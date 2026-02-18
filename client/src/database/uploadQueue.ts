import { MAX_QUEUE_BYTES } from 'shared/constants';

const DB_NAME = 'rxdb_reddit_uploads';
const STORE_NAME = 'pending';

interface QueueEntry {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function enqueue(entry: QueueEntry): Promise<void> {
  const db = await openDb();
  const currentSize = await getTotalSize(db);
  if (currentSize + entry.sizeBytes > MAX_QUEUE_BYTES) {
    db.close();
    throw new Error('Offline upload queue is full (50MB limit)');
  }
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(entry);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function getAll(): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function getTotalSize(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => {
      const total = (req.result as QueueEntry[]).reduce((sum, e) => sum + e.sizeBytes, 0);
      resolve(total);
    };
    req.onerror = () => reject(req.error);
  });
}
