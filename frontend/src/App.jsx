import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import BOM from './pages/BOM';
import Buyers from './pages/Buyers';
import Purchases from './pages/Purchases';
import Stock from './pages/Stock';
import Accessories from './pages/Accessories';
import Assets from './pages/Assets';
import Assembly from './pages/Assembly';
import Testing from './pages/Testing';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/new" element={<CreateProject />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/bom" element={<BOM />} />
                <Route path="/buyers" element={<Buyers />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/accessories" element={<Accessories />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/assembly" element={<Assembly />} />
                <Route path="/testing" element={<Testing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
