import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getPurchaseNotifications,
  inspectAndReceivePurchaseOrder,
} from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/notifications', getPurchaseNotifications);
router.post('/:id/receive', inspectAndReceivePurchaseOrder);
router.route('/').get(getPurchaseOrders).post(createPurchaseOrder);
router.route('/:id').get(getPurchaseOrderById).put(updatePurchaseOrder).delete(deletePurchaseOrder);

export default router;
