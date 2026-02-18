import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type express from 'express';
import type Database from 'better-sqlite3';
import { createTestContext } from '../test/setup.js';
import { verifyToken } from '../middleware/auth.js';

describe('Auth routes', () => {
  let app: express.Express;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = createTestContext());
  });

  describe('POST /api/auth/signup', () => {
    it('creates user and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('alice');

      // Verify user exists in DB
      const row = db.prepare('SELECT * FROM users WHERE username = ?').get('alice') as any;
      expect(row).toBeDefined();
      expect(row.username).toBe('alice');
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 for short username', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'ab', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/3\+ chars/);
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: '12345' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/6\+ chars/);
    });

    it('returns 409 for duplicate username', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password456' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already taken/i);
    });

    it('returned JWT works for authenticated requests', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password123' });

      const token = signupRes.body.token;
      const payload = verifyToken(token);
      expect(payload.username).toBe('alice');
      expect(payload.userId).toBeDefined();

      // Token works for a protected endpoint
      const pullRes = await request(app)
        .get('/api/replication/posts/pull')
        .set('Authorization', `Bearer ${token}`);
      expect(pullRes.status).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password123' });
    });

    it('returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('alice');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('returns 401 for nonexistent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'bob', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });
  });
});
