import { createDatabase } from '../db.js';
import { createApp } from '../app.js';

export function createTestContext() {
  const db = createDatabase(':memory:');
  const app = createApp(db);
  return { db, app };
}
