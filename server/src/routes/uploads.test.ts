import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestContext } from '../test/setup.js';
import { signToken } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

describe('Upload routes', () => {
  let app: express.Express;
  let token: string;

  beforeEach(() => {
    const { app: a, db } = createTestContext();
    app = a;
    db.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)').run(
      'user-1',
      'testuser',
      'not-a-real-hash',
      new Date().toISOString(),
    );
    token = signToken({ userId: 'user-1', username: 'testuser' });
  });

  afterEach(() => {
    // Clean up any uploaded files
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    }
  });

  it('uploads an image file successfully', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.storageUrl).toMatch(/^\/api\/uploads\/.+\.png$/);
    expect(res.body.filename).toBe('photo.png');
    expect(res.body.mimeType).toBe('image/png');
    expect(res.body.sizeBytes).toBeGreaterThan(0);
  });

  it('uploads a video file successfully', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-video-data'), {
        filename: 'clip.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(res.body.storageUrl).toMatch(/^\/api\/uploads\/.+\.mp4$/);
    expect(res.body.mimeType).toBe('video/mp4');
  });

  it('uploads an audio file successfully', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-audio-data'), {
        filename: 'voice.webm',
        contentType: 'audio/webm',
      });

    expect(res.status).toBe(200);
    expect(res.body.storageUrl).toMatch(/^\/api\/uploads\/.+\.webm$/);
    expect(res.body.mimeType).toBe('audio/webm');
  });

  it('rejects non-media files', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello world'), {
        filename: 'readme.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only image, video, and audio/i);
  });

  it('rejects files exceeding 5MB', async () => {
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x'); // 6MB

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', largeBuffer, {
        filename: 'huge.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when no file is provided', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(401);
  });

  it('serves uploaded files via static route', async () => {
    // First upload a file
    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('test-image-content'), {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(uploadRes.status).toBe(200);

    // Then fetch it via the static route
    const fileUrl = uploadRes.body.storageUrl;
    const fetchRes = await request(app).get(fileUrl);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.toString()).toBe('test-image-content');
  });
});
