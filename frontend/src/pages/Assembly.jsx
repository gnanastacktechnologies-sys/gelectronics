import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/common/Modal';
import ImageModal from '../components/common/ImageModal';
import { fileToBase64, FALLBACK_IMAGE_DATA_URI } from '../utils/imageUtils';
import {
  FiCpu,
  FiFolder,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiImage,
  FiTool,
  FiLayers,
  FiBox,
  FiArrowRight,
  FiShield,
  FiCheckSquare,
  FiHelpCircle,
  FiRefreshCw,
  FiEdit,
  FiTrash2,
  FiUpload,
  FiPlay,
  FiPause,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

const Assembly = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [stages, setStages] = useState([]);
  const [activeStageId, setActiveStageId] = useState('');
  const [loading, setLoading] = useState(true);

  // Store & Accessories for Pick Material modal
  const [storeStockItems, setStoreStockItems] = useState([]);
  const [accessoryItems, setAccessoryItems] = useState([]);

  // Auto-Slider state for Reference Diagrams
  const [isDiagramAutoPlay, setIsDiagramAutoPlay] = useState(true);
  const [diagramIndex, setDiagramIndex] = useState(0);

  // Modal states
  const [pickModalOpen, setPickModalOpen] = useState(false);
  const [newStageModalOpen, setNewStageModalOpen] = useState(false);
  const [editStageModalOpen, setEditStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [deleteStageModalOpen, setDeleteStageModalOpen] = useState(false);
  const [deletingStage, setDeletingStage] = useState(null);
  const [previewImage, setPreviewImage] = useState({ isOpen: false, imageUrls: [], title: '', model: '' });

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pick material form
  const [pickForm, setPickForm] = useState({
    itemType: 'Store', // 'Store' | 'Accessory'
    itemId: '',
    quantity: 1,
    usedBy: 'Technician',
  });

  // Create Stage form
  const [stageForm, setStageForm] = useState({
    stageName: '',
    subStageName: '',
    description: '',
    testingRequired: true,
    isFinalStage: false,
    referenceImages: [''],
    remarks: '',
  });

  const activeStage = stages.find((s) => s._id === activeStageId) || stages[0];
  const activeRefImgs = activeStage?.referenceImages?.filter((u) => typeof u === 'string' && u.trim().length > 0) || [];

  // Reset diagram index on active stage change
  useEffect(() => {
    setDiagramIndex(0);
  }, [activeStageId]);

  // Diagram Auto-Slider Timer (3.5 seconds interval)
  useEffect(() => {
    let timer;
    if (isDiagramAutoPlay && activeRefImgs.length > 1) {
      timer = setInterval(() => {
        setDiagramIndex((prev) => (prev + 1) % activeRefImgs.length);
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDiagramAutoPlay, activeStageId, activeRefImgs.length]);

  // Create Stage Diagram Link Handlers
  const handleAddStageImageLink = () => {
    setStageForm((prev) => ({
      ...prev,
      referenceImages: [...prev.referenceImages, ''],
    }));
  };

  const handleRemoveStageImageLink = (index) => {
    setStageForm((prev) => {
      const updated = prev.referenceImages.filter((_, i) => i !== index);
      return {
        ...prev,
        referenceImages: updated.length > 0 ? updated : [''],
      };
    });
  };

  const handleStageImageLinkChange = (index, value) => {
    setStageForm((prev) => {
      const updated = [...prev.referenceImages];
      updated[index] = value;
      return { ...prev, referenceImages: updated };
    });
  };

  const handleStageFileUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        handleStageImageLinkChange(index, base64);
      } catch (err) {
        console.error('[Stage Diagram File Upload Error]:', err);
      }
    }
  };

  // Edit Stage Diagram Link Handlers
  const handleEditAddImageLink = () => {
    setEditingStage((prev) => ({
      ...prev,
      referenceImages: [...(prev.referenceImages || []), ''],
    }));
  };

  const handleEditRemoveImageLink = (index) => {
    setEditingStage((prev) => {
      const updated = (prev.referenceImages || []).filter((_, i) => i !== index);
      return {
        ...prev,
        referenceImages: updated.length > 0 ? updated : [''],
      };
    });
  };

  const handleEditImageLinkChange = (index, value) => {
    setEditingStage((prev) => {
      const updated = [...(prev.referenceImages || [])];
      updated[index] = value;
      return { ...prev, referenceImages: updated };
    });
  };

  const handleEditFileUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        handleEditImageLinkChange(index, base64);
      } catch (err) {
        console.error('[Edit Diagram File Upload Error]:', err);
      }
    }
  };

  // Fetch all projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects?limit=100');
      const prjs = res.data.projects || [];
      setProjects(prjs);
      if (prjs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(prjs[0]._id);
      }
    } catch (err) {
      console.error('[Fetch Projects Error]:', err);
      setErrorMsg('Failed to load project list');
    } finally {
      setLoading(false);
    }
  };

  // Fetch assembly stages whenever selected project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchAssemblyStages(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchAssemblyStages = async (projectId) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/assembly/project/${projectId}`);
      setSelectedProject(res.data.project);
      const stgs = res.data.stages || [];
      setStages(stgs);
      if (stgs.length > 0) {
        // Set active stage to either the active in-progress stage or the first stage
        const active = stgs.find((s) => s.status === 'In Progress' || s.status === 'Waiting for Testing') || stgs[stgs.length - 1];
        setActiveStageId(active._id);
      }
    } catch (err) {
      console.error('[Fetch Assembly Stages Error]:', err);
      setErrorMsg('Failed to load assembly stages for selected project.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Store and Accessories available stock when Pick Modal opens
  const fetchAvailableStocks = async () => {
    try {
      const [stockRes, accRes] = await Promise.all([
        api.get('/stock?limit=100'),
        api.get('/accessories?tab=available&limit=100'),
      ]);

      const storeUsable = (stockRes.data.stockItems || []).filter((i) => i.usableQuantity > 0);
      const accAvailable = (accRes.data.accessories || []).filter((a) => a.availableQuantity > 0);

      setStoreStockItems(storeUsable);
      setAccessoryItems(accAvailable);

      if (pickForm.itemType === 'Store' && storeUsable.length > 0) {
        setPickForm((prev) => ({ ...prev, itemId: storeUsable[0]._id }));
      } else if (pickForm.itemType === 'Accessory' && accAvailable.length > 0) {
        setPickForm((prev) => ({ ...prev, itemId: accAvailable[0]._id }));
      }
    } catch (err) {
      console.error('[Fetch Available Stocks Error]:', err);
    }
  };

  const handleOpenPickModal = () => {
    fetchAvailableStocks();
    setPickModalOpen(true);
  };

  const handleItemTypeChange = (type) => {
    setPickForm((prev) => {
      let firstId = '';
      if (type === 'Store' && storeStockItems.length > 0) {
        firstId = storeStockItems[0]._id;
      } else if (type === 'Accessory' && accessoryItems.length > 0) {
        firstId = accessoryItems[0]._id;
      }
      return { ...prev, itemType: type, itemId: firstId, quantity: 1 };
    });
  };

  // Submit Pick Material
  const handlePickSubmit = async (e) => {
    e.preventDefault();
    if (!activeStageId || !pickForm.itemId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/assembly/stage/${activeStageId}/pick`, pickForm);
      setSuccessMsg(res.data.message || 'Material consumed and subtracted from available stock!');
      setPickModalOpen(false);
      fetchAssemblyStages(selectedProjectId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to pick material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Stage Action
  const handleCompleteStage = async (stageId) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/assembly/stage/${stageId}/complete`);
      setSuccessMsg(res.data.message);
      fetchAssemblyStages(selectedProjectId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete assembly stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateStage = (isFinal = false) => {
    const nextNum = stages.length + 1;
    setStageForm({
      stageName: isFinal ? `Final Stage ${nextNum}: Quality Verification & Final Product Integration` : `Stage ${nextNum}`,
      subStageName: isFinal ? 'Final Product Integration' : '',
      description: '',
      testingRequired: true,
      isFinalStage: Boolean(isFinal),
      referenceImages: [''],
      remarks: '',
    });
    setNewStageModalOpen(true);
  };

  const handleOpenEditStage = (stg) => {
    setEditingStage({
      ...stg,
      description: stg.description || '',
      isFinalStage: Boolean(stg.isFinalStage),
      remarks: stg.remarks || '',
      referenceImages: stg.referenceImages && stg.referenceImages.length > 0 ? stg.referenceImages : [''],
    });
    setEditStageModalOpen(true);
  };

  const handleEditStageSubmit = async (e) => {
    e.preventDefault();
    if (!editingStage || !editingStage.stageName.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const cleanImgs = editingStage.referenceImages.filter((u) => typeof u === 'string' && u.trim().length > 0);
      await api.put(`/assembly/stage/${editingStage._id}`, {
        stageName: editingStage.stageName.trim(),
        subStageName: editingStage.subStageName ? editingStage.subStageName.trim() : '',
        description: editingStage.description ? editingStage.description.trim() : '',
        testingRequired: Boolean(editingStage.testingRequired),
        isFinalStage: Boolean(editingStage.isFinalStage),
        referenceImages: cleanImgs,
        remarks: editingStage.remarks ? editingStage.remarks.trim() : '',
      });
      setSuccessMsg('Assembly Stage updated successfully!');
      setEditStageModalOpen(false);
      fetchAssemblyStages(selectedProjectId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update assembly stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStageConfirm = async () => {
    if (!deletingStage) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await api.delete(`/assembly/stage/${deletingStage._id}`);
      setSuccessMsg(`Stage ${deletingStage.stageNumber} removed successfully`);
      setDeleteStageModalOpen(false);
      setDeletingStage(null);
      fetchAssemblyStages(selectedProjectId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete assembly stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Stage Submit
  const handleCreateStageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !stageForm.stageName.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const cleanImgs = stageForm.referenceImages.filter((u) => typeof u === 'string' && u.trim().length > 0);
      await api.post('/assembly/stage', {
        ...stageForm,
        projectId: selectedProjectId,
        referenceImages: cleanImgs,
      });
      setSuccessMsg('New Assembly Stage created successfully!');
      setNewStageModalOpen(false);
      setStageForm({
        stageName: '',
        subStageName: '',
        description: '',
        testingRequired: true,
        isFinalStage: false,
        referenceImages: [''],
        remarks: '',
      });
      fetchAssemblyStages(selectedProjectId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create assembly stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenImagePreview = (imageUrls, title) => {
    const list = Array.isArray(imageUrls)
      ? imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
      : [];
    if (list.length === 0) return;
    setPreviewImage({ isOpen: true, imageUrls: list, title, model: 'Assembly Reference Diagram' });
  };

  // Currently selected item in Pick Modal
  const selectedStockItem =
    pickForm.itemType === 'Store'
      ? storeStockItems.find((i) => i._id === pickForm.itemId)
      : null;
  const selectedAccessoryItem =
    pickForm.itemType === 'Accessory'
      ? accessoryItems.find((a) => a._id === pickForm.itemId)
      : null;

  const maxAvailable =
    pickForm.itemType === 'Store'
      ? selectedStockItem?.usableQuantity || 0
      : selectedAccessoryItem?.availableQuantity || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Header & Project Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <FiCpu className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Assembly Line Workspace</span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage multi-stage electronic assembly, substages, reference documentation, material usage & test progression.
            </p>
          </div>
        </div>

        {/* Project Selector & Module Type Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2">
            <FiFolder className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Select Project:</span>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500 shadow cursor-pointer min-w-56"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.code} - {p.name} ({p.moduleType || 'Prototype Module'})
              </option>
            ))}
          </select>
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

      {selectedProject && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-white text-base">{selectedProject.name}</span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              {selectedProject.moduleType || 'Prototype Module'}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Code: <strong className="text-white font-mono">{selectedProject.code}</strong></span>
            <span>Total Stages: <strong className="text-cyan-400 font-extrabold">{stages.length}</strong></span>
            <span>Project Status: <strong className="text-emerald-400">{selectedProject.status}</strong></span>
          </div>
        </div>
      )}

      {/* Assembly Stages Stepper / Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <FiLayers className="w-4 h-4 text-cyan-400" />
            <span>Assembly Stages Navigation</span>
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenCreateStage(false)}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="inline sm:hidden">+ Next Stage</span>
                <span className="hidden sm:inline">Add Next Stage</span>
              </span>
            </button>
            <button
              onClick={() => handleOpenCreateStage(true)}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-lg shadow-purple-600/20"
            >
              <FiCheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="inline sm:hidden">+ Final Stage</span>
                <span className="hidden sm:inline">Add Final Stage</span>
              </span>
            </button>
          </div>
        </div>

        {stages.length > 0 ? (
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin">
            {stages.map((stg) => {
              const isActive = stg._id === activeStageId;
              const isPassed = stg.status === 'Stage Passed';
              const isWaiting = stg.status === 'Waiting for Testing';
              const isFailed = stg.status === 'Failed / Rework';

              return (
                <button
                  key={stg._id}
                  onClick={() => setActiveStageId(stg._id)}
                  className={`flex-1 min-w-56 p-3.5 rounded-xl border transition text-left cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-950 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-xs font-extrabold text-cyan-400">
                        STAGE {stg.stageNumber}
                      </span>
                      {stg.isFinalStage && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                          FINAL
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        isPassed
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isWaiting
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          : isFailed
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}
                    >
                      {stg.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-xs truncate">{stg.stageName}</h3>
                  {stg.subStageName && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{stg.subStageName}</p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-3">
            <p className="font-bold text-slate-200">No Assembly Stages created yet for this project.</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => handleOpenCreateStage(false)}
                className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer inline-flex items-center space-x-1.5"
              >
                <FiPlus className="w-4 h-4" />
                <span>Create Stage 1</span>
              </button>
              <button
                onClick={() => handleOpenCreateStage(true)}
                className="px-4 py-2 bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer inline-flex items-center space-x-1.5"
              >
                <FiCheckCircle className="w-4 h-4" />
                <span>Create Final Stage</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Stage Details Panel */}
      {activeStage && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Stage Header Details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-extrabold rounded-lg">
                  STAGE {activeStage.stageNumber}
                </span>
                {activeStage.isFinalStage && (
                  <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 font-extrabold text-xs rounded-lg flex items-center space-x-1">
                    <FiCheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>FINAL STAGE</span>
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${
                    activeStage.testingRequired
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Testing Required: {activeStage.testingRequired ? 'YES' : 'NO'}
                </span>
                <button
                  onClick={() => handleOpenEditStage(activeStage)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer transition"
                  title="Edit Stage Details"
                >
                  <FiEdit className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => {
                    setDeletingStage(activeStage);
                    setDeleteStageModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/30 flex items-center space-x-1 cursor-pointer transition"
                  title="Delete Assembly Stage"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Delete Stage</span>
                </button>
              </div>
              <h2 className="text-xl font-extrabold text-white">{activeStage.stageName}</h2>
              {activeStage.subStageName && (
                <p className="text-sm font-semibold text-cyan-400/90 mt-0.5">
                  Sub-stage: {activeStage.subStageName}
                </p>
              )}
              {activeStage.description && (
                <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  <span className="font-extrabold text-cyan-400 block mb-0.5">Description / Instructions:</span>
                  {activeStage.description}
                </p>
              )}
              {activeStage.remarks && (
                <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  <span className="font-extrabold text-cyan-400 block mb-0.5">Remarks / Comments:</span>
                  {activeStage.remarks}
                </p>
              )}
            </div>

            {/* Action Buttons: Pick Material & Complete Stage */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenPickModal}
                className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition cursor-pointer"
              >
                <FiTool className="w-4 h-4" />
                <span>Use Component / Pick Material</span>
              </button>

              {activeStage.status !== 'Stage Passed' && activeStage.status !== 'Waiting for Testing' && (
                <button
                  onClick={() => handleCompleteStage(activeStage._id)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition cursor-pointer"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Complete Assembly Stage</span>
                </button>
              )}
            </div>
          </div>

          {/* Reference Images Gallery & Auto-Slider */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <FiImage className="w-4 h-4 text-cyan-400" />
                  <span>Assembly Reference Diagrams & Photos</span>
                </h3>
                {activeRefImgs.length > 0 && (
                  <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold rounded-full">
                    {activeRefImgs.length} {activeRefImgs.length === 1 ? 'Diagram' : 'Diagrams'}
                  </span>
                )}
              </div>

              {activeRefImgs.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Diagram {diagramIndex + 1} of {activeRefImgs.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDiagramAutoPlay(!isDiagramAutoPlay)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition cursor-pointer border ${
                      isDiagramAutoPlay
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title={isDiagramAutoPlay ? 'Pause auto-slider' : 'Play auto-slider'}
                  >
                    {isDiagramAutoPlay ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5" />}
                    <span>{isDiagramAutoPlay ? 'Auto Slider ON' : 'Auto Slider OFF'}</span>
                  </button>
                </div>
              )}
            </div>

            {activeRefImgs.length > 0 ? (
              <div className="space-y-3">
                {/* Main Interactive Diagram Card */}
                <div className="relative group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-3 flex flex-col items-center justify-center min-h-64">
                  {/* Prev Arrow */}
                  {activeRefImgs.length > 1 && (
                    <button
                      onClick={() => setDiagramIndex((prev) => (prev === 0 ? activeRefImgs.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-cyan-500 hover:text-white border border-slate-700 text-white rounded-xl transition cursor-pointer z-10 shadow"
                      title="Previous Diagram"
                    >
                      <FiChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  {/* Next Arrow */}
                  {activeRefImgs.length > 1 && (
                    <button
                      onClick={() => setDiagramIndex((prev) => (prev + 1) % activeRefImgs.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-cyan-500 hover:text-white border border-slate-700 text-white rounded-xl transition cursor-pointer z-10 shadow"
                      title="Next Diagram"
                    >
                      <FiChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  {/* Diagram Image */}
                  <div
                    onClick={() => handleOpenImagePreview(activeRefImgs, activeStage.stageName)}
                    className="relative cursor-pointer max-h-80 flex items-center justify-center overflow-hidden rounded-xl group/img"
                    title="Click to zoom in gallery modal"
                  >
                    <img
                      key={diagramIndex}
                      src={activeRefImgs[diagramIndex] || activeRefImgs[0]}
                      alt={`Reference Diagram ${diagramIndex + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-80 object-contain rounded-xl shadow-lg border border-slate-800 group-hover/img:scale-102 transition"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_IMAGE_DATA_URI;
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition rounded-xl">
                      <span className="px-3 py-1.5 bg-cyan-500 text-white text-xs font-extrabold rounded-xl shadow flex items-center space-x-1">
                        <FiImage className="w-4 h-4" />
                        <span>Click to Expand Lightbox Gallery</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thumbnails Navigation Strip */}
                {activeRefImgs.length > 1 && (
                  <div className="flex items-center space-x-2 overflow-x-auto p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
                    {activeRefImgs.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDiagramIndex(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                          idx === diagramIndex
                            ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Thumb ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_IMAGE_DATA_URI;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>No reference diagram image links attached to this stage yet.</span>
                <button
                  onClick={() => handleOpenEditStage(activeStage)}
                  className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-500/20 transition cursor-pointer"
                >
                  + Attach Diagram Links
                </button>
              </div>
            )}
          </div>

          {/* Materials Consumed in this Stage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <FiBox className="w-4 h-4 text-cyan-400" />
                <span>Components Used in this Stage ({activeStage.usedMaterials?.length || 0})</span>
              </h3>
              <span className="text-[11px] text-cyan-400 font-semibold">
                * Available stock is automatically deducted upon picking
              </span>
            </div>

            {activeStage.usedMaterials && activeStage.usedMaterials.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Image</th>
                      <th className="p-3">Source Type</th>
                      <th className="p-3">Component / Accessory</th>
                      <th className="p-3">Model / Part #</th>
                      <th className="p-3 text-right">Quantity Consumed</th>
                      <th className="p-3 text-right">Picked Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeStage.usedMaterials.map((mat, i) => {
                      const matImgs = Array.isArray(mat.imageUrls) && mat.imageUrls.length > 0
                        ? mat.imageUrls.filter((u) => typeof u === 'string' && u.trim().length > 0)
                        : mat.imageUrl
                        ? [mat.imageUrl]
                        : [];

                      return (
                        <tr key={i} className="hover:bg-slate-900/40 transition">
                          <td className="p-3">
                            {matImgs.length > 0 ? (
                              <div
                                onClick={() => handleOpenImagePreview(matImgs, mat.itemDescription)}
                                className="relative group cursor-pointer w-10 h-10 rounded-lg border border-cyan-500/30 overflow-hidden bg-slate-950 shrink-0 shadow"
                                title="Click to view component image"
                              >
                                <img
                                  src={matImgs[0]}
                                  alt={mat.itemDescription}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/100x100/0f172a/06b6d4?text=Item';
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <FiImage className="w-3.5 h-3.5 text-cyan-400" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                                <FiBox className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                mat.itemType === 'Store'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {mat.itemType}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">{mat.itemDescription}</td>
                          <td className="p-3 text-slate-400 font-mono">{mat.modelNumber || '-'}</td>
                          <td className="p-3 text-right font-extrabold text-cyan-400">
                            {mat.quantityUsed} {mat.unit || 'Pcs'}
                          </td>
                          <td className="p-3 text-right text-slate-400 text-[10px]">
                            {new Date(mat.pickedAt).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                <p>No materials have been picked for this stage yet.</p>
                <button
                  onClick={handleOpenPickModal}
                  className="px-3.5 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold rounded-lg hover:bg-cyan-500/30 transition cursor-pointer"
                >
                  Pick Component Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Pick / Use Material from Store or Accessories */}
      <Modal
        isOpen={pickModalOpen}
        onClose={() => setPickModalOpen(false)}
        title="Use Material / Pick Component for Assembly"
        subtitle={`Stage: ${activeStage?.stageName}`}
      >
        <form onSubmit={handlePickSubmit} className="space-y-4">
          {/* Source Switcher: Store vs Accessories */}
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Inventory Source
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleItemTypeChange('Store')}
                className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer transition ${
                  pickForm.itemType === 'Store'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FiLayers className="w-4 h-4" />
                <span>Store Available Stock ({storeStockItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemTypeChange('Accessory')}
                className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer transition ${
                  pickForm.itemType === 'Accessory'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FiBox className="w-4 h-4" />
                <span>Accessories Stock ({accessoryItems.length})</span>
              </button>
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Select Component / Item <span className="text-rose-500">*</span>
            </label>
            {pickForm.itemType === 'Store' ? (
              <select
                required
                value={pickForm.itemId}
                onChange={(e) => setPickForm({ ...pickForm, itemId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {storeStockItems.length === 0 ? (
                  <option value="">No available stock items in store</option>
                ) : (
                  storeStockItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.itemDescription} (Model: {item.modelNumber || 'N/A'}) - Available: {item.usableQuantity} {item.unit || 'Pcs'}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <select
                required
                value={pickForm.itemId}
                onChange={(e) => setPickForm({ ...pickForm, itemId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {accessoryItems.length === 0 ? (
                  <option value="">No available accessories in store</option>
                ) : (
                  accessoryItems.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} (Model: {acc.modelPartNumber || 'N/A'}) - Available: {acc.availableQuantity} {acc.unit || 'Pcs'}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Available Quantity Info & Image Preview Card */}
          {pickForm.itemId && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center space-x-3">
              {pickForm.itemType === 'Store' ? (
                <>
                  {selectedStockItem?.imageUrl || (selectedStockItem?.imageUrls && selectedStockItem?.imageUrls[0]) ? (
                    <img
                      src={selectedStockItem.imageUrl || selectedStockItem.imageUrls[0]}
                      alt={selectedStockItem.itemDescription}
                      className="w-12 h-12 object-cover rounded-lg border border-cyan-500/30 bg-slate-900 shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/100x100/0f172a/06b6d4?text=Store';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                      <FiLayers className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs">{selectedStockItem?.itemDescription}</h4>
                    <p className="text-[10px] text-cyan-400 font-mono">Model: {selectedStockItem?.modelNumber || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400">Available: <strong className="text-emerald-400 font-extrabold">{maxAvailable} {selectedStockItem?.unit || 'Pcs'}</strong></p>
                  </div>
                </>
              ) : (
                <>
                  {selectedAccessoryItem?.imageUrl || (selectedAccessoryItem?.imageUrls && selectedAccessoryItem?.imageUrls[0]) ? (
                    <img
                      src={selectedAccessoryItem.imageUrl || selectedAccessoryItem.imageUrls[0]}
                      alt={selectedAccessoryItem.name}
                      className="w-12 h-12 object-cover rounded-lg border border-emerald-500/30 bg-slate-900 shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/100x100/0f172a/10b981?text=Acc';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                      <FiBox className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-xs">{selectedAccessoryItem?.name}</h4>
                    <p className="text-[10px] text-emerald-400 font-mono">Model: {selectedAccessoryItem?.modelPartNumber || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400">Available: <strong className="text-emerald-400 font-extrabold">{maxAvailable} {selectedAccessoryItem?.unit || 'Pcs'}</strong></p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Quantity to Use <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={maxAvailable || 1}
              required
              value={pickForm.quantity}
              onChange={(e) => setPickForm({ ...pickForm, quantity: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Technician / Assembly Engineer Name <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={pickForm.usedBy}
              onChange={(e) => setPickForm({ ...pickForm, usedBy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPickModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || maxAvailable <= 0}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow cursor-pointer disabled:opacity-50"
            >
              Confirm & Deduct Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create New Assembly Stage */}
      <Modal
        isOpen={newStageModalOpen}
        onClose={() => setNewStageModalOpen(false)}
        title="Add New Assembly Stage / Sub-stage"
        subtitle={`Project: ${selectedProject?.name}`}
      >
        <form onSubmit={handleCreateStageSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Stage Name / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={stageForm.stageName}
              onChange={(e) => setStageForm({ ...stageForm, stageName: e.target.value })}
              placeholder="e.g. Stage 2: Microcontroller Programming & Cable Harnessing"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Sub-stage Name <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={stageForm.subStageName}
              onChange={(e) => setStageForm({ ...stageForm, subStageName: e.target.value })}
              placeholder="e.g. Sub-stage 2.1: Firmware Flashing"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Description / Instructions <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={stageForm.description}
              onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
              placeholder="e.g. Detailed step-by-step assembly instructions or component layout guidelines..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Remarks / Technical Comments <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={stageForm.remarks}
              onChange={(e) => setStageForm({ ...stageForm, remarks: e.target.value })}
              placeholder="e.g. Special notes, safety precautions, ESD handling requirements..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Testing Required After Assembly?
            </label>
            <select
              value={stageForm.testingRequired ? 'yes' : 'no'}
              onChange={(e) => setStageForm({ ...stageForm, testingRequired: e.target.value === 'yes' })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="yes">YES - Sends to Testing Queue after completing assembly</option>
              <option value="no">NO - Automatically advances to next stage without testing</option>
            </select>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-extrabold text-xs text-purple-300 flex items-center space-x-1.5">
                <FiCheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Mark as Final Assembly Stage</span>
              </span>
              <span className="text-[11px] text-slate-400 block">
                Passing testing for this stage will mark the entire project as Completely Finished.
              </span>
            </div>
            <input
              type="checkbox"
              checked={stageForm.isFinalStage}
              onChange={(e) => setStageForm({ ...stageForm, isFinalStage: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Dynamic Reference Diagram Links with Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Reference Diagram Image Links <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleAddStageImageLink}
                className="text-xs font-extrabold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Add More Image Link</span>
              </button>
            </div>

            {stageForm.referenceImages.map((url, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                {/* Live Image URL Preview Box */}
                <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow">
                  {url && url.trim() ? (
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_IMAGE_DATA_URI;
                      }}
                    />
                  ) : (
                    <FiImage className="w-4 h-4 text-slate-500" />
                  )}
                </div>

                {/* Input URL */}
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleStageImageLinkChange(idx, e.target.value)}
                  placeholder="Paste diagram image URL (https://...)"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                {/* File Upload Button */}
                <label
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl cursor-pointer transition shrink-0"
                  title="Upload local diagram image file"
                >
                  <FiUpload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleStageFileUpload(e, idx)}
                  />
                </label>

                {/* Remove Button */}
                {stageForm.referenceImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStageImageLink(idx)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition cursor-pointer shrink-0"
                    title="Remove Link"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setNewStageModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
            >
              Create Stage
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Assembly Stage */}
      {editingStage && (
        <Modal
          isOpen={editStageModalOpen}
          onClose={() => setEditStageModalOpen(false)}
          title={`Edit Stage ${editingStage.stageNumber} Details`}
          subtitle={`Project: ${selectedProject?.name}`}
        >
          <form onSubmit={handleEditStageSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Stage Name / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editingStage.stageName}
                onChange={(e) => setEditingStage({ ...editingStage, stageName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Sub-stage Name <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={editingStage.subStageName || ''}
                onChange={(e) => setEditingStage({ ...editingStage, subStageName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Description / Instructions <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={editingStage.description || ''}
                onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                placeholder="e.g. Detailed step-by-step assembly instructions or component layout guidelines..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Remarks / Technical Comments <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={editingStage.remarks || ''}
                onChange={(e) => setEditingStage({ ...editingStage, remarks: e.target.value })}
                placeholder="e.g. Special notes, safety precautions, ESD handling requirements..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Testing Required After Assembly?
              </label>
              <select
                value={editingStage.testingRequired ? 'yes' : 'no'}
                onChange={(e) => setEditingStage({ ...editingStage, testingRequired: e.target.value === 'yes' })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="yes">YES - Sends to Testing Queue after completing assembly</option>
                <option value="no">NO - Automatically advances to next stage without testing</option>
              </select>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs text-purple-300 flex items-center space-x-1.5">
                  <FiCheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Mark as Final Assembly Stage</span>
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Passing testing for this stage will mark the entire project as Completely Finished.
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(editingStage.isFinalStage)}
                onChange={(e) => setEditingStage({ ...editingStage, isFinalStage: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer shrink-0 ml-2"
              />
            </div>

            {/* Dynamic Reference Diagram Links with Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Reference Diagram Image Links <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={handleEditAddImageLink}
                  className="text-xs font-extrabold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Add More Image Link</span>
                </button>
              </div>

              {(editingStage.referenceImages || ['']).map((url, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  {/* Live Image URL Preview Box */}
                  <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow">
                    {url && url.trim() ? (
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_IMAGE_DATA_URI;
                        }}
                      />
                    ) : (
                      <FiImage className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  {/* Input URL */}
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleEditImageLinkChange(idx, e.target.value)}
                    placeholder="Paste diagram image URL (https://...)"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />

                  {/* File Upload Button */}
                  <label
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl cursor-pointer transition shrink-0"
                    title="Upload local diagram image file"
                  >
                    <FiUpload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleEditFileUpload(e, idx)}
                    />
                  </label>

                  {/* Remove Button */}
                  {(editingStage.referenceImages || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEditRemoveImageLink(idx)}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition cursor-pointer shrink-0"
                      title="Remove Link"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditStageModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Delete Assembly Stage Confirmation */}
      {deletingStage && (
        <Modal
          isOpen={deleteStageModalOpen}
          onClose={() => setDeleteStageModalOpen(false)}
          title={`Delete Stage ${deletingStage.stageNumber} Confirmation`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to delete{' '}
              <span className="font-bold text-white">Stage {deletingStage.stageNumber}: {deletingStage.stageName}</span>?
            </p>
            <p className="text-xs text-rose-400 bg-rose-500/10 p-3 border border-rose-500/20 rounded-xl">
              Warning: This action will delete this assembly stage record.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3">
              <button
                onClick={() => setDeleteStageModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStageConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Image Lightbox Gallery Modal */}
      <ImageModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ isOpen: false, imageUrls: [], title: '', model: '' })}
        imageUrls={previewImage.imageUrls}
        title={previewImage.title}
        model={previewImage.model}
      />
    </div>
  );
};

export default Assembly;
