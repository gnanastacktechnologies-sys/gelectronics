import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  FiSettings,
  FiSliders,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiList,
  FiFolder,
  FiHash,
  FiBriefcase,
  FiBell,
  FiSun,
  FiMoon,
} from 'react-icons/fi';

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [companyName, setCompanyName] = useState('G Electronics');
  const [tagline, setTagline] = useState('Connecting Your World');
  const [currencySymbol] = useState('₹');
  const [minStockThreshold, setMinStockThreshold] = useState(5);
  const [enableLowStockAlert, setEnableLowStockAlert] = useState(true);

  // Project BOM Numbering Settings State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [bomPrefix, setBomPrefix] = useState('BOM-');
  const [bomStartNumber, setBomStartNumber] = useState(1);
  const [isSavingBOM, setIsSavingBOM] = useState(false);

  // Asset Numbering Settings State (Admin)
  const [assetPrefix, setAssetPrefix] = useState('AST-');
  const [assetStartNumber, setAssetStartNumber] = useState(1);
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch projects & asset config on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, assetRes] = await Promise.all([
          api.get('/projects', { params: { limit: 100 } }),
          api.get('/assets/config'),
        ]);

        const list = projRes.data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          setSelectedProjectId(list[0]._id);
          setSelectedProject(list[0]);
          setBomPrefix(list[0].bomPrefix || 'BOM-');
          setBomStartNumber(list[0].bomStartNumber || 1);
        }

        if (assetRes.data) {
          setAssetPrefix(assetRes.data.assetPrefix || 'AST-');
          setAssetStartNumber(assetRes.data.assetStartNumber || 1);
          setEnableLowStockAlert(assetRes.data.enableLowStockAlert !== false);
          setMinStockThreshold(assetRes.data.lowStockThreshold || 5);
        }
      } catch (err) {
        console.error('[Settings fetch error]:', err);
      }
    };
    fetchData();
  }, []);

  const handleSelectProject = (projId) => {
    setSelectedProjectId(projId);
    const prj = projects.find((p) => p._id === projId);
    if (prj) {
      setSelectedProject(prj);
      setBomPrefix(prj.bomPrefix || 'BOM-');
      setBomStartNumber(prj.bomStartNumber || 1);
    }
  };

  const handleSaveProjectBOMSettings = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMsg('Please select an electronics project first.');
      return;
    }

    try {
      setIsSavingBOM(true);
      setErrorMsg('');
      const res = await api.put(`/projects/${selectedProjectId}`, {
        bomPrefix,
        bomStartNumber: Number(bomStartNumber) || 1,
      });

      setProjects((prev) =>
        prev.map((p) => (p._id === selectedProjectId ? { ...p, bomPrefix: res.data.bomPrefix, bomStartNumber: res.data.bomStartNumber } : p))
      );
      setSelectedProject(res.data);

      const digitsCount = Math.max(3, String(bomStartNumber).length);
      const previewNum = `${bomPrefix || 'BOM-'}${String(bomStartNumber || 1).padStart(digitsCount, '0')}`;
      setSuccessMsg(`✓ BOM Item Numbering for '${res.data.name}' configured to start from '${previewNum}'!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save project BOM item settings.');
    } finally {
      setIsSavingBOM(false);
    }
  };

  const handleSaveAssetSettings = async (e) => {
    e.preventDefault();
    try {
      setIsSavingAsset(true);
      setErrorMsg('');
      const res = await api.put('/assets/config', {
        assetPrefix: assetPrefix.trim().toUpperCase(),
        assetStartNumber: Number(assetStartNumber) || 1,
      });

      setAssetPrefix(res.data.assetPrefix);
      setAssetStartNumber(res.data.assetStartNumber);

      const digitsCount = Math.max(4, String(assetStartNumber).length);
      const previewNum = `${res.data.assetPrefix}${String(res.data.assetStartNumber).padStart(digitsCount, '0')}`;
      setSuccessMsg(`✓ Electronics Asset Numbering configured to start from '${previewNum}'!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save asset numbering configuration.');
    } finally {
      setIsSavingAsset(false);
    }
  };

  const handleToggleLowStockAlert = async () => {
    const nextState = !enableLowStockAlert;
    setEnableLowStockAlert(nextState);
    try {
      setErrorMsg('');
      const res = await api.put('/assets/config', {
        enableLowStockAlert: nextState,
        lowStockThreshold: Number(minStockThreshold) || 5,
      });
      setEnableLowStockAlert(res.data.enableLowStockAlert);
      setSuccessMsg(
        `✓ Low Stock Alert preference updated! Notifications are now ${
          res.data.enableLowStockAlert ? 'ENABLED (ON)' : 'DISABLED (OFF)'
        }.`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setEnableLowStockAlert(!nextState);
      setErrorMsg(err.response?.data?.message || 'Failed to save Low Stock Alert preference.');
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      const res = await api.put('/assets/config', {
        enableLowStockAlert,
        lowStockThreshold: Number(minStockThreshold) || 5,
      });

      setEnableLowStockAlert(res.data.enableLowStockAlert);
      setMinStockThreshold(res.data.lowStockThreshold);
      setSuccessMsg(`✓ System Low Stock Alert preference updated! Notifications are now ${res.data.enableLowStockAlert ? 'ENABLED (ON)' : 'DISABLED (OFF)'}.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save general preferences.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <FiSettings className="w-6 h-6 text-cyan-400" />
          <span>System Settings & Preferences</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage system appearance themes, project BOM starting numbers, asset prefixes, currency standards, and alert preferences.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <FiCheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Appearance & Color Theme Settings */}
      <div className="p-6 bg-slate-900 border border-cyan-500/20 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <FiSun className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Appearance & Color Theme</h3>
            <p className="text-xs text-slate-400">
              Choose your preferred application color theme mode. Theme preference is automatically saved to your browser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Theme Option */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-4 ${
              theme === 'dark'
                ? 'bg-slate-950 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400">
                  <FiMoon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Dark Enterprise Theme</h4>
                  <p className="text-[11px] text-slate-400">Sapphire Blue & Electric Cyan dark mode (Default)</p>
                </div>
              </div>
              {theme === 'dark' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  ACTIVE
                </span>
              )}
            </div>

            {/* Dark Theme Preview Chips */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-[#0b0f19] border border-slate-700 shadow" title="Background #0b0f19" />
              <span className="w-6 h-6 rounded-lg bg-[#111827] border border-slate-700 shadow" title="Card #111827" />
              <span className="w-6 h-6 rounded-lg bg-[#3b82f6] shadow" title="Sapphire Blue #3b82f6" />
              <span className="w-6 h-6 rounded-lg bg-[#06b6d4] shadow" title="Electric Cyan #06b6d4" />
            </div>
          </div>

          {/* Light Theme Option */}
          <div
            onClick={() => setTheme('light')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-4 ${
              theme === 'light'
                ? 'bg-slate-950 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <FiSun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Light Enterprise Theme</h4>
                  <p className="text-[11px] text-slate-400">Pure White & Crisp Blue light mode</p>
                </div>
              </div>
              {theme === 'light' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  ACTIVE
                </span>
              )}
            </div>

            {/* Light Theme Preview Chips */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
              <span className="w-6 h-6 rounded-lg bg-[#f1f5f9] border border-slate-300 shadow" title="Light Background #f1f5f9" />
              <span className="w-6 h-6 rounded-lg bg-[#ffffff] border border-slate-300 shadow" title="White Card #ffffff" />
              <span className="w-6 h-6 rounded-lg bg-[#2563eb] shadow" title="Royal Blue #2563eb" />
              <span className="w-6 h-6 rounded-lg bg-[#0284c7] shadow" title="Sky Cyan #0284c7" />
            </div>
          </div>
        </div>
      </div>

      {/* Project BOM Item Starting Number Settings (Admin) */}
      <div className="p-6 bg-slate-900 border border-cyan-500/20 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <FiList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Project BOM Item Numbering Configuration (Admin)</h3>
            <p className="text-xs text-slate-400">
              Select an electronics project to configure custom BOM item prefixes and starting sequence numbers.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProjectBOMSettings} className="space-y-4">
          {/* Select Project Dropdown */}
          <div className="space-y-1.5">
            <label className="flex text-xs font-bold text-cyan-400 uppercase tracking-wider items-center gap-1.5">
              <FiFolder className="w-4 h-4" />
              <span>Select Electronics Project:</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition cursor-pointer"
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code}) [{p.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedProject && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    <FiHash className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BOM Item Prefix</span>
                  </label>
                  <input
                    type="text"
                    value={bomPrefix}
                    onChange={(e) => setBomPrefix(e.target.value)}
                    placeholder="e.g. BOM-, ELE-, PRJ1-"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-100 uppercase focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Prefix code prepended before sequence number (e.g. <strong className="text-cyan-400">BOM-</strong>).
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    <FiHash className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Starting Sequence Number</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bomStartNumber}
                    onChange={(e) => setBomStartNumber(e.target.value)}
                    placeholder="e.g. 1, 100, 500, 1000"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sequence starting number set by admin (e.g. <strong className="text-cyan-400">100</strong> starts at BOM-100).
                  </p>
                </div>
              </div>

              {/* Live Preview Strip */}
              <div className="p-3 bg-slate-900 border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-400">Live Auto-Numbering Sequence Preview:</span>
                <span className="font-mono font-extrabold text-emerald-400">
                  {bomPrefix || 'BOM-'}{String(bomStartNumber || 1).padStart(Math.max(3, String(bomStartNumber || 1).length), '0')}, {bomPrefix || 'BOM-'}{String(Number(bomStartNumber || 1) + 1).padStart(Math.max(3, String(bomStartNumber || 1).length), '0')}, {bomPrefix || 'BOM-'}{String(Number(bomStartNumber || 1) + 2).padStart(Math.max(3, String(bomStartNumber || 1).length), '0')}...
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingBOM || !selectedProjectId}
              className="px-5 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer transition disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Project BOM Numbering Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Asset Numbering Configuration (Admin) */}
      <div className="p-6 bg-slate-900 border border-cyan-500/20 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <FiBriefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Electronics Asset Numbering Configuration (Admin)</h3>
            <p className="text-xs text-slate-400">
              Configure global asset number prefix and sequence starting number for electronics equipment and assembly machinery.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAssetSettings} className="space-y-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  <FiHash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Asset Number Prefix</span>
                </label>
                <input
                  type="text"
                  value={assetPrefix}
                  onChange={(e) => setAssetPrefix(e.target.value)}
                  placeholder="e.g. AST-, EQP-, DEV-"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-100 uppercase focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Prefix code prepended before asset number (e.g. <strong className="text-cyan-400">AST-</strong>).
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  <FiHash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Starting Sequence Number</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={assetStartNumber}
                  onChange={(e) => setAssetStartNumber(e.target.value)}
                  placeholder="e.g. 1, 100, 1000"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Sequence starting number set by admin (e.g. <strong className="text-cyan-400">100</strong> starts at AST-0100).
                </p>
              </div>
            </div>

            {/* Live Asset Numbering Preview Strip */}
            <div className="p-3 bg-slate-900 border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-400">Live Asset Auto-Numbering Preview:</span>
              <span className="font-mono font-extrabold text-emerald-400">
                {assetPrefix || 'AST-'}{String(assetStartNumber || 1).padStart(Math.max(4, String(assetStartNumber || 1).length), '0')}, {assetPrefix || 'AST-'}{String(Number(assetStartNumber || 1) + 1).padStart(Math.max(4, String(assetStartNumber || 1).length), '0')}, {assetPrefix || 'AST-'}{String(Number(assetStartNumber || 1) + 2).padStart(Math.max(4, String(assetStartNumber || 1).length), '0')}...
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingAsset}
              className="px-5 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer transition disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Asset Numbering Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* General & Currency Settings */}
      <div className="p-6 bg-slate-900 border border-cyan-500/20 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <FiSliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">General & Currency Standards</h3>
            <p className="text-xs text-slate-400">System currency notation and organization details</p>
          </div>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4">
          {/* Low Stock Alert Control Toggle Card */}
          <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FiBell className={`w-4 h-4 ${enableLowStockAlert ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Low Stock Alert Notifications
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  enableLowStockAlert 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {enableLowStockAlert ? 'ON (Alerts Enabled)' : 'OFF (Alerts Disabled)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {enableLowStockAlert
                  ? 'System will display notification alerts and bell badges when component stock drops to or below threshold.'
                  : 'Low stock alerts are disabled. No system notifications or alert badges will be generated when stock is low.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleLowStockAlert}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enableLowStockAlert ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              title={enableLowStockAlert ? 'Turn Low Stock Alerts OFF' : 'Turn Low Stock Alerts ON'}
            >
              <span
                className={`pointer-events-none h-6 w-6 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-extrabold ${
                  enableLowStockAlert ? 'translate-x-7 text-cyan-400' : 'translate-x-0 text-slate-400'
                }`}
              >
                {enableLowStockAlert ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                System Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                readOnly
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-cyan-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Primary monetary standard set to <span className="text-cyan-400 font-bold">₹ (INR)</span> across BOM calculations and Purchase Orders.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min="1"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 cursor-pointer"
            >
              <FiSave className="w-4 h-4" />
              <span>Save General Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
