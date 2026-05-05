import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { assertValidEmail, assertValidPassword } from '../utils/validation.js';
import { signAccessToken } from '../services/tokens.js';
import { authenticate } from '../middleware/auth.js';
import { weakEtagFromDate, normalizeIfNoneMatch } from '../utils/httpCache.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const authActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please wait and retry.' },
});

router.post(
  '/register',
  authActionLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    assertValidEmail(email);
    assertValidPassword(password);

    const exists = await User.exists({ email: email.trim().toLowerCase() });
    if (exists) {
      throw conflict('Email already registered.');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'user',
    });

    const token = signAccessToken({ userId: user.id, role: user.role });
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  }),
);

router.post(
  '/login',
  authActionLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    assertValidEmail(email);
    if (typeof password !== 'string' || !password.length) {
      throw badRequest('Password is required.');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Invalid email or password.');
    }

    const token = signAccessToken({ userId: user.id, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const inm = normalizeIfNoneMatch(req.get('if-none-match'));
    if (inm) {
      const brief = await User.findById(req.user.id).select('updatedAt').lean();
      if (!brief) {
        throw notFound('User not found.');
      }
      const etag = weakEtagFromDate(brief.updatedAt);
      if (etag && inm === etag) {
        res.set('ETag', etag);
        return res.status(304).end();
      }
    }

    const user = await User.findById(req.user.id).select('email role createdAt updatedAt').lean();
    if (!user) {
      throw notFound('User not found.');
    }
    const etag = weakEtagFromDate(user.updatedAt);
    if (etag) res.set('ETag', etag);
    res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  }),
);

export default router;
