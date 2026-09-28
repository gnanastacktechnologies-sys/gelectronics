import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLock, FiUser, FiArrowRight, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('Gnanasekaran');
  const [password, setPassword] = useState('Gnana@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('[Login Error]:', err);
      if (!err.response) {
        setError('Network Error: Cannot reach server backend. Please check Wi-Fi connection.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Invalid username or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 flex flex-col justify-between items-center p-3 sm:p-6 lg:p-8 py-6 pb-16 sm:pb-8 relative overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-120 h-96 sm:h-120 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 sm:w-100 h-80 sm:h-100 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-cyan-500/20 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-12 my-auto">
        {/* Left Side: Brand Logo & Identity */}
        <div className="md:col-span-5 p-5 sm:p-6 md:p-8 bg-linear-to-b from-slate-900 via-slate-900/95 to-slate-950 border-b md:border-b-0 md:border-r border-cyan-500/15 flex flex-col justify-center items-center text-center">
          <div className="w-full flex flex-col items-center space-y-3 sm:space-y-4">
            {/* Logo Image styled as a clean white brand badge */}
            <div className="p-3 sm:p-4 bg-white rounded-2xl shadow-2xl border border-cyan-500/30 max-w-48 sm:max-w-56 mx-auto flex items-center justify-center">
              <img
                src="/logo.png"
                alt="G Electronics — Connecting Your World"
                className="w-full h-auto max-h-16 sm:max-h-20 object-contain mx-auto"
              />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-cyan-400 font-mono font-extrabold tracking-wider uppercase mt-1">
                Project, BOM & Stock System
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:col-span-7 p-5 sm:p-8 md:p-10 flex flex-col justify-center space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
              Sign In to Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials to access system management
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start space-x-2">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username / Admin ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400/80">
                  <FiUser className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400/80">
                  <FiLock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-cyan-400 transition cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Copyright */}
      <footer className="text-center text-[11px] text-slate-500 font-mono z-10 pt-4">
        © 2026 Gnanastack Technologies. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
