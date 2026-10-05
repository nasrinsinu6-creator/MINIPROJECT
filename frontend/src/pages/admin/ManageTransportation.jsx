/**
 * @file ManageTransportation.jsx
 * @description Administrative User-Selected Transportation Audit page component.
 * Displays a read-only log of transportation modes and routes selected by users in their planned itineraries.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, Search, Filter, ShieldCheck, MapPin, 
  Clock, Navigation, User, Calendar, RefreshCw
} from 'lucide-react';
import { adminService } from '../../services/api';

/**
 * Admin User Selected Transportation View component.
 */
export default function ManageTransportation() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransportFilter, setSelectedTransportFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTrips();
      const tripsList = Array.isArray(res?.trips) ? res.trips : [];
      setTrips(tripsList);
    } catch (err) {
      console.error("Failed to load user planned trips for transportation view:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter trips that have transport details
  const userTransports = useMemo(() => {
    return trips.map(t => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name || `User ID ${t.user_id}`,
      userEmail: t.user_email || '',
      destinationId: t.destination_id,
      destinationName: t.destination_name || 'Destination',
      sourceLocation: t.source_location || 'Not Specified',
      transportType: t.transport_type || 'Standard Cab',
      transportFare: parseFloat(t.transport_fare || 0),
      travelTime: t.travel_time || 'N/A',
      distance: t.distance ? `${t.distance} km` : 'N/A',
      travelDate: t.travel_date || (t.created_at ? String(t.created_at).split(' ')[0] : 'N/A'),
      createdAt: t.created_at
    }));
  }, [trips]);

  // Extract unique transport types for filter dropdown
  const uniqueTransportTypes = useMemo(() => {
    const types = new Set(userTransports.map(t => t.transportType).filter(Boolean));
    return Array.from(types);
  }, [userTransports]);

  // Filtered dataset based on search and selected transport filter
  const filteredTransports = useMemo(() => {
    return userTransports.filter(t => {
      const matchesFilter = selectedTransportFilter === 'ALL' || t.transportType.toLowerCase() === selectedTransportFilter.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesFilter;

      const matchesQuery = 
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.destinationName.toLowerCase().includes(q) ||
        t.sourceLocation.toLowerCase().includes(q) ||
        t.transportType.toLowerCase().includes(q) ||
        String(t.id).includes(q);

      return matchesFilter && matchesQuery;
    });
  }, [userTransports, searchQuery, selectedTransportFilter]);

  // Compute summary stats
  const stats = useMemo(() => {
    const total = userTransports.length;
    const modeCounts = {};
    let totalFareSum = 0;

    userTransports.forEach(t => {
      modeCounts[t.transportType] = (modeCounts[t.transportType] || 0) + 1;
      totalFareSum += t.transportFare;
    });

    let topMode = 'N/A';
    let maxCount = 0;
    Object.entries(modeCounts).forEach(([mode, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topMode = mode;
      }
    });

    return {
      total,
      topMode,
      avgFare: total > 0 ? Math.round(totalFareSum / total) : 0
    };
  }, [userTransports]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
            <Car className="h-8 w-8 text-primary mr-2.5" />
            User Selected Transportation
          </h1>
          <p className="text-xs text-slate-450 font-outfit font-semibold mt-1">
            Read-only log of transit modes and travel routes selected by users in their itineraries.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center space-x-1.5 font-outfit self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-grotesk">Total Transits Selected</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk">{stats.total}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Navigation className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-grotesk">Most Popular Mode</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white font-grotesk truncate block max-w-[180px]">{stats.topMode}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary">
            <Car className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-grotesk">Average Transit Fare</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk">₹{stats.avgFare.toLocaleString()}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-outfit">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 flex-1 shadow-inner">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by user, route, or transit mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none dark:text-white font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Filter Mode:</span>
          <select
            value={selectedTransportFilter}
            onChange={(e) => setSelectedTransportFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dark:text-white font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Transit Modes</option>
            {uniqueTransportTypes.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transportation Audit Table */}
      <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden font-outfit">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                <th className="py-4 px-6">Trip ID & Date</th>
                <th className="py-4 px-6">Traveler</th>
                <th className="py-4 px-6">Route</th>
                <th className="py-4 px-6">Selected Transit Mode</th>
                <th className="py-4 px-6">Distance & Duration</th>
                <th className="py-4 px-6 text-right">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransports.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                  
                  {/* Trip ID & Date */}
                  <td className="py-4 px-6">
                    <div className="font-extrabold text-slate-900 dark:text-white font-grotesk text-sm">
                      TRIP-{item.id}
                    </div>
                    <span className="text-[10px] text-slate-400 block font-medium flex items-center mt-0.5">
                      <Calendar className="h-3 w-3 mr-1" />
                      {item.travelDate}
                    </span>
                  </td>

                  {/* Traveler */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                        {item.userName ? item.userName[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate text-xs">
                          {item.userName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.userEmail || `User ID ${item.userId}`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-4 px-6">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center text-xs">
                        <MapPin className="h-3.5 w-3.5 text-primary mr-1 shrink-0" />
                        <span className="capitalize">{item.sourceLocation}</span>
                        <span className="mx-1.5 text-slate-400">&rarr;</span>
                        <span className="capitalize">{item.destinationName}</span>
                      </div>
                    </div>
                  </td>

                  {/* Selected Transit Mode */}
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 rounded-xl text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 inline-flex items-center space-x-1.5 font-grotesk">
                      <Car className="h-3.5 w-3.5" />
                      <span>{item.transportType}</span>
                    </span>
                  </td>

                  {/* Distance & Duration */}
                  <td className="py-4 px-6">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                        <Clock className="h-3.5 w-3.5 text-secondary mr-1" />
                        {item.travelTime}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Distance: {item.distance}
                      </span>
                    </div>
                  </td>

                  {/* Fare */}
                  <td className="py-4 px-6 text-right">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                      {item.transportFare > 0 ? `₹${item.transportFare.toLocaleString()}` : 'Included'}
                    </span>
                  </td>

                </tr>
              ))}

              {filteredTransports.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400 font-outfit">
                    <p className="text-xs font-semibold">No user selected transportation records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
