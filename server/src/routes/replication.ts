import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { authMiddleware } from '../middleware/auth.js';
import { sseSubject } from '../sse.js';

const VALID_COLLECTIONS = ['posts', 'comments', 'attachments', 'profiles'] as const;
type CollectionName = (typeof VALID_COLLECTIONS)[number];

function isValidCollection(name: string): name is CollectionName {
  return VALID_COLLECTIONS.includes(name as CollectionName);
}

const COLUMN_MAP: Record<CollectionName, string[]> = {
  posts: ['id', 'title', 'body', 'authorId', 'authorName', 'createdAt', 'updatedAt', '_deleted'],
  comments: ['id', 'postId', 'body', 'authorId', 'authorName', 'createdAt', 'updatedAt', '_deleted'],
  attachments: [
    'id', 'parentId', 'parentType', 'filename', 'mimeType', 'sizeBytes',
    'storageUrl', 'uploadStatus', 'authorId', 'createdAt', 'updatedAt', '_deleted',
  ],
  profiles: ['id', 'username', 'avatarId', 'about', 'themeMode', 'updatedAt', '_deleted'],
};

export function createReplicationRoutes(db: Database.Database): Router {
  const router = Router();

  // --- Pull ---
  router.get('/:collection/pull', authMiddleware, (req: Request, res: Response) => {
    const { collection } = req.params;
    if (!isValidCollection(collection)) {
      res.status(400).json({ error: 'Invalid collection' });
      return;
    }

    const checkpointUpdatedAt = parseInt(req.query.updatedAt as string) || 0;
    const checkpointId = (req.query.id as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    const rows = db
      .prepare(
        `SELECT * FROM ${collection}
         WHERE (updatedAt > ?) OR (updatedAt = ? AND id > ?)
         ORDER BY updatedAt ASC, id ASC
         LIMIT ?`,
      )
      .all(checkpointUpdatedAt, checkpointUpdatedAt, checkpointId, limit) as Record<string, unknown>[];

    const documents: Record<string, unknown>[] = rows.map((row) => ({
      ...row,
      _deleted: row._deleted === 1,
    }));

    const lastDoc = documents.length > 0 ? documents[documents.length - 1] : null;
    const checkpoint = lastDoc
      ? { id: lastDoc.id as string, updatedAt: lastDoc.updatedAt as number }
      : { id: checkpointId, updatedAt: checkpointUpdatedAt };

    res.json({ documents, checkpoint });
  });

  // --- Push ---
  router.post('/:collection/push', authMiddleware, (req: Request, res: Response) => {
    const { collection } = req.params;
    if (!isValidCollection(collection)) {
      res.status(400).json({ error: 'Invalid collection' });
      return;
    }

    const changeRows: { newDocumentState: Record<string, unknown>; assumedMasterState: Record<string, unknown> | null }[] =
      req.body;

    if (!Array.isArray(changeRows)) {
      res.status(400).json({ error: 'Body must be an array' });
      return;
    }

    // Ownership check: users can only push their own profile
    if (collection === 'profiles') {
      for (const { newDocumentState } of changeRows) {
        if (newDocumentState.id !== req.user!.userId) {
          res.status(403).json({ error: 'Cannot modify another user\'s profile' });
          return;
        }
      }
    }

    const conflicts: Record<string, unknown>[] = [];
    const written: Record<string, unknown>[] = [];

    const columns = COLUMN_MAP[collection];

    const placeholders = columns.map(() => '?').join(', ');
    const updateSet = columns
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');

    const upsertStmt = db.prepare(
      `INSERT INTO ${collection} (${columns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
    );

    const selectStmt = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`);

    const runTransaction = db.transaction(() => {
      for (const { newDocumentState, assumedMasterState } of changeRows) {
        const docId = newDocumentState.id as string;
        const existingRow = selectStmt.get(docId) as Record<string, unknown> | undefined;

        if (existingRow) {
          const existingUpdatedAt = existingRow.updatedAt as number;
          const assumedUpdatedAt = assumedMasterState?.updatedAt as number | undefined;

          if (assumedUpdatedAt !== existingUpdatedAt) {
            conflicts.push({ ...existingRow, _deleted: existingRow._deleted === 1 });
            continue;
          }
        }

        const now = Date.now();
        const values = columns.map((c) => {
          if (c === 'updatedAt') return now;
          if (c === '_deleted') return newDocumentState._deleted ? 1 : 0;
          return newDocumentState[c] ?? null;
        });

        upsertStmt.run(...values);
        written.push({ ...newDocumentState, updatedAt: now, _deleted: !!newDocumentState._deleted });
      }
    });

    runTransaction();

    if (written.length > 0) {
      sseSubject.next({ collection, documents: written });
    }

    res.json(conflicts);
  });

  // --- Stream (SSE) ---
  router.get('/:collection/stream', authMiddleware, (req: Request, res: Response) => {
    const { collection } = req.params;
    if (!isValidCollection(collection)) {
      res.status(400).json({ error: 'Invalid collection' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send initial "RESYNC" so RxDB triggers a checkpoint pull
    res.write('data: "RESYNC"\n\n');

    // Heartbeat every 5s as a data message so clients can detect stale connections.
    // When the server dies, the heartbeats stop and the client's stale timer fires.
    const heartbeat = setInterval(() => {
      res.write('data: "HEARTBEAT"\n\n');
    }, 5_000);

    const subscription = sseSubject.subscribe((event) => {
      if (event.collection === collection) {
        res.write(`data: ${JSON.stringify(event.documents)}\n\n`);
      }
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      subscription.unsubscribe();
    });
  });

  return router;
}
