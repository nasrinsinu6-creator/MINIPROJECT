/**
 * @file DashboardLayout.jsx
 * @description Primary layout wrapper for authenticated routes.
 * Enforces session authentication and admin role permissions. Renders sticky Navbar,
 * side navigation, main content Outlet, and the floating AI Chatbot widget.
 */

import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatbotWidget from '../components/ChatbotWidget';
import { authService } from '../services/api';

/**
 * Main Layout component wrapping protected dashboard and admin routes.
 */
export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const token = localStorage.getItem('token');

  // Authentication Guard: Redirect unauthenticated visitors to login
  if (!token || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Identify whether the current route belongs to the admin panel space
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Authorization Guard: Show explicit switch option if non-admin attempts admin access
  if (isAdminRoute && !currentUser.is_admin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 font-sans antialiased">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#111827] rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-grotesk">Admin Access Restricted</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                You are currently logged in as <strong className="text-slate-700 dark:text-slate-200">{currentUser.name || currentUser.email || 'Standard User'}</strong> (Regular Traveler Account). Admin privileges are required for this area.
              </p>
            </div>
            <div className="space-y-3 font-outfit text-xs font-bold">
              <button
                onClick={() => {
                  authService.logout();
                  navigate('/login');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Sign Out & Log In as Admin
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Return to Traveler Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 transition-colors duration-300 antialiased">
      {/* Top Application Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Responsive Side Navigation Menu */}
        <Sidebar isAdmin={isAdminRoute} />

        {/* Dynamic Nested Route Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Floating Interactive AI Assistant (hidden on admin pages) */}
      {!isAdminRoute && <ChatbotWidget />}
    </div>
  );
}

