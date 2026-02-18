import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import { createAuthRoutes } from './routes/auth.js';
import { createReplicationRoutes } from './routes/replication.js';
import { createUploadRoutes } from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

export function createApp(db: Database.Database): express.Express {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/replication', createReplicationRoutes(db));
  app.use('/api/upload', createUploadRoutes());
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  return app;
}
