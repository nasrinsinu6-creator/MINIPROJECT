/**
 * @file ManageTrips.jsx
 * @description Administrative User Planned Trips Management page component.
 * Allows administrators to review all trips planned across registered users,
 * search/filter trips by user name, destination, or status, view detailed day-by-day itineraries,
 * and remove trips if necessary.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookmarkCheck, Search, Calendar, User, MapPin, Trash2, Eye, X, 
  AlertCircle, ShieldCheck, DollarSign, Clock, Users, Filter, RefreshCw, FileText
} from 'lucide-react';
import { adminService } from '../../services/api';

export default function ManageTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal States
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await adminService.getTrips();
      setTrips(Array.isArray(res?.trips) ? res.trips : []);
    } catch (err) {
      console.error('Failed to load user planned trips:', err);
      setErrorMsg('Failed to load planned trips database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    const targetId = tripToDelete.id;
    setDeleting(true);
    setErrorMsg('');
    try {
      await adminService.deleteTrip(targetId);
      setTrips(prev => prev.filter(t => t.id !== targetId));
      setTripToDelete(null);
      setSuccessMsg(`Planned trip #${targetId} deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete planned trip.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered & Searched Trips List
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (trip.user_name && trip.user_name.toLowerCase().includes(q)) ||
        (trip.user_email && trip.user_email.toLowerCase().includes(q)) ||
        (trip.destination_name && trip.destination_name.toLowerCase().includes(q)) ||
        (trip.source_location && trip.source_location.toLowerCase().includes(q)) ||
        String(trip.id).includes(q)
      );

      // Status match
      const isFinished = strIsFinished(trip);
      const matchesStatus = 
        statusFilter === 'All' ||
        (statusFilter === 'Finished' && isFinished) ||
        (statusFilter === 'Upcoming' && !isFinished);

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  function strIsFinished(t) {
    if (t.is_finished) return true;
    if (String(t.status).toLowerCase() === 'finished') return true;
    return false;
  }

  // Summary Metrics
  const totalBudget = useMemo(() => {
    return trips.reduce((acc, curr) => acc + (parseFloat(curr.estimated_cost) || 0), 0);
  }, [trips]);

  const totalTravelers = useMemo(() => {
    return trips.reduce((acc, curr) => acc + (parseInt(curr.travelers) || 1), 0);
  }, [trips]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-16">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
            <BookmarkCheck className="h-8 w-8 text-indigo-500 mr-2.5" />
            User Planned Trips Console
          </h1>
          <p className="text-slate-400 text-xs font-outfit font-semibold">
            Review, inspect, and manage all trip itineraries planned across registered travelers.
          </p>
        </div>
        <button
          onClick={loadTrips}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl font-bold font-outfit flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-2xl font-bold font-outfit flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-grotesk">Total Trips Planned</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk">{trips.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
            <BookmarkCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-grotesk">Total Travelers</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk">{totalTravelers}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-outfit">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, email, destination, source..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end text-xs font-semibold">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
          {['All', 'Upcoming', 'Finished'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                statusFilter === status
                  ? 'bg-primary text-white font-bold shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Planned Trips Data Table */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-outfit text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-4 px-6">Trip ID & Date</th>
                <th className="py-4 px-6">User Account</th>
                <th className="py-4 px-6">Destination & Route</th>
                <th className="py-4 px-6">Duration & Travelers</th>
                <th className="py-4 px-6">Estimated Cost</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTrips.map((trip) => {
                const isFinished = strIsFinished(trip);
                return (
                  <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Trip ID & Created Date */}
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-900 dark:text-white font-grotesk text-sm">
                        TRIP-{trip.id}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {trip.created_at ? String(trip.created_at).split(' ')[0] : 'N/A'}
                      </span>
                    </td>

                    {/* User Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white font-bold flex items-center justify-center text-xs shadow-sm">
                          {trip.user_name ? trip.user_name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 dark:text-white truncate">
                            {trip.user_name || `User ID ${trip.user_id}`}
                          </p>
                          {trip.user_email && (
                            <p className="text-[10px] text-slate-400 truncate">{trip.user_email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Destination & Route */}
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center">
                        <MapPin className="h-3.5 w-3.5 text-primary mr-1 shrink-0" />
                        {trip.destination_name}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        From {trip.source_location || 'Default'}
                      </span>
                    </td>

                    {/* Duration & Travelers */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {trip.duration_days} Days / {trip.travelers} Person{parseInt(trip.travelers) > 1 ? 's' : ''}
                      </p>
                      {trip.travel_date && (
                        <span className="text-[10px] text-primary font-bold block mt-0.5">
                          Date: {trip.travel_date}
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 dark:text-white font-grotesk text-sm">
                        ₹{parseInt(trip.estimated_cost || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border ${
                        isFinished
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {isFinished ? 'Finished' : 'Upcoming'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTrip(trip)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-600 dark:text-slate-300 transition-colors"
                        title="View Trip Itinerary"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setTripToDelete(trip)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 transition-colors"
                        title="Delete Planned Trip"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTrips.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <BookmarkCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No planned trips found matching search parameters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Itinerary Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-grotesk">
                    Trip {selectedTrip.id} – {selectedTrip.destination_name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-outfit mt-0.5">
                  Planned by {selectedTrip.user_name} ({selectedTrip.user_email || `User ID ${selectedTrip.user_id}`})
                </p>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-outfit bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Source</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedTrip.source_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Duration</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedTrip.duration_days} Days</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Travelers</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedTrip.travelers} Persons</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Cost</span>
                <span className="font-extrabold text-primary">₹{parseInt(selectedTrip.estimated_cost || 0).toLocaleString()}</span>
              </div>
            </div>

            {selectedTrip.itinerary_text && (
              <div className="space-y-3 font-outfit">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-grotesk flex items-center">
                  <FileText className="h-4 w-4 text-primary mr-1.5" />
                  Day-by-Day Itinerary Schedule
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed font-medium whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {typeof selectedTrip.itinerary_text === 'string'
                    ? selectedTrip.itinerary_text
                    : JSON.stringify(selectedTrip.itinerary_text, null, 2)}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTrip(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-center">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1 font-outfit">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-grotesk">Delete Planned Trip?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete planned trip <strong>Trip {tripToDelete.id}</strong> ({tripToDelete.destination_name}) for user <strong>{tripToDelete.user_name}</strong>?
              </p>
            </div>
            <div className="flex space-x-3 pt-2 font-outfit text-xs font-bold">
              <button
                onClick={() => setTripToDelete(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTrip}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
