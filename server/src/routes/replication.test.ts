import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type express from 'express';
import type Database from 'better-sqlite3';
import { createTestContext } from '../test/setup.js';
import { signToken } from '../middleware/auth.js';

describe('Replication routes', () => {
  let app: express.Express;
  let db: Database.Database;
  let token: string;

  beforeEach(() => {
    ({ app, db } = createTestContext());
    // Create a test user directly in the DB (skip bcrypt for speed)
    db.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)').run(
      'user-1',
      'testuser',
      'not-a-real-hash',
      new Date().toISOString(),
    );
    token = signToken({ userId: 'user-1', username: 'testuser' });
  });

  function authGet(path: string) {
    return request(app).get(path).set('Authorization', `Bearer ${token}`);
  }

  function authPost(path: string) {
    return request(app).post(path).set('Authorization', `Bearer ${token}`);
  }

  describe('Pull', () => {
    it('returns empty documents and checkpoint for empty collection', async () => {
      const res = await authGet('/api/replication/posts/pull');
      expect(res.status).toBe(200);
      expect(res.body.documents).toEqual([]);
      expect(res.body.checkpoint).toEqual({ id: '', updatedAt: 0 });
    });

    it('returns 400 for invalid collection', async () => {
      const res = await authGet('/api/replication/invalid/pull');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid collection/i);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/replication/posts/pull');
      expect(res.status).toBe(401);
    });
  });

  describe('Push + Pull round-trip', () => {
    it('pushes a post then pulls it back', async () => {
      const post = {
        id: 'post-1',
        title: 'Test Post',
        body: 'Hello world',
        authorId: 'user-1',
        authorName: 'testuser',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      const pushRes = await authPost('/api/replication/posts/push')
        .send([{ newDocumentState: post, assumedMasterState: null }]);
      expect(pushRes.status).toBe(200);
      expect(pushRes.body).toEqual([]); // no conflicts

      const pullRes = await authGet('/api/replication/posts/pull');
      expect(pullRes.status).toBe(200);
      expect(pullRes.body.documents).toHaveLength(1);
      expect(pullRes.body.documents[0].id).toBe('post-1');
      expect(pullRes.body.documents[0].title).toBe('Test Post');
      expect(pullRes.body.documents[0]._deleted).toBe(false);
      expect(pullRes.body.checkpoint.id).toBe('post-1');
    });
  });

  describe('Push conflict detection', () => {
    it('returns server doc when assumedMasterState is wrong', async () => {
      const post = {
        id: 'post-1',
        title: 'Original',
        body: 'Body',
        authorId: 'user-1',
        authorName: 'testuser',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      // Initial push
      await authPost('/api/replication/posts/push')
        .send([{ newDocumentState: post, assumedMasterState: null }]);

      // Pull to get server version
      const pullRes = await authGet('/api/replication/posts/pull');
      const serverDoc = pullRes.body.documents[0];

      // Conflicting push with wrong assumedMasterState
      const conflictRes = await authPost('/api/replication/posts/push')
        .send([{
          newDocumentState: { ...post, title: 'Changed', updatedAt: Date.now() },
          assumedMasterState: { ...serverDoc, updatedAt: 99999 }, // wrong updatedAt
        }]);

      expect(conflictRes.status).toBe(200);
      expect(conflictRes.body).toHaveLength(1);
      expect(conflictRes.body[0].id).toBe('post-1');
    });
  });

  describe('Push validation', () => {
    it('returns 400 for non-array body', async () => {
      const res = await authPost('/api/replication/posts/push')
        .send({ not: 'an array' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/array/i);
    });
  });

  describe('Comments collection', () => {
    it('push and pull works for comments', async () => {
      const comment = {
        id: 'comment-1',
        postId: 'post-1',
        body: 'Nice post!',
        authorId: 'user-1',
        authorName: 'testuser',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      const pushRes = await authPost('/api/replication/comments/push')
        .send([{ newDocumentState: comment, assumedMasterState: null }]);
      expect(pushRes.status).toBe(200);
      expect(pushRes.body).toEqual([]);

      const pullRes = await authGet('/api/replication/comments/pull');
      expect(pullRes.status).toBe(200);
      expect(pullRes.body.documents).toHaveLength(1);
      expect(pullRes.body.documents[0].postId).toBe('post-1');
    });
  });
});
