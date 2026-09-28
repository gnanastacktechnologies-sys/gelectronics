import express from 'express';
import { getPendingTests, submitTestResult } from '../controllers/testingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/pending', getPendingTests);
router.post('/submit', submitTestResult);

export default router;
