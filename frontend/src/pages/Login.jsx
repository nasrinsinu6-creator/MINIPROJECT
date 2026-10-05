/**
 * @file Login.jsx
 * @description User and administrator login page.
 * Handles user authentication via email/username and password, manages session token storage,
 * and routes authenticated users to their corresponding user dashboard or admin console.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Compass, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authService } from '../services/api';

/**
 * User Login view component.
 */
export default function Login() {

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect correctly using Navigate
  if (localStorage.getItem('token') && authService.getCurrentUser()) {
    const user = authService.getCurrentUser();
    return <Navigate to={user.is_admin ? "/admin" : "/dashboard"} replace />;
  }

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter both email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      if (identifier.includes('@')) {
        // Try user login first, fallback to admin
        try {
          await authService.login({ email: identifier, password });
          navigate(from || '/dashboard', { replace: true });
        } catch (userErr) {
          try {
            await authService.adminLogin({ username: identifier, password });
            navigate('/admin', { replace: true });
          } catch (adminErr) {
            setErrorMsg(userErr.response?.data?.message || 'Login failed. Please check credentials.');
          }
        }
      } else {
        // Try admin login first, fallback to user
        try {
          await authService.adminLogin({ username: identifier, password });
          navigate('/admin', { replace: true });
        } catch (adminErr) {
          try {
            await authService.login({ email: identifier, password });
            navigate(from || '/dashboard', { replace: true });
          } catch (userErr) {
            setErrorMsg(adminErr.response?.data?.message || 'Login failed. Please check credentials.');
          }
        }
      }
    } catch (err) {
      setErrorMsg('Authentication failed. Please check your network or inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] shadow-2xl p-8 sm:p-10 space-y-6">

          {/* Logo Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary rounded-2xl">
              <Compass className="h-7 w-7 text-primary dark:text-secondary animate-spin-slow" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Sign In to AuraTravel</h2>
            <p className="text-xs text-slate-400 font-outfit">Plan smart, customized itineraries with AI</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-outfit">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Email or Username</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
                <Mail className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}

                  required
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Password</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850/80 rounded-2xl px-4 py-3">
                <Lock className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}

                  required
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center mt-6"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Footer links */}
          <div className="pt-2 text-center text-xs text-slate-400 font-outfit">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-primary font-bold hover:underline">
              Register Here
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
