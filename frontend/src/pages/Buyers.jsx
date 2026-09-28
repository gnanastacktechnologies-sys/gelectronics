import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { FiPlus, FiEdit, FiTrash2, FiGlobe, FiMapPin, FiAlertCircle, FiCheckCircle, FiShoppingCart, FiMap } from 'react-icons/fi';

const Buyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'Online' | 'Offline'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'Online',
    contactInfo: '',
    website: '',
    address: '',
  });

  const [deleteId, setDeleteId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/buyers');
      setBuyers(res.data);
    } catch (err) {
      console.error('[Buyers fetch error]:', err);
      setErrorMsg('Failed to load suppliers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleOpenAdd = (defaultType = 'Online') => {
    setEditingBuyer(null);
    setForm({ name: '', type: defaultType, contactInfo: '', website: '', address: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBuyer(b);
    setForm({
      name: b.name,
      type: b.type || 'Online',
      contactInfo: b.contactInfo || '',
      website: b.website || '',
      address: b.address || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingBuyer) {
        await api.put(`/buyers/${editingBuyer._id}`, form);
        setSuccessMsg('Supplier updated successfully');
      } else {
        await api.post('/buyers', form);
        setSuccessMsg('New supplier added successfully');
      }
      setModalOpen(false);
      fetchBuyers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/buyers/${deleteId}`);
      setDeleteId(null);
      setSuccessMsg('Supplier removed successfully');
      fetchBuyers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBuyers = buyers.filter((b) => {
    if (activeTab === 'ALL') return true;
    return b.type === activeTab;
  });

  const onlineCount = buyers.filter((b) => b.type === 'Online').length;
  const offlineCount = buyers.filter((b) => b.type === 'Offline').length;

  const columns = [
    {
      header: 'Supplier Name',
      cell: (row) => (
        <div>
          <span className="font-bold text-white text-sm block">{row.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {row._id ? row._id.slice(-6).toUpperCase() : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Procurement Mode',
      cell: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center space-x-1.5 ${
            row.type === 'Online'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
          }`}
        >
          {row.type === 'Online' ? <FiShoppingCart className="w-3.5 h-3.5" /> : <FiMap className="w-3.5 h-3.5" />}
          <span>{row.type} Supplier</span>
        </span>
      ),
    },
    {
      header: 'Website / Offline Address',
      cell: (row) => (
        row.type === 'Online' ? (
          row.website ? (
            <a
              href={row.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1.5"
            >
              <FiGlobe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate max-w-xs">{row.website}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-500 italic">No URL specified</span>
          )
        ) : (
          row.address ? (
            <div className="flex items-start space-x-1.5 text-xs text-purple-300">
              <FiMapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span className="leading-tight max-w-xs">{row.address}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No Offline Address specified</span>
          )
        )
      ),
    },
    {
      header: 'Contact Info / Phone',
      cell: (row) => (
        <span className="text-xs text-slate-300 font-medium">
          {row.contactInfo ? row.contactInfo : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
            row.isEnabled ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-800'
          }`}
        >
          {row.isEnabled ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Edit Supplier"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row._id)}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer"
            title="Delete Supplier"
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Suppliers Directory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage Online procurement vendors (Amazon, Robu, Mouser, DigiKey) and Offline local store suppliers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAdd('Online')}
            className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition cursor-pointer"
          >
            <FiShoppingCart className="w-4 h-4" />
            <span>Add Online Supplier</span>
          </button>
          <button
            onClick={() => handleOpenAdd('Offline')}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-purple-600/20 flex items-center space-x-2 transition cursor-pointer"
          >
            <FiMapPin className="w-4 h-4" />
            <span>Add Offline Supplier</span>
          </button>
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

      {/* Tabs Filter: ALL | Online | Offline */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'ALL'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>All Suppliers</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-300">
            {buyers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Online')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'Online'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900'
          }`}
        >
          <FiShoppingCart className="w-3.5 h-3.5" />
          <span>1. Online Suppliers</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300">
            {onlineCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('Offline')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'Offline'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
          }`}
        >
          <FiMapPin className="w-3.5 h-3.5" />
          <span>2. Offline Store Suppliers</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-200">
            {offlineCount}
          </span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredBuyers}
        loading={loading}
        emptyMessage={`No ${activeTab === 'ALL' ? '' : activeTab} suppliers configured.`}
        emptyAction={
          <button
            onClick={() => handleOpenAdd(activeTab === 'Offline' ? 'Offline' : 'Online')}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl inline-flex items-center space-x-2 cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add {activeTab === 'Offline' ? 'Offline Store Supplier' : 'Online Supplier'}</span>
          </button>
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBuyer ? 'Edit Supplier Details' : 'Add New Supplier'}
        subtitle="Configure Procurement Source Mode & Contact Info"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Supplier Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={
                form.type === 'Online'
                  ? 'e.g. Amazon, Robu.in, Mouser, DigiKey, ElectronicsComp'
                  : 'e.g. SP Road Local Store, Sri Krishna Electronics, City Wholesale Vendor'
              }
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Procurement Type Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'Online' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                  form.type === 'Online'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FiShoppingCart className="w-4 h-4" />
                <span>1. Online Supplier</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'Offline' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                  form.type === 'Offline'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FiMapPin className="w-4 h-4" />
                <span>2. Offline Supplier</span>
              </button>
            </div>
          </div>

          {form.type === 'Online' ? (
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Website URL <span className="text-slate-500 font-normal">(Online Store)</span>
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://amazon.in or https://robu.in"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          ) : (
            <div>
              <label className="flex items-center space-x-1 text-xs font-extrabold text-purple-300 uppercase tracking-wider mb-1">
                <FiMapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>Offline Store / Shop Address <span className="text-rose-500">*</span></span>
              </label>
              <textarea
                rows={3}
                required={form.type === 'Offline'}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter complete offline store location address (e.g. Shop #42, SP Road Market, Electronics Complex, Bangalore - 560002)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-purple-500/40 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 leading-relaxed"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Contact Info / Phone / GSTIN
            </label>
            <input
              type="text"
              value={form.contactInfo}
              onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
              placeholder="e.g. +91 9876543210 / Contact Person / GST No."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
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
              className="px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Supplier Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this supplier record?
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
    </div>
  );
};

export default Buyers;
