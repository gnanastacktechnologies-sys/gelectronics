import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    bomItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectBOMItem',
      required: true,
    },
    itemDescription: {
      type: String,
      required: true,
    },
    modelNumber: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imageUrls: [
      {
        type: String,
        default: '',
      },
    ],
    orderedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: 'Pcs',
    },
    expectedDeliveryDate: {
      type: Date,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    usableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    usageLogs: [
      {
        quantity: { type: Number, required: true },
        usedFor: { type: String, default: 'Assembly' },
        usedBy: { type: String, default: 'Admin' },
        date: { type: Date, default: Date.now },
      },
    ],
    damagedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    replacementQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockStatus: {
      type: String,
      enum: [
        'Ordered',
        'Pending Receipt',
        'Partially Received',
        'Received',
        'Damaged',
        'Replacement Pending',
        'Return Pending',
        'Available',
      ],
      default: 'Pending Receipt',
    },
  },
  {
    timestamps: true,
  }
);

stockItemSchema.virtual('pendingQuantity').get(function () {
  return Math.max(0, this.orderedQuantity - this.receivedQuantity - this.replacementQuantity);
});

stockItemSchema.set('toJSON', { virtuals: true });
stockItemSchema.set('toObject', { virtuals: true });

const StockItem = mongoose.model('StockItem', stockItemSchema);
export default StockItem;
