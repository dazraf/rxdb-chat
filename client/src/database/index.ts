import { createRxDatabase, RxDatabase, RxStorage, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { postSchema, commentSchema, attachmentSchema } from './schemas';
import type { PostDoc, CommentDoc, AttachmentDoc } from 'shared/schemas';

export type Collections = {
  posts: PostDoc;
  comments: CommentDoc;
  attachments: AttachmentDoc;
};

export type AppDatabase = RxDatabase<Collections>;

let dbPromise: Promise<AppDatabase> | null = null;

export async function getDatabase(): Promise<AppDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    let storage: RxStorage<any, any> = getRxStorageDexie();

    if (import.meta.env.DEV) {
      const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
      addRxPlugin(RxDBDevModePlugin);
      const { wrappedValidateAjvStorage } = await import('rxdb/plugins/validate-ajv');
      storage = wrappedValidateAjvStorage({ storage });
    }

    const db = await createRxDatabase<Collections>({
      name: 'kith',
      storage,
      multiInstance: true,
      ignoreDuplicate: true,
    });

    await db.addCollections({
      posts: { schema: postSchema },
      comments: { schema: commentSchema },
      attachments: { schema: attachmentSchema },
    });

    return db;
  })();

  return dbPromise;
}
