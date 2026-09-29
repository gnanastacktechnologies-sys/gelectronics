import mongoose from 'mongoose';

const projectBOMItemSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    bomItemNumber: {
      type: String,
      required: [true, 'BOM Item Number is required'],
      trim: true,
    },
    itemDescription: {
      type: String,
      required: [true, 'Item Description is required'],
      trim: true,
    },
    modelNumber: {
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
      min: [1, 'Quantity must be greater than 0'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'Pcs',
    },
    actualPrice: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    actualLineTotal: {
      type: Number,
      default: 0,
    },
    buyerName: {
      type: String,
      trim: true,
      default: '',
    },
    procurementMode: {
      type: String,
      enum: ['Online', 'Offline'],
      default: 'Online',
    },
    isAccessory: {
      type: Boolean,
      default: false,
    },
    stage: {
      type: String,
      trim: true,
      default: 'Stage 1',
    },
    purchaseStatus: {
      type: String,
      enum: ['Not Purchased', 'Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled', 'Returned', 'Damaged'],
      default: 'Not Purchased',
    },
    stockStatus: {
      type: String,
      enum: [
        'Not Purchased',
        'Ordered',
        'Pending Receipt',
        'Partially Received',
        'Received',
        'Damaged',
        'Replacement Pending',
        'Return Pending',
        'Available',
      ],
      default: 'Not Purchased',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique BOM item numbers within the same project
projectBOMItemSchema.index({ project: 1, bomItemNumber: 1 }, { unique: true });

projectBOMItemSchema.pre('save', function () {
  this.actualLineTotal = (this.quantity || 0) * (this.actualPrice || 0);
});

const ProjectBOMItem = mongoose.model('ProjectBOMItem', projectBOMItemSchema);
export default ProjectBOMItem;
