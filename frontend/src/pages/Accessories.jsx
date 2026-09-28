import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ImageModal from '../components/common/ImageModal';
import {
  FALLBACK_IMAGE_DATA_URI,
  QUANTITY_UNITS,
  fileToBase64,
} from '../utils/imageUtils';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiAlertCircle,
  FiCheckCircle,
  FiImage,
  FiCpu,
  FiUpload,
  FiTool,
  FiClock,
  FiAlertTriangle,
  FiLayers,
} from 'react-icons/fi';

const Accessories = () => {
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'used' | 'low_stock'
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [tabCounts, setTabCounts] = useState({ availableCount: 0, usedCount: 0, lowStockCount: 0 });

  // Use Modal State
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [useForm, setUseForm] = useState({
    quantity: 1,
    usedFor: 'Project Assembly',
    usedBy: 'Admin',
  });

  // Usage Logs Modal State
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'Cables & Wires',
    description: '',
    modelPartNumber: '',
    imageUrls: [''],
    unit: 'Pcs',
    availableQuantity: 0,
    minimumQuantity: 5,
    location: '',
    purchasePrice: 0,
    supplier: '',
    remarks: '',
  });

  const [deleteId, setDeleteId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Lightbox Modal State
  const [previewImage, setPreviewImage] = useState({ isOpen: false, imageUrls: [], title: '', model: '' });

  const handleOpenImagePreview = (imageUrls, title, model) => {
    const list = Array.isArray(imageUrls)
      ? imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0)
      : imageUrls
      ? [imageUrls]
      : [];
    if (list.length === 0) return;
    setPreviewImage({ isOpen: true, imageUrls: list, title, model });
  };

  const fetchAccessories = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: 10,
        search,
        tab: activeTab,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };
      const res = await api.get('/accessories', { params });
      setAccessories(res.data.accessories || []);
      setTabCounts({
        availableCount: res.data.availableCount || 0,
        usedCount: res.data.usedCount || 0,
        lowStockCount: res.data.lowStockCount || 0,
      });
      setPagination({
        page: res.data.page || 1,
        pages: res.data.pages || 1,
        total: res.data.total || 0,
      });
    } catch (err) {
      console.error('[Accessories fetch error]:', err);
      setErrorMsg('Failed to load accessories inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessories(1);
  }, [activeTab, search, categoryFilter, statusFilter]);

  // Open Use Modal
  const handleOpenUse = (acc) => {
    setSelectedAccessory(acc);
    setUseForm({
      quantity: 1,
      usedFor: 'Project Assembly',
      usedBy: 'Admin',
    });
    setUseModalOpen(true);
  };

  // Submit Use Accessory
  const handleUseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccessory) return;

    const qty = Number(useForm.quantity);
    if (qty <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (qty > selectedAccessory.availableQuantity) {
      setErrorMsg(`Cannot use ${qty} units. Only ${selectedAccessory.availableQuantity} available.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/accessories/${selectedAccessory._id}/use`, useForm);
      setSuccessMsg(`Successfully issued ${qty} ${selectedAccessory.unit || 'Pcs'} of ${selectedAccessory.name}!`);
      setUseModalOpen(false);
      fetchAccessories(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to issue accessory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Logs Modal
  const handleOpenLogs = (acc) => {
    setSelectedAccessory(acc);
    setLogsModalOpen(true);
  };

  const handleAddImageLink = () => {
    setForm((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, ''],
    }));
  };

  const handleImageLinkChange = (index, value) => {
    setForm((prev) => {
      const updated = [...prev.imageUrls];
      updated[index] = value;
      return { ...prev, imageUrls: updated };
    });
  };

  const handleRemoveImageLink = (index) => {
    setForm((prev) => {
      const updated = prev.imageUrls.filter((_, i) => i !== index);
      return {
        ...prev,
        imageUrls: updated.length > 0 ? updated : [''],
      };
    });
  };

  const handleOpenAdd = () => {
    setEditingAccessory(null);
    setForm({
      name: '',
      category: 'Cables & Wires',
      description: '',
      modelPartNumber: '',
      imageUrls: [''],
      unit: 'Pcs',
      availableQuantity: 10,
      minimumQuantity: 5,
      location: 'Rack A1',
      purchasePrice: 0,
      supplier: 'Amazon',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setForm((prev) => {
          const updated = [...prev.imageUrls];
          if (updated.length > 0 && !updated[updated.length - 1].trim()) {
            updated[updated.length - 1] = base64;
          } else {
            updated.push(base64);
          }
          return { ...prev, imageUrls: updated };
        });
      } catch (err) {
        console.error('[Accessory Image File Upload Error]:', err);
      }
    }
  };

  const handleOpenEdit = (acc) => {
    setEditingAccessory(acc);
    const existingList = Array.isArray(acc.imageUrls) && acc.imageUrls.length > 0
      ? acc.imageUrls
      : acc.imageUrl
      ? [acc.imageUrl]
      : [''];
    setForm({
      name: acc.name,
      category: acc.category || 'General',
      description: acc.description || '',
      modelPartNumber: acc.modelPartNumber || '',
      imageUrls: existingList,
      unit: acc.unit || 'Pcs',
      availableQuantity: acc.availableQuantity,
      minimumQuantity: acc.minimumQuantity,
      location: acc.location || '',
      purchasePrice: acc.purchasePrice || 0,
      supplier: acc.supplier || '',
      remarks: acc.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const cleanUrls = form.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0);
    const payload = {
      ...form,
      imageUrls: cleanUrls,
      imageUrl: cleanUrls[0] || '',
    };

    try {
      setIsSubmitting(true);
      if (editingAccessory) {
        await api.put(`/accessories/${editingAccessory._id}`, payload);
        setSuccessMsg('Accessory item updated successfully');
      } else {
        await api.post('/accessories', payload);
        setSuccessMsg('New accessory item added');
      }
      setModalOpen(false);
      fetchAccessories(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save accessory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/accessories/${deleteId}`);
      setDeleteId(null);
      setSuccessMsg('Accessory item deleted');
      fetchAccessories(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete accessory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Accessory Name Details',
      cell: (row) => {
        const imgs = Array.isArray(row.imageUrls) && row.imageUrls.length > 0
          ? row.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
          : row.imageUrl
          ? [row.imageUrl]
          : [];
        const isLow = (row.availableQuantity || 0) <= (row.minimumQuantity || 5);

        return (
          <div className="flex items-center space-x-3">
            {imgs.length > 0 ? (
              <div
                onClick={() => handleOpenImagePreview(imgs, row.name, row.modelPartNumber)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view photo gallery"
              >
                <img
                  src={imgs[0]}
                  alt={row.name}
                  className="w-11 h-11 object-cover rounded-xl border border-cyan-500/30 bg-slate-950 shadow group-hover:scale-105 group-hover:border-cyan-400 transition"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/100x100/0f172a/06b6d4?text=Item';
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                  <FiImage className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 shadow">
                <FiCpu className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{row.name}</span>
                {isLow && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    LOW STOCK
                  </span>
                )}
              </div>
              {row.description && <p className="text-xs text-slate-400 mt-0.5">{row.description}</p>}
              {row.modelPartNumber && (
                <p className="text-[10px] text-cyan-400 font-mono font-semibold mt-0.5">Model: {row.modelPartNumber}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      cell: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {row.category || 'General'}
        </span>
      ),
    },
    {
      header: 'Available Stock',
      cell: (row) => (
        <div>
          <span className="text-base font-extrabold text-emerald-400">
            {row.availableQuantity || 0} <span className="text-xs font-medium text-slate-400">{row.unit || 'Pcs'}</span>
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Min Threshold: {row.minimumQuantity || 5} {row.unit || 'Pcs'}</p>
        </div>
      ),
    },
    {
      header: 'Used in Assembly',
      cell: (row) => (
        <div>
          <span className="text-base font-extrabold text-blue-400">
            {row.usedQuantity || 0} <span className="text-xs font-medium text-slate-400">{row.unit || 'Pcs'}</span>
          </span>
          {row.usageLogs && row.usageLogs.length > 0 && (
            <button
              onClick={() => handleOpenLogs(row)}
              className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1 mt-0.5 cursor-pointer font-semibold"
            >
              <FiClock className="w-3 h-3" />
              <span>{row.usageLogs.length} Usage Logs</span>
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => {
        const isLow = (row.availableQuantity || 0) <= (row.minimumQuantity || 5);
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isLow
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold'
                : row.availableQuantity > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isLow ? 'Low Stock Alert' : row.availableQuantity > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {row.availableQuantity > 0 && (
            <button
              onClick={() => handleOpenUse(row)}
              className="px-3 py-1.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-extrabold shadow flex items-center space-x-1 cursor-pointer transition"
            >
              <FiTool className="w-3.5 h-3.5" />
              <span>Use Accessory</span>
            </button>
          )}
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Edit Accessory"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row._id)}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer"
            title="Delete Accessory"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FiLayers className="w-6 h-6 text-cyan-400" />
            <span>Accessories Store & Inventory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standalone accessories store for cables, connectors, fasteners, jumpers, and BOM-designated accessory items.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Accessory</span>
        </button>
      </div>

      {/* Sub-Tabs Bar: Available Accessories | Used Accessories | Low Stock Alerts */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 font-bold text-sm flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'available'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FiCheckCircle className="w-4 h-4" />
          <span>Available Accessories</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
            {tabCounts.availableCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('used')}
          className={`pb-3 px-4 font-bold text-sm flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'used'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FiTool className="w-4 h-4" />
          <span>Used Accessories</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 font-extrabold border border-blue-500/30">
            {tabCounts.usedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('low_stock')}
          className={`pb-3 px-4 font-bold text-sm flex items-center space-x-2 border-b-2 transition cursor-pointer ${
            activeTab === 'low_stock'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FiAlertTriangle className="w-4 h-4" />
          <span>Low Stock Alerts</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/30">
            {tabCounts.lowStockCount}
          </span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <FiCheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accessory name, part number, location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="text-xs text-slate-400">
          {activeTab === 'available' && <span>Showing available accessories in stock</span>}
          {activeTab === 'used' && <span>Showing accessories consumed during project assembly</span>}
          {activeTab === 'low_stock' && <span>Showing accessory items running low</span>}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={accessories}
        loading={loading}
        emptyMessage={
          activeTab === 'available'
            ? 'No available accessories in store.'
            : activeTab === 'used'
            ? 'No accessories have been used for assembly yet.'
            : 'No low stock alerts! All accessories have sufficient stock.'
        }
        emptyAction={
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-2 cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add First Accessory</span>
          </button>
        }
        pagination={pagination}
        onPageChange={(page) => fetchAccessories(page)}
      />

      {/* Modal: Use Accessory */}
      <Modal
        isOpen={useModalOpen}
        onClose={() => setUseModalOpen(false)}
        title="Issue Accessory for Project / Assembly"
        subtitle={`Item: ${selectedAccessory?.name} (Available: ${selectedAccessory?.availableQuantity} ${selectedAccessory?.unit || 'Pcs'})`}
      >
        <form onSubmit={handleUseSubmit} className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Accessory Name:</span>
              <span className="font-bold text-white">{selectedAccessory?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Available In Stock:</span>
              <span className="font-extrabold text-emerald-400">
                {selectedAccessory?.availableQuantity} {selectedAccessory?.unit || 'Pcs'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Previously Issued:</span>
              <span className="font-extrabold text-blue-400">
                {selectedAccessory?.usedQuantity || 0} {selectedAccessory?.unit || 'Pcs'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Quantity to Issue <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedAccessory?.availableQuantity || 1}
              required
              value={useForm.quantity}
              onChange={(e) => setUseForm({ ...useForm, quantity: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Issue Purpose / Project Line
            </label>
            <input
              type="text"
              required
              value={useForm.usedFor}
              onChange={(e) => setUseForm({ ...useForm, usedFor: e.target.value })}
              placeholder="e.g. Enclosure Cabling, Prototyping Line"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Issued By / Engineer Name
            </label>
            <input
              type="text"
              value={useForm.usedBy}
              onChange={(e) => setUseForm({ ...useForm, usedBy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setUseModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow cursor-pointer"
            >
              Confirm Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Usage Logs */}
      <Modal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Accessory Usage History"
        subtitle={`Item: ${selectedAccessory?.name}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between">
            <span className="text-slate-400">Total Issued / Used:</span>
            <span className="font-extrabold text-blue-400 text-sm">
              {selectedAccessory?.usedQuantity || 0} {selectedAccessory?.unit || 'Pcs'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {selectedAccessory?.usageLogs && selectedAccessory.usageLogs.length > 0 ? (
              selectedAccessory.usageLogs.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>Issued {log.quantity} {selectedAccessory.unit || 'Pcs'}</span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.date).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-slate-300">Purpose: <span className="text-cyan-400 font-semibold">{log.usedFor}</span></p>
                  <p className="text-[10px] text-slate-400">Issued By: {log.usedBy}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-4">No usage history logged yet.</p>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => setLogsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccessory ? 'Edit Accessory Item' : 'Add Accessory Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Accessory Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jumper Wires M-F (40pcs), USB Cable 1m"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Cables & Wires">Cables & Wires</option>
                <option value="Hardware & Fasteners">Hardware & Fasteners</option>
                <option value="Connectors & Adapters">Connectors & Adapters</option>
                <option value="Mounting & Enclosures">Mounting & Enclosures</option>
                <option value="Tools & Equipment">Tools & Equipment</option>
                <option value="BOM Accessory">BOM Accessory</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Available Qty & Unit <span className="text-rose-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  required
                  value={form.availableQuantity}
                  onChange={(e) => setForm({ ...form, availableQuantity: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={form.unit || 'Pcs'}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-24 px-2 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-400 focus:outline-none focus:border-cyan-500"
                >
                  {QUANTITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Minimum Threshold Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.minimumQuantity}
                onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
            >
              Save Accessory
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Accessory Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this accessory record?
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Lightbox Modal */}
      <ImageModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ ...previewImage, isOpen: false })}
        imageUrls={previewImage.imageUrls}
        title={previewImage.title}
        modelNumber={previewImage.model}
      />
    </div>
  );
};

export default Accessories;
