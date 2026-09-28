import express from 'express';
import {
  getAccessories,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  useAccessory,
} from '../controllers/accessoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getAccessories).post(createAccessory);
router.post('/:id/use', useAccessory);
router.route('/:id').get(getAccessoryById).put(updateAccessory).delete(deleteAccessory);

export default router;
