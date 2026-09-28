import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard Overview';
    if (pathname === '/projects/new') return 'Create New Project';
    if (pathname.startsWith('/projects/')) return 'Project & BOM Workspace';
    if (pathname.startsWith('/projects')) return 'Projects Directory';
    if (pathname.startsWith('/buyers')) return 'Suppliers Directory & Management';
    if (pathname.startsWith('/purchases')) return 'Purchase Orders';
    if (pathname.startsWith('/stock')) return 'Stock Inventory & Receiving';
    if (pathname.startsWith('/accessories')) return 'Accessories Management';
    if (pathname.startsWith('/settings')) return 'System Settings';
    return 'G Electronics System';
  };

  const handleMenuToggle = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-row overflow-hidden font-sans text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        {/* Fixed Topbar */}
        <Topbar
          onMenuClick={handleMenuToggle}
          pageTitle={getPageTitle(location.pathname)}
        />

        {/* Main Content Area with independent scrolling */}
        <main className="flex-1 overflow-y-auto main-scroll-container p-4 sm:p-6 md:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-6 flex-1">
            <Outlet />
          </div>
          <footer className="pt-6 pb-2 text-center text-xs text-slate-400 font-mono border-t border-cyan-500/10 mt-8 shrink-0">
            © 2026 Gnanastack Technologies. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
