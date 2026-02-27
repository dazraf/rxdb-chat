import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { Subject, BehaviorSubject, Observable, pairwise } from 'rxjs';
import type { RxReplicationPullStreamItem } from 'rxdb';
import type { ReplicationCheckpoint } from 'shared/schemas';
import type { AppDatabase } from './index';

const API_BASE = '/api/replication';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let replications: RxReplicationState<any, any>[] = [];
let cleanupFns: (() => void)[] = [];

export const serverOnline$ = new BehaviorSubject<boolean>(true);

// Collections that get their own SSE stream. Limit to 4 to stay within
// the browser's HTTP/1.1 per-host connection cap (6), leaving headroom
// for pull/push fetch requests.
const SSE_COLLECTIONS = ['posts', 'comments', 'attachments', 'profiles'] as const;
const ALL_COLLECTIONS = ['posts', 'comments', 'attachments', 'profiles', 'subs', 'subscriptions'] as const;

export function startReplication(db: AppDatabase, token: string) {
  cancelReplication();

  // Create SSE streams only for the core collections
  const sseStreams = new Map<string, { stream$: Observable<StreamItem>; cleanup: () => void }>();
  for (const name of SSE_COLLECTIONS) {
    const sse = createSseStream(name, token);
    sseStreams.set(name, sse);
    cleanupFns.push(sse.cleanup);
  }

  for (const name of ALL_COLLECTIONS) {
    const collection = db[name];
    const sse = sseStreams.get(name);

    // Collections without their own SSE use a Subject that gets
    // RESYNC when any other SSE connection opens (via reSync()).
    const pullStream$ = sse
      ? sse.stream$
      : new Subject<StreamItem>().asObservable();

    const replicationState = replicateRxCollection({
      collection: collection as never,
      replicationIdentifier: `http-replication-${name}`,
      deletedField: '_deleted',
      live: true,
      retryTime: 5000,
      push: {
        batchSize: 50,
        async handler(changeRows) {
          const res = await fetch(`${API_BASE}/${name}/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(changeRows),
          });
          if (!res.ok) throw new Error(`Push failed: ${res.status}`);
          return await res.json();
        },
      },
      pull: {
        batchSize: 100,
        async handler(
          checkpoint: ReplicationCheckpoint | undefined,
          batchSize: number,
        ) {
          const params = new URLSearchParams({
            updatedAt: String(checkpoint?.updatedAt ?? 0),
            id: checkpoint?.id ?? '',
            limit: String(batchSize),
          });
          const res = await fetch(`${API_BASE}/${name}/pull?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
          return await res.json();
        },
        stream$: pullStream$ as Observable<RxReplicationPullStreamItem<never, ReplicationCheckpoint>>,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replications.push(replicationState as any);
  }
}

export function cancelReplication() {
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
  for (const rep of replications) {
    rep.cancel();
  }
  replications = [];
}

type StreamItem = RxReplicationPullStreamItem<unknown, ReplicationCheckpoint>;

const SSE_RECONNECT_INTERVAL = 5000;
// Server sends heartbeats every 5s; if we get nothing for 10s, the connection is stale.
const SSE_STALE_TIMEOUT = 10_000;

function createSseStream(
  collection: string,
  token: string,
): { stream$: Observable<StreamItem>; cleanup: () => void } {
  const subject = new Subject<StreamItem>();
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let staleTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  function resetStaleTimer() {
    if (staleTimer) clearTimeout(staleTimer);
    if (cancelled) return;
    staleTimer = setTimeout(() => {
      staleTimer = null;
      if (cancelled || !es) return;
      console.log(`[sse:${collection}] connection stale (no messages for ${SSE_STALE_TIMEOUT / 1000}s), reconnecting`);
      serverOnline$.next(false);
      es.close();
      es = null;
      scheduleReconnect();
    }, SSE_STALE_TIMEOUT);
  }

  function connect() {
    if (cancelled) return;
    if (es) es.close();
    es = new EventSource(`${API_BASE}/${collection}/stream?token=${token}`);

    es.onopen = () => {
      serverOnline$.next(true);
      resetStaleTimer();
      for (const rep of replications) {
        rep.reSync();
      }
    };

    es.onmessage = (event) => {
      resetStaleTimer();
      const data = JSON.parse(event.data);
      if (data === 'HEARTBEAT') {
        // Ignore heartbeats — they just reset the stale timer above
        return;
      }
      if (data === 'RESYNC') {
        subject.next('RESYNC');
      } else if (Array.isArray(data)) {
        const lastDoc = data[data.length - 1];
        subject.next({
          documents: data,
          checkpoint: lastDoc
            ? { id: lastDoc.id, updatedAt: lastDoc.updatedAt }
            : { id: '', updatedAt: 0 },
        });
      }
    };

    es.onerror = () => {
      serverOnline$.next(false);
      if (staleTimer) { clearTimeout(staleTimer); staleTimer = null; }
      // readyState 2 = CLOSED — the browser gave up (e.g. got a non-200 from proxy).
      // We must manually reconnect since auto-reconnect won't fire.
      if (es?.readyState === EventSource.CLOSED) {
        es.close();
        es = null;
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (cancelled || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, SSE_RECONNECT_INTERVAL);
  }

  // When the health check detects server recovery (false → true),
  // force reconnect the EventSource. This handles the case where
  // a reverse proxy (e.g. Vite) holds the SSE connection open
  // after the backend dies, leaving the EventSource in a stale
  // OPEN state that never fires events.
  const sub = serverOnline$.pipe(pairwise()).subscribe(([prev, curr]) => {
    if (!prev && curr && !cancelled) {
      console.log(`[sse:${collection}] server recovered, forcing reconnect`);
      connect();
    }
  });

  function cleanup() {
    cancelled = true;
    sub.unsubscribe();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (staleTimer) clearTimeout(staleTimer);
    if (es) es.close();
    es = null;
  }

  connect();

  return { stream$: subject.asObservable(), cleanup };
}
