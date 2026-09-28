import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1', '1.0.0.1']);
} catch (e) {}

import User from './models/User.js';
import Buyer from './models/Buyer.js';
import Project from './models/Project.js';
import ProjectBOMItem from './models/ProjectBOMItem.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import StockItem from './models/StockItem.js';
import ReplacementReturn from './models/ReplacementReturn.js';
import Accessory from './models/Accessory.js';

dotenv.config();

const cleanData = async () => {
  try {
    console.log('[CleanData]: Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[CleanData]: Connected successfully.');

    // 1. Delete all non-admin users
    const userDeleteResult = await User.deleteMany({ username: { $ne: 'admin' } });
    console.log(`✓ Deleted ${userDeleteResult.deletedCount} non-admin user(s)`);

    // Ensure Admin user exists
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      await User.create({
        name: 'G Electronics Admin',
        username: 'admin',
        password: 'adminpassword',
        role: 'admin',
      });
      console.log('✓ Admin user verified/created (username: "admin", password: "adminpassword")');
    }

    // 2. Delete all Projects, BOM Items, Purchase Orders, Stock Items, Replacement Returns, Accessories
    const prjResult = await Project.deleteMany({});
    const bomResult = await ProjectBOMItem.deleteMany({});
    const poResult = await PurchaseOrder.deleteMany({});
    const stockResult = await StockItem.deleteMany({});
    const returnResult = await ReplacementReturn.deleteMany({});
    const accResult = await Accessory.deleteMany({});

    console.log(`✓ Deleted ${prjResult.deletedCount} project(s)`);
    console.log(`✓ Deleted ${bomResult.deletedCount} BOM item(s)`);
    console.log(`✓ Deleted ${poResult.deletedCount} purchase order(s)`);
    console.log(`✓ Deleted ${stockResult.deletedCount} stock item(s)`);
    console.log(`✓ Deleted ${returnResult.deletedCount} replacement return record(s)`);
    console.log(`✓ Deleted ${accResult.deletedCount} accessory record(s)`);

    console.log('[CleanData Successful]: Database cleaned! Only admin user remains.');
    process.exit(0);
  } catch (error) {
    console.error('[CleanData Error]:', error);
    process.exit(1);
  }
};

cleanData();
