import express from 'express';
import { getBuyers, createBuyer, updateBuyer, deleteBuyer } from '../controllers/buyerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getBuyers).post(createBuyer);
router.route('/:id').put(updateBuyer).delete(deleteBuyer);

export default router;
