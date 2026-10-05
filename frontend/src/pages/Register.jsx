/**
 * @file Register.jsx
 * @description User registration page component.
 * Validates new account form inputs (name, email format, phone, password length),
 * registers the new user via authService, and automatically logs in to the dashboard.
 */

import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Compass, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authService } from '../services/api';

/**
 * User Registration view component.
 */
export default function Register() {

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  // If already logged in, redirect
  if (localStorage.getItem('token') && authService.getCurrentUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  const isValidEmail = (value) => {
    const val = (value || '').trim();
    if (!val || val.length > 254 || val.includes('..') || val.startsWith('.') || val.endsWith('.')) {
      return false;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(val);
  };

  const isValidPassword = (val) => {
    if (!val || val.length < 6) return { valid: false, msg: 'Password must be at least 6 characters long.' };
    if (!/[a-zA-Z]/.test(val) || !/\d/.test(val)) return { valid: false, msg: 'Password must contain at least one letter and one number.' };
    return { valid: true, msg: '' };
  };

  const isValidPhoneNumber = (value) => {
    const normalized = value.replace(/[^0-9]/g, '');
    return /^\d{10}$/.test(normalized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Please populate all required fields.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.msg);
      return;
    }

    if (phone && !isValidPhoneNumber(phone)) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await authService.register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] shadow-2xl p-8 sm:p-10 space-y-6">
          
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 text-secondary rounded-2xl">
              <Compass className="h-7 w-7 text-secondary animate-spin-slow" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Create Account</h2>
            <p className="text-xs text-slate-400 font-outfit">Join AuraTravel to plan customized AI journeys</p>
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
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Full Name *</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
                <User className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Email Address *</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
                <Mail className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Phone Number</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
                <Phone className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Password *</label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
                <Lock className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-outfit px-1">Must be at least 6 characters & include both letters and numbers.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center mt-6"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 font-outfit">
            <span>Already have an account? </span>
            <Link to="/login" className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
