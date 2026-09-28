import AssemblyStage from '../models/AssemblyStage.js';
import StockItem from '../models/StockItem.js';
import Accessory from '../models/Accessory.js';
import Project from '../models/Project.js';

// @desc    Get assembly stages for a project
// @route   GET /api/assembly/project/:projectId
// @access  Private
export const getProjectAssemblyStages = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const stages = await AssemblyStage.find({ project: projectId }).sort({ stageNumber: 1 });

    res.json({ project, stages });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new assembly stage/sub-stage
// @route   POST /api/assembly/stage
// @access  Private
export const createAssemblyStage = async (req, res, next) => {
  try {
    const { projectId, stageName, subStageName, description, testingRequired, isFinalStage, referenceImages, remarks } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!stageName || !stageName.trim()) {
      return res.status(400).json({ message: 'Stage Name is required' });
    }

    const count = await AssemblyStage.countDocuments({ project: projectId });
    const stageNumber = count + 1;

    const imgs = Array.isArray(referenceImages)
      ? referenceImages.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : [];

    const stage = await AssemblyStage.create({
      project: projectId,
      stageNumber,
      stageName: stageName.trim(),
      subStageName: subStageName ? subStageName.trim() : '',
      description: description ? description.trim() : '',
      referenceImages: imgs,
      testingRequired: testingRequired !== undefined ? Boolean(testingRequired) : true,
      isFinalStage: Boolean(isFinalStage),
      status: 'In Progress',
      remarks: remarks ? remarks.trim() : '',
    });

    res.status(201).json(stage);
  } catch (error) {
    next(error);
  }
};

// @desc    Update assembly stage details
// @route   PUT /api/assembly/stage/:id
// @access  Private
export const updateAssemblyStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stageName, subStageName, description, testingRequired, isFinalStage, referenceImages, status, remarks } = req.body;

    const stage = await AssemblyStage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Assembly Stage not found' });
    }

    if (stageName !== undefined) stage.stageName = stageName.trim();
    if (subStageName !== undefined) stage.subStageName = subStageName.trim();
    if (description !== undefined) stage.description = description.trim();
    if (testingRequired !== undefined) stage.testingRequired = Boolean(testingRequired);
    if (isFinalStage !== undefined) stage.isFinalStage = Boolean(isFinalStage);
    if (status !== undefined) stage.status = status;
    if (remarks !== undefined) stage.remarks = remarks.trim();

    if (referenceImages !== undefined && Array.isArray(referenceImages)) {
      stage.referenceImages = referenceImages.filter((u) => typeof u === 'string' && u.trim().length > 0);
    }

    const updated = await stage.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Pick / Use material from Store or Accessories for an Assembly Stage
// @route   POST /api/assembly/stage/:id/pick
// @access  Private
export const pickMaterialForStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemType, itemId, quantity, usedBy } = req.body;

    const stage = await AssemblyStage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Assembly stage not found' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity used must be greater than 0' });
    }

    let itemDescription = '';
    let modelNumber = '';
    let unit = 'Pcs';
    let imageUrl = '';
    let imageUrls = [];

    if (itemType === 'Store') {
      const stockItem = await StockItem.findById(itemId);
      if (!stockItem) {
        return res.status(404).json({ message: 'Store stock item not found' });
      }
      if (qty > stockItem.usableQuantity) {
        return res.status(400).json({
          message: `Cannot pick ${qty} units. Only ${stockItem.usableQuantity} available in Store.`,
        });
      }

      stockItem.usableQuantity -= qty;
      stockItem.usedQuantity += qty;
      stockItem.usageLogs.push({
        quantity: qty,
        usedFor: `${stage.stageName} (${stage.subStageName || 'Assembly'})`,
        usedBy: usedBy || 'Technician',
        date: new Date(),
      });
      await stockItem.save();

      itemDescription = stockItem.itemDescription;
      modelNumber = stockItem.modelNumber || '';
      unit = stockItem.unit || 'Pcs';
      imageUrl = stockItem.imageUrl || (stockItem.imageUrls && stockItem.imageUrls[0]) || '';
      imageUrls = stockItem.imageUrls || (imageUrl ? [imageUrl] : []);
    } else if (itemType === 'Accessory') {
      const accessory = await Accessory.findById(itemId);
      if (!accessory) {
        return res.status(404).json({ message: 'Accessory item not found' });
      }
      if (qty > accessory.availableQuantity) {
        return res.status(400).json({
          message: `Cannot pick ${qty} units. Only ${accessory.availableQuantity} available in Accessories.`,
        });
      }

      accessory.availableQuantity -= qty;
      accessory.usedQuantity = (accessory.usedQuantity || 0) + qty;
      accessory.usageLogs.push({
        quantity: qty,
        usedFor: `${stage.stageName} (${stage.subStageName || 'Assembly'})`,
        usedBy: usedBy || 'Technician',
        date: new Date(),
      });
      await accessory.save();

      itemDescription = accessory.name;
      modelNumber = accessory.modelPartNumber || '';
      unit = accessory.unit || 'Pcs';
      imageUrl = accessory.imageUrl || (accessory.imageUrls && accessory.imageUrls[0]) || '';
      imageUrls = accessory.imageUrls || (imageUrl ? [imageUrl] : []);
    } else {
      return res.status(400).json({ message: 'Invalid material type. Must be Store or Accessory.' });
    }

    stage.usedMaterials.push({
      itemType,
      itemId,
      itemDescription,
      modelNumber,
      imageUrl,
      imageUrls,
      quantityUsed: qty,
      unit,
      pickedAt: new Date(),
    });

    await stage.save();
    res.json({ message: `Successfully picked ${qty} ${unit} of '${itemDescription}' for ${stage.stageName}`, stage });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Assembly Stage (Triggers Testing if required or Marks Stage Passed)
// @route   POST /api/assembly/stage/:id/complete
// @access  Private
export const completeStageAssembly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stage = await AssemblyStage.findById(id);

    if (!stage) {
      return res.status(404).json({ message: 'Assembly stage not found' });
    }

    if (stage.testingRequired) {
      stage.status = 'Waiting for Testing';
      await stage.save();
      return res.json({
        message: `Stage ${stage.stageNumber} (${stage.stageName}) completed! Sent to Testing queue for Quality & Functional Verification.`,
        stage,
        nextAction: 'Sent to Testing',
      });
    } else {
      stage.status = 'Stage Passed';
      await stage.save();

      if (stage.isFinalStage) {
        await Project.findByIdAndUpdate(stage.project, { status: 'Completed' });
      }

      return res.json({
        message: stage.isFinalStage
          ? `Final Stage Passed! Project status is now completely COMPLETED 🎉.`
          : `Stage ${stage.stageNumber} (${stage.stageName}) marked as Stage Passed! You can manually create the next stage when ready.`,
        stage,
        nextAction: 'Stage Passed',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Assembly Stage
// @route   DELETE /api/assembly/stage/:id
// @access  Private
export const deleteAssemblyStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stage = await AssemblyStage.findById(id);

    if (!stage) {
      return res.status(404).json({ message: 'Assembly stage not found' });
    }

    await stage.deleteOne();
    res.json({ message: `Stage ${stage.stageNumber} removed successfully` });
  } catch (error) {
    next(error);
  }
};
