import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    assetNumber: {
      type: String,
      required: [true, 'Asset number is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Asset description / name is required'],
      trim: true,
    },
    modelName: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrls: [
      {
        type: String,
        trim: true,
      },
    ],
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unit: {
      type: String,
      trim: true,
      default: 'Pcs',
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    procurementMode: {
      type: String,
      enum: ['Online', 'Offline'],
      default: 'Online',
    },
    buyer: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Available', 'In Use', 'Under Maintenance', 'Decommissioned'],
      default: 'Available',
    },
    location: {
      type: String,
      trim: true,
      default: 'Assembly Bench',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

assetSchema.pre('save', function () {
  this.totalPrice = (this.quantity || 0) * (this.price || 0);
});

const Asset = mongoose.model('Asset', assetSchema);
export default Asset;
