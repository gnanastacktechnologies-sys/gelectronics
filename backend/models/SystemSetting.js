import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_settings',
    },
    assetPrefix: {
      type: String,
      trim: true,
      default: 'AST-',
    },
    assetStartNumber: {
      type: Number,
      min: 1,
      default: 1,
    },
    enableLowStockAlert: {
      type: Boolean,
      default: true,
    },
    lowStockThreshold: {
      type: Number,
      min: 1,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
