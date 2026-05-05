import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(authenticate, requireRole('admin'));

router.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Admin-only endpoint reachable.' });
});

router.patch(
  '/users/:userId/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body ?? {};
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be "admin" or "user".' });
    }
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.role = role;
    await user.save();

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }),
);

export default router;
