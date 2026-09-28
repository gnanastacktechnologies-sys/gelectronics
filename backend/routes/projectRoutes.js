import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import {
  getBOMItems,
  addBOMItem,
  updateBOMItem,
  deleteBOMItem,
} from '../controllers/bomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProjectById).put(updateProject).delete(deleteProject);

// Nested BOM item routes
router.route('/:projectId/bom').get(getBOMItems).post(addBOMItem);
router.route('/bom/:id').put(updateBOMItem).delete(deleteBOMItem);

export default router;
