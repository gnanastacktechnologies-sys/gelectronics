import express from 'express';
import {
  getProjectAssemblyStages,
  createAssemblyStage,
  updateAssemblyStage,
  deleteAssemblyStage,
  pickMaterialForStage,
  completeStageAssembly,
} from '../controllers/assemblyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/project/:projectId', getProjectAssemblyStages);
router.post('/stage', createAssemblyStage);
router.put('/stage/:id', updateAssemblyStage);
router.delete('/stage/:id', deleteAssemblyStage);
router.post('/stage/:id/pick', pickMaterialForStage);
router.post('/stage/:id/complete', completeStageAssembly);

export default router;
