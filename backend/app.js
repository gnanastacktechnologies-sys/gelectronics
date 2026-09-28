import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import accessoryRoutes from './routes/accessoryRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import assemblyRoutes from './routes/assemblyRoutes.js';
import testingRoutes from './routes/testingRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'G Electronics API Server', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/accessories', accessoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/assembly', assemblyRoutes);
app.use('/api/testing', testingRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
