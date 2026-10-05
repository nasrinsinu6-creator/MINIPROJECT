/**
 * @file ManageUsers.jsx
 * @description Administrative User Accounts & Credentials Management page component.
 * Supports searching registered user accounts, sorting users, creating new user accounts,
 * updating existing credentials, toggling admin privileges, and deleting user accounts.
 */

import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, AlertCircle, Trash2, Plus, Edit2, X, Lock, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { adminService } from '../../services/api';

/**
 * Admin User Management component.
 */
export default function ManageUsers() {

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form & Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Delete Confirmation Modal States
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await adminService.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load registered users database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddClick = () => {
    setEditUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleEditClick = (user) => {
    setEditUserId(user.id);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormPassword('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleDeleteClick = (user) => {
    setErrorMsg('');
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    setDeleting(true);
    setErrorMsg('');
    try {
      await adminService.deleteUser(targetId);
      // Optimistic update
      setUsers(prev => prev.filter(u => u.id !== targetId));
      setUserToDelete(null);
      setSuccessMsg('User profile and dependent records deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete user profile.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const nameVal = formName.trim();
    const emailVal = formEmail.trim();
    const phoneVal = formPhone.trim();
    const passwordVal = formPassword;

    if (!nameVal || nameVal.length < 3) {
      setErrorMsg('Name must be at least 3 characters long.');
      return;
    }

    const isValidEmail = (val) => {
      if (!val || val.length > 254 || val.includes('..') || val.startsWith('.') || val.endsWith('.')) return false;
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(val);
    };

    if (!isValidEmail(emailVal)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const isValidPassword = (val) => {
      if (!val || val.length < 6) return { valid: false, msg: 'Password must be at least 6 characters long.' };
      if (!/[a-zA-Z]/.test(val) || !/\d/.test(val)) return { valid: false, msg: 'Password must contain at least one letter and one number.' };
      return { valid: true, msg: '' };
    };

    if (!editUserId) {
      const passCheck = isValidPassword(passwordVal);
      if (!passCheck.valid) {
        setErrorMsg(passCheck.msg);
        return;
      }
    }

    if (editUserId && passwordVal) {
      const passCheck = isValidPassword(passwordVal);
      if (!passCheck.valid) {
        setErrorMsg(passCheck.msg);
        return;
      }
    }

    const payload = {
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
    };
    if (passwordVal) {
      payload.password = passwordVal;
    }

    setLoading(true);
    try {
      if (editUserId) {
        await adminService.updateUser(editUserId, payload);
        setSuccessMsg('User profile updated successfully.');
      } else {
        await adminService.createUser(payload);
        setSuccessMsg('New user profile created successfully.');
      }
      setIsFormOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to save user profile.');
      setLoading(false);
    }
  };

  const filteredUsers = users
    .filter((user) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.phone && user.phone.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'email-asc') {
        return (a.email || '').localeCompare(b.email || '');
      }
      if (sortBy === 'email-desc') {
        return (b.email || '').localeCompare(a.email || '');
      }
      if (sortBy === 'date-asc') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      if (sortBy === 'date-desc') {
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      return 0;
    });

  if (loading && !isFormOpen) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-105 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
            <Users className="h-8 w-8 text-primary mr-2.5" />
            Registered Users Directory
          </h1>
          <p className="text-xs text-slate-455 font-outfit font-semibold mt-0.5">
            Monitor, sort, and manage details of travelers registered on the platform.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit animate-pulse">
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-outfit">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-xl">
          <div className="flex items-center bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800/80 rounded-2xl px-4 py-2.5 flex-1 shadow-sm">
            <Search className="h-4.5 w-4.5 text-slate-455 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, or phone..."
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800/80 rounded-2xl px-3.5 py-2.5 shadow-sm shrink-0">
            <ArrowUpDown className="h-4 w-4 text-primary mr-2 shrink-0" />
            <span className="text-xs text-slate-500 font-bold mr-1.5 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-850 dark:text-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A – Z)</option>
              <option value="name-desc">Name (Z – A)</option>
              <option value="email-asc">Email (A – Z)</option>
              <option value="email-desc">Email (Z – A)</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-455 font-bold shrink-0">
          Showing {filteredUsers.length} of {users.length} Registered Users
        </span>
      </div>

      {/* Users Layout */}
      <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden font-outfit">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                <th className="p-4 pl-6 w-16">S.No.</th>
                <th
                  onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}
                  className="p-4 cursor-pointer hover:text-primary transition-colors select-none"
                  title="Click to toggle sort by Name"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Traveler Name</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortBy.startsWith('name') ? 'text-primary opacity-100' : 'opacity-50'}`} />
                  </div>
                </th>
                <th
                  onClick={() => setSortBy(sortBy === 'email-asc' ? 'email-desc' : 'email-asc')}
                  className="p-4 cursor-pointer hover:text-primary transition-colors select-none"
                  title="Click to toggle sort by Email"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Email Address</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortBy.startsWith('email') ? 'text-primary opacity-100' : 'opacity-50'}`} />
                  </div>
                </th>
                <th className="p-4">Contact Phone</th>
                <th
                  onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
                  className="p-4 cursor-pointer hover:text-primary transition-colors select-none"
                  title="Click to toggle sort by Registration Date"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Registration Date</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortBy.startsWith('date') ? 'text-primary opacity-100' : 'opacity-50'}`} />
                  </div>
                </th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-855 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                  <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {user.name ? user.name[0] : 'U'}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-655 dark:text-slate-350">
                    <span className="flex items-center space-x-1.5 font-bold">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{user.email}</span>
                    </span>
                  </td>
                  <td className="p-4 text-slate-655 dark:text-slate-350">
                    {user.phone ? (
                      <span className="flex items-center space-x-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not Provided</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400">
                    <span className="inline-flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      <span>{user.created_at ? user.created_at.split(' ')[0] : 'N/A'}</span>
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 text-slate-400 hover:text-primary rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                        title="Edit traveler profile"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                        title="Delete traveler account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-455 font-semibold">
                    No registered travelers match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal (Overlay style) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-2xl max-w-lg w-full overflow-hidden font-outfit animate-scale-up">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-grotesk">
                {editUserId ? 'Modify User Profile' : 'Register New Traveler'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-455 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Traveler Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  placeholder="e.g. johndoe@example.com"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +91 99999 88888"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {editUserId ? 'Reset Password (Leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editUserId}
                    placeholder={editUserId ? "Enter new password if modifying" : "Minimum 6 characters"}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 pl-9 focus:outline-none dark:text-white font-semibold transition-colors"
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {errorMsg && !loading && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center space-x-2 font-bold font-outfit animate-shake">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-1.5"
                  disabled={loading}
                >
                  {loading && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{editUserId ? 'Save Profile' : 'Register Traveler'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-outfit animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-rose-100 dark:border-rose-900/40 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-scale-up">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
                  Delete Traveler Account
                </h3>
                <p className="text-xs text-slate-450 font-medium">Permanent database removal</p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
              <p>
                Are you sure you want to permanently delete traveler profile{' '}
                <strong className="text-slate-900 dark:text-white font-bold">{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                ⚠️ All associated trips, feedback, reviews, chatbot logs, enquiries, and diary records for this user will also be permanently deleted.
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center space-x-2 font-bold font-outfit">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={deleting}
                className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Yes, Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
