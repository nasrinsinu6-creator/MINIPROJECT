/**
 * @file Support.jsx
 * @description Help & Support Portal component themed to match AuraTravel AI design system (Teal & Emerald palette).
 * Features Top Contact Cards (Aura AI Assistant, Traveler Helpline, Email Care Desk),
 * Interactive Support Ticket form with Issue Category, Priority Levels, Saved Trip linking,
 * and a Support Ticket Log & Resolution Status feed with Search, Status Filters, and Admin Resolutions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bot, PhoneCall, Mail, Sparkles, Clock, ShieldCheck, 
  Trash2, Search, ArrowRight, Send, AlertCircle, CheckCircle2,
  LifeBuoy, MapPin, Tag
} from 'lucide-react';
import { tripService } from '../services/api';

export default function Support() {
  const navigate = useNavigate();

  // State Data
  const [complaints, setComplaints] = useState([]);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [category, setCategory] = useState('Accommodation / Stays');
  const [priority, setPriority] = useState('Medium');
  const [linkedTripId, setLinkedTripId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // UI Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // List Filters & Search
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Resolved' | 'In Process' | 'Pending'
  const [searchQuery, setSearchQuery] = useState('');

  // Load User Complaints & Saved Trips
  const loadData = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        tripService.getMyComplaints(),
        tripService.getMyTrips().catch(() => ({ trips: [] }))
      ]);
      setComplaints(cRes.complaints || []);
      setSavedTrips(tRes.trips || []);
    } catch (err) {
      console.error('Failed to load support data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Form Submission
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please populate ticket title and description fields.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formattedSubject = `[${priority}] ${subject.trim()}`;
    const formattedDescription = `[Category: ${category}]${linkedTripId ? ` [Trip ID: ${linkedTripId}]` : ''}\n\n${description.trim()}`;

    try {
      const res = await tripService.submitComplaint({
        subject: formattedSubject,
        description: formattedDescription
      });

      setErrorMsg('');
      setSuccessMsg('Support ticket lodged successfully! Automated AI resolution attached below.');
      setSubject('');
      setDescription('');
      setCategory('Accommodation / Stays');
      setPriority('Medium');
      setLinkedTripId('');

      // Instantly prepend new complaint to state so list updates immediately
      if (res?.complaint) {
        setComplaints(prev => [res.complaint, ...prev]);
      } else {
        try {
          const updated = await tripService.getMyComplaints();
          setComplaints(updated.complaints || []);
        } catch (refreshErr) {
          console.warn('Non-fatal error refreshing complaints list:', refreshErr);
        }
      }
    } catch (err) {
      console.error('Submit complaint error:', err);
      setSuccessMsg('');
      if (err.response?.status === 401) {
        setErrorMsg('Authentication session required. Please log in to your account to lodge a support ticket.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to lodge support ticket. Please verify server connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Ticket Delete
  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Are you sure you want to remove this support ticket?')) return;
    try {
      await tripService.deleteComplaint(id);
      setComplaints(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  // Filter & Search Logged Tickets
  const filteredComplaints = useMemo(() => {
    return complaints.filter(ticket => {
      const statusLower = String(ticket.status || '').toLowerCase();

      // Filter by Status Tab
      if (activeTab === 'Resolved' && statusLower !== 'resolved') return false;
      if (activeTab === 'Pending' && statusLower !== 'pending') return false;
      if (activeTab === 'In Process' && !['in progress', 'in process'].includes(statusLower)) return false;

      // Filter by Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const sub = (ticket.subject || '').toLowerCase();
        const desc = (ticket.description || '').toLowerCase();
        const reply = (ticket.admin_reply || '').toLowerCase();
        return sub.includes(q) || desc.includes(q) || reply.includes(q);
      }

      return true;
    });
  }, [complaints, activeTab, searchQuery]);

  // Helper for priority badges
  const getPriorityBadgeClass = (p) => {
    const lower = String(p).toLowerCase();
    if (lower.includes('urgent')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (lower.includes('high')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (lower.includes('medium')) return 'bg-primary/10 text-primary dark:text-teal-400 border-primary/20';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32 font-sans">
        <div className="h-9 w-9 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans text-slate-800 dark:text-slate-100 animate-fade-in pb-16">
      
      {/* =========================================================================
          TOP CONTACT & ASSISTANCE CARDS (3 COLUMNS)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-outfit">
        
        {/* Card 1: Aura AI Assistant */}
        <div 
          onClick={() => navigate('/plan-trip')}
          className="bg-white dark:bg-[#111827] hover:border-primary/50 border border-slate-200/80 dark:border-slate-850 rounded-[28px] p-6 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary dark:text-teal-400 border border-primary/20 group-hover:scale-110 transition-transform">
              <Bot className="h-6 w-6" />
            </div>
            <div className="text-slate-400 group-hover:text-primary transition-colors pt-1">
              <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
              Aura AI Assistant
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Instant responses on budgets, packing, weather & local transit advice.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-widest text-primary dark:text-teal-400 uppercase font-grotesk flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-teal-400 animate-pulse mr-1"></span>
              <span>ACTIVE 24/7 • INSTANT</span>
            </span>
          </div>
        </div>

        {/* Card 2: Traveler Helpline */}
        <a 
          href="tel:+919072165133"
          className="bg-white dark:bg-[#111827] hover:border-emerald-500/50 border border-slate-200/80 dark:border-slate-850 rounded-[28px] p-6 transition-all duration-300 shadow-sm hover:shadow-md group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <PhoneCall className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
              Traveler Helpline
            </h3>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-wide font-grotesk">
              +91 9072165133
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Toll-free emergency & travel advisory line.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase font-grotesk">
              24/7 AVAILABLE
            </span>
          </div>
        </a>

        {/* Card 3: Email Care Desk */}
        <a 
          href="mailto:support@auratravel.ai"
          className="bg-white dark:bg-[#111827] hover:border-teal-500/50 border border-slate-200/80 dark:border-slate-850 rounded-[28px] p-6 transition-all duration-300 shadow-sm hover:shadow-md group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
              <Mail className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
              Email Care Desk
            </h3>
            <div className="text-xs font-extrabold text-teal-600 dark:text-teal-400 truncate font-grotesk">
              support@auratravel.ai
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              For complex booking receipts & refund reviews.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-widest text-teal-600 dark:text-teal-400 uppercase font-grotesk">
              RESPONSE &lt; 2 HOURS
            </span>
          </div>
        </a>

      </div>

      {/* =========================================================================
          MAIN WORKSPACE GRID (2 COLUMNS)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* =========================================================================
            LEFT COLUMN: SUPPORT TICKET FORM
            ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-850 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Header & Instant AI Resolver Badge */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-base font-grotesk tracking-wide uppercase flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              <span>SUPPORT TICKET</span>
            </h2>

            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider font-grotesk">
              Instant AI Resolver
            </span>
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start space-x-2.5 font-outfit">
              <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start space-x-2.5 font-outfit">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Support Ticket Form */}
          <form onSubmit={handleSubmitTicket} className="space-y-5 font-outfit text-xs">
            
            {/* 1. Issue Category Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-grotesk">
                ISSUE CATEGORY *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-inner"
              >
                <option value="Accommodation / Stays">Accommodation / Stays</option>
                <option value="Transit / Transport">Transit / Transport</option>
                <option value="Weather / Itinerary Adjustment">Weather / Itinerary Adjustment</option>
                <option value="Billing / Budget Estimation">Billing / Budget Estimation</option>
                <option value="General Support & Feedback">General Support & Feedback</option>
              </select>
            </div>

            {/* 2. Urgency Priority Level (Pill Selectors) */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-grotesk">
                URGENCY PRIORITY LEVEL
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2.5 rounded-xl font-extrabold text-xs transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/15 text-primary dark:text-teal-300 border-2 border-primary shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Link Associated Saved Trip (Optional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-grotesk">
                LINK ASSOCIATED SAVED TRIP (OPTIONAL)
              </label>
              <select
                value={linkedTripId}
                onChange={(e) => setLinkedTripId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-inner"
              >
                <option value="">-- Standalone / General Issue --</option>
                {savedTrips.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    Trip #{tr.id} to {tr.destination_name || 'Destination'} ({tr.duration_days} Days)
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Ticket Title / Subject */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-grotesk">
                TICKET TITLE / SUBJECT *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Resort overbooked or transit vehicle delayed"
                required
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
            </div>

            {/* 5. Detailed Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-grotesk">
                DETAILED DESCRIPTION & CONTENT *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or request in detail. For hotel/transit issues, specify destination for automated instant resolution..."
                rows="4"
                required
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner leading-relaxed"
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Lodging Ticket...' : 'Lodge Support Ticket'}</span>
            </button>
          </form>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: SUPPORT TICKET LOG & RESOLUTION STATUS
            ========================================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-850 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
            <div className="space-y-1">
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base font-grotesk tracking-wide uppercase flex items-center space-x-2">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <span>SUPPORT TICKET LOG & RESOLUTION STATUS</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                Track status, review automated AI suggestions, and view updates.
              </p>
            </div>

            {/* Filter Tabs: All, Resolved, In Process, Pending */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-outfit shrink-0 self-start sm:self-auto">
              {['All', 'Resolved', 'In Process', 'Pending'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative font-outfit">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logged support tickets..."
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner font-medium"
            />
          </div>

          {/* Ticket Feed List */}
          <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1 scrollbar-none font-outfit">
            {filteredComplaints.map((ticket) => {
              // Parse subject / priority if formatted
              let priorityTag = 'LOW';
              let displaySubject = ticket.subject || 'Support Ticket';
              
              if (ticket.subject && ticket.subject.startsWith('[')) {
                const parts = ticket.subject.split(']');
                priorityTag = parts[0].replace('[', '').toUpperCase();
                displaySubject = parts.slice(1).join(']').trim();
              }

              // Extract Category if stored in description
              let categoryLabel = 'Accommodation / Stays';
              let cleanDesc = ticket.description || '';
              if (cleanDesc.startsWith('[Category:')) {
                const cEnd = cleanDesc.indexOf(']');
                if (cEnd !== -1) {
                  categoryLabel = cleanDesc.substring(10, cEnd).trim();
                  cleanDesc = cleanDesc.substring(cEnd + 1).replace(/^\[Trip ID: \d+\]\s*/, '').trim();
                }
              }

              const isResolved = ticket.status === 'Resolved';
              const isInProgress = ticket.status === 'In Progress';

              return (
                <div 
                  key={ticket.id} 
                  className="bg-slate-50/90 dark:bg-[#0B0F19]/90 hover:bg-slate-100 dark:hover:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 transition-all duration-200 shadow-sm"
                >
                  {/* Top Bar: Subject, Priority Badge, Date & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-850 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm font-grotesk">{displaySubject}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${getPriorityBadgeClass(priorityTag)} uppercase font-grotesk`}>
                          {priorityTag}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                        <span>Category: <strong className="text-slate-700 dark:text-slate-200">{categoryLabel}</strong></span>
                        <span>•</span>
                        <span>{ticket.created_at}</span>
                      </div>
                    </div>

                    {/* Status Badge & Delete Button */}
                    <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                      {isResolved ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center space-x-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>RESOLVED</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          <span>IN PROGRESS</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          <span>PENDING</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete Ticket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ticket Main Description */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {cleanDesc}
                  </div>

                  {/* Resolution Sub-Box */}
                  {ticket.admin_reply && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-inner">
                      <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs font-grotesk uppercase tracking-wider">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{isResolved ? 'OFFICIAL ADMIN RESOLUTION' : 'AUTOMATED AI ADVISORY'}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        {ticket.admin_reply}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {filteredComplaints.length === 0 && (
              <div className="text-center py-20 bg-slate-50/50 dark:bg-[#0B0F19]/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 space-y-3 font-outfit">
                <LifeBuoy className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold">No logged support tickets matching your selection.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
