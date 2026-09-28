import mongoose from 'mongoose';

const accessorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Accessory name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    modelPartNumber: {
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
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
      default: 0,
    },
    usedQuantity: {
      type: Number,
      min: [0, 'Used quantity cannot be negative'],
      default: 0,
    },
    usageLogs: [
      {
        quantity: { type: Number, required: true },
        usedFor: { type: String, default: 'Assembly / Project' },
        usedBy: { type: String, default: 'Admin' },
        date: { type: Date, default: Date.now },
      },
    ],
    unit: {
      type: String,
      trim: true,
      default: 'Pcs',
    },
    minimumQuantity: {
      type: Number,
      min: [0, 'Minimum quantity cannot be negative'],
      default: 0,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock'],
      default: 'In Stock',
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative'],
      default: 0,
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
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

accessorySchema.pre('save', function () {
  if (this.availableQuantity <= 0) {
    this.status = 'Out of Stock';
  } else if (this.minimumQuantity > 0 && this.availableQuantity <= this.minimumQuantity) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
});

const Accessory = mongoose.model('Accessory', accessorySchema);
export default Accessory;
