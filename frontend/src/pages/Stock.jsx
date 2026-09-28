import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ImageModal from '../components/common/ImageModal';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiSearch,
  FiAlertCircle,
  FiLayers,
  FiImage,
  FiCpu,
  FiTool,
  FiClock,
  FiShoppingCart,
} from 'react-icons/fi';

const Stock = () => {
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'used' | 'low_stock'
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [tabCounts, setTabCounts] = useState({ availableCount: 0, usedCount: 0, lowStockCount: 0 });

  // Use for Assembly Modal State
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [useForm, setUseForm] = useState({
    quantity: 1,
    usedFor: 'PCB Assembly Line 1',
    usedBy: 'Admin',
  });

  // Replacement / Return Modal
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceForm, setReplaceForm] = useState({ quantity: 1, reason: '', remarks: '' });

  // History / Logs Modal State
  const [logsModalOpen, setLogsModalOpen] = useState(false);

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

  const fetchStock = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: 10,
        search,
        tab: activeTab,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };
      const res = await api.get('/stock', { params });
      setStockItems(res.data.stockItems || []);
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
      console.error('[Stock fetch error]:', err);
      setErrorMsg('Failed to load store stock items from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(1);
  }, [activeTab, search, statusFilter]);

  // Handle Component Issue for PCB Assembly
  const handleOpenUse = (item) => {
    setSelectedStockItem(item);
    setUseForm({
      quantity: 1,
      usedFor: `PCB Assembly for ${item.project?.name || 'Project'}`,
      usedBy: 'Admin Tech',
    });
    setUseModalOpen(true);
  };

  const handleUseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStockItem) return;

    const qty = Number(useForm.quantity);
    if (qty <= 0 || qty > selectedStockItem.usableQuantity) {
      setErrorMsg(`Invalid quantity. Available stock is ${selectedStockItem.usableQuantity} units.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/stock/${selectedStockItem._id}/use`, {
        quantity: qty,
        usedFor: useForm.usedFor,
        usedBy: useForm.usedBy,
      });

      setSuccessMsg(`✓ Successfully issued ${qty} ${selectedStockItem.unit || 'Pcs'} of ${selectedStockItem.itemDescription} for assembly!`);
      setUseModalOpen(false);
      fetchStock(pagination.page);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to issue component for assembly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Replacement Order for Damaged Component
  const handleOpenReplace = (item) => {
    setSelectedStockItem(item);
    setReplaceForm({
      quantity: item.damagedQuantity || 1,
      reason: 'Physical damage reported during inspection',
      remarks: '',
    });
    setReplaceModalOpen(true);
  };

  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStockItem) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await api.post(`/stock/${selectedStockItem._id}/replacement`, {
        quantity: Number(replaceForm.quantity) || 1,
        reason: replaceForm.reason,
        remarks: replaceForm.remarks,
      });

      setSuccessMsg(`✓ Replacement request logged for ${selectedStockItem.itemDescription}!`);
      setReplaceModalOpen(false);
      fetchStock(pagination.page);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to log replacement request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Usage History Logs
  const handleOpenLogs = (item) => {
    setSelectedStockItem(item);
    setLogsModalOpen(true);
  };

  const columns = [
    {
      header: 'Store Component',
      cell: (row) => {
        const isLow = (row.usableQuantity || 0) <= (row.lowStockThreshold || 5);
        const imgs = Array.isArray(row.imageUrls)
          ? row.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
          : row.imageUrl
          ? [row.imageUrl]
          : [];

        return (
          <div className="flex items-center space-x-3">
            {imgs.length > 0 ? (
              <div
                onClick={() => handleOpenImagePreview(imgs, row.itemDescription, row.modelNumber)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view photo gallery"
              >
                <img
                  src={imgs[0]}
                  alt={row.itemDescription}
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
                <span className="font-bold text-white text-sm">{row.itemDescription}</span>
                {isLow && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    LOW STOCK
                  </span>
                )}
              </div>
              {row.modelNumber && (
                <p className="text-[11px] text-cyan-400 font-mono font-semibold mt-0.5">Model: {row.modelNumber}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">
                Project: <span className="text-slate-200 font-semibold">{row.project?.name}</span> (
                <span className="text-cyan-400 font-mono font-semibold">{row.project?.code}</span>)
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Available Stock',
      cell: (row) => (
        <div>
          <span className="text-base font-extrabold text-emerald-400">
            {row.usableQuantity || 0} <span className="text-xs font-medium text-slate-400">{row.unit || 'Pcs'}</span>
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Passed Inspection</p>
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
      header: 'Stock Status',
      cell: (row) => {
        const isLow = (row.usableQuantity || 0) <= (row.lowStockThreshold || 5);
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isLow
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold'
                : row.usableQuantity > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isLow ? 'Low Stock Alert' : row.usableQuantity > 0 ? 'In Store Available' : 'Fully Consumed'}
          </span>
        );
      },
    },
    {
      header: 'Actions Workflow',
      className: 'text-right',
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Use for Assembly button on Available Stock */}
          {row.usableQuantity > 0 && (
            <button
              onClick={() => handleOpenUse(row)}
              className="px-3 py-1.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-extrabold shadow flex items-center space-x-1.5 cursor-pointer transition"
            >
              <FiTool className="w-3.5 h-3.5" />
              <span>Use for Assembly</span>
            </button>
          )}

          {/* Low Stock Reorder Link */}
          {(row.usableQuantity || 0) <= (row.lowStockThreshold || 5) && (
            <Link
              to={row.project?._id ? `/projects/${row.project._id}` : '/projects'}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
            >
              <FiShoppingCart className="w-3.5 h-3.5" />
              <span>Reorder BOM</span>
            </Link>
          )}

          {row.damagedQuantity > 0 && (
            <button
              onClick={() => handleOpenReplace(row)}
              className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FiLayers className="w-6 h-6 text-cyan-400" />
            <span>Store & Component Inventory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            After quality inspection, components enter Available Stock, are issued for assembly, and trigger Low Stock alerts when reordering is required.
          </p>
        </div>
      </div>

      {/* Sub-Tabs Bar: Available Stock | Used Stock | Low Stock */}
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
          <span>Available Stock</span>
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
          <span>Used Stock</span>
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-cyan-500/15 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store component or model..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div className="text-xs text-slate-400">
          {activeTab === 'available' && <span>Showing good store inventory passed inspection</span>}
          {activeTab === 'used' && <span>Showing components issued and consumed during assembly</span>}
          {activeTab === 'low_stock' && <span>Showing items where available stock ≤ 5 units</span>}
        </div>
      </div>

      {/* Stock Table */}
      <DataTable
        columns={columns}
        data={stockItems}
        loading={loading}
        emptyMessage={
          activeTab === 'available'
            ? 'No available stock items in store.'
            : activeTab === 'used'
            ? 'No components have been used for assembly yet.'
            : 'No low stock alerts! All store items have healthy stock levels.'
        }
        pagination={pagination}
        onPageChange={(page) => fetchStock(page)}
      />

      {/* Modal: Use Component for Assembly */}
      <Modal
        isOpen={useModalOpen}
        onClose={() => setUseModalOpen(false)}
        title="Issue Component for Assembly"
        subtitle={`Item: ${selectedStockItem?.itemDescription} (Available: ${selectedStockItem?.usableQuantity} ${selectedStockItem?.unit || 'Pcs'})`}
      >
        <form onSubmit={handleUseSubmit} className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Component:</span>
              <span className="font-bold text-white">{selectedStockItem?.itemDescription}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Available Stock:</span>
              <span className="font-extrabold text-emerald-400">
                {selectedStockItem?.usableQuantity} {selectedStockItem?.unit || 'Pcs'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Previously Used:</span>
              <span className="font-extrabold text-blue-400">
                {selectedStockItem?.usedQuantity || 0} {selectedStockItem?.unit || 'Pcs'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Quantity to Use / Issue <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedStockItem?.usableQuantity || 1}
              required
              value={useForm.quantity}
              onChange={(e) => setUseForm({ ...useForm, quantity: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Assembly Purpose / Line Details
            </label>
            <input
              type="text"
              required
              value={useForm.usedFor}
              onChange={(e) => setUseForm({ ...useForm, usedFor: e.target.value })}
              placeholder="e.g. PCB Assembly Batch #102, Mainboard Soldering"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Issued By / Tech Name
            </label>
            <input
              type="text"
              value={useForm.usedBy}
              onChange={(e) => setUseForm({ ...useForm, usedBy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setUseModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow cursor-pointer"
            >
              Confirm Assembly Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Component Usage Logs */}
      <Modal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Assembly Component Usage History"
        subtitle={`Item: ${selectedStockItem?.itemDescription}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between">
            <span className="text-slate-400">Total Consumed for Assembly:</span>
            <span className="font-extrabold text-blue-400 text-sm">
              {selectedStockItem?.usedQuantity || 0} {selectedStockItem?.unit || 'Pcs'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {selectedStockItem?.usageLogs && selectedStockItem.usageLogs.length > 0 ? (
              selectedStockItem.usageLogs.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>Used {log.quantity} {selectedStockItem.unit || 'Pcs'}</span>
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

      {/* Replace Modal */}
      <Modal
        isOpen={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        title="Initiate Replacement Order"
        subtitle={`Damaged Item: ${selectedStockItem?.itemDescription}`}
      >
        <form onSubmit={handleReplaceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Replacement Quantity
            </label>
            <input
              type="number"
              min="1"
              max={selectedStockItem?.damagedQuantity || 1}
              required
              value={replaceForm.quantity}
              onChange={(e) => setReplaceForm({ ...replaceForm, quantity: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Damage Reason / Details
            </label>
            <input
              type="text"
              value={replaceForm.reason}
              onChange={(e) => setReplaceForm({ ...replaceForm, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setReplaceModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Order Replacement
            </button>
          </div>
        </form>
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

export default Stock;
