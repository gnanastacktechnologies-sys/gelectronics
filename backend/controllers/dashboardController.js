import Project from '../models/Project.js';
import ProjectBOMItem from '../models/ProjectBOMItem.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import StockItem from '../models/StockItem.js';
import ReplacementReturn from '../models/ReplacementReturn.js';
import Accessory from '../models/Accessory.js';

// @desc    Get aggregated dashboard summary statistics
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    // Run all count & aggregation metrics in parallel
    const [
      totalProjects,
      totalBOMItems,
      bomTotals,
      totalPurchasedOrders,
      pendingPurchases,
      totalStockRecords,
      stockTotals,
      replacementPendingCount,
      totalAccessories,
      projects,
    ] = await Promise.all([
      Project.countDocuments(),
      ProjectBOMItem.countDocuments(),
      ProjectBOMItem.aggregate([
        {
          $group: {
            _id: null,
            totalBOMCost: { $sum: '$actualLineTotal' },
          },
        },
      ]),
      PurchaseOrder.countDocuments(),
      PurchaseOrder.countDocuments({ purchaseStatus: { $in: ['Pending', 'Ordered', 'Partially Received'] } }),
      StockItem.countDocuments(),
      StockItem.aggregate([
        {
          $group: {
            _id: null,
            totalOrderedQty: { $sum: '$orderedQuantity' },
            totalReceivedQty: { $sum: '$receivedQuantity' },
            totalUsableQty: { $sum: '$usableQuantity' },
            totalDamagedQty: { $sum: '$damagedQuantity' },
          },
        },
      ]),
      ReplacementReturn.countDocuments({ type: 'Replace', status: { $ne: 'Replacement Received' } }),
      Accessory.countDocuments(),
      Project.find().sort({ updatedAt: -1 }).limit(6).lean(),
    ]);

    const totalBOMCost = bomTotals.length > 0 ? bomTotals[0].totalBOMCost : 0;
    const usableStockCount = stockTotals.length > 0 ? stockTotals[0].totalUsableQty : 0;
    const totalDamagedCount = stockTotals.length > 0 ? stockTotals[0].totalDamagedQty : 0;

    // Aggregate project breakdown for recent projects in a single database query
    const projectIds = projects.map((p) => p._id);
    const bomSummary = await ProjectBOMItem.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          totalCost: { $sum: '$actualLineTotal' },
          bomCount: { $sum: 1 },
        },
      },
    ]);

    const bomMap = new Map();
    bomSummary.forEach((b) => {
      bomMap.set(String(b._id), b);
    });

    const projectBreakdown = projects.map((p) => {
      const stats = bomMap.get(String(p._id)) || { totalCost: 0, bomCount: 0 };
      return {
        id: p._id,
        name: p.name,
        code: p.code,
        status: p.status,
        totalCost: stats.totalCost || 0,
        bomCount: stats.bomCount || 0,
      };
    });

    res.json({
      summary: {
        totalProjects,
        totalBOMItems,
        totalBOMCost,
        totalPurchasedOrders,
        pendingPurchases,
        totalStockRecords,
        usableStockCount,
        totalDamagedCount,
        replacementPendingCount,
        totalAccessories,
      },
      projectBreakdown,
    });
  } catch (error) {
    next(error);
  }
};
