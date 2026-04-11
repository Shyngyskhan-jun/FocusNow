import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { saveSession, getStats } from '../controllers/focusController.js';

const router = Router();
router.use(requireAuth);
router.post('/',      saveSession);
router.get('/stats',  getStats);
export default router;