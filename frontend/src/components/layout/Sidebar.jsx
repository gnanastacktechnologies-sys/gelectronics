import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiGrid,
  FiFolder,
  FiList,
  FiUsers,
  FiShoppingBag,
  FiLayers,
  FiBox,
  FiBriefcase,
  FiCpu,
  FiCheckSquare,
  FiLogOut,
  FiSettings,
  FiUser,
  FiX,
} from 'react-icons/fi';

const Sidebar = ({ isMobileOpen, setIsMobileOpen, isCollapsed = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: FiGrid },
    { label: 'Projects', path: '/projects', icon: FiFolder },
    { label: 'BOM', path: '/bom', icon: FiList },
    { label: 'Suppliers', path: '/buyers', icon: FiUsers },
    { label: 'Purchases', path: '/purchases', icon: FiShoppingBag },
    { label: 'Store', path: '/stock', icon: FiLayers },
    { label: 'Accessories', path: '/accessories', icon: FiBox },
    { label: 'Assets', path: '/assets', icon: FiBriefcase },
    { label: 'Assembly', path: '/assembly', icon: FiCpu },
    { label: 'Testing', path: '/testing', icon: FiCheckSquare },
    { label: 'Settings', path: '/settings', icon: FiSettings },
    { label: 'Profile', path: '/profile', icon: FiUser },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-cyan-500/15 text-slate-200 transition-all duration-300">
      {/* Brand Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} h-16 border-b border-cyan-500/15 bg-slate-950/70`}>
        <div className="flex items-center space-x-3">
          <img
            src="/icon.png"
            alt="G Electronics Icon"
            className="w-9 h-9 rounded-xl shadow-lg shadow-cyan-500/10 object-cover bg-slate-950 p-0.5 border border-cyan-500/30 shrink-0"
          />
          {!isCollapsed && (
            <div>
              <h1 className="font-extrabold text-base tracking-wider text-white flex items-center gap-1">
                G <span className="cyan-gradient-text">ELECTRONICS</span>
              </h1>
              <p className="text-[10px] text-cyan-400/90 tracking-widest font-mono uppercase font-semibold">
                BOM & Stock System
              </p>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <FiX className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto overscroll-contain sidebar-scroll-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/projects'}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'} rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  item.isSub && !isCollapsed ? 'ml-4 py-2.5 text-xs' : ''
                } ${
                  isActive
                    ? 'bg-linear-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 font-extrabold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 hover:border-l-2 hover:border-cyan-400'
                }`
              }
            >
              <Icon className={`w-5 h-5 shrink-0 ${item.isSub ? 'w-4 h-4' : ''}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Logout Button & Copyright */}
      <div className="p-3 pb-8 md:pb-3 border-t border-cyan-500/15 bg-slate-950/70">
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-center space-x-2 px-3 py-2'} rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition text-xs font-bold cursor-pointer`}
        >
          <FiLogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
        {!isCollapsed && (
          <div className="mt-2.5 text-center text-[10px] text-slate-500 font-mono tracking-tight">
            © 2026 Gnanastack Technologies
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with Expand / Collapse animation */}
      <aside className={`hidden md:block ${isCollapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 z-30 shrink-0 select-none transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-dvh shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
