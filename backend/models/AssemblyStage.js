import mongoose from 'mongoose';

const assemblyStageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    stageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    stageName: {
      type: String,
      required: [true, 'Stage Name is required'],
      trim: true,
    },
    subStageName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    referenceImages: [
      {
        type: String,
        trim: true,
      },
    ],
    usedMaterials: [
      {
        itemType: { type: String, enum: ['Store', 'Accessory'], required: true },
        itemId: { type: mongoose.Schema.Types.ObjectId },
        itemDescription: { type: String, required: true },
        modelNumber: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        imageUrls: [{ type: String, default: '' }],
        quantityUsed: { type: Number, required: true },
        unit: { type: String, default: 'Pcs' },
        pickedAt: { type: Date, default: Date.now },
      },
    ],
    testingRequired: {
      type: Boolean,
      default: true,
    },
    isFinalStage: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Waiting for Testing', 'Stage Passed', 'Failed / Rework'],
      default: 'In Progress',
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

const AssemblyStage = mongoose.model('AssemblyStage', assemblyStageSchema);
export default AssemblyStage;
