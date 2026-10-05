/**
 * @file AdminDashboard.jsx
 * @description Master Administrative Analytics Dashboard page component.
 * Displays overall platform metrics (registered users, destinations, planned trips, complaints),
 * category distribution metrics, recent user complaints with quick-reply, and AI chatbot conversation logs.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, Map, Calendar, AlertCircle,
  ShieldCheck, CornerDownRight, Send, Star, BookmarkCheck 
} from 'lucide-react';
import { adminService } from '../../services/api';

/**
 * Master Admin Console Dashboard component.
 */
export default function AdminDashboard() {

  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [distribution, setDistribution] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Complaint reply modal/field states
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('Resolved');

  const loadData = async () => {
    try {
      const res = await adminService.getAnalytics();
      setStats(res?.stats || null);
      setDistribution(res?.dest_distribution || {});

      const compRes = await adminService.getComplaints();
      setComplaints(Array.isArray(compRes?.complaints) ? compRes.complaints : []);

      const logsRes = await adminService.getChatLogs();
      setChatLogs(Array.isArray(logsRes?.logs) ? logsRes.logs.slice(0, 10) : []);
    } catch (err) {
      console.error("Failed to load admin analytics dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReplySubmit = async (e, id) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await adminService.replyComplaint(id, {
        admin_reply: replyText,
        status: replyStatus
      });
      setReplyText('');
      setReplyingToId(null);
      loadData(); // reload
    } catch (err) {
      console.error("Failed to post resolution:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-850 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
          <ShieldCheck className="h-8 w-8 text-primary mr-2.5" />
          Administration Command Board
        </h1>
        <p className="text-slate-450 text-xs font-outfit font-semibold">
          Monitor system metrics, update available hotel capacities, and resolve traveler issues.
        </p>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Registered Users', value: stats.users, icon: Users, color: 'text-primary bg-primary/10 border-primary/20', link: '/admin/users' },
            { label: 'Destinations', value: stats.destinations, icon: Map, color: 'text-secondary bg-secondary/10 border-secondary/20', link: '/admin/destinations' },
            { label: 'User Planned Trips', value: stats.trips_planned, icon: BookmarkCheck, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', link: '/admin/trips' },
            { label: 'User Reviews', value: stats.total_reviews !== undefined ? `${stats.total_reviews} (${stats.average_rating || 0} ★)` : '0', icon: Star, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', link: '/admin/reviews' }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Link 
                key={idx} 
                to={stat.link}
                className="bg-white dark:bg-[#111827] p-5 rounded-[24px] border border-slate-100 dark:border-slate-855 shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-primary/40 group"
              >
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1 font-bold uppercase tracking-wider font-grotesk">{stat.label}</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-grotesk group-hover:text-primary transition-colors">{stat.value}</span>
                </div>
                <div className={`p-3 rounded-2xl border ${stat.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent Complaints Section */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-sm font-grotesk uppercase tracking-wider flex items-center">
              <AlertCircle className="h-4 w-4 text-rose-500 mr-2" /> Recent Traveler Complaints
            </h3>
            <p className="text-[10px] text-slate-450 font-outfit mt-0.5">Latest support tickets lodged by users.</p>
          </div>
          <button
            onClick={() => navigate('/admin/complaints')}
            className="text-xs font-bold text-primary hover:underline font-outfit"
          >
            View All &rarr;
          </button>
        </div>

        <div className="space-y-3 font-outfit text-xs pt-2">
          {complaints.slice(0, 4).map((comp) => (
            <div key={comp.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-900 dark:text-white">{comp.user_name || `User ID ${comp.user_id}`}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${
                  comp.status === 'Resolved' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {comp.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-semibold line-clamp-1">{comp.subject}: {comp.description}</p>
            </div>
          ))}
          {complaints.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">No traveler complaints filed yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}
