import app from './app.js';
import { connectDB } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP Server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[G Electronics Backend Server]: Running on port ${PORT} (0.0.0.0) in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
