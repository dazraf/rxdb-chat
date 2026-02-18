import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';
import { MAX_FILE_SIZE } from 'shared/constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (isAllowedMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image, video, and audio files are allowed'));
    }
  },
});

export function createUploadRoutes(): Router {
  const router = Router();

  router.post('/', authMiddleware, (req: Request, res: Response) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const status = err instanceof multer.MulterError ? 400 : 400;
        res.status(status).json({ error: err.message });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      res.json({
        storageUrl: `/api/uploads/${req.file.filename}`,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      });
    });
  });

  return router;
}
