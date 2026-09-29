import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import ImageModal from '../components/common/ImageModal';
import {
  FALLBACK_IMAGE_DATA_URI,
  QUANTITY_UNITS,
  fileToBase64,
} from '../utils/imageUtils';
import {
  getStageBadgeStyle,
  DEFAULT_STAGES,
  getStagePillColor,
} from '../utils/stageUtils';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiShoppingBag,
  FiCpu,
  FiAlertCircle,
  FiCheckCircle,
  FiSearch,
  FiFolder,
  FiList,
  FiImage,
  FiExternalLink,
  FiUpload,
  FiLayers,
} from 'react-icons/fi';

const BOM = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [projectData, setProjectData] = useState(null);
  const [bomItems, setBomItems] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // Modal State for Add/Edit BOM Item
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [editingBOMItem, setEditingBOMItem] = useState(null);
  const [bomForm, setBomForm] = useState({
    bomItemNumber: '',
    itemDescription: '',
    modelNumber: '',
    imageUrl: '',
    imageUrls: [''],
    quantity: 1,
    unit: 'Pcs',
    approxPrice: 0,
    actualPrice: 0,
    procurementMode: 'Online',
    buyerName: 'Amazon',
    isAccessory: false,
    stage: 'Stage 1',
  });

  // Single Item Order Modal State
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [itemToOrder, setItemToOrder] = useState(null);
  const [orderExpectedDate, setOrderExpectedDate] = useState('');
  const [orderBuyerName, setOrderBuyerName] = useState('Amazon');
  const [orderProcurementMode, setOrderProcurementMode] = useState('Online');
  const [orderRemarks, setOrderRemarks] = useState('');

  const handleOpenOrderModal = (item) => {
    setItemToOrder(item);
    const future = new Date();
    future.setDate(future.getDate() + 3);
    setOrderExpectedDate(future.toISOString().split('T')[0]);
    setOrderBuyerName(item.buyerName || (buyers.length > 0 ? buyers[0].name : 'Amazon'));
    setOrderProcurementMode(item.procurementMode || 'Online');
    setOrderRemarks('');
    setOrderModalOpen(true);
  };

  const handleConfirmOrderSingle = async (e) => {
    e.preventDefault();
    if (!itemToOrder) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await api.post('/purchases', {
        projectId: selectedProjectId,
        buyerName: orderBuyerName,
        procurementMode: orderProcurementMode,
        expectedDeliveryDate: orderExpectedDate,
        items: [
          {
            bomItemId: itemToOrder._id,
            orderedQuantity: itemToOrder.quantity,
            actualPrice: itemToOrder.actualPrice,
            expectedDeliveryDate: orderExpectedDate,
          },
        ],
        remarks: orderRemarks || `Ordered BOM component ${itemToOrder.bomItemNumber}`,
      });

      setOrderModalOpen(false);
      setSuccessMsg(`Component '${itemToOrder.itemDescription}' ordered! Delivery date set to ${orderExpectedDate}. Sent to Purchases.`);
      fetchBOMForProject();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to place order for BOM component.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image Lightbox Modal State
  const [previewImage, setPreviewImage] = useState({
    isOpen: false,
    url: '',
    imageUrls: [],
    title: '',
    model: '',
  });

  const handleOpenImagePreview = (url, title, model, imageUrlsList = []) => {
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

  // Delete Modal State
  const [deleteBOMId, setDeleteBOMId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // Load all projects for dropdown selector
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects', { params: { limit: 100 } });
        setProjects(res.data.projects || []);
        if (!selectedProjectId && res.data.projects?.length > 0) {
          setSelectedProjectId(res.data.projects[0]._id);
        }
      } catch (err) {
        console.error('[BOM fetch projects error]:', err);
      }
    };
    fetchProjects();

    const fetchBuyers = async () => {
      try {
        const buyersRes = await api.get('/buyers', { params: { isEnabled: true } });
        setBuyers(buyersRes.data || []);
      } catch (err) {
        console.error('[BOM fetch buyers error]:', err);
      }
    };
    fetchBuyers();
  }, []);

  // Fetch BOM Items when selected project or filters change
  const fetchBOMForProject = async () => {
    if (!selectedProjectId) {
      setProjectData(null);
      setBomItems([]);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/projects/${selectedProjectId}`);
      setProjectData(res.data);

      const bomRes = await api.get(`/projects/${selectedProjectId}/bom`, {
        params: {
          search,
          procurementMode: modeFilter !== 'All' ? modeFilter : undefined,
          purchaseStatus: statusFilter !== 'All' ? statusFilter : undefined,
          stage: stageFilter !== 'All' ? stageFilter : undefined,
        },
      });
      const items = bomRes.data || [];
      setBomItems(items);
    } catch (err) {
      console.error('[BOM fetch error]:', err);
      setErrorMsg('Failed to load BOM components for selected project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBOMForProject();
  }, [selectedProjectId, search, modeFilter, statusFilter, stageFilter]);

  const handleProjectSelect = (projId) => {
    setSelectedProjectId(projId);
    setSearchParams(projId ? { projectId: projId } : {});
  };

  const handleOpenAddModal = () => {
    if (!selectedProjectId) {
      setErrorMsg('Please select or create a project first.');
      return;
    }
    setEditingBOMItem(null);
    setBomForm({
      bomItemNumber: '',
      itemDescription: '',
      modelNumber: '',
      imageUrl: '',
      imageUrls: [''],
      quantity: 1,
      unit: 'Pcs',
      approxPrice: 0,
      actualPrice: 0,
      procurementMode: 'Online',
      buyerName: buyers.length > 0 ? buyers[0].name : 'Amazon',
      isAccessory: false,
      stage: 'Stage 1',
    });
    setIsBOMModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingBOMItem(item);
    const imgs =
      item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls
        : item.imageUrl
        ? [item.imageUrl]
        : [''];
    setBomForm({
      bomItemNumber: item.bomItemNumber,
      itemDescription: item.itemDescription,
      modelNumber: item.modelNumber || '',
      imageUrl: item.imageUrl || '',
      imageUrls: imgs,
      quantity: item.quantity,
      unit: item.unit || 'Pcs',
      approxPrice: item.approxPrice || 0,
      actualPrice: item.actualPrice || 0,
      procurementMode: item.procurementMode || 'Online',
      buyerName: item.buyerName || '',
      isAccessory: Boolean(item.isAccessory),
      stage: item.stage || 'Stage 1',
    });
    setIsBOMModalOpen(true);
  };

  const handleAddImageField = () => {
    setBomForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
  };

  const handleImageUrlChange = (index, value) => {
    setBomForm((prev) => {
      const updated = [...prev.imageUrls];
      updated[index] = value;
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleRemoveImageField = (index) => {
    setBomForm((prev) => {
      const updated = prev.imageUrls.filter((_, i) => i !== index);
      const finalImgs = updated.length > 0 ? updated : [''];
      return {
        ...prev,
        imageUrls: finalImgs,
        imageUrl: finalImgs[0] || '',
      };
    });
  };

  const handleImageFileUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        handleImageUrlChange(index, base64);
      } catch (err) {
        console.error('[Image File Upload Error]:', err);
      }
    }
  };

  const handleSaveBOMItem = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!bomForm.itemDescription.trim()) {
      setErrorMsg('Item Description is required');
      return;
    }

    if (Number(bomForm.quantity) <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingBOMItem) {
        await api.put(`/projects/bom/${editingBOMItem._id}`, bomForm);
        setSuccessMsg('BOM component updated successfully');
      } else {
        await api.post(`/projects/${selectedProjectId}/bom`, bomForm);
        setSuccessMsg('BOM component added successfully');
      }
      setIsBOMModalOpen(false);
      fetchBOMForProject();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save BOM component.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBOM = async () => {
    if (!deleteBOMId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/projects/bom/${deleteBOMId}`);
      setDeleteBOMId(null);
      setSuccessMsg('BOM component deleted');
      fetchBOMForProject();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete BOM component.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const project = projectData?.project;
  const totals = projectData?.totals || { totalActual: 0, itemCount: 0 };

  const columns = [
    {
      header: 'Item No.',
      cell: (row) => <span className="font-mono text-cyan-400 font-extrabold text-xs">{row.bomItemNumber}</span>,
    },
    {
      header: 'Component Details',
      cell: (row) => {
        const imgList = row.imageUrls && row.imageUrls.length > 0 ? row.imageUrls : row.imageUrl ? [row.imageUrl] : [];
        return (
          <div className="flex items-center space-x-3">
            {imgList.length > 0 ? (
              <div
                onClick={() => handleOpenImagePreview(row.imageUrl, row.itemDescription, row.modelNumber, imgList)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view slideshow preview & original links"
              >
                <img
                  src={imgList[0]}
                  alt={row.itemDescription}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 object-cover rounded-xl border border-cyan-500/30 bg-slate-950 shadow group-hover:scale-105 group-hover:border-cyan-400 transition"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_IMAGE_DATA_URI;
                  }}
                />
                {imgList.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-slate-950 shadow">
                    +{imgList.length}
                  </span>
                )}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                  <FiImage className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-500 shrink-0 shadow">
                <FiCpu className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-white text-sm">{row.itemDescription}</span>
              {row.modelNumber && (
                <p className="text-[11px] text-cyan-400 font-mono font-semibold mt-0.5">Model: {row.modelNumber}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Stage',
      cell: (row) => (
        <span
          className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold font-mono inline-flex items-center space-x-1.5 ${getStageBadgeStyle(
            row.stage
          )}`}
        >
          <FiLayers className="w-3 h-3 shrink-0" />
          <span>{row.stage || 'Stage 1'}</span>
        </span>
      ),
    },
    {
      header: 'Qty & Unit',
      cell: (row) => (
        <div>
          <span className="font-extrabold text-white text-sm">{row.quantity}</span>
          <span className="text-cyan-400 font-bold text-xs ml-1 font-mono">{row.unit || 'Pcs'}</span>
        </div>
      ),
    },
    {
      header: 'Price (₹)',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
            <span>Approx: ₹{(row.approxPrice || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Tot: ₹{(row.approxLineTotal || row.quantity * (row.approxPrice || 0)).toLocaleString('en-IN')})
            </span>
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
            <span>Actual: ₹{(row.actualPrice || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-300/80 font-normal">
              (Tot: ₹{(row.actualLineTotal || row.quantity * (row.actualPrice || 0)).toLocaleString('en-IN')})
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Supplier & Mode',
      cell: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-200">{row.buyerName || 'Unassigned'}</span>
          <p className="text-[10px] text-cyan-400 font-mono font-semibold">{row.procurementMode}</p>
        </div>
      ),
    },
    {
      header: 'Purchase Status',
      cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
            row.purchaseStatus === 'Received'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : row.purchaseStatus === 'Ordered'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : row.purchaseStatus === 'Partially Received'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
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
        const isOrdered = ['Ordered', 'Partially Received', 'Received'].includes(row.purchaseStatus);
        return (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isOrdered ? (
              <button
                disabled
                className="px-2.5 py-1 bg-slate-800 text-slate-500 rounded-lg text-xs font-bold border border-slate-700 cursor-not-allowed opacity-60 flex items-center space-x-1 shrink-0"
                title="Component is already ordered"
              >
                <FiCheckCircle className="w-3 h-3 text-emerald-500" />
                <span>Ordered</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenOrderModal(row)}
                className="px-3 py-1 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-lg text-xs shadow-md shadow-cyan-500/20 flex items-center space-x-1 cursor-pointer transition shrink-0"
                title="Place Purchase Order for this component"
              >
                <FiShoppingBag className="w-3.5 h-3.5" />
                <span>Order</span>
              </button>
            )}
            <button
              onClick={() => handleOpenEditModal(row)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
              title="Edit BOM Component"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteBOMId(row._id)}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer"
              title="Delete BOM Component"
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FiList className="w-6 h-6 text-cyan-400" />
            <span>Bill of Materials (BOM)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage electronic components, item image links, quantity requirements, and total costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/projects/new"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Project</span>
          </Link>

          {selectedProjectId && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add BOM Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Project Selector Bar */}
      <div className="p-5 bg-slate-900 border border-cyan-500/20 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-96 space-y-1.5">
            <label className="flex text-xs font-bold text-cyan-400 uppercase tracking-wider items-center gap-1.5">
              <FiFolder className="w-4 h-4" />
              <span>Select Project for BOM Workspace:</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="" disabled>
                -- Select an Electronics Project --
              </option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code}) [{p.status}]
                </option>
              ))}
            </select>
          </div>

          {project && (
            <div className="flex flex-wrap items-center gap-4 bg-slate-950 p-3.5 px-5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Selected Project</span>
                <span className="text-sm font-extrabold text-white">{project.name}</span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Code</span>
                <span className="text-xs font-mono text-cyan-400 font-bold">{project.code}</span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
                <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full font-semibold">
                  {project.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="py-20 text-center bg-slate-900/50 border border-dashed border-cyan-500/20 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <FiFolder className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Project Selected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please select an existing project from the dropdown above or create a new project to start adding BOM components.
          </p>
          <Link
            to="/projects/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create New Project</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-cyan-500/10 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, model, buyer, stage..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <FiLayers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Stage:</span>
                </span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                >
                  <option value="All">All Stages</option>
                  {Array.from(
                    new Set([...DEFAULT_STAGES, ...bomItems.map((i) => i.stage).filter(Boolean)])
                  ).map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="All">All Modes</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold">Purchase:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="All">All Statuses</option>
                  <option value="Not Purchased">Not Purchased</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Partially Received">Partially Received</option>
                  <option value="Received">Received</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stage-wise Highlight Filter Bar */}
          <div className="p-3.5 bg-slate-900 border border-cyan-500/20 rounded-2xl flex flex-wrap items-center gap-2 shadow-lg">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <FiLayers className="w-4 h-4 text-cyan-400" />
              <span>Stages Highlight:</span>
            </span>
            <button
              type="button"
              onClick={() => setStageFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center space-x-1.5 ${
                stageFilter === 'All'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>All Stages</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                {bomItems.length}
              </span>
            </button>
            {Array.from(
              new Set([...DEFAULT_STAGES, ...bomItems.map((i) => i.stage).filter(Boolean)])
            ).map((stg) => {
              const stageItems = bomItems.filter((i) => (i.stage || 'Stage 1') === stg);
              const isSelected = stageFilter === stg;
              const pillColors = getStagePillColor(stg);
              return (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setStageFilter(isSelected ? 'All' : stg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center space-x-1.5 ${
                    isSelected ? pillColors.active : pillColors.inactive
                  }`}
                >
                  <span>{stg}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                    {stageItems.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* BOM Items Table */}
          <DataTable
            columns={columns}
            data={bomItems}
            loading={loading}
            emptyMessage="No BOM components added for this project yet"
            emptyAction={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl inline-flex items-center space-x-2"
              >
                <FiPlus className="w-4 h-4" />
                <span>Add First Component</span>
              </button>
            }
          />

          {/* Project Totals Summary Footer */}
          <div className="p-6 bg-slate-900 border border-cyan-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-2xl text-slate-950 font-black">
                <FiCpu className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Project Total BOM Cost</h4>
                <p className="text-xs text-slate-400">
                  Aggregated total for {totals.itemCount || 0} BOM component records
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="p-3 px-5 bg-slate-950 border border-cyan-500/30 rounded-xl text-right">
                <div className="text-[10px] text-cyan-400 font-bold uppercase">Total Approx Cost</div>
                <div className="text-lg font-extrabold text-cyan-300">
                  ₹{(totals.totalApprox !== undefined ? totals.totalApprox : bomItems.reduce((acc, item) => acc + (item.approxLineTotal || (item.quantity * (item.approxPrice || 0))), 0)).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 px-5 bg-slate-950 border border-emerald-500/30 rounded-xl text-right">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Total Actual Cost</div>
                <div className="text-xl font-extrabold text-emerald-400">
                  ₹{(totals.totalActual || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit BOM Component Modal */}
      <Modal
        isOpen={isBOMModalOpen}
        onClose={() => setIsBOMModalOpen(false)}
        title={editingBOMItem ? 'Edit BOM Component' : 'Add BOM Component'}
        subtitle={`Project: ${project?.name} (${project?.code})`}
      >
        <form onSubmit={handleSaveBOMItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                BOM Item Number
              </label>
              <input
                type="text"
                value={bomForm.bomItemNumber}
                onChange={(e) => setBomForm({ ...bomForm, bomItemNumber: e.target.value })}
                placeholder="e.g. BOM-001 (Auto generated if blank)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 uppercase focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Item Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bomForm.itemDescription}
                onChange={(e) => setBomForm({ ...bomForm, itemDescription: e.target.value })}
                placeholder="e.g. ESP32 Development Board, 4G Module"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Stage / Assembly Phase Field */}
          <div className="p-3 bg-slate-950 border border-cyan-500/25 rounded-2xl space-y-2">
            <label className="flex text-xs font-bold text-cyan-400 uppercase tracking-wider items-center gap-1.5">
              <FiLayers className="w-4 h-4" />
              <span>Assembly Stage / Phase <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={bomForm.stage}
              onChange={(e) => setBomForm({ ...bomForm, stage: e.target.value })}
              placeholder="Type stage manually (e.g. Stage 1, Stage 2, Prototype...)"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-cyan-500/40 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-bold font-mono"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Select Stage:</span>
              {DEFAULT_STAGES.map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setBomForm({ ...bomForm, stage: stg })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                    bomForm.stage === stg
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {stg}
                </button>
              ))}
            </div>
          </div>

          {/* Item Image Links Section with + and Delete per row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex text-xs font-semibold text-cyan-400 uppercase tracking-wider items-center gap-1.5">
                <FiImage className="w-3.5 h-3.5" />
                <span>Component Image Links ({bomForm.imageUrls.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddImageField}
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Add Image Link</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {bomForm.imageUrls.map((urlVal, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-500 w-5 shrink-0">#{idx + 1}</span>
                  <input
                    type="text"
                    value={urlVal}
                    onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                    placeholder={`Paste image URL #${idx + 1} (https://...)`}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <label className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer shrink-0 transition" title="Upload Image File">
                    <FiUpload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(idx, e)}
                      className="hidden"
                    />
                  </label>
                  {bomForm.imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImageField(idx)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-white rounded-xl cursor-pointer shrink-0 transition"
                      title="Delete Image Link"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Previews Strip */}
            {bomForm.imageUrls.filter((u) => u && u.trim()).length > 0 && (
              <div className="p-3 bg-slate-950 border border-cyan-500/25 rounded-xl space-y-2 animate-fade-in">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                  <span>✓ {bomForm.imageUrls.filter((u) => u && u.trim()).length} Image(s) Attached</span>
                  <span className="text-slate-400 font-normal">Will work as interactive slideshow</span>
                </div>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {bomForm.imageUrls
                    .filter((u) => u && u.trim())
                    .map((url, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img
                          src={url}
                          alt={`Preview ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-lg border border-cyan-500/30 bg-slate-900"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_IMAGE_DATA_URI;
                          }}
                        />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition"
                          title="Open original link"
                        >
                          <FiExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Model Name / Number
              </label>
              <input
                type="text"
                value={bomForm.modelNumber}
                onChange={(e) => setBomForm({ ...bomForm, modelNumber: e.target.value })}
                placeholder="e.g. ESP32-WROOM-32"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Quantity & Unit <span className="text-rose-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={bomForm.quantity}
                  onChange={(e) => setBomForm({ ...bomForm, quantity: e.target.value })}
                  className="w-2/3 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-extrabold"
                />
                <select
                  value={bomForm.unit || 'Pcs'}
                  onChange={(e) => setBomForm({ ...bomForm, unit: e.target.value })}
                  className="w-1/3 px-2 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
                >
                  {QUANTITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Approx. Unit Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bomForm.approxPrice}
                onChange={(e) => setBomForm({ ...bomForm, approxPrice: e.target.value })}
                placeholder="e.g. 150"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono font-semibold"
              />
              <p className="text-[10px] text-cyan-400 font-semibold mt-1">
                Approx Total: ₹{(Number(bomForm.quantity || 0) * Number(bomForm.approxPrice || 0)).toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Actual Unit Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bomForm.actualPrice}
                onChange={(e) => setBomForm({ ...bomForm, actualPrice: e.target.value })}
                placeholder="e.g. 140"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                Actual Total: ₹{(Number(bomForm.quantity || 0) * Number(bomForm.actualPrice || 0)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Procurement Mode
            </label>
            <select
              value={bomForm.procurementMode}
              onChange={(e) => setBomForm({ ...bomForm, procurementMode: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              {bomForm.procurementMode === 'Online' ? 'Online Supplier' : 'Offline Supplier / Vendor'}
            </label>
            {bomForm.procurementMode === 'Online' ? (
              <select
                value={bomForm.buyerName}
                onChange={(e) => setBomForm({ ...bomForm, buyerName: e.target.value })}
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
                value={bomForm.buyerName}
                onChange={(e) => setBomForm({ ...bomForm, buyerName: e.target.value })}
                placeholder="e.g. Local Electronics Market Vendor"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            )}
          </div>

          {/* Accessories Classification Toggle */}
          <div className="p-3.5 bg-slate-950 border border-cyan-500/25 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-cyan-400 flex items-center gap-1.5">
                🔌 Mark as Accessory Item
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                If enabled, after quality inspection passes in Purchases, this item will automatically be added to Accessories Inventory.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={bomForm.isAccessory || false}
                onChange={(e) => setBomForm({ ...bomForm, isAccessory: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBOMModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {editingBOMItem ? 'Update Component' : 'Add Component'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete BOM Modal */}
      <Modal
        isOpen={!!deleteBOMId}
        onClose={() => setDeleteBOMId(null)}
        title="Confirm BOM Item Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to remove this BOM component from the project?
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteBOMId(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteBOM}
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Single Item Order Modal */}
      <Modal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title={`Order BOM Component: ${itemToOrder?.bomItemNumber || ''}`}
        subtitle={`Project: ${project?.name} (${project?.code})`}
      >
        <form onSubmit={handleConfirmOrderSingle} className="space-y-4">
          <div className="p-3.5 bg-slate-950 border border-cyan-500/20 rounded-xl space-y-2">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>{itemToOrder?.itemDescription}</span>
              <span className="text-cyan-400 font-mono">{itemToOrder?.modelNumber ? `Model: ${itemToOrder.modelNumber}` : ''}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Required Qty: <strong className="text-white">{itemToOrder?.quantity} {itemToOrder?.unit || 'Pcs'}</strong></span>
              <span className="text-emerald-400 font-bold">Total Price: ₹{((itemToOrder?.quantity || 0) * (itemToOrder?.actualPrice || 0)).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
              Expected Delivery Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={orderExpectedDate}
              onChange={(e) => setOrderExpectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-500/40 rounded-xl text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Entered expected delivery date will lock status to "Ordered" and send record to Purchases.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Supplier / Buyer
              </label>
              <select
                value={orderBuyerName}
                onChange={(e) => setOrderBuyerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {buyers.map((b) => (
                  <option key={b._id} value={b.name}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Procurement Mode
              </label>
              <select
                value={orderProcurementMode}
                onChange={(e) => setOrderProcurementMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Order Remarks / Tracking Notes
            </label>
            <input
              type="text"
              value={orderRemarks}
              onChange={(e) => setOrderRemarks(e.target.value)}
              placeholder="e.g. Ordered on Amazon Business order #405-1234567"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setOrderModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Confirm & Order Component
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Lightbox Modal */}
      <ImageModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ ...previewImage, isOpen: false })}
        imageUrl={previewImage.url}
        imageUrls={previewImage.imageUrls}
        title={previewImage.title}
        modelNumber={previewImage.model}
      />
    </div>
  );
};

export default BOM;
