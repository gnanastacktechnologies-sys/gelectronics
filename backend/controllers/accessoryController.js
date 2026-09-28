import Accessory from '../models/Accessory.js';

// @desc    Get all accessories
// @route   GET /api/accessories
// @access  Private
export const getAccessories = async (req, res, next) => {
  try {
    const { search, category, status, tab = 'available', page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { modelPartNumber: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') filter.category = category;

    // Sub-tab filtering
    if (tab === 'available') {
      filter.availableQuantity = { $gt: 0 };
    } else if (tab === 'used') {
      filter.usedQuantity = { $gt: 0 };
    } else if (tab === 'low_stock') {
      filter.$or = [
        { status: 'Low Stock' },
        { availableQuantity: { $lte: 5 } },
      ];
    } else if (status && status !== 'All') {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Accessory.countDocuments(filter);

    const accessories = await Accessory.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate sub-tab counts
    const availableCount = await Accessory.countDocuments({ availableQuantity: { $gt: 0 } });
    const usedCount = await Accessory.countDocuments({ usedQuantity: { $gt: 0 } });
    const lowStockCount = await Accessory.countDocuments({
      $or: [{ status: 'Low Stock' }, { availableQuantity: { $lte: 5 } }],
    });

    res.json({
      accessories,
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

// @desc    Get single accessory
// @route   GET /api/accessories/:id
// @access  Private
export const getAccessoryById = async (req, res, next) => {
  try {
    const accessory = await Accessory.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ message: 'Accessory not found' });
    }
    res.json(accessory);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new accessory
// @route   POST /api/accessories
// @access  Private
export const createAccessory = async (req, res, next) => {
  try {
    const {
      name,
      category,
      description,
      modelPartNumber,
      imageUrl,
      imageUrls,
      availableQuantity,
      unit,
      minimumQuantity,
      location,
      purchasePrice,
      supplier,
      remarks,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Accessory name is required' });
    }

    const qty = Number(availableQuantity) || 0;
    const minQty = Number(minimumQuantity) || 0;
    const price = Number(purchasePrice) || 0;

    if (qty < 0) {
      return res.status(400).json({ message: 'Available quantity cannot be negative' });
    }

    const imgs = Array.isArray(imageUrls) ? imageUrls.filter((u) => u && u.trim()) : imageUrl ? [imageUrl.trim()] : [];

    const accessory = await Accessory.create({
      name: name.trim(),
      category: category ? category.trim() : 'General',
      description: description ? description.trim() : '',
      modelPartNumber: modelPartNumber ? modelPartNumber.trim() : '',
      imageUrl: imgs.length > 0 ? imgs[0] : imageUrl ? imageUrl.trim() : '',
      imageUrls: imgs,
      availableQuantity: qty,
      unit: unit ? unit.trim() : 'Pcs',
      minimumQuantity: minQty,
      location: location ? location.trim() : '',
      purchasePrice: price,
      supplier: supplier ? supplier.trim() : '',
      remarks: remarks ? remarks.trim() : '',
    });

    res.status(201).json(accessory);
  } catch (error) {
    next(error);
  }
};

// @desc    Update accessory
// @route   PUT /api/accessories/:id
// @access  Private
export const updateAccessory = async (req, res, next) => {
  try {
    const {
      name,
      category,
      description,
      modelPartNumber,
      imageUrl,
      imageUrls,
      availableQuantity,
      unit,
      minimumQuantity,
      location,
      purchasePrice,
      supplier,
      remarks,
    } = req.body;

    const accessory = await Accessory.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ message: 'Accessory not found' });
    }

    if (name) accessory.name = name.trim();
    if (category !== undefined) accessory.category = category.trim();
    if (description !== undefined) accessory.description = description.trim();
    if (modelPartNumber !== undefined) accessory.modelPartNumber = modelPartNumber.trim();
    if (unit !== undefined) accessory.unit = unit.trim();
    
    if (imageUrls !== undefined && Array.isArray(imageUrls)) {
      const filtered = imageUrls.filter((u) => u && u.trim());
      accessory.imageUrls = filtered;
      accessory.imageUrl = filtered.length > 0 ? filtered[0] : '';
    } else if (imageUrl !== undefined) {
      accessory.imageUrl = imageUrl.trim();
      if (imageUrl.trim()) accessory.imageUrls = [imageUrl.trim()];
    }
    
    if (availableQuantity !== undefined) {
      const qty = Number(availableQuantity);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ message: 'Available quantity cannot be negative' });
      }
      accessory.availableQuantity = qty;
    }

    if (minimumQuantity !== undefined) {
      const minQty = Number(minimumQuantity);
      if (isNaN(minQty) || minQty < 0) {
        return res.status(400).json({ message: 'Minimum quantity cannot be negative' });
      }
      accessory.minimumQuantity = minQty;
    }

    if (location !== undefined) accessory.location = location.trim();
    if (purchasePrice !== undefined) accessory.purchasePrice = Number(purchasePrice) || 0;
    if (supplier !== undefined) accessory.supplier = supplier.trim();
    if (remarks !== undefined) accessory.remarks = remarks.trim();

    const updated = await accessory.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete accessory
// @route   DELETE /api/accessories/:id
// @access  Private
export const deleteAccessory = async (req, res, next) => {
  try {
    const accessory = await Accessory.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ message: 'Accessory not found' });
    }

    await accessory.deleteOne();
    res.json({ message: 'Accessory removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Use/Consume Accessory for Assembly or Project
// @route   POST /api/accessories/:id/use
// @access  Private
export const useAccessory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, usedFor, usedBy } = req.body;

    const accessory = await Accessory.findById(id);
    if (!accessory) {
      return res.status(404).json({ message: 'Accessory not found' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity used must be greater than 0' });
    }

    if (qty > accessory.availableQuantity) {
      return res.status(400).json({
        message: `Cannot use ${qty} units. Only ${accessory.availableQuantity} available in accessory stock.`,
      });
    }

    accessory.availableQuantity -= qty;
    accessory.usedQuantity = (accessory.usedQuantity || 0) + qty;
    accessory.usageLogs.push({
      quantity: qty,
      usedFor: usedFor ? usedFor.trim() : 'Project / Assembly',
      usedBy: usedBy ? usedBy.trim() : 'Admin',
      date: new Date(),
    });

    await accessory.save();
    res.json({ message: `Successfully issued ${qty} ${accessory.unit || 'Pcs'} of ${accessory.name}`, accessory });
  } catch (error) {
    next(error);
  }
};
