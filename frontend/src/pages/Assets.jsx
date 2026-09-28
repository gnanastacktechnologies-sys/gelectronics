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
  FiBriefcase,
  FiLayers,
  FiDollarSign,
  FiTool,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [metrics, setMetrics] = useState({
    totalAssetValue: 0,
    availableAssetCount: 0,
    inUseAssetCount: 0,
  });

  const [buyers, setBuyers] = useState([]);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState({
    assetNumber: '',
    description: '',
    modelName: '',
    imageUrls: [''],
    quantity: 1,
    unit: 'Pcs',
    price: 0,
    procurementMode: 'Online',
    buyer: 'Amazon',
    status: 'Available',
    location: 'Assembly Bench 1',
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

  const fetchBuyers = async () => {
    try {
      const res = await api.get('/buyers');
      setBuyers(res.data || []);
    } catch (err) {
      console.error('[Fetch Buyers Error]:', err);
    }
  };

  const fetchAssets = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: 10,
        search,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        procurementMode: modeFilter !== 'All' ? modeFilter : undefined,
      };
      const res = await api.get('/assets', { params });
      setAssets(res.data.assets || []);
      setMetrics({
        totalAssetValue: res.data.totalAssetValue || 0,
        availableAssetCount: res.data.availableAssetCount || 0,
        inUseAssetCount: res.data.inUseAssetCount || 0,
      });
      setPagination({
        page: res.data.page || 1,
        pages: res.data.pages || 1,
        total: res.data.total || 0,
      });
    } catch (err) {
      console.error('[Assets fetch error]:', err);
      setErrorMsg('Failed to load electronics assembly assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  useEffect(() => {
    fetchAssets(1);
  }, [search, statusFilter, modeFilter]);

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
        console.error('[Asset Image File Upload Error]:', err);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setForm({
      assetNumber: '',
      description: '',
      modelName: '',
      imageUrls: [''],
      quantity: 1,
      unit: 'Pcs',
      price: 0,
      procurementMode: 'Online',
      buyer: buyers.length > 0 ? buyers[0].name : 'Amazon',
      status: 'Available',
      location: 'Assembly Bench 1',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (ast) => {
    setEditingAsset(ast);
    const existingList = Array.isArray(ast.imageUrls) && ast.imageUrls.length > 0
      ? ast.imageUrls
      : ast.imageUrl
      ? [ast.imageUrl]
      : [''];
    setForm({
      assetNumber: ast.assetNumber,
      description: ast.description,
      modelName: ast.modelName || '',
      imageUrls: existingList,
      quantity: ast.quantity,
      unit: ast.unit || 'Pcs',
      price: ast.price || 0,
      procurementMode: ast.procurementMode || 'Online',
      buyer: ast.buyer || '',
      status: ast.status || 'Available',
      location: ast.location || 'Assembly Bench 1',
      remarks: ast.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;

    const cleanUrls = form.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0);
    const payload = {
      ...form,
      imageUrls: cleanUrls,
      imageUrl: cleanUrls[0] || '',
    };

    try {
      setIsSubmitting(true);
      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id}`, payload);
        setSuccessMsg('Asset item updated successfully');
      } else {
        await api.post('/assets', payload);
        setSuccessMsg('New electronics assembly asset created');
      }
      setModalOpen(false);
      fetchAssets(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save asset item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/assets/${deleteId}`);
      setDeleteId(null);
      setSuccessMsg('Asset record deleted');
      fetchAssets(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Asset No.',
      cell: (row) => (
        <span className="font-mono text-cyan-400 font-extrabold text-xs">
          {row.assetNumber}
        </span>
      ),
    },
    {
      header: 'Asset Description & Details',
      cell: (row) => {
        const imgs = Array.isArray(row.imageUrls) && row.imageUrls.length > 0
          ? row.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
          : row.imageUrl
          ? [row.imageUrl]
          : [];
        return (
          <div className="flex items-center space-x-3">
            {imgs.length > 0 ? (
              <div
                onClick={() => handleOpenImagePreview(imgs, row.description, row.modelName)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view photo gallery & slideshow"
              >
                <img
                  src={imgs[0]}
                  alt={row.description}
                  className="w-11 h-11 object-cover rounded-xl border border-cyan-500/30 bg-slate-950 shadow group-hover:scale-105 group-hover:border-cyan-400 transition"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_IMAGE_DATA_URI;
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                  <FiImage className="w-4 h-4 text-cyan-400" />
                </div>
                {imgs.length > 1 && (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-cyan-500 text-slate-950 font-extrabold text-[9px] rounded-full shadow border border-slate-900">
                    +{imgs.length - 1}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-500 shrink-0 shadow">
                <FiBriefcase className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-white text-sm">{row.description}</span>
              {row.modelName && (
                <p className="text-[11px] text-cyan-400 font-mono font-semibold mt-0.5">Model: {row.modelName}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Quantity',
      cell: (row) => (
        <span className="font-bold text-white text-sm">
          {row.quantity} <span className="text-xs font-semibold text-cyan-400">{row.unit || 'Pcs'}</span>
        </span>
      ),
    },
    {
      header: 'Price / Line Total',
      cell: (row) => (
        <div>
          <span className="font-bold text-emerald-400 text-sm">
            ₹{(row.price || 0).toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Total: <span className="font-bold text-emerald-300">₹{(row.totalPrice || 0).toLocaleString('en-IN')}</span>
          </p>
        </div>
      ),
    },
    {
      header: 'Procurement & Buyer',
      cell: (row) => (
        <div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              row.procurementMode === 'Online'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
            }`}
          >
            {row.procurementMode}
          </span>
          <p className="text-[11px] font-semibold text-slate-200 mt-1">{row.buyer || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Status & Location',
      cell: (row) => (
        <div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              row.status === 'Available'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : row.status === 'In Use'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : row.status === 'Under Maintenance'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {row.status}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Loc: {row.location || 'Assembly Bench'}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Edit Asset"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row._id)}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer"
            title="Delete Asset"
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
            <FiBriefcase className="w-6 h-6 text-cyan-400" />
            <span>Electronics Assembly Assets Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track equipment & tools for electronics assembly: soldering stations, oscilloscopes, multimeters, testing jigs, and machinery.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-sm font-extrabold shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Assets Recorded
            </span>
            <span className="text-2xl font-extrabold text-white">{pagination.total || 0} Items</span>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <FiBriefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Asset Value
            </span>
            <span className="text-2xl font-extrabold text-emerald-400">
              ₹{(metrics.totalAssetValue || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TbCurrencyRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Available Assets
            </span>
            <span className="text-2xl font-extrabold text-sky-400">{metrics.availableAssetCount || 0}</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              In Use / Deployed
            </span>
            <span className="text-2xl font-extrabold text-purple-400">{metrics.inUseAssetCount || 0}</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <FiTool className="w-5 h-5" />
          </div>
        </div>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset number, description, model, buyer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold flex items-center space-x-1">
              <FiFilter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        emptyMessage="No electronics assembly assets found"
        emptyAction={
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl inline-flex items-center space-x-2 cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add First Asset</span>
          </button>
        }
        pagination={pagination}
        onPageChange={(page) => fetchAssets(page)}
      />

      {/* Add / Edit Asset Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAsset ? 'Edit Assembly Asset' : 'Add Electronics Assembly Asset'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Asset Number (Auto generated if blank)
              </label>
              <input
                type="text"
                value={form.assetNumber}
                onChange={(e) => setForm({ ...form, assetNumber: e.target.value })}
                placeholder="e.g. AST-0001"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Asset Description / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Hakko Soldering Station FX-888D, Rigol Oscilloscope"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Model Name / Part Number
              </label>
              <input
                type="text"
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                placeholder="e.g. FX-888D / DS1054Z"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Storage / Assembly Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Assembly Bench 1, Testing Jig Rack"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Asset Image Links & Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex text-xs font-semibold text-cyan-400 uppercase tracking-wider items-center gap-1.5">
                <FiImage className="w-3.5 h-3.5" />
                <span>Asset Image Link(s) ({form.imageUrls.length})</span>
              </label>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center space-x-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <FiUpload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddImageLink}
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {form.imageUrls.map((url, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleImageLinkChange(idx, e.target.value)}
                    placeholder={`Asset Image URL #${idx + 1} (https://...)`}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  {form.imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImageLink(idx)}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-xl transition cursor-pointer"
                      title="Delete Image Link"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {form.imageUrls.filter((u) => u.trim().length > 0).length > 0 && (
              <div className="p-3 bg-slate-950 border border-cyan-500/25 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center space-x-3 overflow-x-auto">
                  {form.imageUrls
                    .filter((u) => u.trim().length > 0)
                    .map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt={`Preview ${i + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-xl border border-cyan-500/40 bg-slate-900 shrink-0 shadow"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_IMAGE_DATA_URI;
                        }}
                      />
                    ))}
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">
                      ✓ {form.imageUrls.filter((u) => u.trim().length > 0).length} Asset Image(s) Attached
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Quantity & Unit <span className="text-rose-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-2/3 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={form.unit || 'Pcs'}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-1/3 px-2 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
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
                Unit Purchase Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                Total Asset Value: ₹{(Number(form.quantity || 0) * Number(form.price || 0)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Procurement Mode
              </label>
              <select
                value={form.procurementMode}
                onChange={(e) => setForm({ ...form, procurementMode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Buyer / Supplier Name
              </label>
              {form.procurementMode === 'Online' ? (
                <select
                  value={form.buyer}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {buyers.map((b) => (
                    <option key={b._id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  {buyers.length === 0 && <option value="Amazon">Amazon</option>}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.buyer}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                  placeholder="e.g. Local Machinery Vendor"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Asset Operating Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use / Deployed</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
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
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {editingAsset ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Asset Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to remove this assembly asset record?
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

export default Assets;
