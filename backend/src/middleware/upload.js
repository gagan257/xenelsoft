import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';

const uploadRoot = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const err = new Error('Unsupported file type.');
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploadMaxFileSizeBytes,
    files: 5,
  },
});

export function toUploadRecord(file, userId) {
  const originalName = sanitizeFileName(file.originalname || 'file');
  const extension = path.extname(originalName).toLowerCase();
  return {
    originalName,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    extension,
    urlPath: `/uploads/${file.filename}`,
    uploadedBy: userId,
  };
}
