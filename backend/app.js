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
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', system: 'G Electronics API Server', timestamp: new Date() });
});

// API Routes (mounted both with and without /api for Vercel serverless routing compatibility)
const registerRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/projects`, projectRoutes);
  app.use(`${prefix}/purchases`, purchaseRoutes);
  app.use(`${prefix}/stock`, stockRoutes);
  app.use(`${prefix}/accessories`, accessoryRoutes);
  app.use(`${prefix}/assets`, assetRoutes);
  app.use(`${prefix}/assembly`, assemblyRoutes);
  app.use(`${prefix}/testing`, testingRoutes);
  app.use(`${prefix}/buyers`, buyerRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);
};

registerRoutes('/api');
registerRoutes('');

// Error Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
