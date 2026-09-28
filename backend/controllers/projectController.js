import Project from '../models/Project.js';
import ProjectBOMItem from '../models/ProjectBOMItem.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc    Get all projects with summary metrics
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [totalProjects, projects] = await Promise.all([
      Project.countDocuments(query),
      Project.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
    ]);

    // Batch load all BOM items and purchase orders for the page in 2 parallel queries
    const projectIds = projects.map((prj) => prj._id);

    const [allBomItems, allPurchaseOrders] = await Promise.all([
      ProjectBOMItem.find({ project: { $in: projectIds } }).lean(),
      PurchaseOrder.find({ project: { $in: projectIds } }).lean(),
    ]);

    // Fast in-memory lookup maps
    const bomMap = new Map();
    allBomItems.forEach((item) => {
      const pId = String(item.project);
      if (!bomMap.has(pId)) bomMap.set(pId, []);
      bomMap.get(pId).push(item);
    });

    const poMap = new Map();
    allPurchaseOrders.forEach((po) => {
      const pId = String(po.project);
      if (!poMap.has(pId)) poMap.set(pId, []);
      poMap.get(pId).push(po);
    });

    const enhancedProjects = projects.map((prj) => {
      const bomItems = bomMap.get(String(prj._id)) || [];
      const bomItemCount = bomItems.length;
      const actualTotal = bomItems.reduce((acc, item) => acc + (item.actualLineTotal || 0), 0);

      const purchaseOrders = poMap.get(String(prj._id)) || [];
      let purchaseStatus = 'Not Purchased';
      if (purchaseOrders.length > 0) {
        const allReceived = purchaseOrders.every((po) => po.purchaseStatus === 'Received');
        const anyReceived = purchaseOrders.some((po) => ['Received', 'Partially Received'].includes(po.purchaseStatus));
        if (allReceived) purchaseStatus = 'Received';
        else if (anyReceived) purchaseStatus = 'Partially Received';
        else purchaseStatus = 'Ordered';
      }

      return {
        ...prj,
        bomItemCount,
        actualTotal,
        purchaseStatus,
      };
    });

    res.json({
      projects: enhancedProjects,
      total: totalProjects,
      page: Number(page),
      pages: Math.ceil(totalProjects / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID with BOM components and calculated totals
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const bomItems = await ProjectBOMItem.find({ project: project._id }).sort({ bomItemNumber: 1 });

    const totalActual = bomItems.reduce((acc, item) => acc + (item.actualLineTotal || 0), 0);

    res.json({
      project,
      bomItems,
      totals: {
        totalActual,
        itemCount: bomItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res, next) => {
  try {
    const { name, code, description, status, moduleType, bomPrefix, bomStartNumber } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project Name is required' });
    }

    let projectCode = code ? code.trim().toUpperCase() : '';

    // Auto-generate project code if not provided
    if (!projectCode) {
      const count = await Project.countDocuments();
      projectCode = `PRJ-${String(count + 1).padStart(3, '0')}`;
    }

    const existingCode = await Project.findOne({ code: projectCode });
    if (existingCode) {
      return res.status(400).json({ message: `Project code '${projectCode}' is already in use` });
    }

    const project = await Project.create({
      name: name.trim(),
      code: projectCode,
      description: description || '',
      status: status || 'Draft',
      moduleType: moduleType || 'Prototype Module',
      bomPrefix: bomPrefix ? bomPrefix.trim().toUpperCase() : 'BOM-',
      bomStartNumber: Number(bomStartNumber) >= 1 ? Number(bomStartNumber) : 1,
      createdBy: req.user?._id,
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
  try {
    const { name, code, description, status, moduleType, bomPrefix, bomStartNumber } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (code && code.trim().toUpperCase() !== project.code) {
      const existing = await Project.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: `Project code '${code}' already exists` });
      }
      project.code = code.trim().toUpperCase();
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (status) project.status = status;
    if (moduleType) project.moduleType = moduleType;
    if (bomPrefix !== undefined) project.bomPrefix = bomPrefix.trim().toUpperCase();
    if (bomStartNumber !== undefined) {
      const sNum = Number(bomStartNumber);
      if (!isNaN(sNum) && sNum >= 1) {
        project.bomStartNumber = sNum;
      }
    }

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project has purchase orders
    const poCount = await PurchaseOrder.countDocuments({ project: project._id });
    if (poCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete project with existing Purchase Orders. Please cancel or remove linked purchase orders first.',
      });
    }

    // Delete associated BOM items
    await ProjectBOMItem.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ message: 'Project and associated BOM components removed successfully' });
  } catch (error) {
    next(error);
  }
};
