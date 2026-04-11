import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/userController.js';

const router = Router();
router.use(requireAuth);
router.get('/profile',  getProfile);
router.put('/profile',  updateProfile);
export default router;