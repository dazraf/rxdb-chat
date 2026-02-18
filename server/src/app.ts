import express from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { createAuthRoutes } from './routes/auth.js';
import { createReplicationRoutes } from './routes/replication.js';

export function createApp(db: Database.Database): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/replication', createReplicationRoutes(db));

  return app;
}
