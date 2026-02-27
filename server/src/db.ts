import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_SUB_ID } from 'shared/constants';

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
      subId TEXT NOT NULL DEFAULT 'general',
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

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatarId TEXT NOT NULL DEFAULT 'default',
      about TEXT NOT NULL DEFAULT '',
      themeMode TEXT NOT NULL DEFAULT 'system',
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      creatorId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      subId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      _deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_comments_updated ON comments (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (postId, updatedAt);
    CREATE INDEX IF NOT EXISTS idx_attachments_updated ON attachments (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments (parentId, updatedAt);
    CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_subs_updated ON subs (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_subs_name ON subs (name);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_updated ON subscriptions (updatedAt, id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_sub ON subscriptions (userId, subId);
  `);

  // Add themeMode column to existing profiles tables (idempotent migration)
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN themeMode TEXT NOT NULL DEFAULT 'system'`);
  } catch {
    // Column already exists — ignore
  }

  // Add subId column to existing posts tables (idempotent migration)
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN subId TEXT NOT NULL DEFAULT 'general'`);
  } catch {
    // Column already exists — ignore
  }

  // Create subId index after migration ensures the column exists
  db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_sub ON posts (subId, createdAt)`);

  // Backfill profiles for existing users that don't have one yet
  db.prepare(
    `INSERT OR IGNORE INTO profiles (id, username, avatarId, about, themeMode, updatedAt, _deleted)
     SELECT id, username, 'default', '', 'system', strftime('%s','now') * 1000, 0
     FROM users WHERE id NOT IN (SELECT id FROM profiles)`
  ).run();

  // Seed the default "general" sub
  db.prepare(
    `INSERT OR IGNORE INTO subs (id, name, description, creatorId, createdAt, updatedAt, _deleted)
     VALUES (?, 'general', 'General discussion', 'system', ?, ?, 0)`
  ).run(DEFAULT_SUB_ID, new Date().toISOString(), Date.now());

  return db;
}

export default createDatabase();
