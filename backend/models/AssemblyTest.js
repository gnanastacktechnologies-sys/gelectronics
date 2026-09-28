import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ['Pass', 'Fail'], default: 'Pass' },
  notes: { type: String, default: '' },
});

const assemblyTestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assemblyStage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssemblyStage',
      required: true,
    },
    stageNumber: {
      type: Number,
      required: true,
    },
    stageName: {
      type: String,
      required: true,
    },
    testDate: {
      type: Date,
      default: Date.now,
    },
    voltageCheck: {
      type: String,
      enum: ['Pass', 'Fail'],
      default: 'Pass',
    },
    shortCircuitCheck: {
      type: String,
      enum: ['Pass', 'Fail'],
      default: 'Pass',
    },
    functionalCheck: {
      type: String,
      enum: ['Pass', 'Fail'],
      default: 'Pass',
    },
    checklist: [checklistItemSchema],
    result: {
      type: String,
      enum: ['Pass', 'Fail'],
      default: 'Pass',
    },
    testedBy: {
      type: String,
      default: 'Quality Engineer',
    },
    defectNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const AssemblyTest = mongoose.model('AssemblyTest', assemblyTestSchema);
export default AssemblyTest;
