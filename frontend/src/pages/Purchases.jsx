import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ImageModal from '../components/common/ImageModal';
import { FALLBACK_IMAGE_DATA_URI } from '../utils/imageUtils';
import {
  FiEye,
  FiLayers,
  FiSearch,
  FiFilter,
  FiPrinter,
  FiAlertCircle,
  FiCpu,
  FiEdit,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiBell,
  FiCheck,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Notifications Alert Banner State
  const [notifications, setNotifications] = useState([]);

  // View PO Modal State
  const [viewPO, setViewPO] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit PO Delivery Date / Status Modal State
  const [editPO, setEditPO] = useState(null);
  const [editForm, setEditForm] = useState({
    purchaseStatus: 'Ordered',
    expectedDeliveryDate: '',
    remarks: '',
  });

  // Inspection & Part Receive Modal State
  const [inspectPO, setInspectPO] = useState(null);
  const [inspectionForm, setInspectionForm] = useState({
    partMatch: 'Pass',
    modelMatch: 'Pass',
    physicalDamage: 'No Damage',
    receivedQuantity: 1,
    remarks: '',
    returnReason: 'Damaged or specification mismatch upon delivery',
  });

  const handleOpenInspection = (po) => {
    setInspectPO(po);
    const firstItemQty = po.items?.[0]?.orderedQuantity || 1;
    setInspectionForm({
      partMatch: 'Pass',
      modelMatch: 'Pass',
      physicalDamage: 'No Damage',
      receivedQuantity: firstItemQty,
      remarks: '',
      returnReason: 'Damaged or specification mismatch upon delivery',
    });
  };

  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!inspectPO) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/purchases/${inspectPO._id}/receive`, inspectionForm);
      setInspectPO(null);
      setSuccessMsg(res.data.message);
      fetchPurchases(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete part receive inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete PO State
  const [deletePOId, setDeletePOId] = useState(null);

  // Create PO Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [bomItems, setBomItems] = useState([]);
  const [selectedBOMItemIds, setSelectedBOMItemIds] = useState([]);
  const [itemDeliveryDates, setItemDeliveryDates] = useState({});
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState('Amazon');
  const [selectedMode, setSelectedMode] = useState('Online');
  const [poNumber, setPoNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poRemarks, setPoRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Preview Lightbox State
  const [previewImage, setPreviewImage] = useState({
    isOpen: false,
    url: '',
    imageUrls: [],
    title: '',
    model: '',
  });

  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/purchases/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('[Purchases notifications fetch error]:', err);
    }
  };

  // Active Tab State (Arriving vs Returned)
  const [activeTab, setActiveTab] = useState('Arriving');
  const [tabCounts, setTabCounts] = useState({ arriving: 0, returned: 0 });

  const fetchPurchases = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: 10,
        search,
        status: activeTab,
      };
      const res = await api.get('/purchases', { params });
      setPurchases(res.data.purchases || []);
      setTabCounts({
        arriving: res.data.arrivingCount || 0,
        returned: res.data.returnedCount || 0,
      });
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total,
      });
      fetchNotifications();
    } catch (err) {
      console.error('[Purchases fetch error]:', err);
      setErrorMsg('Failed to load purchase orders list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases(1);
  }, [activeTab, search]);

  const handleOpenCreatePO = async () => {
    try {
      setErrorMsg('');
      const projRes = await api.get('/projects', { params: { limit: 100 } });
      const projList = projRes.data.projects || [];
      setProjects(projList);

      const buyersRes = await api.get('/buyers', { params: { isEnabled: true } });
      setBuyers(buyersRes.data || []);

      if (projList.length > 0) {
        const firstProjId = projList[0]._id;
        setSelectedProjectId(firstProjId);
        loadBOMForCreatePO(firstProjId);
      }

      setPoNumber('');
      setExpectedDeliveryDate('');
      setPoRemarks('');
      setCreateModalOpen(true);
    } catch (err) {
      console.error('[Create PO open error]:', err);
      setErrorMsg('Failed to initialize purchase order creation modal.');
    }
  };

  const loadBOMForCreatePO = async (projId) => {
    try {
      const res = await api.get(`/projects/${projId}/bom`);
      const items = res.data || [];
      setBomItems(items);
      setSelectedBOMItemIds(items.map((i) => i._id));
    } catch (err) {
      console.error('[Load BOM for Create PO error]:', err);
      setBomItems([]);
      setSelectedBOMItemIds([]);
    }
  };

  const handleCreatePOSubmit = async (e) => {
    e.preventDefault();
    const targetItems = bomItems.filter((item) => selectedBOMItemIds.includes(item._id));
    if (targetItems.length === 0) {
      setErrorMsg('Please select at least one BOM component item to generate Purchase Order.');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsToPurchase = targetItems.map((item) => ({
        bomItemId: item._id,
        orderedQuantity: item.quantity,
        actualPrice: item.actualPrice,
        expectedDeliveryDate: itemDeliveryDates[item._id] || expectedDeliveryDate || undefined,
      }));

      const res = await api.post('/purchases', {
        purchaseNumber: poNumber.trim(),
        projectId: selectedProjectId,
        buyerName: selectedBuyer,
        procurementMode: selectedMode,
        expectedDeliveryDate,
        items: itemsToPurchase,
        remarks: poRemarks,
      });

      setCreateModalOpen(false);
      setSuccessMsg(`Purchase Order ${res.data.purchaseOrder.purchaseNumber} created successfully!`);
      fetchPurchases(1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create Purchase Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePOConfirm = async () => {
    if (!deletePOId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/purchases/${deletePOId}`);
      setDeletePOId(null);
      setSuccessMsg('Purchase Order deleted successfully.');
      fetchPurchases(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete Purchase Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditPO = (po) => {
    setEditPO(po);
    setEditForm({
      purchaseStatus: po.purchaseStatus || 'Ordered',
      expectedDeliveryDate: po.expectedDeliveryDate
        ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0]
        : '',
      remarks: po.remarks || '',
    });
  };

  const handleUpdatePO = async (e) => {
    e.preventDefault();
    if (!editPO) return;

    try {
      setIsSubmitting(true);
      await api.put(`/purchases/${editPO._id}`, editForm);
      setSuccessMsg(`Purchase Order ${editPO.purchaseNumber} updated successfully!`);
      setEditPO(null);
      fetchPurchases(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update Purchase Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openImagePreview = (url, title, model, imageUrlsList = []) => {
    const list = Array.isArray(imageUrlsList) && imageUrlsList.length > 0 ? imageUrlsList : url ? [url] : [];
    if (list.length === 0) return;
    setPreviewImage({
      isOpen: true,
      url: list[0],
      imageUrls: list,
      title,
      model,
    });
  };

  const columns = [
    {
      header: 'Component Details',
      cell: (row) => {
        const item = row.items?.[0] || {};
        const imgList = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
        return (
          <div className="flex items-center space-x-3">
            {imgList.length > 0 ? (
              <div
                onClick={() => openImagePreview(item.imageUrl, item.itemDescription, item.modelNumber, imgList)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view full image gallery"
              >
                <img
                  src={imgList[0]}
                  alt={item.itemDescription}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-cover rounded-xl border border-cyan-500/30 bg-slate-950 shadow"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_IMAGE_DATA_URI;
                  }}
                />
                {imgList.length > 1 && (
                  <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[8px] font-extrabold px-1 rounded-full border border-slate-950">
                    +{imgList.length}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                <FiCpu className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-white text-xs">{item.itemDescription || row.remarks || 'Electronic Part'}</span>
              {item.modelNumber && (
                <p className="text-[10px] text-cyan-400 font-mono font-semibold">Model: {item.modelNumber}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Project',
      cell: (row) => (
        <div>
          <span className="font-semibold text-white text-xs">{row.project?.name || 'Project'}</span>
          <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{row.project?.code}</p>
        </div>
      ),
    },
    {
      header: 'Qty & Unit',
      cell: (row) => {
        const item = row.items?.[0] || {};
        return (
          <div>
            <span className="font-extrabold text-white text-xs">{item.orderedQuantity || 1}</span>
            <span className="text-cyan-400 font-bold text-xs ml-1 font-mono">{item.unit || 'Pcs'}</span>
          </div>
        );
      },
    },
    {
      header: 'Supplier & Mode',
      cell: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-200">{row.buyerName}</span>
          <p className="text-[10px] text-slate-400 uppercase font-mono">{row.procurementMode}</p>
        </div>
      ),
    },
    {
      header: 'Expected Delivery Date',
      cell: (row) => {
        if (!row.expectedDeliveryDate) {
          return <span className="text-xs text-slate-500 italic">Not set</span>;
        }
        const delDate = new Date(row.expectedDeliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const delMidnight = new Date(delDate);
        delMidnight.setHours(0, 0, 0, 0);

        const isOverdue = delMidnight < today && row.purchaseStatus !== 'Received' && row.purchaseStatus !== 'Cancelled' && row.purchaseStatus !== 'Returned';
        const isDueToday = delMidnight.getTime() === today.getTime() && row.purchaseStatus !== 'Received' && row.purchaseStatus !== 'Cancelled' && row.purchaseStatus !== 'Returned';

        return (
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-white flex items-center space-x-1">
              <FiClock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{delDate.toLocaleDateString('en-IN')}</span>
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 block w-max animate-pulse">
                ⚠ OVERDUE
              </span>
            )}
            {isDueToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 block w-max">
                🚚 DUE TODAY
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Amount',
      cell: (row) => (
        <span className="font-bold text-emerald-400 text-xs">
          ₹{(row.totalAmount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
            row.purchaseStatus === 'Received'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : row.purchaseStatus === 'Returned'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : row.purchaseStatus === 'Partially Received'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : row.purchaseStatus === 'Cancelled'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          {row.purchaseStatus}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => {
        const isReceivedOrReturned = ['Received', 'Returned'].includes(row.purchaseStatus);
        return (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {!isReceivedOrReturned ? (
              <button
                onClick={() => handleOpenInspection(row)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow-md flex items-center space-x-1 cursor-pointer transition shrink-0"
                title="Perform Quality Inspection and Receive Part into Store"
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                <span>Part Receive</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg">
                Completed
              </span>
            )}
            <button
              onClick={() => handleOpenEditPO(row)}
              className="p-1.5 text-cyan-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
              title="Edit Delivery Date & Status"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeletePOId(row._id)}
              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 rounded-lg transition cursor-pointer"
              title="Delete Purchase Order"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Purchases & Quality Receiving</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track arriving components, inspect delivered parts, and manage returns & defective parts.
          </p>
        </div>
      </div>

      {/* 2 Sub-Tabs Bar: Arriving vs Returns */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('Arriving')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'Arriving'
              ? 'bg-linear-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FiTruck className="w-4 h-4" />
          <span>1. Arriving & Expected Parts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'Arriving' ? 'bg-slate-950 text-cyan-400' : 'bg-slate-800 text-slate-300'
          }`}>
            {tabCounts.arriving}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Returned')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'Returned'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FiXCircle className="w-4 h-4" />
          <span>2. Returns & Defective Parts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'Returned' ? 'bg-slate-950 text-rose-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {tabCounts.returned}
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

      {/* Notifications & Delivery Alerts Panel */}
      {notifications.length > 0 && (
        <div className="p-4 bg-slate-900 border border-cyan-500/20 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiBell className="w-4 h-4" />
              <span>Purchase Order Delivery & Fulfillment Alerts</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
              {notifications.length} Active Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  n.type === 'warning'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : n.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : n.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1.5">
                    {n.type === 'warning' ? (
                      <FiClock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : n.type === 'success' ? (
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <FiXCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span>{n.title}</span>
                  </span>
                  {n.date && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.date).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-90">{n.message}</p>
              </div>
            ))}
          </div>
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
            placeholder="Search PO number, buyer, remarks..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto text-xs">
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
            <option value="Ordered">Ordered</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        emptyMessage={
          activeTab === 'Arriving'
            ? 'No arriving component orders found. Order components from BOM to track arriving parts.'
            : 'No returned or defective parts records found.'
        }
        pagination={pagination}
        onPageChange={(page) => fetchPurchases(page)}
      />

      {/* Create PO Modal (Full CRUD) */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Purchase Order"
        subtitle="Generate Purchase Order from Project BOM components"
      >
        <form onSubmit={handleCreatePOSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Select Target Project <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                loadBOMForCreatePO(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              PO Number (Optional - Auto generated if empty)
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-0001"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Procurement Mode
              </label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Supplier / Buyer
              </label>
              <select
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {buyers.map((b) => (
                  <option key={b._id} value={b.name}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
              General Expected Delivery Date
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Remarks / Order Notes
            </label>
            <input
              type="text"
              value={poRemarks}
              onChange={(e) => setPoRemarks(e.target.value)}
              placeholder="e.g. Order placed via Amazon Business"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* BOM Items Checkbox List with Per-Item Delivery Date */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="font-bold text-cyan-400">
                Components Checkbox Selection ({bomItems.filter((i) => selectedBOMItemIds.includes(i._id)).length} of {bomItems.length} selected):
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedBOMItemIds.length === bomItems.length) setSelectedBOMItemIds([]);
                  else setSelectedBOMItemIds(bomItems.map((i) => i._id));
                }}
                className="text-[10px] text-cyan-400 hover:underline font-bold"
              >
                {selectedBOMItemIds.length === bomItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 text-slate-300 pr-1">
              {bomItems.length === 0 ? (
                <p className="text-slate-500 text-center py-2">No BOM items found for this project.</p>
              ) : (
                bomItems.map((item) => {
                  const isChecked = selectedBOMItemIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      className={`p-2.5 rounded-lg border transition ${
                        isChecked ? 'bg-slate-900 border-cyan-500/40' : 'bg-slate-950 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer font-semibold text-white">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBOMItemIds([...selectedBOMItemIds, item._id]);
                              else setSelectedBOMItemIds(selectedBOMItemIds.filter((id) => id !== item._id));
                            }}
                            className="w-4 h-4 text-cyan-500 rounded border-slate-700 bg-slate-950 focus:ring-cyan-500"
                          />
                          <span>
                            <strong className="text-cyan-400 font-mono">[{item.stage || 'Stage 1'}]</strong> {item.bomItemNumber} - {item.itemDescription} ({item.quantity} {item.unit || 'Pcs'})
                          </span>
                        </label>
                        <span className="text-emerald-400 font-bold">₹{(item.quantity * item.actualPrice).toLocaleString('en-IN')}</span>
                      </div>

                      {isChecked && (
                        <div className="flex items-center space-x-2 pt-1 pl-6">
                          <span className="text-[10px] text-slate-400 uppercase font-mono shrink-0">Item Delivery Date:</span>
                          <input
                            type="date"
                            value={itemDeliveryDates[item._id] || expectedDeliveryDate || ''}
                            onChange={(e) =>
                              setItemDeliveryDates((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Confirm & Create PO
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete PO Confirmation Modal */}
      <Modal
        isOpen={!!deletePOId}
        onClose={() => setDeletePOId(null)}
        title="Confirm Purchase Order Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Are you sure you want to delete this Purchase Order record? This will revert linked BOM components status.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletePOId(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePOConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-extrabold hover:bg-rose-500 cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit PO Modal */}
      <Modal
        isOpen={!!editPO}
        onClose={() => setEditPO(null)}
        title={`Edit PO Delivery & Status: ${editPO?.purchaseNumber}`}
        subtitle={`Project: ${editPO?.project?.name}`}
      >
        <form onSubmit={handleUpdatePO} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={editForm.expectedDeliveryDate}
              onChange={(e) => setEditForm({ ...editForm, expectedDeliveryDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Setting this date triggers automated notifications on topbar and delivery alerts banner.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Purchase Status
            </label>
            <select
              value={editForm.purchaseStatus}
              onChange={(e) => setEditForm({ ...editForm, purchaseStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="Ordered">Ordered</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received (All Items In Stock)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Remarks / Fulfillment Notes
            </label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              placeholder="e.g. Shipment dispatched via BlueDart tracking #12345"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditPO(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* View PO Document Modal */}
      <Modal
        isOpen={!!viewPO}
        onClose={() => setViewPO(null)}
        title={`Purchase Order: ${viewPO?.purchaseNumber}`}
        subtitle={`Project: ${viewPO?.project?.name} (${viewPO?.project?.code})`}
      >
        {viewPO && (
          <div className="space-y-6">
            {/* PO Document Header */}
            <div className="p-6 bg-slate-950 border border-cyan-500/20 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="text-xl font-extrabold text-white">G ELECTRONICS</h3>
                  <p className="text-xs text-cyan-400 font-mono font-bold">PURCHASE ORDER DOCUMENT</p>
                </div>
                <div className="sm:text-right">
                  <div className="text-lg font-mono font-bold text-cyan-400">{viewPO.purchaseNumber}</div>
                  <div className="text-xs text-slate-400">
                    Date: {new Date(viewPO.purchaseDate || viewPO.createdAt).toLocaleDateString()}
                  </div>
                  {viewPO.expectedDeliveryDate && (
                    <div className="text-xs text-cyan-400 font-mono font-semibold mt-0.5 flex items-center space-x-1 justify-end">
                      <FiClock className="w-3.5 h-3.5" />
                      <span>Expected Delivery: {new Date(viewPO.expectedDeliveryDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Supplier / Buyer:</span>
                  <div className="font-bold text-white text-sm mt-0.5">{viewPO.buyerName}</div>
                  <div className="text-cyan-400 font-mono font-semibold">{viewPO.procurementMode} Procurement</div>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Fulfillment Status:</span>
                  <div className="mt-0.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      {viewPO.purchaseStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PO Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Purchased Components & Per-Item Delivery Schedule
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">BOM No.</th>
                      <th className="p-3">Component</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Delivery Date</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Line Total & Store Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {viewPO.items?.map((item, idx) => {
                      const itemDel = item.expectedDeliveryDate || viewPO.expectedDeliveryDate;
                      return (
                        <tr key={idx}>
                          <td className="p-3 font-mono text-cyan-400 font-bold">{item.bomItemNumber}</td>
                          <td className="p-3 font-semibold">
                            <div className="flex items-center space-x-2.5">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.itemDescription}
                                  onClick={() => openImagePreview(item.imageUrl, item.itemDescription, item.modelNumber, item.imageUrls)}
                                  className="w-9 h-9 object-cover rounded-lg border border-cyan-500/20 cursor-pointer hover:scale-105 transition"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-500 shrink-0">
                                  <FiCpu className="w-4 h-4" />
                                </div>
                              )}
                              <span>{item.itemDescription}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono">{item.modelNumber || '-'}</td>
                          <td className="p-3 font-bold">{item.orderedQuantity} {item.unit || 'Pcs'}</td>
                          <td className="p-3 font-mono text-cyan-400/90 font-semibold">
                            {itemDel ? new Date(itemDel).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="p-3">₹{item.actualPrice}</td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-emerald-400">
                              ₹{(item.totalPrice || item.orderedQuantity * item.actualPrice).toLocaleString('en-IN')}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setViewPO(null);
                                navigate('/stock');
                              }}
                              className="mt-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 rounded-lg text-[10px] font-extrabold inline-flex items-center space-x-1 cursor-pointer transition"
                            >
                              <FiLayers className="w-3 h-3" />
                              <span>Receive Part to Store</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document Total */}
            <div className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs font-bold text-slate-300 uppercase">Grand Total Amount</span>
              <span className="text-xl font-extrabold text-emerald-400">
                ₹{(viewPO.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Print action */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-2 cursor-pointer"
              >
                <FiPrinter className="w-4 h-4" />
                <span>Print PO</span>
              </button>
              <button
                onClick={() => setViewPO(null)}
                className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Part Receive & Quality Inspection Modal */}
      <Modal
        isOpen={!!inspectPO}
        onClose={() => setInspectPO(null)}
        title="Part Quality Inspection & Receiving"
        subtitle={`Supplier: ${inspectPO?.buyerName || ''} (${inspectPO?.procurementMode || ''}) | Project: ${inspectPO?.project?.name || ''}`}
      >
        {inspectPO && (
          <form onSubmit={handleSubmitInspection} className="space-y-4">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center space-x-3">
                {inspectPO.items?.[0]?.imageUrls?.length > 0 ? (
                  <img
                    src={inspectPO.items[0].imageUrls[0]}
                    alt={inspectPO.items[0].itemDescription}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded-xl border border-cyan-500/30 bg-slate-900"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_IMAGE_DATA_URI;
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-500 shrink-0">
                    <FiCpu className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-white text-sm">
                    {inspectPO.items?.[0]?.itemDescription || 'Electronic Component'}
                  </h4>
                  {inspectPO.items?.[0]?.modelNumber && (
                    <p className="text-xs text-cyan-400 font-mono">Model: {inspectPO.items[0].modelNumber}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Ordered Qty: <strong className="text-white">{inspectPO.items?.[0]?.orderedQuantity || 1} {inspectPO.items?.[0]?.unit || 'Pcs'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Quality Inspection Checklist Header */}
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pt-1">
              <FiCheckCircle className="w-4 h-4" />
              <span>Quality & Physical Inspection Checklist:</span>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 border border-cyan-500/20 rounded-xl">
              {/* 1. Part Match Check */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-white block">1. Part Specification Check</span>
                  <span className="text-[10px] text-slate-400">Does delivered item match required component specs?</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, partMatch: 'Pass' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.partMatch === 'Pass'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✓ Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, partMatch: 'Fail' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.partMatch === 'Fail'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✕ Fail
                  </button>
                </div>
              </div>

              {/* 2. Model / MPN Check */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-white block">2. Model / MPN Match Check</span>
                  <span className="text-[10px] text-slate-400">Does part number / model code match requisition?</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, modelMatch: 'Pass' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.modelMatch === 'Pass'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✓ Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, modelMatch: 'Fail' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.modelMatch === 'Fail'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✕ Fail
                  </button>
                </div>
              </div>

              {/* 3. Physical Damage Check */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">3. Physical Damage Inspection</span>
                  <span className="text-[10px] text-slate-400">Check for package damage, bent pins, or broken parts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, physicalDamage: 'No Damage' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.physicalDamage === 'No Damage'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✓ No Damage
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectionForm({ ...inspectionForm, physicalDamage: 'Damaged' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      inspectionForm.physicalDamage === 'Damaged'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ⚠ Damaged
                  </button>
                </div>
              </div>
            </div>

            {/* Received Qty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Received Quantity ({inspectPO.items?.[0]?.unit || 'Pcs'})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inspectionForm.receivedQuantity}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, receivedQuantity: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Conditional Return Reason if inspection fails */}
              {(inspectionForm.partMatch === 'Fail' || inspectionForm.modelMatch === 'Fail' || inspectionForm.physicalDamage === 'Damaged') && (
                <div>
                  <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
                    Return Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectionForm.returnReason}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, returnReason: e.target.value })}
                    placeholder="e.g. Physical damage during transit / wrong MPN shipped"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-rose-500/50 rounded-xl text-xs text-rose-300 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Inspection Notes / Remarks
              </label>
              <input
                type="text"
                value={inspectionForm.remarks}
                onChange={(e) => setInspectionForm({ ...inspectionForm, remarks: e.target.value })}
                placeholder="e.g. Package opened and tested OK"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectPO(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              {inspectionForm.partMatch === 'Pass' && inspectionForm.modelMatch === 'Pass' && inspectionForm.physicalDamage === 'No Damage' ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center space-x-1"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Pass & Receive to Store</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-rose-600/20 cursor-pointer flex items-center space-x-1"
                >
                  <FiXCircle className="w-4 h-4" />
                  <span>Fail & Send for Return</span>
                </button>
              )}
            </div>
          </form>
        )}
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

export default Purchases;
