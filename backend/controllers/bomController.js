import ProjectBOMItem from '../models/ProjectBOMItem.js';
import Project from '../models/Project.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc    Get all BOM components for a project
// @route   GET /api/projects/:projectId/bom
// @access  Private
export const getBOMItems = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { search, procurementMode, purchaseStatus } = req.query;

    const filter = { project: projectId };

    if (search) {
      filter.$or = [
        { itemDescription: { $regex: search, $options: 'i' } },
        { modelNumber: { $regex: search, $options: 'i' } },
        { bomItemNumber: { $regex: search, $options: 'i' } },
        { buyerName: { $regex: search, $options: 'i' } },
      ];
    }

    if (procurementMode && procurementMode !== 'All') {
      filter.procurementMode = procurementMode;
    }

    if (purchaseStatus && purchaseStatus !== 'All') {
      filter.purchaseStatus = purchaseStatus;
    }

    const bomItems = await ProjectBOMItem.find(filter).sort({ bomItemNumber: 1 });
    res.json(bomItems);
  } catch (error) {
    next(error);
  }
};

// @desc    Add BOM component to a project
// @route   POST /api/projects/:projectId/bom
// @access  Private
export const addBOMItem = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    let {
      bomItemNumber,
      itemDescription,
      modelNumber,
      imageUrl,
      imageUrls,
      unit,
      quantity,
      actualPrice,
      buyerName,
      procurementMode,
      isAccessory,
    } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!itemDescription || !itemDescription.trim()) {
      return res.status(400).json({ message: 'Item Description is required' });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a number greater than 0' });
    }

    const actP = Number(actualPrice) >= 0 ? Number(actualPrice) : 0;

    // Auto generate BOM Item Number if not provided
    if (!bomItemNumber || !bomItemNumber.trim()) {
      const prefix = project.bomPrefix || 'BOM-';
      const startNum = project.bomStartNumber || 1;

      const existingItems = await ProjectBOMItem.find({ project: projectId }).select('bomItemNumber');
      let maxVal = startNum - 1;

      for (const item of existingItems) {
        const match = item.bomItemNumber?.match(/(\d+)$/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxVal) maxVal = val;
        }
      }

      const nextNum = maxVal + 1;
      const digitsCount = Math.max(3, String(startNum).length);
      bomItemNumber = `${prefix}${String(nextNum).padStart(digitsCount, '0')}`;
    } else {
      bomItemNumber = bomItemNumber.trim().toUpperCase();
      const duplicate = await ProjectBOMItem.findOne({ project: projectId, bomItemNumber });
      if (duplicate) {
        return res.status(400).json({ message: `BOM Item Number '${bomItemNumber}' already exists in this project` });
      }
    }

    const newItem = await ProjectBOMItem.create({
      project: projectId,
      bomItemNumber,
      itemDescription: itemDescription.trim(),
      modelNumber: modelNumber ? modelNumber.trim() : '',
      imageUrl: imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : imageUrl ? imageUrl.trim() : '',
      imageUrls: imageUrls && Array.isArray(imageUrls) ? imageUrls.filter(u => u && u.trim()) : imageUrl ? [imageUrl.trim()] : [],
      quantity: numQty,
      unit: unit ? unit.trim() : 'Pcs',
      actualPrice: actP,
      actualLineTotal: numQty * actP,
      buyerName: buyerName ? buyerName.trim() : '',
      procurementMode: procurementMode || 'Online',
      isAccessory: Boolean(isAccessory),
    });

    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

// @desc    Update BOM component
// @route   PUT /api/bom/:id
// @access  Private
export const updateBOMItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      bomItemNumber,
      itemDescription,
      modelNumber,
      imageUrl,
      imageUrls,
      unit,
      quantity,
      actualPrice,
      buyerName,
      procurementMode,
      isAccessory,
      purchaseStatus,
      stockStatus,
    } = req.body;

    const bomItem = await ProjectBOMItem.findById(id);
    if (!bomItem) {
      return res.status(404).json({ message: 'BOM component not found' });
    }

    if (bomItemNumber && bomItemNumber.trim().toUpperCase() !== bomItem.bomItemNumber) {
      const duplicate = await ProjectBOMItem.findOne({
        project: bomItem.project,
        bomItemNumber: bomItemNumber.trim().toUpperCase(),
        _id: { $ne: id },
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ message: `BOM Item Number '${bomItemNumber}' already exists in this project` });
      }
      bomItem.bomItemNumber = bomItemNumber.trim().toUpperCase();
    }

    if (itemDescription !== undefined) bomItem.itemDescription = itemDescription.trim();
    if (modelNumber !== undefined) bomItem.modelNumber = modelNumber.trim();
    if (unit !== undefined) bomItem.unit = unit.trim();
    if (imageUrls !== undefined && Array.isArray(imageUrls)) {
      const filtered = imageUrls.filter((u) => u && u.trim());
      bomItem.imageUrls = filtered;
      bomItem.imageUrl = filtered.length > 0 ? filtered[0] : '';
    } else if (imageUrl !== undefined) {
      bomItem.imageUrl = imageUrl.trim();
      if (imageUrl.trim()) {
        bomItem.imageUrls = [imageUrl.trim()];
      }
    }

    if (quantity !== undefined) {
      const numQty = Number(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
      }
      bomItem.quantity = numQty;
    }

    if (actualPrice !== undefined) {
      const actP = Number(actualPrice);
      if (isNaN(actP) || actP < 0) {
        return res.status(400).json({ message: 'Price cannot be negative' });
      }
      bomItem.actualPrice = actP;
    }

    if (buyerName !== undefined) bomItem.buyerName = buyerName.trim();
    if (procurementMode !== undefined) bomItem.procurementMode = procurementMode;
    if (isAccessory !== undefined) bomItem.isAccessory = Boolean(isAccessory);
    if (purchaseStatus !== undefined) bomItem.purchaseStatus = purchaseStatus;
    if (stockStatus !== undefined) bomItem.stockStatus = stockStatus;

    bomItem.actualLineTotal = bomItem.quantity * bomItem.actualPrice;

    const updated = await bomItem.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete BOM component
// @route   DELETE /api/bom/:id
// @access  Private
export const deleteBOMItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bomItem = await ProjectBOMItem.findById(id);
    if (!bomItem) {
      return res.status(404).json({ message: 'BOM component not found' });
    }

    // Safety check: Prevent deletion if BOM item is linked to a Purchase Order
    const linkedPO = await PurchaseOrder.findOne({ 'items.bomItem': id });
    if (linkedPO) {
      return res.status(400).json({
        message: `Cannot delete BOM component '${bomItem.bomItemNumber}' as it is referenced in Purchase Order ${linkedPO.purchaseNumber}. Delete or adjust the Purchase Order first.`,
      });
    }

    await bomItem.deleteOne();
    res.json({ message: 'BOM component deleted successfully' });
  } catch (error) {
    next(error);
  }
};
