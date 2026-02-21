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

  describe('Attachments collection', () => {
    it('push and pull works for attachments', async () => {
      const attachment = {
        id: 'att-1',
        parentId: 'post-1',
        parentType: 'post',
        filename: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 12345,
        storageUrl: '/api/uploads/abc.png',
        uploadStatus: 'uploaded',
        authorId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      const pushRes = await authPost('/api/replication/attachments/push')
        .send([{ newDocumentState: attachment, assumedMasterState: null }]);
      expect(pushRes.status).toBe(200);
      expect(pushRes.body).toEqual([]);

      const pullRes = await authGet('/api/replication/attachments/pull');
      expect(pullRes.status).toBe(200);
      expect(pullRes.body.documents).toHaveLength(1);
      expect(pullRes.body.documents[0].id).toBe('att-1');
      expect(pullRes.body.documents[0].parentId).toBe('post-1');
      expect(pullRes.body.documents[0].parentType).toBe('post');
      expect(pullRes.body.documents[0].filename).toBe('photo.png');
      expect(pullRes.body.documents[0].mimeType).toBe('image/png');
      expect(pullRes.body.documents[0].sizeBytes).toBe(12345);
      expect(pullRes.body.documents[0].storageUrl).toBe('/api/uploads/abc.png');
      expect(pullRes.body.documents[0].uploadStatus).toBe('uploaded');
      expect(pullRes.body.documents[0]._deleted).toBe(false);
    });

    it('handles conflict detection for attachments', async () => {
      const attachment = {
        id: 'att-1',
        parentId: 'post-1',
        parentType: 'post',
        filename: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 12345,
        storageUrl: '/api/uploads/abc.png',
        uploadStatus: 'uploaded',
        authorId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      // Initial push
      await authPost('/api/replication/attachments/push')
        .send([{ newDocumentState: attachment, assumedMasterState: null }]);

      // Pull to get server version
      const pullRes = await authGet('/api/replication/attachments/pull');
      const serverDoc = pullRes.body.documents[0];

      // Conflicting push with wrong assumedMasterState
      const conflictRes = await authPost('/api/replication/attachments/push')
        .send([{
          newDocumentState: { ...attachment, uploadStatus: 'pending', updatedAt: Date.now() },
          assumedMasterState: { ...serverDoc, updatedAt: 99999 },
        }]);

      expect(conflictRes.status).toBe(200);
      expect(conflictRes.body).toHaveLength(1);
      expect(conflictRes.body[0].id).toBe('att-1');
    });

    it('soft-deletes attachments via replication', async () => {
      const attachment = {
        id: 'att-2',
        parentId: 'comment-1',
        parentType: 'comment',
        filename: 'voice.webm',
        mimeType: 'audio/webm',
        sizeBytes: 50000,
        storageUrl: '/api/uploads/xyz.webm',
        uploadStatus: 'uploaded',
        authorId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };

      // Push the attachment
      await authPost('/api/replication/attachments/push')
        .send([{ newDocumentState: attachment, assumedMasterState: null }]);

      // Pull and get the server version
      const pullRes = await authGet('/api/replication/attachments/pull');
      const serverDoc = pullRes.body.documents[0];

      // Soft-delete
      const deleteRes = await authPost('/api/replication/attachments/push')
        .send([{
          newDocumentState: { ...attachment, _deleted: true, updatedAt: Date.now() },
          assumedMasterState: serverDoc,
        }]);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body).toEqual([]);

      // Pull again - should see _deleted: true
      const pullRes2 = await authGet('/api/replication/attachments/pull');
      expect(pullRes2.body.documents).toHaveLength(1);
      expect(pullRes2.body.documents[0]._deleted).toBe(true);
    });
  });

  describe('Profiles collection', () => {
    it('push and pull works for profiles', async () => {
      const profile = {
        id: 'user-1',
        username: 'testuser',
        avatarId: 'cat',
        about: 'Hello world',
        themeMode: 'dark',
        updatedAt: Date.now(),
        _deleted: false,
      };

      const pushRes = await authPost('/api/replication/profiles/push')
        .send([{ newDocumentState: profile, assumedMasterState: null }]);
      expect(pushRes.status).toBe(200);
      expect(pushRes.body).toEqual([]);

      const pullRes = await authGet('/api/replication/profiles/pull');
      expect(pullRes.status).toBe(200);
      expect(pullRes.body.documents).toHaveLength(1);
      expect(pullRes.body.documents[0].id).toBe('user-1');
      expect(pullRes.body.documents[0].username).toBe('testuser');
      expect(pullRes.body.documents[0].avatarId).toBe('cat');
      expect(pullRes.body.documents[0].about).toBe('Hello world');
      expect(pullRes.body.documents[0].themeMode).toBe('dark');
      expect(pullRes.body.documents[0]._deleted).toBe(false);
    });

    it('handles conflict detection for profiles', async () => {
      const profile = {
        id: 'user-1',
        username: 'testuser',
        avatarId: 'default',
        about: '',
        themeMode: 'system',
        updatedAt: Date.now(),
        _deleted: false,
      };

      // Initial push
      await authPost('/api/replication/profiles/push')
        .send([{ newDocumentState: profile, assumedMasterState: null }]);

      // Pull to get server version
      const pullRes = await authGet('/api/replication/profiles/pull');
      const serverDoc = pullRes.body.documents[0];

      // Conflicting push with wrong assumedMasterState
      const conflictRes = await authPost('/api/replication/profiles/push')
        .send([{
          newDocumentState: { ...profile, avatarId: 'fox', updatedAt: Date.now() },
          assumedMasterState: { ...serverDoc, updatedAt: 99999 },
        }]);

      expect(conflictRes.status).toBe(200);
      expect(conflictRes.body).toHaveLength(1);
      expect(conflictRes.body[0].id).toBe('user-1');
    });

    it('rejects pushing another user\'s profile with 403', async () => {
      const otherProfile = {
        id: 'other-user-id',
        username: 'hacker',
        avatarId: 'default',
        about: 'hacked',
        themeMode: 'system',
        updatedAt: Date.now(),
        _deleted: false,
      };

      const pushRes = await authPost('/api/replication/profiles/push')
        .send([{ newDocumentState: otherProfile, assumedMasterState: null }]);
      expect(pushRes.status).toBe(403);
      expect(pushRes.body.error).toMatch(/another user/i);
    });
  });
});
