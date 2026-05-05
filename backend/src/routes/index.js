import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import userRoutes from './user.js';
import productRoutes from './products.js';
import uploadRoutes from './uploads.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/products', productRoutes);
router.use('/uploads', uploadRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
