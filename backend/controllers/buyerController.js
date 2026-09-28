import Buyer from '../models/Buyer.js';
import ProjectBOMItem from '../models/ProjectBOMItem.js';

// @desc    Get all buyers
// @route   GET /api/buyers
// @access  Private
export const getBuyers = async (req, res, next) => {
  try {
    const { type, isEnabled } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true';

    const buyers = await Buyer.find(filter).sort({ name: 1 });
    res.json(buyers);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new buyer
// @route   POST /api/buyers
// @access  Private
export const createBuyer = async (req, res, next) => {
  try {
    const { name, type, contactInfo, website, address } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Buyer name is required' });
    }

    const existing = await Buyer.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'A buyer with this name already exists' });
    }

    const buyer = await Buyer.create({
      name: name.trim(),
      type: type || 'Online',
      contactInfo: contactInfo || '',
      website: website || '',
      address: address || '',
      isEnabled: true,
    });

    res.status(201).json(buyer);
  } catch (error) {
    next(error);
  }
};

// @desc    Update buyer
// @route   PUT /api/buyers/:id
// @access  Private
export const updateBuyer = async (req, res, next) => {
  try {
    const { name, type, contactInfo, website, address, isEnabled } = req.body;

    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    if (name && name.trim().toLowerCase() !== buyer.name.toLowerCase()) {
      const existing = await Buyer.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (existing) {
        return res.status(400).json({ message: 'A buyer with this name already exists' });
      }
      buyer.name = name.trim();
    }

    if (type) buyer.type = type;
    if (contactInfo !== undefined) buyer.contactInfo = contactInfo;
    if (website !== undefined) buyer.website = website;
    if (address !== undefined) buyer.address = address;
    if (isEnabled !== undefined) buyer.isEnabled = isEnabled;

    const updated = await buyer.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete buyer
// @route   DELETE /api/buyers/:id
// @access  Private
export const deleteBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Check if buyer is used in BOM items
    const usedInBOM = await ProjectBOMItem.findOne({ buyerName: buyer.name });
    if (usedInBOM) {
      return res.status(400).json({
        message: 'Cannot delete buyer because it is assigned to existing BOM items. You can disable it instead.',
      });
    }

    await buyer.deleteOne();
    res.json({ message: 'Buyer removed successfully' });
  } catch (error) {
    next(error);
  }
};
