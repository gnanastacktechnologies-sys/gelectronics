import mongoose from 'mongoose';

const replacementReturnSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Replace', 'Return'],
      required: true,
    },
    stockItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockItem',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    bomItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectBOMItem',
      required: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    buyerName: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Replacement Pending',
        'Replacement Ordered',
        'Replacement Received',
        'Return Pending',
        'Returned',
        'Refund Pending',
        'Closed',
      ],
      default: 'Pending',
    },
    actionDate: {
      type: Date,
      default: Date.now,
    },
    resolutionDate: {
      type: Date,
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

const ReplacementReturn = mongoose.model('ReplacementReturn', replacementReturnSchema);
export default ReplacementReturn;
