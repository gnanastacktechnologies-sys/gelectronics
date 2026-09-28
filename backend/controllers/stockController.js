import StockItem from '../models/StockItem.js';
import ReplacementReturn from '../models/ReplacementReturn.js';
import ProjectBOMItem from '../models/ProjectBOMItem.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// @desc    Get all stock items
// @route   GET /api/stock
// @access  Private
export const getStockItems = async (req, res, next) => {
  try {
    const { search, project, status, tab = 'available', page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { itemDescription: { $regex: search, $options: 'i' } },
        { modelNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (project && project !== 'All') filter.project = project;

    // Sub-tab filtering
    if (tab === 'available') {
      filter.usableQuantity = { $gt: 0 };
    } else if (tab === 'used') {
      filter.usedQuantity = { $gt: 0 };
    } else if (tab === 'low_stock') {
      filter.$expr = { $lte: ['$usableQuantity', '$lowStockThreshold'] };
    } else if (status && status !== 'All') {
      filter.stockStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, stockItems, availableCount, usedCount, lowStockCount] = await Promise.all([
      StockItem.countDocuments(filter),
      StockItem.find(filter)
        .populate('project', 'name code')
        .populate('purchaseOrder', 'purchaseNumber buyerName procurementMode purchaseDate')
        .populate('bomItem', 'bomItemNumber approximatePrice actualPrice')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StockItem.countDocuments({ usableQuantity: { $gt: 0 } }),
      StockItem.countDocuments({ usedQuantity: { $gt: 0 } }),
      StockItem.countDocuments({
        $expr: { $lte: ['$usableQuantity', '$lowStockThreshold'] },
      }),
    ]);

    res.json({
      stockItems,
      total,
      availableCount,
      usedCount,
      lowStockCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single stock item detail with replacement/return history
// @route   GET /api/stock/:id
// @access  Private
export const getStockItemById = async (req, res, next) => {
  try {
    const stockItem = await StockItem.findById(req.params.id)
      .populate('project', 'name code')
      .populate('purchaseOrder')
      .populate('bomItem');

    if (!stockItem) {
      return res.status(404).json({ message: 'Stock Item not found' });
    }

    const replacementReturns = await ReplacementReturn.find({ stockItem: stockItem._id }).sort({ createdAt: -1 });

    res.json({ stockItem, replacementReturns });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive Stock physically
// @route   POST /api/stock/:id/receive
// @access  Private
export const receiveStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newlyReceived, usableQuantity, damagedQuantity, remarks } = req.body;

    const stockItem = await StockItem.findById(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const nReceived = Number(newlyReceived) || 0;
    const nUsable = Number(usableQuantity) || 0;
    const nDamaged = Number(damagedQuantity) || 0;

    if (nReceived <= 0) {
      return res.status(400).json({ message: 'Received quantity must be greater than 0' });
    }

    if (nUsable < 0 || nDamaged < 0) {
      return res.status(400).json({ message: 'Usable and damaged quantities cannot be negative' });
    }

    if (nUsable + nDamaged > nReceived) {
      return res.status(400).json({
        message: `Sum of Usable (${nUsable}) and Damaged (${nDamaged}) cannot exceed Newly Received Quantity (${nReceived})`,
      });
    }

    const totalNewReceived = stockItem.receivedQuantity + nReceived;
    if (totalNewReceived > stockItem.orderedQuantity) {
      return res.status(400).json({
        message: `Cannot receive more than ordered. Ordered: ${stockItem.orderedQuantity}, Previously Received: ${stockItem.receivedQuantity}, Attempting to add: ${nReceived}`,
      });
    }

    stockItem.receivedQuantity = totalNewReceived;
    stockItem.usableQuantity += nUsable;
    stockItem.damagedQuantity += nDamaged;

    // Determine status
    if (stockItem.damagedQuantity > 0 && stockItem.usableQuantity === 0) {
      stockItem.stockStatus = 'Damaged';
    } else if (stockItem.receivedQuantity >= stockItem.orderedQuantity) {
      if (stockItem.damagedQuantity > 0) stockItem.stockStatus = 'Damaged';
      else stockItem.stockStatus = 'Received';
    } else {
      stockItem.stockStatus = 'Partially Received';
    }

    await stockItem.save();

    // Update parent BOM Item status
    const bomItem = await ProjectBOMItem.findById(stockItem.bomItem);
    if (bomItem) {
      if (stockItem.receivedQuantity >= stockItem.orderedQuantity) {
        bomItem.purchaseStatus = 'Received';
        bomItem.stockStatus = stockItem.damagedQuantity > 0 ? 'Damaged' : 'Available';
      } else {
        bomItem.purchaseStatus = 'Partially Received';
        bomItem.stockStatus = 'Partially Received';
      }
      await bomItem.save();
    }

    // Update Parent Purchase Order status if all items received
    const allPOItems = await StockItem.find({ purchaseOrder: stockItem.purchaseOrder });
    const allReceived = allPOItems.every((item) => item.receivedQuantity >= item.orderedQuantity);
    const anyReceived = allPOItems.some((item) => item.receivedQuantity > 0);

    const po = await PurchaseOrder.findById(stockItem.purchaseOrder);
    if (po) {
      if (allReceived) po.purchaseStatus = 'Received';
      else if (anyReceived) po.purchaseStatus = 'Partially Received';
      await po.save();
    }

    res.json({ message: 'Stock received and classified successfully', stockItem });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate Replacement for Damaged Stock
// @route   POST /api/stock/:id/replace
// @access  Private
export const initiateReplacement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, reason, remarks } = req.body;

    const stockItem = await StockItem.findById(id).populate('purchaseOrder');
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Replacement quantity must be greater than 0' });
    }

    if (qty > stockItem.damagedQuantity) {
      return res.status(400).json({
        message: `Replacement quantity (${qty}) cannot exceed existing damaged quantity (${stockItem.damagedQuantity})`,
      });
    }

    const replacementRecord = await ReplacementReturn.create({
      type: 'Replace',
      stockItem: stockItem._id,
      project: stockItem.project,
      bomItem: stockItem.bomItem,
      purchaseOrder: stockItem.purchaseOrder?._id,
      quantity: qty,
      reason: reason || 'Item damaged upon receipt',
      buyerName: stockItem.purchaseOrder?.buyerName || '',
      status: 'Replacement Ordered',
      actionDate: new Date(),
      remarks: remarks || '',
    });

    stockItem.stockStatus = 'Replacement Pending';
    await stockItem.save();

    await ProjectBOMItem.findByIdAndUpdate(stockItem.bomItem, { stockStatus: 'Replacement Pending' });

    res.status(201).json({ message: 'Replacement order initiated successfully', replacementRecord });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive Replacement Stock
// @route   POST /api/stock/replacement/:replacementId/receive
// @access  Private
export const receiveReplacement = async (req, res, next) => {
  try {
    const { replacementId } = req.params;
    const { receivedQuantity, remarks } = req.body;

    const record = await ReplacementReturn.findById(replacementId);
    if (!record || record.type !== 'Replace') {
      return res.status(404).json({ message: 'Replacement record not found' });
    }

    const stockItem = await StockItem.findById(record.stockItem);
    if (!stockItem) {
      return res.status(404).json({ message: 'Linked stock item not found' });
    }

    const recQty = Number(receivedQuantity) || record.quantity;

    record.status = 'Replacement Received';
    record.resolutionDate = new Date();
    if (remarks) record.remarks = remarks;
    await record.save();

    // Update Stock Item: convert damaged -> usable via replacement
    stockItem.damagedQuantity = Math.max(0, stockItem.damagedQuantity - recQty);
    stockItem.replacementQuantity += recQty;
    stockItem.usableQuantity += recQty;

    if (stockItem.damagedQuantity === 0) {
      stockItem.stockStatus = 'Available';
    }
    await stockItem.save();

    await ProjectBOMItem.findByIdAndUpdate(stockItem.bomItem, { stockStatus: 'Available' });

    res.json({ message: 'Replacement stock received into usable inventory', stockItem, record });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate Return for Damaged Stock
// @route   POST /api/stock/:id/return
// @access  Private
export const initiateReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, reason, remarks } = req.body;

    const stockItem = await StockItem.findById(id).populate('purchaseOrder');
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Return quantity must be greater than 0' });
    }

    if (qty > stockItem.damagedQuantity) {
      return res.status(400).json({
        message: `Return quantity (${qty}) cannot exceed damaged quantity (${stockItem.damagedQuantity})`,
      });
    }

    const returnRecord = await ReplacementReturn.create({
      type: 'Return',
      stockItem: stockItem._id,
      project: stockItem.project,
      bomItem: stockItem.bomItem,
      purchaseOrder: stockItem.purchaseOrder?._id,
      quantity: qty,
      reason: reason || 'Damaged / Defective - Returned for refund',
      buyerName: stockItem.purchaseOrder?.buyerName || '',
      status: 'Returned',
      actionDate: new Date(),
      resolutionDate: new Date(),
      remarks: remarks || '',
    });

    stockItem.damagedQuantity -= qty;
    stockItem.returnedQuantity += qty;
    stockItem.stockStatus = 'Return Pending';
    await stockItem.save();

    await ProjectBOMItem.findByIdAndUpdate(stockItem.bomItem, { stockStatus: 'Return Pending' });

    res.status(201).json({ message: 'Return initiated successfully', returnRecord });
  } catch (error) {
    next(error);
  }
};

// @desc    Use/Consume Stock for Assembly
// @route   POST /api/stock/:id/use
// @access  Private
export const useStockForAssembly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, usedFor, usedBy } = req.body;

    const stockItem = await StockItem.findById(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity used must be greater than 0' });
    }

    if (qty > stockItem.usableQuantity) {
      return res.status(400).json({
        message: `Cannot use ${qty} units. Only ${stockItem.usableQuantity} available in store stock.`,
      });
    }

    stockItem.usableQuantity -= qty;
    stockItem.usedQuantity += qty;
    stockItem.usageLogs.push({
      quantity: qty,
      usedFor: usedFor ? usedFor.trim() : 'PCB Assembly',
      usedBy: usedBy ? usedBy.trim() : 'Admin',
      date: new Date(),
    });

    if (stockItem.usableQuantity === 0) {
      stockItem.stockStatus = 'Fully Used';
    }

    await stockItem.save();

    if (stockItem.usableQuantity === 0) {
      await ProjectBOMItem.findByIdAndUpdate(stockItem.bomItem, { stockStatus: 'Fully Used' });
    }

    res.json({ message: `Successfully issued ${qty} ${stockItem.unit || 'Pcs'} for assembly.`, stockItem });
  } catch (error) {
    next(error);
  }
};
