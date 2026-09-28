import express from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetConfig,
  updateAssetConfig,
} from '../controllers/assetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/config').get(getAssetConfig).put(updateAssetConfig);
router.route('/').get(getAssets).post(createAsset);
router.route('/:id').get(getAssetById).put(updateAsset).delete(deleteAsset);

export default router;
