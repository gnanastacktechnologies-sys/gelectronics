import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  FiFolder,
  FiCpu,
  FiShoppingBag,
  FiLayers,
  FiAlertTriangle,
  FiBox,
  FiPlus,
  FiArrowRight,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('[Dashboard fetch error]:', err);
      setError('Failed to load dashboard metrics from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-400 font-medium">Fetching real-time database stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
        {error}
      </div>
    );
  }

  const summary = stats?.summary || {};
  const projectBreakdown = stats?.projectBreakdown || [];

  const cards = [
    {
      title: 'Total Projects',
      value: summary.totalProjects || 0,
      sub: 'Active & Draft Projects',
      icon: FiFolder,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-400',
      link: '/projects',
    },
    {
      title: 'Total BOM Components',
      value: summary.totalBOMItems || 0,
      sub: 'Unique BOM Component Records',
      icon: FiCpu,
      color: 'from-blue-600 to-indigo-700',
      textColor: 'text-blue-400',
      link: '/projects',
    },
    {
      title: 'Total BOM Cost (₹)',
      value: `₹${(summary.totalBOMCost || 0).toLocaleString('en-IN')}`,
      sub: 'Total Procurement Budget',
      icon: TbCurrencyRupee,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
    },
    {
      title: 'Arriving Orders',
      value: summary.pendingPurchases || 0,
      sub: `${summary.totalPurchasedOrders || 0} Total Purchase Orders`,
      icon: FiShoppingBag,
      color: 'from-purple-600 to-indigo-600',
      textColor: 'text-purple-400',
      link: '/purchases',
    },
    {
      title: 'Usable Store Stock',
      value: summary.usableStockCount || 0,
      sub: `${summary.totalStockRecords || 0} Stock Batches`,
      icon: FiLayers,
      color: 'from-sky-600 to-blue-600',
      textColor: 'text-sky-400',
      link: '/stock',
    },
    {
      title: 'Returned / Damaged Parts',
      value: summary.totalDamagedCount || 0,
      sub: `${summary.replacementPendingCount || 0} Replacements Pending`,
      icon: FiAlertTriangle,
      color: 'from-rose-600 to-pink-600',
      textColor: 'text-rose-400',
      link: '/stock',
    },
    {
      title: 'Accessories Inventory',
      value: summary.totalAccessories || 0,
      sub: 'Standalone Store Items',
      icon: FiBox,
      color: 'from-teal-600 to-cyan-600',
      textColor: 'text-teal-400',
      link: '/accessories',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-950 border border-cyan-500/30 rounded-full text-xs font-semibold">
            <img src="/icon.png" alt="G Electronics" className="w-4 h-4 rounded object-cover" />
            <span className="text-cyan-400">G Electronics Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Electronics Project & BOM Workspace
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Real-time procurement, BOM calculations, physical stock receiving, damaged item tracking, and accessories inventory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            to="/projects/new"
            className="px-5 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer transition"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create Project</span>
          </Link>
          <Link
            to="/purchases"
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center space-x-2 cursor-pointer transition"
          >
            <FiShoppingBag className="w-4 h-4" />
            <span>View Purchases</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/10 shadow-lg flex flex-col justify-between space-y-4 hover:border-cyan-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl bg-linear-to-tr ${card.color} text-white font-black shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {card.value}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>{card.sub}</span>
                  {card.link && (
                    <Link to={card.link} className={`${card.textColor} hover:underline flex items-center space-x-1 font-semibold`}>
                      <span>View</span>
                      <FiArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Cost Breakdown Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Project Cost Summaries</h3>
            <p className="text-xs text-slate-400">Total BOM component procurement cost per project</p>
          </div>
          <Link
            to="/projects"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
          >
            <span>All Projects</span>
            <FiArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto border border-cyan-500/10 rounded-2xl bg-slate-900 shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-cyan-500/10">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-300">Project Name</th>
                <th className="px-6 py-4 font-bold text-slate-300">Code</th>
                <th className="px-6 py-4 font-bold text-slate-300">Status</th>
                <th className="px-6 py-4 font-bold text-slate-300">BOM Count</th>
                <th className="px-6 py-4 font-bold text-slate-300">Total BOM Cost</th>
                <th className="px-6 py-4 text-right font-bold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectBreakdown.length > 0 ? (
                projectBreakdown.map((prj) => (
                  <tr key={prj.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">{prj.name}</td>
                    <td className="px-6 py-4 font-mono text-cyan-400 text-xs font-bold">{prj.code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          prj.status === 'Active'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : prj.status === 'Completed'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-slate-700/40 border-slate-600 text-slate-300'
                        }`}
                      >
                        {prj.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{prj.bomCount} Items</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      ₹{(prj.totalCost || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${prj.id}`}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Open BOM Workspace
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    No projects found in database. Create your first project to begin!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View for Project Cost Breakdown */}
        <div className="block md:hidden space-y-3">
          {projectBreakdown.length > 0 ? (
            projectBreakdown.map((prj) => (
              <div
                key={prj.id}
                className="p-4 bg-slate-900 border border-cyan-500/20 rounded-2xl space-y-3 shadow-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{prj.name}</h4>
                    <span className="font-mono text-xs text-cyan-400 font-bold">{prj.code}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      prj.status === 'Active'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : prj.status === 'Completed'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-slate-700/40 border-slate-600 text-slate-300'
                    }`}
                  >
                    {prj.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">BOM Count</span>
                    <span className="text-slate-200 font-bold">{prj.bomCount} Items</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total BOM Cost</span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      ₹{(prj.totalCost || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/projects/${prj.id}`}
                  className="w-full py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <span>Open BOM Workspace</span>
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              No projects found in database. Create your first project to begin!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
