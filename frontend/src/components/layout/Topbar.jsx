import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiUser, FiLogOut, FiBell, FiCheckCircle, FiAlertTriangle, FiXCircle, FiTruck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Topbar = ({ onMenuClick, pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('gelectronics_read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent && notifications.length === 0) setLoading(true);
      const res = await api.get('/purchases/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('[Topbar notifications fetch error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 60000); // silent refresh every minute
    return () => clearInterval(interval);
  }, []);

  const markAllAsSeen = (currentNotifications = notifications) => {
    if (!currentNotifications || currentNotifications.length === 0) return;
    const currentIds = currentNotifications.map((n) => n.id || n._id).filter(Boolean);
    const updated = Array.from(new Set([...seenNotificationIds, ...currentIds]));
    setSeenNotificationIds(updated);
    try {
      localStorage.setItem('gelectronics_read_notification_ids', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save read notifications to localStorage', e);
    }
  };

  const toggleNotifications = () => {
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (nextShow) {
      fetchNotifications();
      markAllAsSeen(notifications);
    }
  };

  const unreadCount = notifications.filter(
    (n) => !seenNotificationIds.includes(n.id || n._id)
  ).length;

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/15 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 text-slate-100">
      {/* Left Section: Menu Toggle & Title */}
      <div className="flex items-center space-x-3">
        {/* Menu button visible on both Laptop/Desktop and Mobile */}
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl focus:outline-none cursor-pointer transition"
          aria-label="Toggle Navigation Menu"
          title="Toggle Navigation Menu"
        >
          <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          <img src="/icon.png" alt="G Electronics" className="w-6 h-6 rounded object-cover md:hidden border border-cyan-500/30 shrink-0" />
          <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-wide truncate max-w-35 xs:max-w-[220px] sm:max-w-none">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Right Section: Notifications, Profile Icon Button & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Notifications Icon Button with Dynamic Alert Badge */}
        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition cursor-pointer relative"
            title="Notifications & Delivery Alerts"
          >
            <FiBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900" />
              </>
            )}
          </button>

          {/* Transparent Backdrop to dismiss notification popover on click outside */}
          {showNotifications && (
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          )}

          {/* Notification Popover Dropdown */}
          {showNotifications && (
            <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-h-[80vh] sm:max-h-[85vh] bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-xs space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
                <span className="font-bold text-white text-sm flex items-center space-x-1.5">
                  <FiBell className="w-4 h-4 text-cyan-400" />
                  <span>Purchase & Delivery Alerts</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                      {unreadCount} New
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                      All Seen
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-[10px]">
                    {notifications.length} Total
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[60vh] sm:max-h-72 pr-1 flex-1">
                {loading ? (
                  <p className="text-center text-slate-500 py-4">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No active delivery alerts or status updates.</p>
                ) : (
                  notifications.map((n) => {
                    const isNew = !seenNotificationIds.includes(n.id || n._id);
                    return (
                      <div
                        key={n.id || n._id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/purchases');
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer relative ${
                          n.type === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                            : n.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                            : n.type === 'error'
                            ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold flex items-center space-x-1.5 ${
                              n.type === 'warning'
                                ? 'text-amber-400'
                                : n.type === 'success'
                                ? 'text-emerald-400'
                                : n.type === 'error'
                                ? 'text-rose-400'
                                : 'text-cyan-400'
                            }`}
                          >
                            {n.type === 'warning' ? (
                              <FiAlertTriangle className="w-4 h-4 shrink-0" />
                            ) : n.type === 'success' ? (
                              <FiCheckCircle className="w-4 h-4 shrink-0" />
                            ) : n.type === 'error' ? (
                              <FiXCircle className="w-4 h-4 shrink-0" />
                            ) : (
                              <FiTruck className="w-4 h-4 shrink-0" />
                            )}
                            <span>{n.title}</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            {isNew && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="New Alert" />
                            )}
                            {n.date && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(n.date).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Icon Only Button */}
        <button
          onClick={() => navigate('/profile')}
          className="p-2 bg-slate-950 hover:bg-slate-800 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center justify-center"
          title="Open User Profile"
        >
          <FiUser className="w-5 h-5" />
        </button>

        {/* SEPARATE Logout Action Button */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
          title="Sign Out of Portal"
        >
          <FiLogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;

