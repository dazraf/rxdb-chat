import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signToken, verifyToken, authMiddleware } from './auth.js';

describe('signToken / verifyToken', () => {
  it('round-trips a payload', () => {
    const payload = { userId: 'u1', username: 'alice' };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.username).toBe('alice');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ userId: 'u1', username: 'alice' });
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(() => verifyToken(tampered)).toThrow();
  });
});

describe('authMiddleware', () => {
  function buildApp() {
    const app = express();
    app.use(express.json());
    app.get('/protected', authMiddleware, (_req, res) => {
      res.json({ user: _req.user });
    });
    return app;
  }

  it('passes with valid Bearer token', async () => {
    const app = buildApp();
    const token = signToken({ userId: 'u1', username: 'alice' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBe('u1');
  });

  it('passes with query param token', async () => {
    const app = buildApp();
    const token = signToken({ userId: 'u1', username: 'alice' });
    const res = await request(app)
      .get(`/protected?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
  });

  it('returns 401 without token', async () => {
    const app = buildApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 401 with invalid token', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });
});
