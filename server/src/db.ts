import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

export function createDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      body TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      parentId TEXT NOT NULL,
      parentType TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      storageUrl TEXT NOT NULL DEFAULT '',
      uploadStatus TEXT NOT NULL DEFAULT 'pending',
      authorId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_comments_updated ON comments (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (postId, updatedAt);
    CREATE INDEX IF NOT EXISTS idx_attachments_updated ON attachments (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments (parentId, updatedAt);
  `);

  return db;
}

export default createDatabase();
