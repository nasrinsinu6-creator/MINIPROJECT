/**
 * @file ManageComplaints.jsx
 * @description Administrative Traveler Complaints & Support Ticket Management page component.
 * Allows administrators to review user complaints, filter/search by status or priority,
 * and provide official replies, priority adjustments, status resolution updates, and 
 * AI-powered 1-click urgent resolution with nearby hotel/restaurant alternative replacements.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, Search, Clock, CheckCircle2, AlertTriangle, 
  MessageSquare, User, Mail, Calendar, Send, RefreshCw, Filter, 
  ShieldAlert, Trash2, Tag, Zap, Hotel, Utensils, Sparkles, MapPin, 
  Star, ExternalLink, Building2, Check, Plus
} from 'lucide-react';
import { adminService, tripService } from '../../services/api';

/**
 * Admin Complaints Management component with AI Urgent Resolver.
 */
export default function ManageComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'In Progress', 'Resolved'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'Urgent', 'High', 'Medium', 'Low'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Hotels', 'Restaurants', 'Transit', 'Other'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'

  // Modal / Inline Reply States
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('Resolved');
  const [replyPriority, setReplyPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  // AI Urgent Resolver States
  const [aiIssueType, setAiIssueType] = useState('hotel'); // 'hotel' | 'restaurant'
  const [aiDestId, setAiDestId] = useState('1');
  const [aiAlternatives, setAiAlternatives] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadComplaintsAndDestinations = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const compRes = await adminService.getComplaints();
      setComplaints(compRes.complaints || []);

      const destRes = await tripService.getDestinations();
      const destList = Array.isArray(destRes?.destinations) ? destRes.destinations : [];
      setDestinations(destList);
    } catch (err) {
      console.error('Failed to fetch complaints or destinations:', err);
      setErrorMsg('Failed to load complaint data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaintsAndDestinations();
  }, []);

  const getTicketPriority = (comp) => {
    if (comp.subject && comp.subject.startsWith('[')) {
      const parts = comp.subject.split(']');
      const tag = parts[0].replace('[', '').trim().toLowerCase();
      if (tag.includes('urgent')) return 'Urgent';
      if (tag.includes('high')) return 'High';
      if (tag.includes('medium')) return 'Medium';
      if (tag.includes('low')) return 'Low';
    }
    const fullText = `${comp.subject || ''} ${comp.description || ''}`.toLowerCase();
    if (fullText.includes('urgent') || fullText.includes('full') || fullText.includes('booked')) return 'Urgent';
    return 'Medium';
  };

  const getTicketCategory = (comp) => {
    const desc = comp.description || '';
    if (desc.startsWith('[Category:')) {
      const cEnd = desc.indexOf(']');
      if (cEnd !== -1) {
        return desc.substring(10, cEnd).trim();
      }
    }
    const fullText = `${comp.subject || ''} ${comp.description || ''}`.toLowerCase();
    if (fullText.includes('hotel') || fullText.includes('resort') || fullText.includes('room') || fullText.includes('stay') || fullText.includes('accommodation')) {
      return 'Hotels / Accommodation';
    }
    if (fullText.includes('restaurant') || fullText.includes('food') || fullText.includes('dining') || fullText.includes('meal')) {
      return 'Restaurants / Dining';
    }
    if (fullText.includes('bus') || fullText.includes('cab') || fullText.includes('taxi') || fullText.includes('transport')) {
      return 'Transit / Transport';
    }
    return 'General Support';
  };

  const getCleanDescription = (comp) => {
    let desc = comp.description || '';
    if (desc.startsWith('[Category:')) {
      const cEnd = desc.indexOf(']');
      if (cEnd !== -1) {
        desc = desc.substring(cEnd + 1).replace(/^\[Trip ID: \d+\]\s*/, '').trim();
      }
    }
    return desc;
  };

  // Helper to detect destination & issue type from complaint content
  const detectComplaintDetails = (comp) => {
    const fullText = `${comp.subject || ''} ${comp.description || ''}`.toLowerCase();
    
    // Determine issue type
    let type = 'hotel';
    if (fullText.includes('restaurant') || fullText.includes('food') || fullText.includes('dining') || fullText.includes('meal')) {
      type = 'restaurant';
    } else if (fullText.includes('hotel') || fullText.includes('resort') || fullText.includes('room') || fullText.includes('stay') || fullText.includes('booked')) {
      type = 'hotel';
    }

    // Determine destination
    let foundDestId = '1';
    if (destinations.length > 0) {
      const matched = destinations.find(d => fullText.includes(d.name.toLowerCase()) || fullText.includes((d.city || '').toLowerCase()));
      if (matched) {
        foundDestId = String(matched.id);
      } else {
        foundDestId = String(destinations[0].id);
      }
    }

    return { type, destId: foundDestId };
  };

  // Fetch AI alternatives (hotels or restaurants) for chosen destination
  const fetchAIAlternatives = async (destId, type) => {
    setAiLoading(true);
    setAiAlternatives([]);
    try {
      if (type === 'hotel') {
        const res = await adminService.getHotels(destId);
        const list = Array.isArray(res?.hotels) ? res.hotels : [];
        list.sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)));
        setAiAlternatives(list.slice(0, 4));
      } else {
        const res = await adminService.getRestaurants(destId);
        const list = Array.isArray(res?.restaurants) ? res.restaurants : [];
        list.sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)));
        setAiAlternatives(list.slice(0, 4));
      }
    } catch (err) {
      console.error('Failed to fetch AI alternatives:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenReplyModal = (complaint) => {
    setActiveComplaint(complaint);
    setReplyText(complaint.admin_reply || '');
    setReplyStatus(complaint.status || 'Resolved');
    setReplyPriority(getTicketPriority(complaint));
    setErrorMsg('');

    // Auto-detect AI resolution parameters
    const { type, destId } = detectComplaintDetails(complaint);
    setAiIssueType(type);
    setAiDestId(destId);
    fetchAIAlternatives(destId, type);
  };

  const handleCloseReplyModal = () => {
    setActiveComplaint(null);
    setReplyText('');
    setReplyStatus('Resolved');
    setReplyPriority('Medium');
    setAiAlternatives([]);
  };

  // One-Click AI Urgent Resolve Action
  const handleAIOneClickResolve = async (complaint) => {
    setActiveComplaint(complaint);
    setReplyStatus('Resolved');
    setReplyPriority('Urgent');
    setErrorMsg('');

    const { type, destId } = detectComplaintDetails(complaint);
    setAiIssueType(type);
    setAiDestId(destId);
    setAiLoading(true);

    try {
      let alternatives = [];
      let destObj = destinations.find(d => String(d.id) === String(destId)) || { name: 'Destination' };

      if (type === 'hotel') {
        const res = await adminService.getHotels(destId);
        const list = Array.isArray(res?.hotels) ? res.hotels : [];
        list.sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)));
        alternatives = list.slice(0, 3);
      } else {
        const res = await adminService.getRestaurants(destId);
        const list = Array.isArray(res?.restaurants) ? res.restaurants : [];
        list.sort((a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0)));
        alternatives = list.slice(0, 3);
      }

      setAiAlternatives(alternatives);

      // Auto-generate solution message
      let solutionText = "";
      if (type === 'hotel') {
        solutionText = `🚨 URGENT ACCOMMODATION RESOLUTION: We apologize for the hotel availability issue. Our AI System has immediately identified nearby verified alternative accommodations in ${destObj.name} for you:\n\n` +
          alternatives.map((h, i) => `${i+1}. ${h.name} (${h.hotel_type || 'Hotel'})\n   • Rating: ⭐${h.rating || '4.5'}\n   • Address: ${h.address}\n   • Price: ₹${parseInt(h.price_per_night || 2000).toLocaleString()}/night\n   ${h.booking_url ? `• Direct Booking: ${h.booking_url}` : ''}`).join('\n\n') +
          `\n\nPlease select your preferred option so our support desk can transfer your booking immediately!`;
      } else {
        solutionText = `🚨 URGENT DINING RESOLUTION: We apologize for the restaurant booking issue. Our AI System has immediately identified nearby top-rated alternative restaurants in ${destObj.name} for you:\n\n` +
          alternatives.map((r, i) => `${i+1}. ${r.name} (${r.cuisine || 'Multi-Cuisine'})\n   • Rating: ⭐${r.rating || '4.5'}\n   • Address: ${r.address}\n   • Avg Cost: ₹${parseInt(r.avg_cost || 400).toLocaleString()} for two`).join('\n\n') +
          `\n\nOur support desk has alerted the venue for priority seating!`;
      }

      setReplyText(solutionText);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAISolutionToReply = () => {
    let destObj = destinations.find(d => String(d.id) === String(aiDestId)) || { name: 'Destination' };
    let solutionText = "";
    if (aiIssueType === 'hotel') {
      solutionText = `🚨 URGENT ACCOMMODATION RESOLUTION: We apologize for the hotel availability issue. Our AI System has immediately identified nearby verified alternative accommodations in ${destObj.name} for you:\n\n` +
        aiAlternatives.map((h, i) => `${i+1}. ${h.name} (${h.hotel_type || 'Hotel'})\n   • Rating: ⭐${h.rating || '4.5'}\n   • Address: ${h.address}\n   • Price: ₹${parseInt(h.price_per_night || 2000).toLocaleString()}/night\n   ${h.booking_url ? `• Direct Booking: ${h.booking_url}` : ''}`).join('\n\n') +
        `\n\nPlease select your preferred option so our support desk can transfer your booking immediately!`;
    } else {
      solutionText = `🚨 URGENT DINING RESOLUTION: We apologize for the restaurant booking issue. Our AI System has immediately identified nearby top-rated alternative restaurants in ${destObj.name} for you:\n\n` +
        aiAlternatives.map((r, i) => `${i+1}. ${r.name} (${r.cuisine || 'Multi-Cuisine'})\n   • Rating: ⭐${r.rating || '4.5'}\n   • Address: ${r.address}\n   • Avg Cost: ₹${parseInt(r.avg_cost || 400).toLocaleString()} for two`).join('\n\n') +
        `\n\nOur support desk has alerted the venue for priority seating!`;
    }
    setReplyText(solutionText);
    setReplyStatus('Resolved');
  };

  const handleAppendSingleOption = (item) => {
    let addText = "";
    if (aiIssueType === 'hotel') {
      addText = `\n• Alternative Hotel: ${item.name} (${item.hotel_type || 'Resort'}) - ₹${item.price_per_night}/night (⭐${item.rating}). Address: ${item.address} ${item.booking_url ? `Link: ${item.booking_url}` : ''}`;
    } else {
      addText = `\n• Alternative Restaurant: ${item.name} (${item.cuisine}) - Avg Cost ₹${item.avg_cost} for two (⭐${item.rating}). Address: ${item.address}`;
    }
    setReplyText(prev => prev ? `${prev}\n${addText}` : addText);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!activeComplaint) return;
    if (!replyText.trim()) {
      setErrorMsg('Please enter a response message before updating.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await adminService.replyComplaint(activeComplaint.id, {
        admin_reply: replyText.trim(),
        status: replyStatus,
        priority: replyPriority
      });

      setSuccessMsg(`Complaint ${activeComplaint.id} updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      handleCloseReplyModal();
      await loadComplaintsAndDestinations();
    } catch (err) {
      console.error('Failed to submit reply:', err);
      setErrorMsg('Failed to update complaint status.');
    } finally {
      setSubmitting(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm(`Are you sure you want to delete complaint ${id}?`)) return;
    setDeletingId(id);
    setErrorMsg('');
    try {
      await adminService.deleteComplaint(id);
      setSuccessMsg(`Complaint ${id} deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadComplaintsAndDestinations();
    } catch (err) {
      console.error('Failed to delete complaint:', err);
      setErrorMsg('Failed to delete complaint.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickStatusChange = async (complaint, newStatus) => {
    try {
      await adminService.replyComplaint(complaint.id, {
        admin_reply: complaint.admin_reply || '',
        status: newStatus
      });
      setSuccessMsg(`Complaint ${complaint.id} status updated to ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadComplaintsAndDestinations();
    } catch (err) {
      console.error('Failed to update status:', err);
      setErrorMsg('Failed to update complaint status.');
    }
  };

  // Filter & Sort complaints
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((comp) => {
        // Status Filter
        const compStatus = (comp.status || 'Pending').toLowerCase();
        let matchStatus = statusFilter === 'all';
        if (statusFilter !== 'all') {
          matchStatus = compStatus === statusFilter.toLowerCase();
        }

        // Priority Filter
        const compPriority = getTicketPriority(comp).toLowerCase();
        let matchPriority = priorityFilter === 'all';
        if (priorityFilter !== 'all') {
          matchPriority = compPriority === priorityFilter.toLowerCase();
        }

        // Category Filter
        const category = getTicketCategory(comp).toLowerCase();
        let matchCategory = categoryFilter === 'all';
        if (categoryFilter === 'Hotels') {
          matchCategory = category.includes('hotel') || category.includes('stay') || category.includes('accommodation');
        } else if (categoryFilter === 'Restaurants') {
          matchCategory = category.includes('restaurant') || category.includes('dining') || category.includes('food');
        } else if (categoryFilter === 'Transit') {
          matchCategory = category.includes('transit') || category.includes('transport');
        }

        // Search Filter
        const query = searchQuery.toLowerCase();
        const matchSearch =
          !searchQuery ||
          (comp.subject || '').toLowerCase().includes(query) ||
          (comp.description || '').toLowerCase().includes(query) ||
          (comp.user_name || '').toLowerCase().includes(query) ||
          (comp.user_email || '').toLowerCase().includes(query) ||
          category.includes(query) ||
          String(comp.id).includes(query);

        return matchStatus && matchPriority && matchCategory && matchSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [complaints, statusFilter, priorityFilter, categoryFilter, searchQuery, sortBy]);

  // Analytics counts
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'pending').length;
  const inProgressCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'in progress').length;
  const resolvedCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'resolved').length;
  const urgentCount = complaints.filter((c) => getTicketPriority(c) === 'Urgent').length;

  const getStatusBadge = (status) => {
    const st = (status || 'Pending').toLowerCase();
    if (st === 'resolved') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Resolved
        </span>
      );
    }
    if (st === 'in progress') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center w-fit">
          <Clock className="w-3.5 h-3.5 mr-1" />
          In Progress
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center w-fit">
        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
        Pending
      </span>
    );
  };

  const getPriorityBadge = (p) => {
    const prio = String(p).toUpperCase();
    if (prio === 'URGENT') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center w-fit animate-pulse">
          <Zap className="w-3 h-3 mr-1 text-rose-500" />
          URGENT
        </span>
      );
    }
    if (prio === 'HIGH') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit">
          HIGH
        </span>
      );
    }
    if (prio === 'MEDIUM') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-primary/10 text-primary dark:text-teal-400 border border-primary/20 w-fit">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 w-fit">
        LOW
      </span>
    );
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk">
            <ShieldAlert className="h-8 w-8 text-rose-500 mr-3" />
            Traveler Complaints & Support Desk
          </h1>
          <p className="text-slate-450 text-xs font-outfit font-semibold mt-1">
            Review user support tickets with AI-powered 1-click urgent resolution providing replacement hotel & restaurant options.
          </p>
        </div>

        <button
          onClick={loadComplaintsAndDestinations}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold font-outfit transition-all duration-200 w-fit"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold flex items-center space-x-2 font-outfit">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xs font-bold flex items-center space-x-2 font-outfit">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-grotesk">Total Tickets</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk">{totalCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-grotesk">Pending Review</span>
            <span className="text-2xl font-extrabold text-amber-500 font-grotesk">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-grotesk">In Process</span>
            <span className="text-2xl font-extrabold text-blue-500 font-grotesk">{inProgressCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-grotesk">Resolved</span>
            <span className="text-2xl font-extrabold text-emerald-500 font-grotesk">{resolvedCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-grotesk">Urgent Disputes</span>
            <span className="text-2xl font-extrabold text-rose-500 font-grotesk">{urgentCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Zap className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between font-outfit">
        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket ID, user, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Filter Controls (Status, Priority, Category) */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Category Quick Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 font-grotesk">Category:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'Hotels', label: 'Hotels', icon: Hotel },
              { id: 'Restaurants', label: 'Dining', icon: Utensils }
            ].map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1 ${
                    categoryFilter === cat.id
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-3 h-3 mr-0.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 font-grotesk">Status:</span>
            {['all', 'Pending', 'In Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 capitalize ${
                  statusFilter.toLowerCase() === st.toLowerCase()
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] p-12 rounded-[32px] border border-slate-100 dark:border-slate-800 text-center space-y-3 font-outfit">
          <AlertCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Complaints Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
              ? 'No traveler complaints match your active search or filter criteria.'
              : 'Great news! There are currently no traveler support complaints logged.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((comp) => {
            const prio = getTicketPriority(comp);
            const category = getTicketCategory(comp);
            const cleanDesc = getCleanDescription(comp);
            let displaySubj = comp.subject || 'Support Ticket';
            if (displaySubj.startsWith('[')) {
              const parts = displaySubj.split(']');
              displaySubj = parts.slice(1).join(']').trim();
            }

            const isHotelOrRest = category.includes('Hotel') || category.includes('Restaurant') || category.includes('Accommodation') || category.includes('Dining') || prio === 'Urgent';

            return (
              <div
                key={comp.id}
                className={`bg-white dark:bg-[#111827] p-6 rounded-[28px] border transition-all duration-200 space-y-4 font-outfit shadow-sm ${
                  prio === 'Urgent' 
                    ? 'border-rose-500/40 dark:border-rose-900/50 bg-gradient-to-r from-rose-500/[0.02] via-transparent to-transparent' 
                    : 'border-slate-100 dark:border-slate-800/80 hover:shadow-md'
                }`}
              >
                {/* Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                  <div className="flex items-start space-x-3">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm font-grotesk shrink-0 mt-0.5 border ${
                      category.includes('Hotel') 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        : category.includes('Restaurant')
                        ? 'bg-teal-500/10 border-teal-500/20 text-teal-500'
                        : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                      {category.includes('Hotel') ? <Hotel className="h-5 w-5" /> : category.includes('Restaurant') ? <Utensils className="h-5 w-5" /> : comp.id}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                          {displaySubj}
                        </h3>
                        {getPriorityBadge(prio)}
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center">
                          {category.includes('Hotel') ? <Hotel className="w-3 h-3 mr-1 text-amber-500" /> : category.includes('Restaurant') ? <Utensils className="w-3 h-3 mr-1 text-teal-500" /> : <Tag className="w-3 h-3 mr-1 text-slate-400" />}
                          {category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1 text-slate-400" />
                          <strong>{comp.user_name || `User ID ${comp.user_id}`}</strong>
                        </span>
                        {comp.user_email && (
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-slate-400" />
                            {comp.user_email}
                          </span>
                        )}
                        {comp.created_at && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {new Date(comp.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                    
                    {/* AI One-Click Resolve Button for Urgent/Hotel/Restaurant Tickets */}
                    {isHotelOrRest && (
                      <button
                        onClick={() => handleAIOneClickResolve(comp)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-xs font-extrabold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 font-grotesk"
                        title="Auto-fetch nearest alternative hotel/restaurant recommendations and generate 1-click solution"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                        <span>AI Urgent Resolve</span>
                      </button>
                    )}

                    <select
                      value={comp.status || 'Pending'}
                      onChange={(e) => handleQuickStatusChange(comp, e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    {getStatusBadge(comp.status)}
                    <button
                      onClick={() => handleOpenReplyModal(comp)}
                      className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{comp.admin_reply ? 'Edit Reply' : 'Respond'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteComplaint(comp.id)}
                      disabled={deletingId === comp.id}
                      title="Delete Ticket"
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description Body */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-outfit">
                  <span className="font-bold text-slate-400 block mb-1 uppercase text-[10px] tracking-wider font-grotesk">
                    Traveler Description:
                  </span>
                  {cleanDesc || 'No description provided.'}
                </div>

                {/* Admin Reply Section (if existing) */}
                {comp.admin_reply && (
                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-xs space-y-1.5">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Official Administrative Reply & Resolution:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-outfit whitespace-pre-line leading-relaxed">{comp.admin_reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply & AI Urgent Resolution Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-outfit overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk">
                  <MessageSquare className="w-5 h-5 text-primary mr-2" />
                  Respond to Ticket {activeComplaint.id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Provide administrative solution or use AI Urgent Resolver to offer alternative hotels & restaurants.
                </p>
              </div>
              <button
                onClick={handleCloseReplyModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReplySubmit} className="space-y-6">
              {/* User Complaint Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Submitter: <strong className="text-slate-800 dark:text-slate-200">{activeComplaint.user_name || `User #${activeComplaint.user_id}`}</strong> ({activeComplaint.user_email || 'No email'})</span>
                  <span className="text-[10px]">{activeComplaint.created_at}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-100 font-bold text-xs">{activeComplaint.subject}</p>
                <div className="text-slate-600 dark:text-slate-300 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  {getCleanDescription(activeComplaint)}
                </div>
              </div>

              {/* AI Smart Urgent Resolver Widget */}
              <div className="bg-gradient-to-br from-amber-500/10 via-primary/5 to-secondary/10 p-5 rounded-3xl border border-amber-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                      AI Smart Urgent Resolver
                    </h4>
                  </div>
                  
                  {/* Issue Type & Destination Selector */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={aiIssueType}
                      onChange={(e) => {
                        setAiIssueType(e.target.value);
                        fetchAIAlternatives(aiDestId, e.target.value);
                      }}
                      className="bg-white dark:bg-slate-900 border border-amber-500/30 text-xs px-2.5 py-1.5 rounded-xl font-bold dark:text-white cursor-pointer"
                    >
                      <option value="hotel">Hotels & Stays</option>
                      <option value="restaurant">Restaurants & Dining</option>
                    </select>

                    <select
                      value={aiDestId}
                      onChange={(e) => {
                        setAiDestId(e.target.value);
                        fetchAIAlternatives(e.target.value, aiIssueType);
                      }}
                      className="bg-white dark:bg-slate-900 border border-amber-500/30 text-xs px-2.5 py-1.5 rounded-xl font-bold dark:text-white cursor-pointer max-w-[140px]"
                    >
                      {destinations.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  Select nearest replacement options from our catalog to include in your administrative reply:
                </p>

                {aiLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiAlternatives.map((item) => (
                      <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-slate-900 dark:text-white truncate block pr-1">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                              ⭐ {item.rating || '4.5'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {aiIssueType === 'hotel' ? item.hotel_type || 'Resort' : item.cuisine || 'Multi-Cuisine'} • {item.address}
                          </span>
                          <span className="text-[11px] font-extrabold text-primary block">
                            {aiIssueType === 'hotel' ? `₹${parseInt(item.price_per_night || 0).toLocaleString()}/night` : `Avg ₹${parseInt(item.avg_cost || 0).toLocaleString()} for 2`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAppendSingleOption(item)}
                          className="w-full py-1.5 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 dark:hover:bg-primary text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Append Option</span>
                        </button>
                      </div>
                    ))}
                    {aiAlternatives.length === 0 && (
                      <p className="col-span-2 text-center text-xs text-slate-400 py-4">No alternative choices found for this destination.</p>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleApplyAISolutionToReply}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-xs rounded-2xl shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-1.5 font-grotesk"
                  >
                    <Zap className="h-4 w-4 fill-current animate-pulse" />
                    <span>Auto-Fill Complete AI Urgent Resolution</span>
                  </button>
                </div>
              </div>

              {/* Status and Priority Select Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block font-grotesk">
                    Update Status
                  </label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block font-grotesk">
                    Adjust Priority
                  </label>
                  <select
                    value={replyPriority}
                    onChange={(e) => setReplyPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Reply Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block font-grotesk">
                  Administrative Response Message
                </label>
                <textarea
                  rows={5}
                  placeholder="Type official reply / resolution details here or use the AI Smart Urgent Resolver above..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary resize-none font-outfit"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReplyModal}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/25 transition-all flex items-center space-x-2 font-outfit"
                >
                  {submitting && <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Resolution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
