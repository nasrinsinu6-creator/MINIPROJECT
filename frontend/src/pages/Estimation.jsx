/**
 * @file Estimation.jsx
 * @description Comprehensive Trip Cost Breakdown & Estimation Summary page component.
 * Displays itemized cost breakdown for accommodation, dining, transit, activities, emergency reserves,
 * and allows users to save the calculated trip to their account.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Receipt, Wallet, Users, Calendar, MapPin, Sparkles,
  CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Printer,
  Building2, Utensils, Compass, Clock, Check, Sun, CloudRain, CloudSun,
  ShieldAlert, ExternalLink, HelpCircle
} from 'lucide-react';
import { tripService, getHotelWebsiteUrl } from '../services/api';

/**
 * Trip Cost Estimation & Invoice view component.
 */
export default function Estimation() {

  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state || {};

  // Retrieve saved state from router state or localStorage fallback
  const tripData = useMemo(() => {
    if (routeState.selectedDest && routeState.preferences) {
      return routeState;
    }
    try {
      const stored = localStorage.getItem('active_trip_estimation');
      if (stored) return JSON.parse(stored);
      const recStored = localStorage.getItem('recommendation_results');
      if (recStored) {
        const parsed = JSON.parse(recStored);
        if (parsed.recommendations && parsed.recommendations.length > 0) {
          const dest = parsed.recommendations[0];
          return {
            selectedDest: dest,
            recommendations: parsed.recommendations,
            preferences: parsed.preferences,
            previewCost: dest.estimated_cost
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse trip data in Estimation', e);
    }
    return {};
  }, [routeState]);

  const recs = tripData.recommendations || [];
  const selectedDest = tripData.selectedDest || recs[0] || null;
  const preferences = tripData.preferences || null;
  const previewItinerary = tripData.previewItinerary || [];
  const previewWeather = tripData.previewWeather || null;
  const selectedHotels = tripData.selectedHotels || {};
  const selectedRestaurants = tripData.selectedRestaurants || {};
  const selectedTransports = tripData.selectedTransports || {};

  // Interactive Estimation State
  const [budgetTier, setBudgetTier] = useState('standard'); // 'budget', 'standard', 'luxury'
  const [costViewMode, setCostViewMode] = useState('total'); // 'total' | 'per_person'
  const [costData, setCostData] = useState(tripData.previewCost || null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [userTargetBudget, setUserTargetBudget] = useState(
    preferences?.budget ? String(preferences.budget) : ''
  );

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Persist active state so refresh doesn't lose it
  useEffect(() => {
    if (tripData.selectedDest) {
      try {
        localStorage.setItem('active_trip_estimation', JSON.stringify(tripData));
      } catch (e) {
        console.warn('Could not store active_trip_estimation', e);
      }
    }
  }, [tripData]);

  // Recalculate cost when budgetTier changes
  useEffect(() => {
    if (!selectedDest) return;

    let isMounted = true;
    async function recalculateCost() {
      setLoadingCost(true);
      const destId = selectedDest.destination_id || selectedDest.id;
      const hotelId = selectedHotels[destId] || selectedDest.hotels?.[0]?.id || null;
      const restId = selectedRestaurants[destId] || selectedDest.restaurants?.[0]?.id || null;
      const transId = selectedTransports[destId] || selectedDest.transportation?.[0]?.id || null;

      try {
        const res = await tripService.estimateCost({
          destination_id: destId,
          travelers: preferences?.travelers || 2,
          duration_days: preferences?.duration_days || 3,
          hotel_id: budgetTier === 'standard' ? hotelId : undefined,
          restaurant_id: budgetTier === 'standard' ? restId : undefined,
          transport_id: budgetTier === 'standard' ? transId : undefined,
          budget_tier: budgetTier
        });

        if (isMounted) {
          setCostData(res.cost_estimation);
        }
      } catch (err) {
        console.error('Failed to recalculate cost for tier:', err);
      } finally {
        if (isMounted) setLoadingCost(false);
      }
    }

    recalculateCost();
    return () => { isMounted = false; };
  }, [selectedDest, budgetTier, preferences, selectedHotels, selectedRestaurants, selectedTransports]);

  if (!selectedDest || !preferences) {
    return (
      <div className="text-center py-24 font-sans space-y-4 max-w-md mx-auto animate-fade-in">
        <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">No Trip Data to Estimate</h2>
        <p className="text-xs text-slate-400 font-outfit leading-relaxed">
          Please complete your travel parameters and select a destination itinerary first to compile travel expenses.
        </p>
        <Link to="/plan-trip" className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          Go to Trip Planner
        </Link>
      </div>
    );
  }

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const destId = selectedDest.destination_id || selectedDest.id;
      const hotelId = selectedHotels[destId] || selectedDest.hotels?.[0]?.id || null;

      const payload = {
        destination_id: destId,
        source_location: preferences.source_location || '',
        budget: parseFloat(preferences.budget || 0),
        travelers: parseInt(preferences.travelers || 1),
        duration_days: parseInt(preferences.duration_days || 3),
        interests: preferences.interests || [],
        itinerary: previewItinerary,
        estimated_cost: costData?.total || 0,
        hotel_id: hotelId,
        travel_date: preferences.travel_date || ''
      };

      await tripService.saveTrip(payload);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Save trip error:', err);
      const msg = err.response?.data?.message || 'Failed to save journey plan. Please verify session.';
      setSaveError(msg);
      if (err.response?.status === 401) {
        setTimeout(() => navigate('/login'), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const budgetHealth = useMemo(() => {
    if (!userTargetBudget || !costData?.total) return null;
    const target = parseFloat(userTargetBudget);
    if (isNaN(target) || target <= 0) return null;
    const diff = target - costData.total;
    const pct = Math.min(100, Math.round((costData.total / target) * 100));
    return {
      target,
      diff,
      isUnder: diff >= 0,
      pct
    };
  }, [userTargetBudget, costData]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans animate-fade-in pb-12">

      {/* Stepper Header */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 font-outfit text-xs">
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-2xl text-slate-400 opacity-60">
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
            <div className="truncate hidden sm:block">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">Step 1</p>
              <p className="font-semibold text-xs truncate">Parameters</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-2xl text-slate-400 opacity-60">
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
            <div className="truncate hidden sm:block">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">Step 2</p>
              <p className="font-semibold text-xs truncate">Matches</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-2xl text-slate-400 opacity-60">
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
            <div className="truncate hidden sm:block">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">Step 3</p>
              <p className="font-semibold text-xs truncate">Itinerary & Weather</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-2xl bg-primary/10 border border-primary/25 text-primary dark:text-secondary">
            <span className="h-6 w-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">4</span>
            <div className="truncate">
              <p className="text-[9px] uppercase font-black tracking-wider opacity-70">Step 4</p>
              <p className="font-bold text-xs truncate">Total Expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-outfit">
        <button
          onClick={() => navigate('/recommendations', { state: { ...tripData, step: 3 } })}
          className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-primary font-bold text-xs self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to recommendations</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-sm"
          >
            <Printer className="h-4 w-4 text-primary" />
            <span>Print Budget</span>
          </button>
        </div>
      </div>

      {/* Destination & Trip Summary Hero Card */}
      <div className="bg-white dark:bg-[#111827] rounded-[36px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <img
              src={selectedDest.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'}
              alt={selectedDest.name}
              className="h-16 w-16 rounded-2xl object-cover shadow-md border border-white/20 shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                  Total Travel Expenses for {selectedDest.name}
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize font-outfit">
                  {selectedDest.category}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-bold font-outfit uppercase tracking-wider mt-1">
                <span className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-primary" /> From {preferences.source_location}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 text-secondary" /> {preferences.duration_days} Days
                </span>
                <span className="flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1 text-accent" /> {preferences.travelers} Traveler(s)
                </span>
                {preferences.travel_date && (
                  <span className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Date: {preferences.travel_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tier Switcher in Banner */}
          <div className="space-y-1 self-stretch sm:self-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-grotesk text-left sm:text-right">
              Travel Comfort Tier
            </span>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-outfit text-xs">
              <button
                type="button"
                onClick={() => setBudgetTier('budget')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${budgetTier === 'budget' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Budget
              </button>
              <button
                type="button"
                onClick={() => setBudgetTier('standard')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${budgetTier === 'standard' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setBudgetTier('luxury')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${budgetTier === 'luxury' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Luxury
              </button>
            </div>
          </div>
        </div>

        {/* Big Financial Overview Display */}
        {costData && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-outfit">
              {/* Total Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent border border-primary/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-grotesk">
                    {costViewMode === 'total' ? 'Total Estimated Travel Cost' : 'Cost Per Person'}
                  </span>
                  <div className="inline-flex p-0.5 bg-white/70 dark:bg-slate-800 rounded-xl text-[10px] font-bold">
                    <button
                      onClick={() => setCostViewMode('total')}
                      className={`px-2.5 py-1 rounded-lg ${costViewMode === 'total' ? 'bg-primary text-white' : 'text-slate-400'}`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setCostViewMode('per_person')}
                      className={`px-2.5 py-1 rounded-lg ${costViewMode === 'per_person' ? 'bg-primary text-white' : 'text-slate-400'}`}
                    >
                      Per Person
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline space-x-2 pt-1">
                  <span className="text-4xl sm:text-5xl font-black font-grotesk text-primary dark:text-secondary">
                    ₹{Math.round(costViewMode === 'total' ? costData.total : (costData.per_person_total || costData.total / preferences.travelers)).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400">INR</span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {costViewMode === 'total' ? `Covers all ${preferences.travelers} traveler(s) for ${preferences.duration_days} days` : `Calculated per traveler across ${preferences.duration_days} days`}
                </p>
              </div>

              {/* Daily Average Burn Card */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-grotesk">
                  Daily Average Expense
                </span>
                <div className="flex items-baseline space-x-2 pt-1">
                  <span className="text-3xl sm:text-4xl font-black font-grotesk text-slate-800 dark:text-white">
                    ₹{Math.round(costViewMode === 'total' ? (costData.daily_average || costData.total / preferences.duration_days) : ((costData.per_person_per_day || costData.total / (preferences.travelers * preferences.duration_days)))).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ Day</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Average daily spend including food, lodging, and local excursions
                </p>
              </div>

              {/* Target Budget Health Check */}
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-400 font-grotesk">
                  <span>Budget Health Meter</span>
                  {budgetHealth && (
                    <span className={`font-extrabold ${budgetHealth.isUnder ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {budgetHealth.isUnder ? `+₹${Math.round(budgetHealth.diff).toLocaleString()} Surplus` : `-₹${Math.round(Math.abs(budgetHealth.diff)).toLocaleString()} Deficit`}
                    </span>
                  )}
                </div>

                <div className="relative pt-1">
                  <input
                    type="number"
                    value={userTargetBudget}
                    onChange={(e) => setUserTargetBudget(e.target.value)}
                    placeholder="Your target budget (₹)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-secondary/30 text-slate-800 dark:text-white"
                  />
                </div>

                {budgetHealth && (
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${budgetHealth.isUnder ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, budgetHealth.pct)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {budgetHealth.isUnder ? '✅ Comfortably within your allocated savings' : '⚠️ Exceeds planned budget. Consider switching to Budget tier below.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Expense Distribution Progress Bar */}
            <div className="space-y-3 pt-2 font-outfit">
              <div className="flex items-center justify-between text-xs font-bold font-grotesk text-slate-700 dark:text-slate-300">
                <span>Expense Category Distribution</span>
                <span className="text-slate-400 text-[11px]">Normalized 100% Share</span>
              </div>

              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex p-0.5">
                <div
                  className="bg-primary h-full rounded-l-xl transition-all"
                  style={{ width: `${costData.breakdown_percentages?.accommodation || 35}%` }}
                  title={`Lodging: ${costData.breakdown_percentages?.accommodation}%`}
                ></div>
                <div
                  className="bg-secondary h-full transition-all"
                  style={{ width: `${costData.breakdown_percentages?.food || 25}%` }}
                  title={`Food: ${costData.breakdown_percentages?.food}%`}
                ></div>
                <div
                  className="bg-accent h-full transition-all"
                  style={{ width: `${costData.breakdown_percentages?.local_transport || 20}%` }}
                  title={`Transport: ${costData.breakdown_percentages?.local_transport}%`}
                ></div>
                <div
                  className="bg-teal-500 h-full transition-all"
                  style={{ width: `${costData.breakdown_percentages?.sightseeing || 12}%` }}
                  title={`Sightseeing: ${costData.breakdown_percentages?.sightseeing}%`}
                ></div>
                <div
                  className="bg-slate-400 h-full rounded-r-xl transition-all"
                  style={{ width: `${costData.breakdown_percentages?.miscellaneous || 8}%` }}
                  title={`Contingency Buffer: ${costData.breakdown_percentages?.miscellaneous}%`}
                ></div>
              </div>

              {/* Legend Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-md bg-primary shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Lodging</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(costViewMode === 'total' ? costData.accommodation : costData.accommodation / preferences.travelers).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-md bg-secondary shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Meals & Dining</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(costViewMode === 'total' ? costData.food : costData.food / preferences.travelers).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-md bg-accent shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Transportation</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(costViewMode === 'total' ? costData.local_transport : costData.local_transport / preferences.travelers).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-md bg-teal-500 shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Sightseeing</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(costViewMode === 'total' ? costData.sightseeing : costData.sightseeing / preferences.travelers).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-md bg-slate-400 shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Buffer (8%)</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(costViewMode === 'total' ? costData.miscellaneous : costData.miscellaneous / preferences.travelers).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Breakdown Table */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-4 font-outfit text-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white font-grotesk uppercase tracking-wider flex items-center">
                <Receipt className="h-4 w-4 text-primary mr-2" />
                Itemized Expense Breakdown & Allocations
              </h3>

              <div className="space-y-3">
                {(() => {
                  const hotelObj = selectedDest?.hotels?.find(h => 
                    h.id === (selectedHotels[selectedDest.destination_id || selectedDest.id] || selectedDest.hotels[0]?.id) ||
                    (costData.hotel_name && h.name && h.name.toLowerCase() === costData.hotel_name.toLowerCase())
                  ) || { name: costData.hotel_name };
                  const hotelUrl = getHotelWebsiteUrl(hotelObj, selectedDest?.name || '');
                  const hotelName = costData.hotel_name || hotelObj.name || 'Standard 3-Star Hotel';

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                      <div>
                        <div className="flex items-center space-x-2">
                          <strong className="text-slate-800 dark:text-white block font-bold">🏨 Lodging & Accommodation</strong>
                          <a
                            href={hotelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[10px] text-primary hover:underline font-bold bg-primary/10 px-2 py-0.5 rounded-md"
                            title={`Visit outside website for ${hotelName}`}
                          >
                            <span>Hotel Website</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          <a
                            href={hotelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 dark:text-slate-200 font-semibold hover:text-primary transition-colors underline"
                          >
                            {hotelName}
                          </a>
                          {' '}• {costData.rooms_needed || 1} room(s) × {costData.nights || (preferences.duration_days - 1)} night(s) @ ₹{costData.hotel_price_per_night || 1800}/night
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        ₹{Math.round(costData.accommodation).toLocaleString()}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                  <div>
                    <strong className="text-slate-800 dark:text-white block font-bold">🍽️ Dining & Daily Meals</strong>
                    <span className="text-[11px] text-slate-400">
                      Breakfast, lunch, and dinner @ ₹{costData.avg_meal_price || 300}/meal for {preferences.travelers} traveler(s) across {preferences.duration_days} days
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{Math.round(costData.food).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                  <div>
                    <strong className="text-slate-800 dark:text-white block font-bold">🚗 Local Transportation & Transfers</strong>
                    <span className="text-[11px] text-slate-400">
                      Covers transit legs between attractions and lodging via recommended routes
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{Math.round(costData.local_transport).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                  <div>
                    <strong className="text-slate-800 dark:text-white block font-bold">🎟️ Sightseeing Entrance Tickets</strong>
                    <span className="text-[11px] text-slate-400">
                      Entry tickets to viewpoints, national parks, tea factories, and heritage grounds
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{Math.round(costData.sightseeing).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800 gap-1">
                  <div>
                    <strong className="text-slate-800 dark:text-white block font-bold">🛡️ Contingency & Incidentals Buffer (8%)</strong>
                    <span className="text-[11px] text-slate-400">
                      Emergency medicine, extra tips, bottled water, and unforeseen local expenses
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{Math.round(costData.miscellaneous).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Tier Comparison Cards */}
            {costData.budget_tiers_comparison && (
              <div className="space-y-3 font-outfit">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-grotesk uppercase tracking-wider">
                  📊 Alternative Tier Cost Comparison
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => setBudgetTier('budget')}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${budgetTier === 'budget' ? 'bg-primary/5 border-primary shadow-md scale-[1.02]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-primary/40'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold font-grotesk uppercase text-emerald-600 dark:text-emerald-400">Economy Budget</span>
                      {budgetTier === 'budget' && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">Active</span>}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black font-grotesk text-slate-900 dark:text-white">
                        ₹{Math.round(costData.budget_tiers_comparison.budget).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Homestays, public buses/trains, local dining</p>
                  </div>

                  <div
                    onClick={() => setBudgetTier('standard')}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${budgetTier === 'standard' ? 'bg-primary/5 border-primary shadow-md scale-[1.02]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-primary/40'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold font-grotesk uppercase text-primary">Standard Balanced</span>
                      {budgetTier === 'standard' && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">Active</span>}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black font-grotesk text-slate-900 dark:text-white">
                        ₹{Math.round(costData.budget_tiers_comparison.standard).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">3-star hotels, casual dining, mixed transit</p>
                  </div>

                  <div
                    onClick={() => setBudgetTier('luxury')}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${budgetTier === 'luxury' ? 'bg-primary/5 border-primary shadow-md scale-[1.02]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-primary/40'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold font-grotesk uppercase text-amber-500">Luxury Premium</span>
                      {budgetTier === 'luxury' && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">Active</span>}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-black font-grotesk text-slate-900 dark:text-white">
                        ₹{Math.round(costData.budget_tiers_comparison.luxury).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Resorts, private AC cabs, fine dining</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Money Saving Tips */}
            {costData.money_saving_tips && (
              <div className="p-5 rounded-3xl bg-secondary/5 border border-secondary/20 space-y-2 font-outfit text-xs">
                <span className="font-extrabold text-secondary uppercase tracking-wider block font-grotesk flex items-center">
                  <Sparkles className="h-4 w-4 mr-1.5" /> Budget Optimization Strategies
                </span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  {costData.money_saving_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-secondary font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Save Status Notifications */}
      {saveSuccess && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-outfit space-y-3 animate-fade-in text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
          <h3 className="font-extrabold text-base font-grotesk">Journey Plan Saved Successfully!</h3>
          <p className="text-xs font-medium">
            Your custom itinerary, weather advisory, and total expense estimation have been stored in your travel dashboard.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <Link
              to="/my-trips"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:scale-105 transition-all"
            >
              View My Saved Trips
            </Link>
          </div>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-outfit text-xs font-bold">
          {saveError}
        </div>
      )}

      {/* Bottom Sticky Confirmation Action Bar */}
      <div className="sticky bottom-4 z-40 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl rounded-[28px] p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-outfit print:hidden">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Ready to confirm your trip budget and reserve accommodation?
            </span>
            <p className="text-[11px] text-slate-400">
              Total estimated cost: <strong className="text-primary dark:text-secondary">₹{Math.round(costData?.total || 0).toLocaleString()}</strong> ({preferences.travelers} traveler(s), {preferences.duration_days} days)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/recommendations', { state: { ...tripData, step: 3 } })}
            className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
          >
            ← Back to Itinerary
          </button>

          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={isSaving || saveSuccess}
            className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isSaving ? 'Saving Trip Plan...' : (saveSuccess ? 'Plan Saved ✓' : 'Confirm & Save Journey Plan')}</span>
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
