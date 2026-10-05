/**
 * @file PlanTrip.jsx
 * @description AI Trip Planning Form page component.
 * Collects user travel inputs (source location, preferred landscape/destination type, max budget,
 * number of travelers, duration, date, travel style, and interests), validates inputs,
 * and submits parameters to `tripService.planTrip()` to generate AI recommendations.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass, MapPin, Receipt, Users, Clock, Tag,
  HelpCircle, Sparkles, ArrowRight, Calendar, Check
} from 'lucide-react';
import { tripService } from '../services/api';

/**
 * Trip Planning preference form component.
 */
export default function PlanTrip() {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [sourceLocation, setSourceLocation] = useState('');
  const [destinationTypes, setDestinationTypes] = useState(['hill station']);
  const [budget, setBudget] = useState('');
  const [travelers, setTravelers] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [groupType, setGroupType] = useState('family');
  const [state, setState] = useState('');
  const [travelDate, setTravelDate] = useState('');

  const [interests, setInterests] = useState([]);

  const location = useLocation();
  const routeState = location.state || {};

  const categoryOptions = [
    { id: 'hill station', name: 'Hill Station', icon: '🏔️', desc: 'Tea estates & misty valleys' },
    { id: 'beach', name: 'Beach', icon: '🏖️', desc: 'Coastal shores & surf beaches' },
    { id: 'backwaters', name: 'Backwaters', icon: '🛶', desc: 'Houseboats & scenic canals' },
    { id: 'nature', name: 'Nature & Wildlife', icon: '🌲', desc: 'Sanctuaries, flora & fauna' },
    { id: 'heritage', name: 'Heritage', icon: '🏛️', desc: 'Ancient ruins & history' },
    { id: 'adventure', name: 'Adventure', icon: '🏕️', desc: 'Trek trails & outdoor sports' },
    { id: 'pilgrimage', name: 'Pilgrimage', icon: '🛕', desc: 'Temples & sacred shrines' },
    { id: 'waterfall', name: 'Waterfalls', icon: '💦', desc: 'Cascading river falls' },
    { id: 'eco tourism', name: 'Eco Tourism', icon: '🌿', desc: 'Forest trails & reserves' },
    { id: 'city tourism', name: 'City Tourism', icon: '🏙️', desc: 'Urban sights & markets' }
  ];

  const handleCategoryToggle = (id) => {
    setDestinationTypes((prev) => {
      const arr = Array.isArray(prev) ? prev : (typeof prev === 'string' ? prev.split(',').map(s => s.trim()).filter(Boolean) : ['hill station']);
      if (arr.includes(id)) {
        return arr.length > 1 ? arr.filter(c => c !== id) : arr;
      } else {
        return [...arr, id];
      }
    });
  };

  // Pre-fill parameters when adjusting budget & preferences from recommendations/error screen
  useEffect(() => {
    let p = routeState.preferences || routeState.editPreferences;
    if (!p) {
      try {
        const savedRes = localStorage.getItem('recommendation_results');
        if (savedRes) {
          const parsed = JSON.parse(savedRes);
          if (parsed && parsed.preferences) {
            p = parsed.preferences;
          }
        }
      } catch (err) {
        console.error("Failed to parse stored recommendation preferences:", err);
      }
    }
    if (p) {
      if (p.source_location) setSourceLocation(p.source_location);
      if (p.destination_type) {
        if (Array.isArray(p.destination_type)) {
          setDestinationTypes(p.destination_type);
        } else if (typeof p.destination_type === 'string') {
          setDestinationTypes(p.destination_type.split(',').map(s => s.trim()).filter(Boolean));
        }
      }
      if (p.budget !== undefined && p.budget !== null) setBudget(String(p.budget));
      if (p.travelers) setTravelers(String(p.travelers));
      if (p.duration_days) setDurationDays(String(p.duration_days));
      if (p.group_type) setGroupType(p.group_type);
      if (p.state) setState(p.state);
      if (p.travel_date) setTravelDate(p.travel_date);
      if (Array.isArray(p.interests) && p.interests.length > 0) setInterests(p.interests);
    }
  }, [routeState]);

  const handleAutoFillFromHistory = async () => {
    try {
      setLoading(true);
      const res = await tripService.getMyTrips();
      const trips = Array.isArray(res?.trips) ? res.trips : [];
      if (trips.length === 0) {
        setErrorMsg('No saved trip history found. Please fill in the details manually.');
        return;
      }
      const lastTrip = trips[0];
      if (lastTrip.source_location) setSourceLocation(lastTrip.source_location);
      if (lastTrip.budget) setBudget(String(lastTrip.budget));
      if (lastTrip.travelers) setTravelers(String(lastTrip.travelers));
      if (lastTrip.duration_days) setDurationDays(String(lastTrip.duration_days));
      
      const allInterests = trips.flatMap(t => {
        if (Array.isArray(t.interests)) return t.interests;
        try { return JSON.parse(t.interests); } catch (e) { return []; }
      });
      const uniqueInterests = [...new Set(allInterests.filter(Boolean))];
      if (uniqueInterests.length > 0) setInterests(uniqueInterests);
      
      setDestinationTypes(['hill station', 'nature', 'adventure']);
      setErrorMsg('');
    } catch (e) {
      console.error("Failed to load history for autofill:", e);
    } finally {
      setLoading(false);
    }
  };

  // Reset all inputs to clean empty state
  const handleResetForm = () => {
    setSourceLocation('');
    setDestinationTypes(['hill station']);
    setBudget('');
    setTravelers('');
    setDurationDays('');
    setGroupType('family');
    setState('');
    setTravelDate('');
    setInterests([]);
    setErrorMsg('');
    try {
      localStorage.removeItem('recommendation_results');
    } catch (err) { }
  };

  const interestOptions = [
    { id: 'nature', label: 'Nature & Scenic' },
    { id: 'adventure', label: 'Adventure Sports' },
    { id: 'relaxation', label: 'Relaxation & Spa' },
    { id: 'history', label: 'History & Ruins' },
    { id: 'culture', label: 'Local Culture' },
    { id: 'food', label: 'Local Food & Dining' },
    { id: 'shopping', label: 'Shopping Markets' },
    { id: 'photography', label: 'Sightseeing Photo' },
    { id: 'nightlife', label: 'Nightlife & Cafes' }
  ];

  const handleInterestToggle = (id) => {
    setInterests((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      if (arr.includes(id)) {
        return arr.filter(i => i !== id);
      } else {
        return [...arr, id];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceLocation || !budget || !travelers || !durationDays) {
      setErrorMsg('Please populate all primary form fields.');
      return;
    }

    if (parseFloat(budget) <= 0) {
      setErrorMsg('Total budget must be a positive amount greater than ₹0.');
      return;
    }

    if (parseInt(travelers) <= 0) {
      setErrorMsg('Number of travelers must be at least 1 person.');
      return;
    }

    if (parseInt(durationDays) <= 0) {
      setErrorMsg('Trip duration must be at least 1 day.');
      return;
    }

    const todayDate = new Date().toLocaleDateString('en-CA');
    if (travelDate && travelDate < todayDate) {
      setErrorMsg('Travel date cannot be in the past. Please select today or a future date.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        source_location: sourceLocation,
        target_destination: 'all',
        destination_type: destinationTypes.length > 0 ? destinationTypes : ['hill station'],
        budget: parseFloat(budget),
        travelers: parseInt(travelers),
        duration_days: parseInt(durationDays),
        interests: interests,
        group_type: groupType,
        state: state,
        travel_date: travelDate
      };
      const res = await tripService.planTrip(payload);
      const resultState = {
        recommendations: res.recommendations || [],
        preferences: res.preferences,
        message: res.message || ''
      };
      localStorage.setItem('recommendation_results', JSON.stringify(resultState));

      // Navigate to results page passing backend recommendations output
      navigate('/recommendations', {
        state: resultState
      });
    } catch (err) {
      console.error('Plan trip submission error:', err);
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err.message && err.message.includes('Network Error')) {
        setErrorMsg('Unable to connect to AI travel service. Please ensure the backend server is running on http://localhost:5000.');
      } else {
        setErrorMsg(err.message || 'Recommendation compilation notice. Please check inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans animate-fade-in">

      {/* Stepper Progress Header */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 font-outfit text-xs">
          <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 rounded-2xl bg-primary/10 border border-secondary/25 text-primary dark:text-secondary">
            <span className="h-6 w-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">1</span>
            <div className="truncate">
              <p className="text-[9px] uppercase font-black tracking-wider opacity-70">Step 1</p>
              <p className="font-bold text-xs truncate">Trip Parameters</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 rounded-2xl text-slate-400 opacity-60">
            <span className="h-6 w-6 rounded-full bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
            <div className="truncate">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">Step 2</p>
              <p className="font-semibold text-xs truncate">Recommendations</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 rounded-2xl text-slate-400 opacity-60">
            <span className="h-6 w-6 rounded-full bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
            <div className="truncate">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">Step 3</p>
              <p className="font-semibold text-xs truncate">Itinerary Preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title with Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
            <Sparkles className="h-7 w-7 text-primary mr-2" />
            Plan My Trip
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-outfit font-medium">
            Specify your budget parameters and interests. Our scoring model compiles recommended destinations.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoFillFromHistory}
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Use History</span>
          </button>
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 font-bold text-xs rounded-2xl transition-all"
          >
            Clear Inputs
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl font-bold font-outfit">
          {errorMsg}
        </div>
      )}

      {/* Planning Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] rounded-[36px] p-6 sm:p-10 border border-slate-100 dark:border-slate-850 shadow-sm space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-outfit">
          {/* Source Location */}
          <div className="space-y-1.5 col-span-full">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center font-grotesk">
              <MapPin className="h-4.5 w-4.5 mr-1 text-emerald-500" /> Source Location *
            </label>
            <input
              type="text"
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
              placeholder="e.g. Kochi, Trivandrum"
              required
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          {/* Multi-Select Destination Categories */}
          <div className="space-y-2.5 col-span-full">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center font-grotesk">
                <Compass className="h-4.5 w-4.5 mr-1 text-primary" /> Preferred Categories *
              </label>
              <span className="text-[10px] text-primary font-extrabold font-outfit bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {destinationTypes.length} Selected (Multiple Allowed)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-outfit">
              {categoryOptions.map((cat) => {
                const isSelected = Array.isArray(destinationTypes) ? destinationTypes.includes(cat.id) : destinationTypes === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${isSelected
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm scale-[1.01]'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-slate-300 font-medium'
                      }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-xs font-extrabold">{cat.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">{cat.desc}</p>
                    </div>
                    <div className={`h-4.5 w-4.5 rounded-lg border flex items-center justify-center shrink-0 ml-2 ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>



          {/* Travel Budget */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center">
              <Receipt className="h-4.5 w-4.5 mr-1 text-secondary" /> Total Budget (₹) *
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 15000"
              required
              min="2000"
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          {/* Travelers Count */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center">
              <Users className="h-4.5 w-4.5 mr-1 text-secondary" /> Number of Travelers *
            </label>
            <input
              type="number"
              value={travelers}
              onChange={(e) => {
                const val = e.target.value;
                setTravelers(val);
                if (parseInt(val) > 1 && groupType === 'solo') {
                  setGroupType('friends');
                } else if (parseInt(val) === 1) {
                  setGroupType('solo');
                }
              }}
              placeholder="e.g. 2"
              required
              min="1"
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          {/* Duration days */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center">
              <Clock className="h-4.5 w-4.5 mr-1 text-accent" /> Trip Duration (Days) *
            </label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="e.g. 3"
              required
              min="1"
              max="15"
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          {/* Group Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center">
              <Users className="h-4.5 w-4.5 mr-1 text-accent" /> Travel Companions *
            </label>
            <select
              value={groupType}
              onChange={(e) => {
                const val = e.target.value;
                setGroupType(val);
                if (val === 'solo') {
                  setTravelers('1');
                } else if (val !== 'solo' && (parseInt(travelers) <= 1 || !travelers)) {
                  setTravelers('2');
                }
              }}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold shadow-sm transition-all"
            >
              <option value="solo">Solo Traveler (1 Person)</option>
              <option value="friends">Friends Group (2+ Persons)</option>
              <option value="family">Family Trip (2+ Persons)</option>
              <option value="honeymoon">Couples / Honeymoon (2 Persons)</option>
                            <option value="family"> ( min10)</option>

            </select>
          </div>

          {/* Travel Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center">
              <Calendar className="h-4.5 w-4.5 mr-1 text-slate-400" /> Travel Date (Optional - Today or Future)
            </label>
            <input
              type="date"
              value={travelDate}
              min={new Date().toLocaleDateString('en-CA')}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold shadow-sm transition-all"
            />
          </div>
        </div>



        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Analyzing Destinations...' : 'Get Recommendations'}</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
