import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import { signToken } from '../middleware/auth.js';

export function createAuthRoutes(db: Database.Database): Router {
  const router = Router();

  router.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
      }

      if (username.length < 3 || password.length < 6) {
        res.status(400).json({ error: 'Username must be 3+ chars, password 6+ chars' });
        return;
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        res.status(409).json({ error: 'Username already taken' });
        return;
      }

      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      const createdAt = new Date().toISOString();

      db.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)').run(
        id,
        username,
        passwordHash,
        createdAt,
      );

      db.prepare(
        'INSERT INTO profiles (id, username, avatarId, about, themeMode, updatedAt, _deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
      ).run(id, username, 'default', '', 'system', Date.now());

      const token = signToken({ userId: id, username });
      res.json({ token, user: { id, username } });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
      }

      const row = db
        .prepare('SELECT id, username, passwordHash FROM users WHERE username = ?')
        .get(username) as { id: string; username: string; passwordHash: string } | undefined;

      if (!row) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, row.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = signToken({ userId: row.id, username: row.username });
      res.json({ token, user: { id: row.id, username: row.username } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
