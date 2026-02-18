import { useState, useEffect } from 'react';
import { serverOnline$ } from '../database/replication';

const POLL_INTERVAL = 5000;

// Poll /api/health so serverOnline$ stays current even when
// the EventSource is stale (e.g. proxy held the connection open).
let polling = false;
function startHealthPolling() {
  if (polling) return;
  polling = true;

  async function check() {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const val = res.ok;
      if (val !== serverOnline$.getValue()) console.log(`[health] server ${val ? 'UP' : 'DOWN'}`);
      serverOnline$.next(val);
    } catch {
      if (serverOnline$.getValue()) console.log('[health] server DOWN (fetch error)');
      serverOnline$.next(false);
    }
  }

  check();
  setInterval(check, POLL_INTERVAL);
}

export function useOnlineStatus(): boolean {
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [serverOnline, setServerOnline] = useState(serverOnline$.getValue());

  useEffect(() => {
    const goOnline = () => setBrowserOnline(true);
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    startHealthPolling();
    const sub = serverOnline$.subscribe(setServerOnline);
    return () => sub.unsubscribe();
  }, []);

  return browserOnline && serverOnline;
}
