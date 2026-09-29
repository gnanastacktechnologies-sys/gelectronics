import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  FiArrowLeft,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiShoppingBag,
  FiCpu,
  FiAlertCircle,
  FiCheckCircle,
  FiSearch,
  FiImage,
  FiExternalLink,
  FiUpload,
  FiLayers,
} from 'react-icons/fi';

const ProjectDetails = () => {
  const { id: projectId } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [bomItems, setBomItems] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // BOM Modal State
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
    actualPrice: 0,
    procurementMode: 'Online',
    buyerName: 'Amazon',
    stage: 'Stage 1',
  });

  // Purchase Order Trigger Modal
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('Amazon');
  const [selectedMode, setSelectedMode] = useState('Online');
  const [poRemarks, setPoRemarks] = useState('');

  // Delete Modal State
  const [deleteBOMId, setDeleteBOMId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const navigate = useNavigate();

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/projects/${projectId}`);
      setProjectData(res.data);

      const bomRes = await api.get(`/projects/${projectId}/bom`, {
        params: {
          search,
          procurementMode: modeFilter !== 'All' ? modeFilter : undefined,
          purchaseStatus: statusFilter !== 'All' ? statusFilter : undefined,
          stage: stageFilter !== 'All' ? stageFilter : undefined,
        },
      });
      setBomItems(bomRes.data || []);

      // Fetch Buyers
      const buyersRes = await api.get('/buyers', { params: { isEnabled: true } });
      setBuyers(buyersRes.data || []);
      if (buyersRes.data.length > 0 && !bomForm.buyerName) {
        setBomForm((prev) => ({ ...prev, buyerName: buyersRes.data[0].name }));
      }
    } catch (err) {
      console.error('[Project Details error]:', err);
      setErrorMsg('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId, search, modeFilter, statusFilter, stageFilter]);

  const handleOpenAddModal = () => {
    setEditingBOMItem(null);
    setBomForm({
      bomItemNumber: '',
      itemDescription: '',
      modelNumber: '',
      imageUrl: '',
      imageUrls: [''],
      quantity: 1,
      unit: 'Pcs',
      actualPrice: 0,
      procurementMode: 'Online',
      buyerName: buyers.length > 0 ? buyers[0].name : 'Amazon',
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
      actualPrice: item.actualPrice,
      procurementMode: item.procurementMode || 'Online',
      buyerName: item.buyerName || '',
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
        setSuccessMsg('BOM Component updated successfully');
      } else {
        await api.post(`/projects/${projectId}/bom`, bomForm);
        setSuccessMsg('BOM Component added successfully');
      }
      setIsBOMModalOpen(false);
      fetchProjectDetails();
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
      fetchProjectDetails();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete BOM component.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    if (bomItems.length === 0) {
      setErrorMsg('Cannot create Purchase Order for empty BOM list');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsToPurchase = bomItems.map((item) => ({
        bomItemId: item._id,
        orderedQuantity: item.quantity,
        actualPrice: item.actualPrice,
      }));

      const res = await api.post('/purchases', {
        purchaseNumber: poNumber.trim(),
        projectId,
        buyerName: selectedBuyer,
        procurementMode: selectedMode,
        items: itemsToPurchase,
        remarks: poRemarks,
      });

      setIsPOModalOpen(false);
      setSuccessMsg(`Purchase Order ${res.data.purchaseOrder.purchaseNumber} created!`);
      fetchProjectDetails();
      navigate('/purchases');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate Purchase Order.');
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
        <div>
          <span className="text-xs text-slate-300">Unit: ₹{(row.actualPrice || 0).toLocaleString('en-IN')}</span>
          <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
            Total: ₹{(row.actualLineTotal || row.quantity * row.actualPrice || 0).toLocaleString('en-IN')}
          </p>
        </div>
      ),
    },
    {
      header: 'Buyer & Mode',
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
      cell: (row) => (
        <div className="flex items-center justify-end space-x-2">
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
      ),
    },
  ];

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-400 font-medium">Loading project BOM workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/projects"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{project?.name}</h1>
              <span className="font-mono text-xs px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full font-bold">
                {project?.code}
              </span>
              <span className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-full font-semibold">
                {project?.status}
              </span>
            </div>
            {project?.description && (
              <p className="text-xs text-slate-400 mt-1">{project.description}</p>
            )}
          </div>
        </div>

        {/* Action Header Buttons */}
        <div>
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4 shrink-0" />
            <span>Add BOM Component</span>
          </button>
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

      {/* BOM Workspace Search and Filters */}
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

      {/* BOM Table */}
      <DataTable
        columns={columns}
        data={bomItems}
        loading={false}
        emptyMessage="No BOM components added to this project yet"
        emptyAction={
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl inline-flex items-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add First BOM Component</span>
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
              Aggregated for {totals.itemCount || 0} BOM component records
            </p>
          </div>
        </div>

        <div className="p-3 px-6 bg-slate-950 border border-cyan-500/20 rounded-xl text-right">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Total Cost</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹{(totals.totalActual || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Add / Edit BOM Modal */}
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Unit Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bomForm.actualPrice}
                onChange={(e) => setBomForm({ ...bomForm, actualPrice: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                Line Total: ₹{(Number(bomForm.quantity || 0) * Number(bomForm.actualPrice || 0)).toLocaleString('en-IN')}
              </p>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              {bomForm.procurementMode === 'Online' ? 'Online Buyer' : 'Offline Buyer / Vendor'}
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

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBOMModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {editingBOMItem ? 'Update Component' : 'Add Component'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Generate Purchase Order Modal */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        title="Generate Purchase Order"
        subtitle={`Project: ${project?.name} (${project?.code})`}
      >
        <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Purchase Order Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-0001 (Leave blank to auto-generate PO number)"
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
                Primary Buyer / Vendor
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Remarks / Order Notes
            </label>
            <input
              type="text"
              value={poRemarks}
              onChange={(e) => setPoRemarks(e.target.value)}
              placeholder="e.g. Expedited delivery requested for prototype testing"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <div className="font-bold text-cyan-400">Included BOM Items ({bomItems.length}):</div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-slate-300">
              {bomItems.map((item) => (
                <div key={item._id} className="flex justify-between border-b border-slate-800/40 pb-0.5">
                  <span>{item.bomItemNumber} - {item.itemDescription} (Qty: {item.quantity})</span>
                  <span className="text-emerald-400 font-semibold">₹{(item.quantity * item.actualPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPOModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Confirm & Create PO
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
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={() => setDeleteBOMId(null)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
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

export default ProjectDetails;
