import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
  bomItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectBOMItem',
    required: true,
  },
  bomItemNumber: { type: String, required: true },
  itemDescription: { type: String, required: true },
  modelNumber: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imageUrls: [{ type: String, default: '' }],
  orderedQuantity: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'Pcs' },
  approximatePrice: { type: Number, default: 0 },
  actualPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  expectedDeliveryDate: { type: Date },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: [true, 'Purchase Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    buyerName: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
    },
    procurementMode: {
      type: String,
      enum: ['Online', 'Offline'],
      default: 'Online',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    items: [purchaseOrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    purchaseStatus: {
      type: String,
      enum: ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled', 'Returned', 'Damaged'],
      default: 'Ordered',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
