/**
 * @file SavedTrips.jsx
 * @description User Saved Trips management page component.
 * Lists all travel itineraries saved by the authenticated user, organized into Active/Upcoming
 * journeys and a dedicated Completed Trip History archive.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, Calendar, Users, MapPin, ArrowRight, Hourglass, 
  Trash2, AlertTriangle, BadgeCheck, CheckCircle2, BookOpen, 
  History, Sparkles, Filter
} from 'lucide-react';
import { tripService } from '../services/api';

/**
 * Saved Trips & Completed Trip History gallery component.
 */
export default function SavedTrips() {

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active Tab: 'all' | 'upcoming' | 'history'
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await tripService.getMyTrips();
        setTrips(Array.isArray(res?.trips) ? res.trips : []);
      } catch (err) {
        console.error("Error loading user trips:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTrips();
  }, []);

  const handleFinishTrip = async (id) => {
    try {
      await tripService.finishTrip(id);
      setTrips(prev => prev.map(t => t.id === id ? { ...t, is_finished: true, status: 'Finished' } : t));
      setMsg('Trip marked as finished! It has been moved to your Completed Trip History.');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      console.error("Error finishing trip:", err);
      setErrorMsg('Failed to update trip status.');
    }
  };

  const handleDeleteTrip = async (id) => {
    setDeletingId(id);
    setMsg('');
    setErrorMsg('');
    try {
      await tripService.deleteTrip(id);
      setTrips(prev => prev.filter(t => t.id !== id));
      setMsg('Saved trip deleted successfully!');
      setDeleteConfirmId(null);
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      console.error("Error deleting trip:", err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete trip. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Separate upcoming vs completed/finished trips
  const upcomingTrips = useMemo(() => trips.filter(t => !t.is_finished), [trips]);
  const historyTrips = useMemo(() => trips.filter(t => t.is_finished), [trips]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render individual trip card component
  const renderTripCard = (trip, isHistoryItem = false) => (
    <div 
      key={trip.id} 
      className={`bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] border shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all relative ${
        isHistoryItem 
          ? 'border-emerald-500/30 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-transparent' 
          : 'border-slate-100 dark:border-slate-850'
      }`}
    >
      <div className="p-6 sm:p-8 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 font-outfit">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                Trip to {trip.destination_name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] font-semibold mt-1">
              <span className="flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 text-primary" /> Source: {trip.source_location}
              </span>
              {trip.travel_date && (
                <span className="flex items-center text-primary dark:text-secondary font-bold">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Travel Date: {trip.travel_date}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-450 font-bold px-2.5 py-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800/80 font-outfit shrink-0 flex items-center" title="Travel Date">
              <Calendar className="h-3 w-3 text-primary mr-1" />
              <span>{trip.travel_date ? trip.travel_date : 'Date Not Set'}</span>
            </span>
            <button
              onClick={() => setDeleteConfirmId(trip.id)}
              title="Delete saved trip"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 text-center text-xs font-semibold font-outfit">
          <div>
            <span className="text-slate-400 text-[9px] font-bold block mb-0.5 uppercase tracking-wider">Duration</span>
            <strong className="text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
              <Hourglass className="h-3.5 w-3.5 mr-1 text-primary" /> {trip.duration_days} Days
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[9px] font-bold block mb-0.5 uppercase tracking-wider">Travelers</span>
            <strong className="text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
              <Users className="h-3.5 w-3.5 mr-1 text-secondary" /> {trip.travelers} Pax
            </strong>
          </div>
          <div>
            <span className="text-slate-400 text-[9px] font-bold block mb-0.5 uppercase tracking-wider">Total Cost</span>
            <strong className="text-primary dark:text-secondary flex items-center justify-center font-extrabold">
              ₹{Math.round(trip.estimated_cost).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {trip.interests && Array.isArray(trip.interests) && trip.interests.map((int, i) => (
            <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-xl border border-slate-200/40 dark:border-slate-800/50 uppercase tracking-wider font-outfit capitalize">
              {int}
            </span>
          ))}
        </div>
      </div>

      <div className="px-6 sm:px-8 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-outfit">
        <div className="flex items-center space-x-2">
          {trip.is_finished ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider flex items-center shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Completed Journey
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-wider flex items-center">
              <Hourglass className="h-3.5 w-3.5 mr-1 text-amber-500" /> Upcoming Trip
            </span>
          )}

          {!trip.is_finished && (
            <button
              type="button"
              onClick={() => handleFinishTrip(trip.id)}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              Mark Finished
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/trips/${trip.id}`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center space-x-1"
          >
            <span>Itinerary</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {trip.is_finished && (
            <Link
              to={`/diaries?destId=${trip.destination_id}`}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-amber-500/20 hover:scale-105 transition-all flex items-center space-x-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Add Diary</span>
            </Link>
          )}
        </div>
      </div>

      {/* Confirmation Overlay Modal per Card */}
      {deleteConfirmId === trip.id && (
        <div className="absolute inset-0 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md rounded-[32px] p-6 flex flex-col justify-center items-center text-center space-y-4 z-20 animate-fade-in font-outfit">
          <div className="p-3 bg-rose-500/10 rounded-full text-rose-500">
            <Trash2 className="h-7 w-7" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm font-grotesk">Delete this saved trip?</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Are you sure you want to delete your trip to <strong>{trip.destination_name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteTrip(trip.id)}
              disabled={deletingId === trip.id}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1"
            >
              {deletingId === trip.id ? (
                <span>Deleting...</span>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-12">
      
      {/* Title & Page Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
            <Compass className="h-8 w-8 text-primary mr-2.5 animate-spin-slow" />
            Saved Trips & Travel History
          </h1>
          <p className="text-xs text-slate-400 font-outfit font-semibold mt-1">
            Access your active planned itineraries and review your completed travel history archive.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-outfit self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Trips ({trips.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upcoming ({upcomingTrips.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            <History className="h-3.5 w-3.5 mr-1" />
            <span>Trip History ({historyTrips.length})</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit animate-fade-in">
          <BadgeCheck className="h-4.5 w-4.5" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit animate-fade-in">
          <AlertTriangle className="h-4.5 w-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-5 max-w-lg mx-auto">
          <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 font-grotesk">No Saved Trips Yet</h3>
          <p className="text-slate-400 text-xs font-outfit leading-relaxed max-w-sm mx-auto">
            You haven't locked in any travel itineraries yet. Use the planner to build custom suggestions!
          </p>
          <Link
            to="/plan-trip"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            Plan Your Trip Now
          </Link>
        </div>
      ) : (
        <div className="space-y-10">

          {/* Section 1: Upcoming & Active Journeys */}
          {(activeTab === 'all' || activeTab === 'upcoming') && upcomingTrips.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                <Hourglass className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
                  Upcoming & Active Journeys ({upcomingTrips.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingTrips.map(trip => renderTripCard(trip, false))}
              </div>
            </div>
          )}

          {/* Section 2: Completed Trip History Archive */}
          {(activeTab === 'all' || activeTab === 'history') && historyTrips.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <div className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">
                    Completed Trip History ({historyTrips.length})
                  </h2>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-outfit">
                  ✓ Travel Memories & Diary Logs
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {historyTrips.map(trip => renderTripCard(trip, true))}
              </div>
            </div>
          )}

          {/* Empty state per tab */}
          {activeTab === 'upcoming' && upcomingTrips.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 text-slate-400 font-outfit text-xs">
              <p>No active upcoming trips found. All saved trips are marked as completed!</p>
            </div>
          )}

          {activeTab === 'history' && historyTrips.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 text-slate-400 font-outfit text-xs space-y-2">
              <History className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-semibold">No completed trip history logged yet.</p>
              <p className="text-[11px] text-slate-400">Mark your upcoming trips as "Finished" to archive them into your trip history.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
