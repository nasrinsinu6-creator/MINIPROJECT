/**
 * @file Sidebar.jsx
 * @description Side navigation menu component for authenticated users and administrators.
 * Renders user navigation or admin management options with active tab highlighting
 * and a compact user profile + logout action footer bar.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Hotel, 
  Utensils, 
  Bus, 
  User, 
  Users, 
  Compass, 
  BookmarkCheck, 
  MailWarning, 
  AlertCircle, 
  BookOpen, 
  ClipboardList,
  LogOut
} from 'lucide-react';
import { authService } from '../services/api';

/**
 * Sidebar navigation drawer component.
 * 
 * @param {Object} props
 * @param {boolean} props.isAdmin - Flag indicating whether to render admin management links vs. user dashboard links.
 */
export default function Sidebar({ isAdmin }) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Navigation menu items for standard user workspace
  const userLinks = [
    { to: '/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: '/plan-trip', label: 'Plan Trip', icon: Compass },
    { to: '/my-trips', label: 'Saved Trips', icon: BookmarkCheck },
    { to: '/diaries', label: 'Trip Diary', icon: BookOpen },
    { to: '/feedback-reviews', label: 'Feedback & Reviews', icon: ClipboardList },
    { to: '/support', label: 'Help & Support', icon: MailWarning },
    { to: '/profile', label: 'Profile Settings', icon: User },
  ];

  // Navigation menu items for administrative control panel
  const adminLinks = [
    { to: '/admin', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/destinations', label: 'Destination Management', icon: Map },
    { to: '/admin/hotels', label: 'Accommodation Management', icon: Hotel },
    { to: '/admin/restaurants', label: 'Restaurant Management', icon: Utensils },
    { to: '/admin/transportation', label: 'Transportation Management', icon: Bus },
    { to: '/admin/complaints', label: 'Manage Complaints', icon: AlertCircle },
    { to: '/admin/diaries', label: 'Manage Trip Diaries', icon: BookOpen },
    { to: '/admin/reviews', label: 'Reviews & Feedback', icon: ClipboardList },
  ];

  // Select active link configuration based on user role
  const links = isAdmin ? adminLinks : userLinks;

  const initial = currentUser?.name
    ? currentUser.name[0].toUpperCase()
    : currentUser?.username
    ? currentUser.username[0].toUpperCase()
    : 'A';

  const roleText = currentUser?.is_admin
    ? 'System Account'
    : 'Traveler Account';

  return (
    <aside className="w-72 bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800/80 h-[calc(100vh-5rem)] sticky top-20 shadow-sm hidden md:flex flex-col justify-between flex-shrink-0 transition-all duration-300">
      {/* Top Menu Links */}
      <div className="p-5 space-y-3 overflow-y-auto">
        <div className="px-3 py-1 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-grotesk">
            {isAdmin ? 'Admin Console' : 'Travel Dashboard'}
          </span>
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>

        <div className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin' || link.to === '/dashboard'}
                className={({ isActive }) =>
                  `group flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20 scale-[1.01] font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-primary dark:hover:text-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && (
                      <Icon
                        className={`h-4.5 w-4.5 flex-shrink-0 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-secondary'
                        }`}
                        strokeWidth={isActive ? 2.2 : 2}
                      />
                    )}
                    <span className="font-outfit tracking-wide">{link.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer User & Logout Bar */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0E131F] flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-teal-400 to-emerald-500 text-white font-extrabold font-grotesk text-lg flex items-center justify-center shadow-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate font-outfit leading-tight">
              {currentUser?.name || currentUser?.username || 'admin'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-400 truncate font-outfit mt-0.5">
              {roleText}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-200 flex-shrink-0 ml-2"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}

