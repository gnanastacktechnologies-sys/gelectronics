import AssemblyStage from '../models/AssemblyStage.js';
import AssemblyTest from '../models/AssemblyTest.js';
import Project from '../models/Project.js';

// @desc    Get all pending assembly stages waiting for testing and past test records
// @route   GET /api/testing/pending
// @access  Private
export const getPendingTests = async (req, res, next) => {
  try {
    const pendingStages = await AssemblyStage.find({ status: 'Waiting for Testing' })
      .populate('project', 'name pcbName client moduleType status')
      .sort({ updatedAt: -1 });

    const recentTests = await AssemblyTest.find()
      .populate('project', 'name pcbName client moduleType')
      .populate('assemblyStage', 'stageNumber stageName subStageName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ pendingStages, recentTests });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Test Result for an Assembly Stage
// @route   POST /api/testing/submit
// @access  Private
export const submitTestResult = async (req, res, next) => {
  try {
    const {
      stageId,
      voltageCheck = 'Pass',
      shortCircuitCheck = 'Pass',
      functionalCheck = 'Pass',
      checklist = [],
      testedBy = 'Quality Inspector',
      defectNotes = '',
    } = req.body;

    const stage = await AssemblyStage.findById(stageId).populate('project');
    if (!stage) {
      return res.status(404).json({ message: 'Assembly Stage not found' });
    }

    // Determine if all standard and custom checklist items passed
    const standardPass = voltageCheck === 'Pass' && shortCircuitCheck === 'Pass' && functionalCheck === 'Pass';
    const customChecklistPass = Array.isArray(checklist)
      ? checklist.every((item) => item.status === 'Pass')
      : true;

    const overallResult = standardPass && customChecklistPass ? 'Pass' : 'Fail';

    // Sanitize checklist array for database storage
    const cleanChecklist = Array.isArray(checklist)
      ? checklist.map((item) => ({
          title: item.title ? item.title.trim() : 'Custom Test Check',
          status: item.status === 'Fail' ? 'Fail' : 'Pass',
          notes: item.notes ? item.notes.trim() : '',
        }))
      : [];

    // Create Test Record
    const testRecord = await AssemblyTest.create({
      project: stage.project._id,
      assemblyStage: stage._id,
      stageNumber: stage.stageNumber,
      stageName: stage.stageName,
      voltageCheck,
      shortCircuitCheck,
      functionalCheck,
      checklist: cleanChecklist,
      result: overallResult,
      testedBy: testedBy || 'Quality Inspector',
      defectNotes: defectNotes || '',
    });

    if (overallResult === 'Pass') {
      stage.status = 'Stage Passed';
      await stage.save();

      let isProjectCompleted = false;
      if (stage.isFinalStage) {
        await Project.findByIdAndUpdate(stage.project._id || stage.project, { status: 'Completed' });
        isProjectCompleted = true;
      }

      return res.json({
        message: isProjectCompleted
          ? `Final Testing PASSED for Stage ${stage.stageNumber} (${stage.stageName})! The project is now COMPLETELY FINISHED and marked as Completed 🎉.`
          : `Testing PASSED for Stage ${stage.stageNumber} (${stage.stageName})! Stage marked as Stage Passed. You can manually create the next stage when ready.`,
        testRecord,
        stage,
        isProjectCompleted,
      });
    } else {
      stage.status = 'Failed / Rework';
      await stage.save();

      return res.json({
        message: `Testing FAILED for Stage ${stage.stageNumber}. Stage status updated to 'Failed / Rework'.`,
        testRecord,
        stage,
      });
    }
  } catch (error) {
    next(error);
  }
};
