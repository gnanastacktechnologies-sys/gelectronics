import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import User from './models/User.js';
import Buyer from './models/Buyer.js';
import Project from './models/Project.js';
import ProjectBOMItem from './models/ProjectBOMItem.js';
import StockItem from './models/StockItem.js';
import Accessory from './models/Accessory.js';
import Asset from './models/Asset.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import AssemblyStage from './models/AssemblyStage.js';
import AssemblyTest from './models/AssemblyTest.js';
import ReplacementReturn from './models/ReplacementReturn.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('[Seed]: Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed]: Connected successfully.');

    const adminName = process.env.ADMIN_NAME || 'Gnanasekaran';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'gnanastacktechnologies@gmail.com';
    const adminMobile = process.env.ADMIN_MOBILE || '6379250367';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Gnana@123';

    // Optional: Clear dummy balance data if --reset or ERASE_BALANCE_DATA flag is provided
    const shouldResetData = process.argv.includes('--reset') || process.env.ERASE_BALANCE_DATA === 'true';

    if (shouldResetData) {
      console.log('[Reset]: Clearing test balance data from database collections...');
      await Promise.all([
        Project.deleteMany({}),
        ProjectBOMItem.deleteMany({}),
        StockItem.deleteMany({}),
        Accessory.deleteMany({}),
        Asset.deleteMany({}),
        PurchaseOrder.deleteMany({}),
        AssemblyStage.deleteMany({}),
        AssemblyTest.deleteMany({}),
        ReplacementReturn.deleteMany({}),
      ]);
      console.log('✓ Balance dummy data erased.');
    }

    // Upsert Admin User with configured credentials
    await User.deleteMany({}); // Reset users table so only current admin exists
    const adminUser = new User({
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      mobileNumber: adminMobile,
      password: adminPassword,
      role: 'admin',
    });

    await adminUser.save();
    console.log(`✓ Admin user configured and seeded:`);
    console.log(`  • Name: ${adminName}`);
    console.log(`  • Username: ${adminUsername}`);
    console.log(`  • Email: ${adminEmail}`);
    console.log(`  • Mobile: ${adminMobile}`);
    console.log(`  • Password: ${adminPassword}`);

    // Seed Default Online Buyers
    const defaultBuyers = [
      { name: 'Amazon', type: 'Online', website: 'https://amazon.in' },
      { name: 'Robu', type: 'Online', website: 'https://robu.in' },
      { name: 'ElectronicsComp', type: 'Online', website: 'https://electronicscomp.com' },
      { name: 'Mouser', type: 'Online', website: 'https://mouser.in' },
      { name: 'DigiKey', type: 'Online', website: 'https://digikey.in' },
    ];

    for (const b of defaultBuyers) {
      await Buyer.findOneAndUpdate(
        { name: b.name },
        { name: b.name, type: b.type, website: b.website, isEnabled: true },
        { upsert: true, new: true }
      );
    }
    console.log('✓ Default Buyers seeded (Amazon, Robu, ElectronicsComp, Mouser, DigiKey)');

    console.log('[Seed Completed Successfully]');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
