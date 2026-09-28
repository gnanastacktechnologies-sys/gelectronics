import express from 'express';
import {
  getStockItems,
  getStockItemById,
  receiveStock,
  useStockForAssembly,
  initiateReplacement,
  receiveReplacement,
  initiateReturn,
} from '../controllers/stockController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getStockItems);
router.get('/:id', getStockItemById);
router.post('/:id/receive', receiveStock);
router.post('/:id/use', useStockForAssembly);
router.post('/:id/replace', initiateReplacement);
router.post('/:id/return', initiateReturn);
router.post('/replacement/:replacementId/receive', receiveReplacement);

export default router;
