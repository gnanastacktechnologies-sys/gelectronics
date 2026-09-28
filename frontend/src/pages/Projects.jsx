import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit,
  FiTrash2,
  FiExternalLink,
  FiAlertCircle,
  FiList,
} from 'react-icons/fi';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Modal State for Edit/Delete
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchProjects = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: 10,
        search,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };
      const res = await api.get('/projects', { params });
      setProjects(res.data.projects);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total,
      });
    } catch (err) {
      console.error('[Projects fetch error]:', err);
      setErrorMsg('Failed to load projects from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(1);
  }, [search, statusFilter]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProject?.name?.trim()) return;

    try {
      setIsSubmitting(true);
      await api.put(`/projects/${editingProject._id}`, {
        name: editingProject.name,
        code: editingProject.code,
        description: editingProject.description,
        status: editingProject.status,
        moduleType: editingProject.moduleType,
      });
      setEditModalOpen(false);
      fetchProjects(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/projects/${deletingProject._id}`);
      setDeleteModalOpen(false);
      fetchProjects(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Project Name',
      cell: (row) => (
        <div>
          <div className="flex items-center space-x-2">
            <Link
              to={`/projects/${row._id}`}
              className="font-bold text-white hover:text-cyan-400 transition"
            >
              {row.name}
            </Link>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {row.moduleType || 'Prototype Module'}
            </span>
          </div>
          {row.description && (
            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Project Code',
      cell: (row) => <span className="font-mono text-cyan-400 font-bold text-xs">{row.code}</span>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
            row.status === 'Active'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : row.status === 'Completed'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : row.status === 'Cancelled'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-slate-700/40 border-slate-600 text-slate-300'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'BOM Items',
      cell: (row) => <span className="text-slate-300 font-medium">{row.bomItemCount || 0} Items</span>,
    },
    {
      header: 'Total BOM Cost',
      cell: (row) => (
        <span className="font-semibold text-emerald-400">
          ₹{(row.actualTotal || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Purchase Status',
      cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
            row.purchaseStatus === 'Received'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : row.purchaseStatus === 'Ordered'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              : row.purchaseStatus === 'Partially Received'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {row.purchaseStatus || 'Not Purchased'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/bom?projectId=${row._id}`)}
            className="p-2 text-emerald-400 hover:text-slate-950 hover:bg-emerald-500 border border-emerald-500/30 rounded-lg transition cursor-pointer"
            title="Manage Project BOM"
          >
            <FiList className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/projects/${row._id}`)}
            className="p-2 text-cyan-400 hover:text-slate-950 hover:bg-cyan-500 border border-cyan-500/30 rounded-lg transition cursor-pointer"
            title="Open Project Workspace"
          >
            <FiExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingProject({ ...row });
              setEditModalOpen(true);
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Edit Project Details"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setDeletingProject(row);
              setDeleteModalOpen(true);
            }}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer"
            title="Delete Project"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Electronics Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage electronic design projects, BOM components, approximate vs actual totals.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="px-4 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create Project</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-cyan-500/15 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold flex items-center space-x-1">
            <FiFilter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No electronics projects found"
        emptyAction={
          <Link
            to="/projects/new"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl inline-flex items-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create First Project</span>
          </Link>
        }
        pagination={pagination}
        onPageChange={(page) => fetchProjects(page)}
      />

      {/* Edit Project Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Project Details"
      >
        {editingProject && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={editingProject.name}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Project Code
              </label>
              <input
                type="text"
                value={editingProject.code}
                onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 uppercase focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows="3"
                value={editingProject.description}
                onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Module Type (Assembly Classification)
              </label>
              <select
                value={editingProject.moduleType || 'Prototype Module'}
                onChange={(e) => setEditingProject({ ...editingProject, moduleType: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
              >
                <option value="Prototype Module">Prototype Module</option>
                <option value="Production Module">Production Module</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editingProject.status}
                onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Project Confirmation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete project{' '}
            <span className="font-bold text-white">{deletingProject?.name}</span> (
            <span className="font-mono text-cyan-400">{deletingProject?.code}</span>)?
          </p>
          <p className="text-xs text-rose-400 bg-rose-500/10 p-3 border border-rose-500/20 rounded-xl">
            Warning: This action will delete all linked BOM items. Action cannot be undone if no purchase orders exist.
          </p>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 cursor-pointer"
            >
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Projects;
