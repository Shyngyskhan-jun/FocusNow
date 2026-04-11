import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/tasksController.js';

const router = Router();
router.use(requireAuth);

router.get('/', c.getTasks);
router.post('/', c.createTask);
router.put('/:id', c.updateTask);
router.delete('/:id', c.deleteTask);
router.post('/:taskId/steps', c.addStep);
router.put('/:taskId/steps/:stepId/toggle', c.toggleStep);

export default router;