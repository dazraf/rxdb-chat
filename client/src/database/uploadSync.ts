import { pairwise } from 'rxjs';
import type { RxCollection } from 'rxdb';
import { serverOnline$ } from './replication';
import { getAll, dequeue } from './uploadQueue';
import { getDatabase } from './index';
import type { AttachmentDoc } from 'shared/schemas';

let started = false;

export function startUploadSync(token: string) {
  if (started) return;
  started = true;

  // When server transitions from offline to online, flush the queue
  serverOnline$.pipe(pairwise()).subscribe(([prev, curr]) => {
    if (!prev && curr) {
      flushQueue(token);
    }
  });

  // Also try flushing immediately in case we start online with pending items
  if (serverOnline$.getValue()) {
    flushQueue(token);
  }
}

async function flushQueue(token: string) {
  const entries = await getAll();
  if (entries.length === 0) return;

  const db = await getDatabase();
  const collection = db.collections.attachments as unknown as RxCollection<AttachmentDoc>;

  for (const entry of entries) {
    try {
      const form = new FormData();
      form.append('file', entry.blob, entry.filename);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        console.warn(`Upload failed for ${entry.id}: ${res.status}`);
        continue;
      }

      const { storageUrl } = await res.json();

      // Update the attachment doc with the server URL
      const doc = await collection.findOne(entry.id).exec();
      if (doc) {
        await doc.incrementalPatch({
          storageUrl,
          uploadStatus: 'uploaded',
          updatedAt: Date.now(),
        });
      }

      await dequeue(entry.id);
    } catch (err) {
      console.warn(`Upload sync failed for ${entry.id}:`, err);
      // Stop flushing on network error; will retry on next online transition
      break;
    }
  }
}
