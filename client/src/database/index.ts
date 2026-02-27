import { createRxDatabase, RxDatabase, RxStorage, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { postSchema, commentSchema, attachmentSchema, profileSchema, subSchema, subscriptionSchema } from './schemas';
import type { PostDoc, CommentDoc, AttachmentDoc, ProfileDoc, SubDoc, SubscriptionDoc } from 'shared/schemas';
import { DEFAULT_SUB_ID } from 'shared/constants';

addRxPlugin(RxDBMigrationSchemaPlugin);

export type Collections = {
  posts: PostDoc;
  comments: CommentDoc;
  attachments: AttachmentDoc;
  profiles: ProfileDoc;
  subs: SubDoc;
  subscriptions: SubscriptionDoc;
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
      posts: {
        schema: postSchema,
        migrationStrategies: {
          1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, subId: DEFAULT_SUB_ID }),
        },
      },
      comments: { schema: commentSchema },
      attachments: { schema: attachmentSchema },
      profiles: { schema: profileSchema },
      subs: { schema: subSchema },
      subscriptions: { schema: subscriptionSchema },
    });

    return db;
  })();

  return dbPromise;
}
