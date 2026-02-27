import type { RxCollection } from 'rxdb';
import type { SubscriptionDoc } from 'shared/schemas';

/**
 * Unsubscribe from a sub by removing the subscription document.
 */
export async function unsubscribe(
  collection: RxCollection<SubscriptionDoc>,
  userId: string,
  subId: string,
) {
  const docId = `${userId}_${subId}`;
  const doc = await collection.findOne(docId).exec();
  if (doc) await doc.remove();
}

/**
 * Subscribe (or re-subscribe) to a sub.
 *
 * RxDB doesn't support "un-deleting" a removed document through its
 * normal collection API (insert / upsert / incrementalUpsert all fail
 * or silently leave the doc in a deleted state). When a subscription
 * was previously removed, we must write directly to the storage
 * instance to revive the document.
 */
export async function resubscribe(
  collection: RxCollection<SubscriptionDoc>,
  userId: string,
  subId: string,
) {
  const docId = `${userId}_${subId}`;
  const now = Date.now();
  const createdAt = new Date().toISOString();

  // Fast path: first-time subscription (or re-subscribe after purge)
  try {
    await collection.insert({
      id: docId,
      userId,
      subId,
      createdAt,
      updatedAt: now,
      _deleted: false,
    });
    return;
  } catch {
    // Document might still exist in storage (soft-deleted) — fall through
  }

  // Slow path: revive a previously deleted subscription via storage API
  const si = collection.storageInstance;
  const existing = await si.findDocumentsById([docId], true);
  const prev = existing[0];
  if (!prev) return;

  await si.bulkWrite(
    [
      {
        previous: prev,
        document: {
          ...prev,
          _deleted: false,
          updatedAt: now,
          createdAt,
          _meta: { lwt: now },
          _rev: '',
          _attachments: {},
        },
      },
    ],
    'resubscribe',
  );
}
