/**
 * @file Navbar.jsx
 * @description Main top navigation bar component.
 * Displays brand logo, desktop/mobile navigation links, user profile dropdown menu,
 * authentication triggers (login/register/logout), and responsive mobile drawer menu.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Compass, User, LogOut, LayoutDashboard, Calendar, BookmarkCheck, MailWarning, AlertCircle, BookOpen, ClipboardList } from 'lucide-react';
import { authService } from '../services/api';

/**
 * Top navigation header component rendered on all main views.
 */
export default function Navbar() {
  const [darkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Click outside listener to automatically close profile dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setDropdownOpen(false);
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-primary font-bold text-xl tracking-tight">
              <div className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-2xl border border-primary/20">
                <Compass className="h-6 w-6 text-primary dark:text-secondary" />
              </div>
              <span className="font-extrabold font-grotesk text-2xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-wide">
                AuraTravel AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-5">
            <Link to="/" className={`font-semibold font-outfit text-sm transition-all hover:text-primary ${isActive('/') ? 'text-primary' : 'text-slate-600 dark:text-slate-350'}`}>
              Home
            </Link>
            <Link to="/about" className={`font-semibold font-outfit text-sm transition-all hover:text-primary ${isActive('/about') ? 'text-primary' : 'text-slate-600 dark:text-slate-350'}`}>
              About
            </Link>
            <Link to="/destinations" className={`font-semibold font-outfit text-sm transition-all hover:text-primary ${isActive('/destinations') ? 'text-primary' : 'text-slate-600 dark:text-slate-350'}`}>
              Destinations
            </Link>
            <Link to="/feedback-reviews" className={`font-semibold font-outfit text-sm transition-all hover:text-primary ${isActive('/feedback-reviews') ? 'text-primary' : 'text-slate-600 dark:text-slate-350'}`}>
              Feedback & Reviews
            </Link>

            


            {/* Profile Dropdown or Auth buttons */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800 transition-all focus:outline-none"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold font-grotesk text-sm shadow-md">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : (currentUser.username ? currentUser.username[0].toUpperCase() : 'A')}
                  </div>
                  <span className="hidden lg:inline text-sm font-bold font-outfit text-slate-700 dark:text-slate-200">
                    {currentUser.name || currentUser.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 shadow-2xl py-3 animate-fade-in focus:outline-none">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{currentUser.name || currentUser.username}</p>
                      <p className="text-[11px] text-slate-450 truncate font-outfit mt-0.5">{currentUser.email || 'System Administrator'}</p>
                    </div>

                    <div className="py-2 px-2">
                      {currentUser.is_admin ? (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2.5 text-primary" /> Admin Panel
                          </Link>
                          <Link
                            to="/admin/diaries"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <BookOpen className="h-4 w-4 mr-2.5 text-amber-500" /> Manage Diaries
                          </Link>
                          <Link
                            to="/admin/reviews"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <ClipboardList className="h-4 w-4 mr-2.5 text-emerald-500" /> Reviews & Feedback
                          </Link>
                          <Link
                            to="/admin/complaints"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all"
                          >
                            <AlertCircle className="h-4 w-4 mr-2.5 text-rose-500" /> Manage Complaints
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2.5 text-primary" /> Dashboard Overview
                          </Link>
                          <Link
                            to="/plan-trip"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Calendar className="h-4 w-4 mr-2.5 text-secondary" /> Plan New Trip
                          </Link>
                          <Link
                            to="/my-trips"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <BookmarkCheck className="h-4 w-4 mr-2.5 text-teal-500" /> Saved Trips
                          </Link>
                          <Link
                            to="/diaries"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <BookOpen className="h-4 w-4 mr-2.5 text-amber-500" /> Trip Diary
                          </Link>
                          <Link
                            to="/feedback-reviews"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <ClipboardList className="h-4 w-4 mr-2.5 text-emerald-500" /> Feedback & Reviews
                          </Link>
                          <Link
                            to="/support"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all"
                          >
                            <MailWarning className="h-4 w-4 mr-2.5 text-rose-500" /> Help & Support
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <User className="h-4 w-4 mr-2.5 text-accent" /> Profile Settings
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 my-1"></div>
                    <div className="px-2 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                      >
                        <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="px-5 py-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-primary font-bold font-outfit text-sm transition-all">
                  Login
                </Link>
                <Link to="/register" className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold font-outfit text-sm shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-850 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-inner">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
            Home
          </Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
            About
          </Link>
          <Link to="/destinations" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
            Destinations
          </Link>
          <div className="border-t border-slate-100 dark:border-slate-850 my-2"></div>

          {currentUser ? (
            <div className="space-y-1">
              {currentUser.is_admin ? (
                <>
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-primary font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    Admin Console
                  </Link>
                  <Link to="/admin/diaries" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-amber-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    Manage Diaries
                  </Link>
                  <Link to="/admin/reviews" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-emerald-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    Reviews & Feedback
                  </Link>
                  <Link to="/admin/complaints" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-rose-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    Manage Complaints
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Dashboard
                  </Link>
                  <Link to="/plan-trip" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Plan Trip
                  </Link>
                  <Link to="/my-trips" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Saved Trips
                  </Link>
                  <Link to="/diaries" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Trip Diary
                  </Link>
                  <Link to="/feedback-reviews" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Feedback & Reviews
                  </Link>
                  <Link to="/support" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Help & Support
                  </Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-sm">
                    Profile Settings
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left block px-4 py-3 rounded-2xl text-rose-500 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-center px-4 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md">
              Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
