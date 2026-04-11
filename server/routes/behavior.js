import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { logBehavior } from '../controllers/behaviorController.js';

const router = Router();
router.use(requireAuth);
router.post('/', logBehavior);
export default router;