/**
 * @file Profile.jsx
 * @description User Profile Settings page component.
 * Allows authenticated users to view and update their personal account details (full name, email address,
 * contact phone number, and password credentials) with field validation.
 */

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldAlert, BadgeCheck, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

/**
 * User Profile settings management component.
 */
export default function Profile() {

  const currentUser = authService.getCurrentUser() || {};

  const [name, setName] = useState(currentUser.name || currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await authService.getProfile();
        if (res && res.user) {
          if (res.user.name) setName(res.user.name);
          if (res.user.email) setEmail(res.user.email);
          if (res.user.phone !== undefined) setPhone(res.user.phone);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }
    loadProfile();
  }, []);

  const isValidEmail = (value) => {
    const val = (value || '').trim();
    if (!val || val.length > 254 || val.includes('..') || val.startsWith('.') || val.endsWith('.')) {
      return false;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(val);
  };

  const isValidPhone = (value) => {
    const val = (value || '').trim();
    if (!val) return true; // Optional field
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
    const phoneRegex = /^\+?[0-9\s\-\(\)]{7,15}$/;
    return phoneRegex.test(val);
  };

  const isValidPassword = (val) => {
    if (!val) return { valid: true, msg: '' }; // Optional on profile update
    if (val.length < 6) return { valid: false, msg: 'Password must be at least 6 characters long.' };
    if (!/[a-zA-Z]/.test(val) || !/\d/.test(val)) return { valid: false, msg: 'Password must contain at least one letter and one number.' };
    return { valid: true, msg: '' };
  };

  const validateAll = () => {
    const errors = { name: '', email: '', phone: '', password: '' };
    let isValid = true;

    // Validate Name
    const nameTrim = (name || '').trim();
    if (!nameTrim) {
      errors.name = 'Full traveler name is required.';
      isValid = false;
    } else if (nameTrim.length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
      isValid = false;
    }

    // Validate Email
    if (!email || !email.trim()) {
      errors.email = 'Email address is required.';
      isValid = false;
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
      isValid = false;
    }

    // Validate Phone
    if (phone && !isValidPhone(phone)) {
      errors.phone = 'Please enter a valid phone number (7 to 15 digits).';
      isValid = false;
    }

    // Validate Password
    if (password) {
      const passCheck = isValidPassword(password);
      if (!passCheck.valid) {
        errors.password = passCheck.msg;
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleFieldBlur = (field, value) => {
    let err = '';
    if (field === 'name') {
      const nameTrim = (value || '').trim();
      if (!nameTrim) err = 'Full traveler name is required.';
      else if (nameTrim.length < 2) err = 'Name must be at least 2 characters long.';
    } else if (field === 'email') {
      if (!value || !value.trim()) err = 'Email address is required.';
      else if (!isValidEmail(value)) err = 'Please enter a valid email address (e.g. name@domain.com).';
    } else if (field === 'phone') {
      if (value && !isValidPhone(value)) err = 'Please enter a valid phone number (7 to 15 digits).';
    } else if (field === 'password') {
      if (value) {
        const passCheck = isValidPassword(value);
        if (!passCheck.valid) err = passCheck.msg;
      }
    }
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');

    if (!validateAll()) {
      setErrorMsg('Please correct the highlighted errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), phone: phone.trim() };
      if (password) {
        payload.password = password;
      }
      const res = await authService.updateProfile(payload);
      setMsg(res.message || 'Profile updated successfully!');
      setPassword(''); // clear password box
      setFieldErrors({ name: '', email: '', phone: '', password: '' });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1 border-b border-slate-100 dark:border-slate-850 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
          <User className="h-8 w-8 text-primary mr-2.5" />
          Account Profile Settings
        </h1>
        <p className="text-xs text-slate-400 font-outfit font-semibold">
          Keep your email credentials and contact details fresh to receive alerts.
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
          <BadgeCheck className="h-4.5 w-4.5" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
          <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleUpdate} noValidate className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-5 font-outfit">
        
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <label className={`text-[10px] uppercase font-bold tracking-widest block transition-colors ${fieldErrors.name ? 'text-rose-500' : 'text-slate-400'}`}>
            Full Traveler Name *
          </label>
          <div className={`flex items-center rounded-2xl px-4 py-3 border transition-all ${
            fieldErrors.name 
              ? 'bg-rose-500/5 border-rose-500 ring-2 ring-rose-500/20' 
              : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus-within:border-primary'
          }`}>
            <User className={`h-4.5 w-4.5 mr-3 flex-shrink-0 ${fieldErrors.name ? 'text-rose-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) handleFieldBlur('name', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('name', e.target.value)}
              placeholder="Full Name"
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white focus:outline-none font-semibold"
            />
          </div>
          {fieldErrors.name && (
            <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1 animate-fade-in mt-1">
              <AlertCircle className="h-3.5 w-3.5 inline mr-1 flex-shrink-0" />
              <span>{fieldErrors.name}</span>
            </p>
          )}
        </div>

        {/* Email Address Field */}
        <div className="space-y-1.5">
          <label className={`text-[10px] uppercase font-bold tracking-widest block transition-colors ${fieldErrors.email ? 'text-rose-500' : 'text-slate-400'}`}>
            Email Address *
          </label>
          <div className={`flex items-center rounded-2xl px-4 py-3 border transition-all ${
            fieldErrors.email 
              ? 'bg-rose-500/5 border-rose-500 ring-2 ring-rose-500/20' 
              : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus-within:border-primary'
          }`}>
            <Mail className={`h-4.5 w-4.5 mr-3 flex-shrink-0 ${fieldErrors.email ? 'text-rose-500' : 'text-slate-400'}`} />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) handleFieldBlur('email', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('email', e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white focus:outline-none font-semibold"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1 animate-fade-in mt-1">
              <AlertCircle className="h-3.5 w-3.5 inline mr-1 flex-shrink-0" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        {/* Contact Phone Number Field */}
        <div className="space-y-1.5">
          <label className={`text-[10px] uppercase font-bold tracking-widest block transition-colors ${fieldErrors.phone ? 'text-rose-500' : 'text-slate-400'}`}>
            Contact Phone Number
          </label>
          <div className={`flex items-center rounded-2xl px-4 py-3 border transition-all ${
            fieldErrors.phone 
              ? 'bg-rose-500/5 border-rose-500 ring-2 ring-rose-500/20' 
              : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus-within:border-primary'
          }`}>
            <Phone className={`h-4.5 w-4.5 mr-3 flex-shrink-0 ${fieldErrors.phone ? 'text-rose-500' : 'text-slate-400'}`} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) handleFieldBlur('phone', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('phone', e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white focus:outline-none font-semibold"
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1 animate-fade-in mt-1">
              <AlertCircle className="h-3.5 w-3.5 inline mr-1 flex-shrink-0" />
              <span>{fieldErrors.phone}</span>
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className={`text-[10px] uppercase font-bold tracking-widest block transition-colors ${fieldErrors.password ? 'text-rose-500' : 'text-slate-400'}`}>
            Update Password (Leave blank to keep current)
          </label>
          <div className={`flex items-center rounded-2xl px-4 py-3 border transition-all ${
            fieldErrors.password 
              ? 'bg-rose-500/5 border-rose-500 ring-2 ring-rose-500/20' 
              : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus-within:border-primary'
          }`}>
            <Lock className={`h-4.5 w-4.5 mr-3 flex-shrink-0 ${fieldErrors.password ? 'text-rose-500' : 'text-slate-400'}`} />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) handleFieldBlur('password', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('password', e.target.value)}
              placeholder="Enter new secure password"
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white focus:outline-none font-semibold"
            />
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-rose-500 font-semibold flex items-center space-x-1 animate-fade-in mt-1">
              <AlertCircle className="h-3.5 w-3.5 inline mr-1 flex-shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{loading ? 'Saving updates...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
