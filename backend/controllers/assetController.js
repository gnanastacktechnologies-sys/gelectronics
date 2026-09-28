import Asset from '../models/Asset.js';
import SystemSetting from '../models/SystemSetting.js';

// Helper to get or initialize SystemSetting
const getSystemSetting = async () => {
  let setting = await SystemSetting.findOne({ key: 'global_settings' });
  if (!setting) {
    setting = await SystemSetting.create({ key: 'global_settings', assetPrefix: 'AST-', assetStartNumber: 1 });
  }
  return setting;
};

// @desc    Get System Config & Preferences (Admin)
// @route   GET /api/assets/config
// @access  Private
export const getAssetConfig = async (req, res, next) => {
  try {
    const setting = await getSystemSetting();
    res.json({
      assetPrefix: setting.assetPrefix || 'AST-',
      assetStartNumber: setting.assetStartNumber || 1,
      enableLowStockAlert: setting.enableLowStockAlert !== false,
      lowStockThreshold: setting.lowStockThreshold || 5,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update System Config & Preferences (Admin)
// @route   PUT /api/assets/config
// @access  Private
export const updateAssetConfig = async (req, res, next) => {
  try {
    const { assetPrefix, assetStartNumber, enableLowStockAlert, lowStockThreshold } = req.body;
    const setting = await getSystemSetting();

    if (assetPrefix !== undefined) setting.assetPrefix = assetPrefix.trim().toUpperCase();
    if (assetStartNumber !== undefined) {
      const num = Number(assetStartNumber);
      if (!isNaN(num) && num >= 1) {
        setting.assetStartNumber = num;
      }
    }
    if (enableLowStockAlert !== undefined) {
      setting.enableLowStockAlert = Boolean(enableLowStockAlert);
    }
    if (lowStockThreshold !== undefined) {
      const threshold = Number(lowStockThreshold);
      if (!isNaN(threshold) && threshold >= 1) {
        setting.lowStockThreshold = threshold;
      }
    }

    await setting.save();
    res.json({
      assetPrefix: setting.assetPrefix,
      assetStartNumber: setting.assetStartNumber,
      enableLowStockAlert: setting.enableLowStockAlert,
      lowStockThreshold: setting.lowStockThreshold,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res, next) => {
  try {
    const { search, status, procurementMode, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { assetNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } },
        { buyer: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') filter.status = status;
    if (procurementMode && procurementMode !== 'All') filter.procurementMode = procurementMode;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Asset.countDocuments(filter);

    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Summary calculations
    const allAssets = await Asset.find();
    const totalAssetValue = allAssets.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
    const availableAssetCount = allAssets.filter((a) => a.status === 'Available').length;
    const inUseAssetCount = allAssets.filter((a) => a.status === 'In Use').length;

    res.json({
      assets,
      total,
      totalAssetValue,
      availableAssetCount,
      inUseAssetCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Private
export const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset record not found' });
    }
    res.json(asset);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private
export const createAsset = async (req, res, next) => {
  try {
    let {
      assetNumber,
      description,
      modelName,
      imageUrl,
      imageUrls,
      quantity,
      unit,
      price,
      procurementMode,
      buyer,
      status,
      location,
      remarks,
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Asset description / name is required' });
    }

    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const p = Number(price) >= 0 ? Number(price) : 0;

    // Auto-generate Asset Number if not provided using SystemSetting
    if (!assetNumber || !assetNumber.trim()) {
      const setting = await getSystemSetting();
      const prefix = setting.assetPrefix || 'AST-';
      const startNum = setting.assetStartNumber || 1;

      const existingAssets = await Asset.find().select('assetNumber');
      let maxVal = startNum - 1;

      for (const ast of existingAssets) {
        const match = ast.assetNumber?.match(/(\d+)$/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxVal) maxVal = val;
        }
      }

      const nextNum = maxVal + 1;
      const digitsCount = Math.max(4, String(startNum).length);
      assetNumber = `${prefix}${String(nextNum).padStart(digitsCount, '0')}`;
    } else {
      assetNumber = assetNumber.trim().toUpperCase();
      const existing = await Asset.findOne({ assetNumber });
      if (existing) {
        return res.status(400).json({ message: `Asset Number '${assetNumber}' already exists` });
      }
    }

    const imgs = Array.isArray(imageUrls)
      ? imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : imageUrl
      ? [imageUrl.trim()]
      : [];

    const asset = await Asset.create({
      assetNumber,
      description: description.trim(),
      modelName: modelName ? modelName.trim() : '',
      imageUrl: imgs.length > 0 ? imgs[0] : imageUrl ? imageUrl.trim() : '',
      imageUrls: imgs,
      quantity: qty,
      unit: unit ? unit.trim() : 'Pcs',
      price: p,
      totalPrice: qty * p,
      procurementMode: procurementMode || 'Online',
      buyer: buyer ? buyer.trim() : '',
      status: status || 'Available',
      location: location ? location.trim() : 'Assembly Bench',
      remarks: remarks ? remarks.trim() : '',
    });

    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private
export const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      assetNumber,
      description,
      modelName,
      imageUrl,
      imageUrls,
      quantity,
      unit,
      price,
      procurementMode,
      buyer,
      status,
      location,
      remarks,
    } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset record not found' });
    }

    if (assetNumber && assetNumber.trim().toUpperCase() !== asset.assetNumber) {
      const existing = await Asset.findOne({ assetNumber: assetNumber.trim().toUpperCase(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: `Asset Number '${assetNumber}' already exists` });
      }
      asset.assetNumber = assetNumber.trim().toUpperCase();
    }

    if (description !== undefined) asset.description = description.trim();
    if (modelName !== undefined) asset.modelName = modelName.trim();
    if (unit !== undefined) asset.unit = unit.trim();
    if (procurementMode !== undefined) asset.procurementMode = procurementMode;
    if (buyer !== undefined) asset.buyer = buyer.trim();
    if (status !== undefined) asset.status = status;
    if (location !== undefined) asset.location = location.trim();
    if (remarks !== undefined) asset.remarks = remarks.trim();

    if (imageUrls !== undefined && Array.isArray(imageUrls)) {
      const clean = imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0);
      asset.imageUrls = clean;
      asset.imageUrl = clean.length > 0 ? clean[0] : '';
    } else if (imageUrl !== undefined) {
      asset.imageUrl = imageUrl.trim();
      if (imageUrl.trim()) asset.imageUrls = [imageUrl.trim()];
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
      }
      asset.quantity = qty;
    }

    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({ message: 'Price cannot be negative' });
      }
      asset.price = p;
    }

    asset.totalPrice = asset.quantity * asset.price;

    const updated = await asset.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private
export const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset record not found' });
    }

    await asset.deleteOne();
    res.json({ message: 'Asset record deleted successfully' });
  } catch (error) {
    next(error);
  }
};
