import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ProjectBOMItem from '../models/ProjectBOMItem.js';
import StockItem from '../models/StockItem.js';
import Project from '../models/Project.js';
import ReplacementReturn from '../models/ReplacementReturn.js';
import Accessory from '../models/Accessory.js';
import SystemSetting from '../models/SystemSetting.js';

// @desc    Get all purchase orders
// @route   GET /api/purchases
// @access  Private
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const { search, project, buyer, status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
        { buyerName: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }
    if (project && project !== 'All') filter.project = project;
    if (buyer && buyer !== 'All') filter.buyerName = buyer;
    if (status && status !== 'All') {
      if (status === 'Arriving') {
        filter.purchaseStatus = { $in: ['Ordered', 'Pending', 'Partially Received'] };
      } else if (status === 'Returned') {
        filter.purchaseStatus = { $in: ['Returned', 'Cancelled', 'Damaged'] };
      } else {
        filter.purchaseStatus = status;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, purchases, arrivingCount, returnedCount] = await Promise.all([
      PurchaseOrder.countDocuments(filter),
      PurchaseOrder.find(filter)
        .populate('project', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      PurchaseOrder.countDocuments({
        purchaseStatus: { $in: ['Ordered', 'Pending', 'Partially Received'] },
      }),
      PurchaseOrder.countDocuments({
        purchaseStatus: { $in: ['Returned', 'Cancelled', 'Damaged'] },
      }),
    ]);

    res.json({
      purchases,
      total,
      arrivingCount,
      returnedCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase order
// @route   GET /api/purchases/:id
// @access  Private
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    if (req.params.id === 'notifications') {
      return getPurchaseNotifications(req, res, next);
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Purchase Order ID' });
    }

    const purchase = await PurchaseOrder.findById(req.params.id).populate('project', 'name code description');
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    const stockItems = await StockItem.find({ purchaseOrder: purchase._id });

    res.json({ purchase, stockItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Purchase Order
// @route   POST /api/purchases
// @desc    Create a new Purchase Order
// @route   POST /api/purchases
// @access  Private
export const createPurchaseOrder = async (req, res, next) => {
  try {
    let {
      purchaseNumber,
      projectId,
      buyerName,
      procurementMode,
      expectedDeliveryDate,
      items, // array of { bomItemId, orderedQuantity, actualPrice }
      remarks,
    } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!buyerName || !buyerName.trim()) {
      return res.status(400).json({ message: 'Buyer name is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Purchase Order must include at least one BOM item' });
    }

    // Purchase Number handling
    if (!purchaseNumber || !purchaseNumber.trim()) {
      const count = await PurchaseOrder.countDocuments();
      purchaseNumber = `PO-${String(count + 1).padStart(4, '0')}`;
    } else {
      purchaseNumber = purchaseNumber.trim().toUpperCase();
      const existingPO = await PurchaseOrder.findOne({ purchaseNumber });
      if (existingPO) {
        return res.status(400).json({ message: `Purchase Number '${purchaseNumber}' already exists` });
      }
    }

    let totalAmount = 0;
    const poItems = [];
    const createdStockItems = [];

    for (const item of items) {
      const bomItem = await ProjectBOMItem.findById(item.bomItemId);
      if (!bomItem) {
        return res.status(404).json({ message: `BOM Component with ID ${item.bomItemId} not found` });
      }

      const orderedQty = Number(item.orderedQuantity) || bomItem.quantity;
      const actualP = Number(item.actualPrice) !== undefined && Number(item.actualPrice) >= 0
        ? Number(item.actualPrice)
        : bomItem.actualPrice;

      const itemTotal = orderedQty * actualP;
      totalAmount += itemTotal;

      // Update BOM item actual price and line total if updated during PO creation
      bomItem.actualPrice = actualP;
      bomItem.actualLineTotal = orderedQty * actualP;
      bomItem.buyerName = buyerName.trim();
      bomItem.procurementMode = procurementMode || bomItem.procurementMode;
      bomItem.purchaseStatus = 'Ordered';
      bomItem.stockStatus = 'Pending Receipt';
      await bomItem.save();

      const itemDelDate = item.expectedDeliveryDate
        ? new Date(item.expectedDeliveryDate)
        : expectedDeliveryDate
        ? new Date(expectedDeliveryDate)
        : undefined;

      poItems.push({
        bomItem: bomItem._id,
        bomItemNumber: bomItem.bomItemNumber,
        itemDescription: bomItem.itemDescription,
        modelNumber: bomItem.modelNumber || '',
        imageUrl: bomItem.imageUrl || '',
        imageUrls: bomItem.imageUrls || (bomItem.imageUrl ? [bomItem.imageUrl] : []),
        orderedQuantity: orderedQty,
        unit: bomItem.unit || 'Pcs',
        actualPrice: actualP,
        totalPrice: itemTotal,
        expectedDeliveryDate: itemDelDate,
      });
    }

    const purchaseOrder = await PurchaseOrder.create({
      purchaseNumber,
      project: projectId,
      buyerName: buyerName.trim(),
      procurementMode: procurementMode || 'Online',
      purchaseDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      items: poItems,
      totalAmount,
      purchaseStatus: 'Ordered',
      remarks: remarks ? remarks.trim() : '',
      createdBy: req.user?._id,
    });

    // Create StockItems for physical receiving flow
    for (const poItem of poItems) {
      const stockItem = await StockItem.create({
        project: projectId,
        purchaseOrder: purchaseOrder._id,
        bomItem: poItem.bomItem,
        itemDescription: poItem.itemDescription,
        modelNumber: poItem.modelNumber,
        imageUrl: poItem.imageUrl,
        imageUrls: poItem.imageUrls || (poItem.imageUrl ? [poItem.imageUrl] : []),
        orderedQuantity: poItem.orderedQuantity,
        unit: poItem.unit || 'Pcs',
        expectedDeliveryDate: poItem.expectedDeliveryDate,
        receivedQuantity: 0,
        usableQuantity: 0,
        damagedQuantity: 0,
        returnedQuantity: 0,
        replacementQuantity: 0,
        stockStatus: 'Pending Receipt',
      });
      createdStockItems.push(stockItem);
    }

    res.status(201).json({ purchaseOrder, stockItems: createdStockItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase order status/remarks/delivery date
// @route   PUT /api/purchases/:id
// @access  Private
export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const { purchaseStatus, remarks, expectedDeliveryDate, buyerName, procurementMode } = req.body;

    const purchase = await PurchaseOrder.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseStatus) {
      purchase.purchaseStatus = purchaseStatus;
      // Cascade status update to linked BOM items
      for (const item of purchase.items) {
        await ProjectBOMItem.findByIdAndUpdate(item.bomItem, { purchaseStatus });
      }
    }
    if (remarks !== undefined) purchase.remarks = remarks.trim();
    if (expectedDeliveryDate !== undefined) {
      purchase.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }
    if (buyerName) purchase.buyerName = buyerName.trim();
    if (procurementMode) purchase.procurementMode = procurementMode;

    const updated = await purchase.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase order notifications & delivery alerts
// @route   GET /api/purchases/notifications
// @access  Private
export const getPurchaseNotifications = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allPOs = await PurchaseOrder.find()
      .populate('project', 'name code')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const notifications = [];

    for (const po of allPOs) {
      const projName = po.project?.name || 'Project';
      const poNum = po.purchaseNumber;

      // Status notifications: Received / Cancelled / Partially Received
      if (po.purchaseStatus === 'Received') {
        notifications.push({
          id: `rec-${po._id}`,
          poId: po._id,
          title: `Parts Received: ${poNum}`,
          message: `All component items for ${poNum} (${projName}) have been physically received!`,
          type: 'success',
          status: 'Received',
          date: po.updatedAt,
        });
      } else if (po.purchaseStatus === 'Partially Received') {
        notifications.push({
          id: `part-${po._id}`,
          poId: po._id,
          title: `Partially Received: ${poNum}`,
          message: `Some component parts for ${poNum} (${projName}) were received into stock.`,
          type: 'info',
          status: 'Partially Received',
          date: po.updatedAt,
        });
      } else if (po.purchaseStatus === 'Cancelled') {
        notifications.push({
          id: `can-${po._id}`,
          poId: po._id,
          title: `Order Cancelled: ${poNum}`,
          message: `Purchase order ${poNum} (${projName}) was marked as CANCELLED.`,
          type: 'error',
          status: 'Cancelled',
          date: po.updatedAt,
        });
      }

      // Delivery date notifications (Due Today or Overdue)
      if (po.expectedDeliveryDate && po.purchaseStatus !== 'Received' && po.purchaseStatus !== 'Cancelled') {
        const delDate = new Date(po.expectedDeliveryDate);
        const delDateMidnight = new Date(delDate);
        delDateMidnight.setHours(0, 0, 0, 0);

        if (delDateMidnight < today) {
          notifications.push({
            id: `overdue-${po._id}`,
            poId: po._id,
            title: `OVERDUE Delivery: ${poNum}`,
            message: `Delivery for ${poNum} (${projName}) was expected on ${delDate.toLocaleDateString('en-IN')}. Status: ${po.purchaseStatus}`,
            type: 'warning',
            status: po.purchaseStatus,
            date: po.expectedDeliveryDate,
            isOverdue: true,
          });
        } else if (delDateMidnight.getTime() === today.getTime()) {
          notifications.push({
            id: `due-${po._id}`,
            poId: po._id,
            title: `Delivery Due Today: ${poNum}`,
            message: `Purchase order ${poNum} (${projName}) is scheduled for delivery TODAY!`,
            type: 'info',
            status: po.purchaseStatus,
            date: po.expectedDeliveryDate,
            isDueToday: true,
          });
        }
      }
    }

    // Check SystemSetting for Low Stock Alert preference
    let setting = await SystemSetting.findOne({ key: 'global_settings' });
    const isLowStockAlertEnabled = setting ? setting.enableLowStockAlert !== false : true;
    const lowStockThreshold = setting?.lowStockThreshold || 5;

    if (isLowStockAlertEnabled) {
      // Fetch low stock items from Store Stock
      const lowStockItems = await StockItem.find({
        usableQuantity: { $lte: lowStockThreshold, $gt: 0 },
      }).populate('project', 'name code');

      for (const st of lowStockItems) {
        notifications.push({
          id: `lowstock-${st._id}`,
          title: `Low Stock Alert: ${st.itemDescription}`,
          message: `Usable quantity for ${st.itemDescription} (${st.project?.name || 'Store'}) is low (${st.usableQuantity} ${st.unit || 'Pcs'} left, threshold: ${lowStockThreshold}).`,
          type: 'warning',
          date: st.updatedAt,
        });
      }

      // Fetch low stock accessories
      const lowAccItems = await Accessory.find({
        availableQuantity: { $lte: lowStockThreshold },
      });

      for (const acc of lowAccItems) {
        notifications.push({
          id: `lowacc-${acc._id}`,
          title: `Low Accessory Stock: ${acc.name}`,
          message: `Accessory ${acc.name} is running low (${acc.availableQuantity} ${acc.unit || 'Pcs'} remaining).`,
          type: 'warning',
          date: acc.updatedAt,
        });
      }
    }

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete purchase order
// @route   DELETE /api/purchases/:id
// @access  Private
export const deletePurchaseOrder = async (req, res, next) => {
  try {
    const purchase = await PurchaseOrder.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Check if any items have been physically received in stock
    const stockItems = await StockItem.find({ purchaseOrder: purchase._id });
    const receivedAny = stockItems.some((si) => si.receivedQuantity > 0);

    if (receivedAny) {
      return res.status(400).json({
        message: 'Cannot delete Purchase Order because parts have already been physically received into Stock.',
      });
    }

    // Revert BOM items purchase and stock status
    for (const item of purchase.items) {
      await ProjectBOMItem.findByIdAndUpdate(item.bomItem, {
        purchaseStatus: 'Not Purchased',
        stockStatus: 'Not Purchased',
      });
    }

    await StockItem.deleteMany({ purchaseOrder: purchase._id });
    await purchase.deleteOne();

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive Part with Quality & Damage Inspection
// @route   POST /api/purchases/:id/receive
// @access  Private
export const inspectAndReceivePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      partMatch, // 'Pass' or 'Fail'
      modelMatch, // 'Pass' or 'Fail'
      physicalDamage, // 'No Damage' or 'Damaged'
      receivedQuantity,
      remarks,
      returnReason,
    } = req.body;

    const purchase = await PurchaseOrder.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    const isAllPass = partMatch === 'Pass' && modelMatch === 'Pass' && physicalDamage === 'No Damage';
    const stockItems = await StockItem.find({ purchaseOrder: purchase._id });

    if (isAllPass) {
      // Inspection Passed -> Receive into Store & Stock
      purchase.purchaseStatus = 'Received';
      await purchase.save();

      for (const poItem of purchase.items) {
        const qty = Number(receivedQuantity) || poItem.orderedQuantity;

        // Update StockItem
        let stockItem = stockItems.find((s) => String(s.bomItem) === String(poItem.bomItem));
        if (stockItem) {
          stockItem.receivedQuantity = qty;
          stockItem.usableQuantity = qty;
          stockItem.damagedQuantity = 0;
          stockItem.stockStatus = 'Received';
          await stockItem.save();
        }

        // Update ProjectBOMItem
        const bomItem = await ProjectBOMItem.findByIdAndUpdate(
          poItem.bomItem,
          {
            purchaseStatus: 'Received',
            stockStatus: 'Available',
          },
          { new: true }
        );

        // If component is marked as an Accessory -> Add to Accessories Store
        if (bomItem && bomItem.isAccessory) {
          let existingAcc = await Accessory.findOne({
            name: { $regex: `^${bomItem.itemDescription.trim()}$`, $options: 'i' },
          });

          if (existingAcc) {
            existingAcc.availableQuantity += qty;
            existingAcc.purchasePrice = bomItem.actualPrice || existingAcc.purchasePrice;
            await existingAcc.save();
          } else {
            await Accessory.create({
              name: bomItem.itemDescription.trim(),
              category: 'BOM Accessory',
              modelPartNumber: bomItem.modelNumber || '',
              imageUrl: bomItem.imageUrl || '',
              imageUrls: bomItem.imageUrls || [],
              availableQuantity: qty,
              unit: bomItem.unit || 'Pcs',
              purchasePrice: bomItem.actualPrice || 0,
              supplier: purchase.buyerName || '',
              remarks: `Received from PO ${purchase.purchaseNumber} after Quality Inspection`,
            });
          }
        }
      }

      return res.json({
        message: 'Inspection Passed! Component received into Store and Accessories updated.',
        purchase,
        status: 'Received',
      });
    } else {
      // Inspection Failed or Physical Damage reported -> Send for Return
      purchase.purchaseStatus = 'Returned';
      if (remarks || returnReason) {
        purchase.remarks = `${remarks || ''} [Returned: ${returnReason || 'Failed quality inspection'}]`.trim();
      }
      await purchase.save();

      for (const poItem of purchase.items) {
        const qty = Number(receivedQuantity) || poItem.orderedQuantity;

        let stockItem = stockItems.find((s) => String(s.bomItem) === String(poItem.bomItem));
        if (stockItem) {
          stockItem.receivedQuantity = qty;
          stockItem.damagedQuantity = qty;
          stockItem.returnedQuantity = qty;
          stockItem.usableQuantity = 0;
          stockItem.stockStatus = 'Return Pending';
          await stockItem.save();

          // Log Return record in ReplacementReturn
          await ReplacementReturn.create({
            type: 'Return',
            stockItem: stockItem._id,
            project: purchase.project,
            bomItem: poItem.bomItem,
            purchaseOrder: purchase._id,
            quantity: qty,
            reason: returnReason || `Failed inspection: Part Spec (${partMatch}), Model (${modelMatch}), Damage (${physicalDamage})`,
            buyerName: purchase.buyerName,
            status: 'Returned',
            actionDate: new Date(),
            resolutionDate: new Date(),
            remarks: remarks || '',
          });
        }

        // Update ProjectBOMItem
        await ProjectBOMItem.findByIdAndUpdate(poItem.bomItem, {
          purchaseStatus: 'Returned',
          stockStatus: 'Return Pending',
        });
      }

      return res.json({
        message: 'Part failed quality inspection and marked as Sent for Return.',
        purchase,
        status: 'Returned',
      });
    }
  } catch (error) {
    next(error);
  }
};

