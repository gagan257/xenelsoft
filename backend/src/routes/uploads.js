import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { upload, toUploadRecord } from '../middleware/upload.js';
import { Upload } from '../models/Upload.js';
import { config } from '../config/env.js';
import { badRequest } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests. Please retry later.' },
});

router.use(authenticate);
router.use(uploadLimiter);

function fileUrl(req, urlPath) {
  if (config.uploadBaseUrl) {
    return `${config.uploadBaseUrl.replace(/\/$/, '')}${urlPath}`;
  }
  return `${req.protocol}://${req.get('host')}${urlPath}`;
}

function asResponse(req, doc) {
  return {
    id: doc._id.toString(),
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedBy: doc.uploadedBy.toString(),
    createdAt: doc.createdAt,
    url: fileUrl(req, doc.urlPath),
    path: doc.urlPath,
  };
}

router.post(
  '/single',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest('file field is required.');
    }

    const payload = toUploadRecord(req.file, req.user.id);
    const doc = await Upload.create(payload);
    return res.status(201).json(asResponse(req, doc));
  }),
);

router.post(
  '/multiple',
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      throw badRequest('files field is required.');
    }

    const records = files.map((file) => toUploadRecord(file, req.user.id));
    const docs = await Upload.insertMany(records, { ordered: true });
    return res.status(201).json({
      files: docs.map((doc) => asResponse(req, doc)),
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const docs = await Upload.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      files: docs.map((doc) => asResponse(req, doc)),
    });
  }),
);

export default router;
