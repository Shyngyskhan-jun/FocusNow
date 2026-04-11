import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = Router();
router.use(requireAuth);
router.get('/', getAnalytics);
export default router;