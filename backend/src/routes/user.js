import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('user'));

router.get('/welcome', (_req, res) => {
  res.json({
    message: 'Standard user area. Admins receive 403 here (role separation demo).',
  });
});

export default router;
