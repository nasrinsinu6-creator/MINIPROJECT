/**
 * @file Recommendations.jsx
 * @description Wanderlog-inspired AI Travel Planning Workspace.
 * Integrates 10 core travel planning sections into one unified dashboard:
 * 1. Trip Overview & Navigation
 * 2. Interactive Leaflet Map
 * 3. Recommended Places & Attractions
 * 4. Recommended Accommodation
 * 5. Recommended Restaurants
 * 6. Dynamic Transportation Options
 * 7. Weather Forecast & Packing Advisory
 * 8. AI Personalized Recommendations
 * 9. Interactive Suggested Itinerary
 * 10. Itemized Budget & Cost Estimation
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, Star, Building2, Utensils, MapPin, 
  Receipt, ShieldCheck, Calendar, ArrowRight, ArrowLeft, Compass,
  CheckCircle2, Sun, ShieldAlert, Share2, Printer, Map, ExternalLink,
  Clock, Users, Check, Wallet, CloudRain, CloudSun, Cloud, Wind,
  Camera, Plus, Trash2, Navigation, Layers, ChevronRight, CheckSquare, Square, Info
} from 'lucide-react';
import { tripService, getHotelWebsiteUrl } from '../services/api';
import ItineraryView from '../components/ItineraryView';
import TransportSelector from '../components/TransportSelector';
import { generateTransportOptions } from '../utils/transportEngine';
import TravelMap from '../components/TravelMap';
import TripCostSummary from '../components/TripCostSummary';
import AITravelAdvice from '../components/AITravelAdvice';

/**
 * Recommendations workspace view component.
 */
export default function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeData = location.state || {};

  const savedState = useMemo(() => {
    if (routeData.recommendations && routeData.preferences) {
      return routeData;
    }
    try {
      const stored = localStorage.getItem('recommendation_results');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored recommendations', e);
    }
    return {};
  }, [routeData]);

  const data = savedState;
  const recs = data.recommendations || [];
  const preferences = data.preferences || null;

  // Active Destination index if multiple AI destination options returned
  const [activeDestIdx, setActiveDestIdx] = useState(0);

  // Workspace tab view selection: 'all' (Dashboard) or specific section
  const [activeSection, setActiveSection] = useState('all');
  const [currentView, setCurrentView] = useState('workspace'); // 'workspace' | 'itinerary' | 'budget'

  // Selected hotel/restaurant/transport/attractions states per destination
  const [selectedHotels, setSelectedHotels] = useState(routeData.selectedHotels || {});
  const [selectedRestaurants, setSelectedRestaurants] = useState(routeData.selectedRestaurants || {});
  const [selectedTransports, setSelectedTransports] = useState(routeData.selectedTransports || {});
  const [selectedAttractionsMap, setSelectedAttractionsMap] = useState(routeData.selectedAttractions || {});

  // Preview & generated states
  const [previewItinerary, setPreviewItinerary] = useState(routeData.previewItinerary || null);
  const [previewWeather, setPreviewWeather] = useState(routeData.previewWeather || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  const currentDest = recs[activeDestIdx] || recs[0] || null;
  const destId = currentDest?.destination_id;

  // Sync selected hotel / restaurant defaults
  const currentHotelId = selectedHotels[destId] || currentDest?.hotels?.[0]?.id || null;
  const currentHotel = currentDest?.hotels?.find(h => h.id === currentHotelId) || currentDest?.hotels?.[0] || null;

  const currentRestId = selectedRestaurants[destId] || currentDest?.restaurants?.[0]?.id || null;
  const currentRestaurant = currentDest?.restaurants?.find(r => r.id === currentRestId) || currentDest?.restaurants?.[0] || null;

  const currentSource = preferences?.source_location || 'Kochi';
  const currentTransport = selectedTransports[destId] || generateTransportOptions(currentSource, currentDest?.name || 'Munnar')[0];

  // Selected attractions list for current destination
  const selectedAttractionsList = useMemo(() => {
    if (!currentDest || !currentDest.attractions) return [];
    const saved = selectedAttractionsMap[destId];
    if (Array.isArray(saved)) return saved;
    // Default to all attractions selected
    return currentDest.attractions.map(a => a.name || a.id);
  }, [currentDest, selectedAttractionsMap, destId]);

  // Fetch Weather & Generate Itinerary on load or destination switch
  useEffect(() => {
    if (!currentDest || !preferences) return;

    let isMounted = true;

    async function loadDestData() {
      try {
        // Fetch Weather
        const wRes = await tripService.getWeather(destId, {
          days: preferences.duration_days || 3,
          travel_date: preferences.travel_date || ''
        });
        if (isMounted && wRes?.weather) {
          setPreviewWeather(wRes.weather);
        }
      } catch (err) {
        console.warn('Weather fetch warning', err);
      }

      try {
        // Fetch or compile initial itinerary
        const itRes = await tripService.generateItinerary({
          destination_id: destId,
          duration_days: preferences.duration_days || 3,
          interests: preferences.interests || [],
          hotel_id: currentHotel?.id || null,
          restaurant_id: currentRestaurant?.id || null
        });
        if (isMounted && itRes?.itinerary) {
          setPreviewItinerary(itRes.itinerary);
        }
      } catch (err) {
        console.warn('Itinerary compilation notice', err);
      }
    }

    loadDestData();

    return () => { isMounted = false; };
  }, [destId, preferences?.duration_days, preferences?.travel_date]);

  // Handle No Preferences Found
  if (!preferences) {
    return (
      <div className="text-center py-24 font-sans space-y-4 max-w-md mx-auto animate-fade-in">
        <Compass className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto animate-spin-slow" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">No Trip Input Data Found</h2>
        <p className="text-xs text-slate-400 font-outfit leading-relaxed">
          Please enter your travel details in the trip planner form first to view personalized recommendations.
        </p>
        <Link to="/plan-trip" className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          Go to Plan Trip
        </Link>
      </div>
    );
  }

  // Handle Hotel Selection
  const handleHotelSelect = (hotelObj) => {
    setSelectedHotels(prev => ({ ...prev, [destId]: hotelObj.id }));
  };

  // Handle Restaurant Selection
  const handleRestaurantSelect = (restObj) => {
    setSelectedRestaurants(prev => ({ ...prev, [destId]: restObj.id }));
  };

  // Handle Transport Selection
  const handleTransportSelect = (transObj) => {
    setSelectedTransports(prev => ({ ...prev, [destId]: transObj }));
  };

  // Toggle Attraction in Trip
  const toggleAttractionInTrip = (attrName) => {
    setSelectedAttractionsMap(prev => {
      const currentList = prev[destId] || (currentDest.attractions?.map(a => a.name) || []);
      const exists = currentList.includes(attrName);
      const updated = exists ? currentList.filter(n => n !== attrName) : [...currentList, attrName];
      return { ...prev, [destId]: updated };
    });
  };

  // Live Budget Computations
  const travelers = preferences.travelers || 1;
  const duration = preferences.duration_days || 3;
  const roomsNeeded = Math.ceil(travelers / 2);
  const nights = Math.max(1, duration - 1);

  const hotelPrice = currentHotel ? Number(currentHotel.price_per_night || 0) : (currentDest?.hotels?.[0]?.price_per_night ? Number(currentDest.hotels[0].price_per_night) : 1500);
  const estAccommodation = hotelPrice * roomsNeeded * nights;

  const mealPrice = currentRestaurant ? Number(currentRestaurant.avg_cost || 0) : (currentDest?.restaurants?.[0]?.avg_cost ? Number(currentDest.restaurants[0].avg_cost) : 300);
  const estFood = mealPrice * travelers * duration * 2.5;

  const transFare = currentTransport ? Number(currentTransport.fare || 0) : 500;
  const estTransport = transFare * (currentTransport?.fare_unit === 'per day' ? duration : 1);

  // Multi-Destination Summary Computations
  const totalAllocatedDays = useMemo(() => {
    if (!recs || recs.length === 0) return 0;
    return recs.reduce((sum, r) => sum + (r.allocated_days || 1), 0);
  }, [recs]);

  const totalEstimatedCost = useMemo(() => {
    if (!recs || recs.length === 0) return 0;
    return recs.reduce((sum, r) => sum + (r.estimated_cost?.total || 0), 0);
  }, [recs]);

  const userBudget = preferences?.budget || 0;
  const userDuration = preferences?.duration_days || 3;
  const remainingBudget = Math.max(0, userBudget - totalEstimatedCost);
  const remainingDays = Math.max(0, userDuration - totalAllocatedDays);

  const selectedAttractionsCount = selectedAttractionsList.length;
  const estSightseeing = 150 * selectedAttractionsCount * travelers;

  // Dynamic Multi-Destination Day-Wise Itinerary Construction
  const dynamicItinerary = useMemo(() => {
    if (!recs || recs.length === 0) return [];
    
    const daysArr = [];
    let dayCounter = 1;

    recs.forEach((stop, stopIdx) => {
      const stopAttractions = stop.attractions || [];
      const stopHotels = stop.hotels || [];
      const stopRests = stop.restaurants || [];
      const stopHotelName = selectedHotels[stop.destination_id] 
        ? stopHotels.find(h => h.id === selectedHotels[stop.destination_id])?.name || stopHotels[0]?.name || 'Hotel'
        : stopHotels[0]?.name || 'Hotel';
      
      const allocDays = stop.allocated_days || 1;

      for (let dayInStop = 1; dayInStop <= allocDays; dayInStop++) {
        const currentDayNum = dayCounter;
        const dayAtts = stopAttractions.slice((dayInStop - 1) * 2, dayInStop * 2);

        let morning = dayAtts[0]
          ? `Visit **${dayAtts[0].name}** (${dayAtts[0].estimated_duration || '1-2 hours'})`
          : `Explore scenic viewpoints in ${stop.name}`;

        let afternoon = dayAtts[1]
          ? `Visit **${dayAtts[1].name}** — ${dayAtts[1].description || 'Guided walkthrough'}`
          : `Leisure afternoon sightseeing & photo tour in ${stop.name}`;

        if (dayInStop === 1) {
          if (stopIdx === 0) {
            morning = `Travel from ${currentSource} to **${stop.name}** via ${currentTransport.transport_type || 'transit'}. Arrival & check-in at **${stopHotelName}**.`;
          } else {
            const prevStopName = recs[stopIdx - 1].name;
            morning = `Travel from ${prevStopName} to **${stop.name}**, check-in at **${stopHotelName}**, and refresh.`;
          }
        }

        let lunch = `Lunch at **${stopRests[dayInStop % (stopRests.length || 1)]?.name || 'Local Restaurant'}** (${stopRests[0]?.cuisine || 'Local Cuisine'})`;
        let evening = (stopIdx === recs.length - 1 && dayInStop === allocDays)
          ? `Souvenir shopping, local market visit, and departure journey towards ${currentSource}.`
          : `Evening walk & tea break around ${stop.city || stop.name}`;
        let dinner = `Dinner at **${stopRests[(dayInStop + 1) % (stopRests.length || 1)]?.name || 'Local Restaurant'}**`;

        daysArr.push({
          day: currentDayNum,
          destination_name: stop.name,
          morning,
          lunch,
          afternoon,
          evening,
          dinner
        });

        dayCounter++;
      }
    });

    return daysArr;
  }, [recs, selectedHotels, currentSource, currentTransport]);

  // Final Confirmation & Save Multi-Destination Trip
  const handleSaveTrip = async () => {
    if (!recs || recs.length === 0) return;
    setIsSaving(true);
    setSaveStatusMsg('');

    try {
      await tripService.saveTrip({
        destination_id: currentDest.destination_id,
        destinations: recs,
        source_location: currentTransport.source || currentSource,
        budget: preferences.budget,
        travelers: preferences.travelers,
        duration_days: preferences.duration_days,
        interests: preferences.interests,
        itinerary: dynamicItinerary,
        estimated_cost: Math.round(totalEstimatedCost),
        hotel_id: currentHotel?.id || null,
        restaurant_id: currentRestaurant?.id || null,
        travel_date: preferences.travel_date,
        transport_type: currentTransport.transport_type || '',
        transport_fare: currentTransport.fare || 0,
        travel_time: currentTransport.travel_time || '',
        distance: currentTransport.distance || 0
      });

      setSaveStatusMsg('Multi-destination trip saved successfully! Redirecting to your trips history...');
      setTimeout(() => {
        navigate('/my-trips');
      }, 1200);
    } catch (err) {
      console.error('Save trip error:', err);
      const msg = err.response?.data?.message || 'Failed to save trip. Please ensure you are logged in.';
      setSaveStatusMsg(msg);
      if (err.response?.status === 401) {
        setTimeout(() => navigate('/login'), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareItinerary = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback('Share link copied to clipboard!');
      setTimeout(() => setShareFeedback(''), 3000);
    }
  };

  const scrollToSection = (id) => {
    setCurrentView('workspace');
    setActiveSection('all');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans animate-fade-in print:p-0 pb-16">

      {/* =========================================================================
          1. TRIP OVERVIEW & WORKSPACE HEADER
          ========================================================================= */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-850 font-outfit">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-wider font-grotesk">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Multi-Destination Planner</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight leading-tight">
              {recs.length > 1 
                ? `Your Recommended ${recs.length}-Stop Kerala Trip` 
                : (currentDest ? `${currentSource} → ${currentDest.name} Trip` : 'Travel Recommendations')}
            </h1>

            {/* Route Flow Header */}
            {recs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-emerald-600 dark:text-emerald-400">🚩 {currentSource}</span>
                {recs.map((r, idx) => (
                  <React.Fragment key={r.destination_id}>
                    <span className="text-slate-400 font-normal">➔</span>
                    <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center space-x-1">
                      <span>Stop {idx + 1}: {r.name}</span>
                      <span className="text-[10px] opacity-75">({r.allocated_days}d)</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Quick Trip Parameter Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1">
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Origin: <strong className="ml-1 text-slate-900 dark:text-white">{currentSource}</strong>
              </span>
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" /> Dates: <strong className="ml-1 text-slate-900 dark:text-white">{preferences.travel_date || 'Upcoming'} ({userDuration} Days)</strong>
              </span>
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <Users className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Travelers: <strong className="ml-1 text-slate-900 dark:text-white">{travelers} Person{travelers > 1 ? 's' : ''}</strong>
              </span>
              <span className="flex items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold">
                Budget Cap: ₹{Number(userBudget).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => navigate('/itinerary', { state: { ...data, recommendations: recs, previewItinerary: dynamicItinerary } })}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-teal-500/20 hover:scale-105 transition-all"
            >
              <Compass className="h-4 w-4" />
              <span>📅 Multi-Destination Itinerary</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/estimation', { state: { ...data, recommendations: recs } })}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-primary hover:from-emerald-600 hover:to-primary text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-500/20 hover:scale-105 transition-all"
            >
              <Receipt className="h-4 w-4" />
              <span>💰 Trip Cost Breakdown</span>
            </button>

            <Link
              to="/plan-trip"
              state={{ preferences }}
              className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-primary font-bold text-xs py-2.5 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Modify Trip</span>
            </Link>

            <button
              onClick={handleShareItinerary}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:scale-105 transition-all"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-primary" />
            </button>
          </div>
        </div>

        {/* TRIP SUMMARY BAR (REQUIRED) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl shadow-inner font-outfit border border-slate-800">
          <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-grotesk tracking-wider">Total Duration</span>
            <div className="text-xl font-black text-amber-400 font-grotesk flex items-baseline space-x-1">
              <span>{totalAllocatedDays} Days</span>
              <span className="text-xs text-slate-400 font-normal">/ {userDuration}d</span>
            </div>
          </div>

          <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-grotesk tracking-wider">Est. Total Cost</span>
            <div className="text-xl font-black text-emerald-400 font-grotesk">
              ₹{Math.round(totalEstimatedCost).toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-grotesk tracking-wider">Remaining Budget</span>
            <div className="text-xl font-black text-blue-400 font-grotesk">
              ₹{Math.round(remainingBudget).toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-grotesk tracking-wider">Destinations</span>
            <div className="text-xl font-black text-purple-400 font-grotesk">
              {recs.length} Stop{recs.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Multi-Destination Stop Selection Tabs */}
        {recs.length > 0 && (
          <div className="space-y-2 font-outfit pt-2">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block font-grotesk">
              Itinerary Destination Stops (Click to explore stop details)
            </span>
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
              {recs.map((dest, idx) => (
                <button
                  key={dest.destination_id}
                  onClick={() => setActiveDestIdx(idx)}
                  className={`px-4 py-3 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center space-x-2.5 ${
                    activeDestIdx === idx
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 scale-[1.02] border border-white/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </span>
                  <div className="text-left">
                    <p className="leading-none text-xs">{dest.name}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{dest.day_range || `${dest.allocated_days} Days`} • Est. ₹{Number(dest.estimated_cost?.total || 0).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Workspace Navigation Quick-Jump Tabs */}
        <div className="pt-2">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none font-outfit">

            <button
              onClick={() => scrollToSection('section-attractions')}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all flex items-center space-x-1.5"
            >
              <span>📍 Places to Visit ({currentDest?.attractions?.length || 0})</span>
            </button>

            <button
              onClick={() => scrollToSection('section-hotels')}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all flex items-center space-x-1.5"
            >
              <span>🏨 Accommodation ({currentDest?.hotels?.length || 0})</span>
            </button>

            <button
              onClick={() => scrollToSection('section-restaurants')}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all flex items-center space-x-1.5"
            >
              <span>🍴 Restaurants ({currentDest?.restaurants?.length || 0})</span>
            </button>

            <button
              onClick={() => scrollToSection('section-transportation')}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all flex items-center space-x-1.5"
            >
              <span>🚗 Transportation</span>
            </button>

          </div>
        </div>

      </div>

      {/* Handle Empty Recommendations / Budget Exceeded */}
      {recs.length === 0 ? (
        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[36px] border border-slate-100 dark:border-slate-850 p-8 sm:p-12 shadow-sm text-center space-y-8 animate-fade-in max-w-3xl mx-auto">
          <div className="space-y-4">
            <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wallet className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
              No matching destinations for budget ₹{Number(preferences.budget || 0).toLocaleString()}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-outfit max-w-xl mx-auto leading-relaxed">
              We searched all destinations, but none fit within your budget for {travelers} traveler{travelers > 1 ? 's' : ''} across {duration} days.
            </p>
          </div>

          <Link
            to="/plan-trip"
            state={{ preferences }}
            className="inline-flex items-center space-x-2 px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:scale-105 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Adjust Trip Parameters & Budget</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-12">

          {/* =========================================================================
              2. DESTINATION IMAGE SHOWCASE SECTION (ADMIN ADDED PHOTO)
              ========================================================================= */}
          <div id="section-map" className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 font-outfit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider font-grotesk">
                  <span>Stop {activeDestIdx + 1} of {recs.length} ({currentDest.day_range || `${currentDest.allocated_days} Days`})</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                  {currentDest.name} — Allocated {currentDest.allocated_days || 1} Day{(currentDest.allocated_days || 1) > 1 ? 's' : ''}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  💰 Est. Cost: ₹{Number(currentDest.estimated_cost?.total || 0).toLocaleString()}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                  📍 {currentDest.city}, {currentDest.state}
                </span>
                {currentDest.category && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                    🏷️ {currentDest.category}
                  </span>
                )}
              </div>
            </div>

            {/* Destination Hero Image Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900 min-h-[360px] sm:min-h-[480px] flex flex-col justify-end p-6 sm:p-10 transition-all duration-300">
              <img
                src={currentDest.image_url || currentDest.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'}
                alt={currentDest.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.85] dark:brightness-75"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              
              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

              {/* Top Floating Badges */}
              <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold font-grotesk tracking-wide shadow-lg flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Stop {activeDestIdx + 1} ({currentDest.day_range || `${currentDest.allocated_days} Days`})</span>
                </span>
                {currentDest.best_time && (
                  <span className="px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-bold font-grotesk tracking-wide shadow-lg">
                    🗓️ Best Season: {currentDest.best_time}
                  </span>
                )}
              </div>

              {/* Bottom Card Information */}
              <div className="relative z-10 space-y-3 text-white max-w-3xl">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 font-grotesk uppercase tracking-widest">
                  <MapPin className="h-4 w-4" />
                  <span>{currentSource} ➔ {currentDest.name}</span>
                </div>

                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black font-grotesk tracking-tight drop-shadow-md">
                  {currentDest.name}
                </h3>

                {currentDest.description && (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-outfit font-medium max-w-2xl drop-shadow-sm">
                    {currentDest.description}
                  </p>
                )}

                {/* Additional Info Badges */}
                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/90 font-outfit">
                  <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center space-x-1">
                    <span>⏱️ Allocated Stop Days:</span>
                    <strong className="text-amber-300">{currentDest.allocated_days || 1} Days ({currentDest.day_range})</strong>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center space-x-1">
                    <span>💰 Est. Stop Cost:</span>
                    <strong className="text-emerald-300">₹{Number(currentDest.estimated_cost?.total || 0).toLocaleString()}</strong>
                  </div>
                  {currentDest.local_cities && (
                    <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center space-x-1">
                      <span>🏙️ Key Nearby Hubs:</span>
                      <span className="text-slate-200 line-clamp-1 max-w-xs">{currentDest.local_cities}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              3. RECOMMENDED PLACES / ATTRACTIONS SECTION
              ========================================================================= */}
          <div id="section-attractions" className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 font-outfit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider font-grotesk">
                  <Camera className="h-4 w-4" />
                  <span>Section 3: Sightseeing</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                  Recommended Places & Tourist Attractions
                </h2>
                <p className="text-xs text-slate-400">
                  Select places to include in your personalized day-wise trip plan.
                </p>
              </div>

              <div className="text-right text-xs font-bold text-slate-500 font-outfit">
                <span>{selectedAttractionsCount} of {currentDest.attractions?.length || 0} Places Added to Trip</span>
              </div>
            </div>

            {currentDest.attractions && currentDest.attractions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentDest.attractions.map((att, aIdx) => {
                  const isAdded = selectedAttractionsList.includes(att.name || att.id);
                  return (
                    <div 
                      key={aIdx}
                      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                        isAdded 
                          ? 'border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20 shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19]'
                      }`}
                    >
                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-grotesk">
                              {att.category || 'Attraction'}
                            </span>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 font-grotesk">
                              {att.name}
                            </h3>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs font-black text-amber-500 shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                            <Star className="h-3.5 w-3.5 fill-amber-500" />
                            <span>{att.rating || 4.5}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {att.description || 'Stunning tourist destination offering authentic cultural and natural views.'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-350 pt-2 font-semibold border-t border-slate-100 dark:border-slate-800/80">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Est. Visit</span>
                            <span>⏱️ {att.estimated_duration || '1–2 hours'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Entry Fee</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              🎟️ {att.entry_fee || 'Free Entry'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => toggleAttractionInTrip(att.name)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                            isAdded
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 hover:bg-purple-700'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckSquare className="h-4 w-4" />
                              <span>Added to Trip ✓</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 text-purple-500" />
                              <span>Add to Trip</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific attractions listed for this destination.</p>
            )}
          </div>

          {/* =========================================================================
              4. RECOMMENDED ACCOMMODATION SECTION
              ========================================================================= */}
          <div id="section-hotels" className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 font-outfit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-grotesk">
                  <Building2 className="h-4 w-4" />
                  <span>Section 4: Lodging</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                  Recommended Accommodation Options
                </h2>
                <p className="text-xs text-slate-400">
                  Handpicked hotels & resorts matching destination budget ₹{Number(preferences.budget || 0).toLocaleString()} for {travelers} guest{travelers > 1 ? 's' : ''}.
                </p>
              </div>

              {currentHotel && (
                <div className="text-right font-outfit">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Stay</span>
                  <strong className="text-xs font-black text-blue-600 dark:text-blue-400">{currentHotel.name}</strong>
                </div>
              )}
            </div>

            {currentDest.hotels && currentDest.hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentDest.hotels.map((hotel) => {
                  const isSelected = currentHotel?.id === hotel.id;
                  const hotelUrl = getHotelWebsiteUrl(hotel, currentDest.name);
                  return (
                    <div 
                      key={hotel.id}
                      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                        isSelected 
                          ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19]'
                      }`}
                    >
                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                              {hotel.name}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-semibold block flex items-center mt-0.5">
                              <MapPin className="h-3 w-3 mr-0.5 text-blue-500" /> {hotel.location || currentDest.city || 'Central Location'}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-grotesk">
                              ₹{Number(hotel.price_per_night || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-semibold">/ night</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {hotel.description || 'Comfortable rooms with modern amenities and welcoming atmosphere.'}
                        </p>

                        {/* Amenities Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">📶 Free WiFi</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">🏊 Swimming Pool</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">🍳 Breakfast</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">❄️ AC Rooms</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => handleHotelSelect(hotel)}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Selected Hotel ✓</span>
                            </>
                          ) : (
                            <span>Select Hotel</span>
                          )}
                        </button>

                        <a
                          href={hotelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all flex items-center space-x-1 shrink-0"
                          title="Open official hotel site in new tab"
                        >
                          <span>Site</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Standard local accommodation available.</p>
            )}
          </div>

          {/* =========================================================================
              5. RECOMMENDED RESTAURANTS SECTION
              ========================================================================= */}
          <div id="section-restaurants" className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 font-outfit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider font-grotesk">
                  <Utensils className="h-4 w-4" />
                  <span>Section 5: Dining</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                  Recommended Restaurants & Local Dining Spots
                </h2>
                <p className="text-xs text-slate-400">
                  Popular restaurants offering regional cuisines and authentic food.
                </p>
              </div>

              {currentRestaurant && (
                <div className="text-right font-outfit">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Dining</span>
                  <strong className="text-xs font-black text-amber-500">{currentRestaurant.name}</strong>
                </div>
              )}
            </div>

            {currentDest.restaurants && currentDest.restaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentDest.restaurants.map((rest) => {
                  const isSelected = currentRestaurant?.id === rest.id;
                  return (
                    <div 
                      key={rest.id}
                      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                        isSelected 
                          ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19]'
                      }`}
                    >
                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-grotesk">
                              {rest.cuisine || 'Local Cuisine'}
                            </span>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 font-grotesk">
                              {rest.name}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-1 text-xs font-black text-amber-500 shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                            <Star className="h-3.5 w-3.5 fill-amber-500" />
                            <span>{rest.rating || 4.5}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {rest.description || 'Flavorful local food served in a relaxed, friendly environment.'}
                        </p>

                        <div className="text-xs text-slate-600 dark:text-slate-350 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Average Meal: ₹{rest.avg_cost || 300} / person</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleRestaurantSelect(rest)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Selected Restaurant ✓</span>
                            </>
                          ) : (
                            <span>Select Restaurant</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Authentic local dining spots available throughout destination.</p>
            )}
          </div>

          {/* =========================================================================
              6. TRANSPORTATION SECTION
              ========================================================================= */}
          <div id="section-transportation" className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-sm space-y-4 font-outfit">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-grotesk">
                <Navigation className="h-4 w-4" />
                <span>Section 6: Transit & Travel Route</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                Recommended Transportation Options
              </h2>
            </div>

            <TransportSelector
              initialSource={currentSource}
              destinationName={currentDest.name}
              travelersCount={travelers}
              selectedTransport={selectedTransports[destId]}
              onSelectTransport={handleTransportSelect}
            />
          </div>



          {/* Bottom Lock In & Save Trip Action Bar */}
          <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 font-outfit print:hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                <ShieldCheck className="h-4.5 w-4.5 mr-1.5 text-secondary" /> Save this personalized trip plan?
              </span>
              <p className="text-[11px] text-slate-450">
                Saving will store this itinerary and cost breakdown in your travel profile.
              </p>
              {saveStatusMsg && (
                <p className="text-xs font-bold text-secondary animate-pulse mt-1">{saveStatusMsg}</p>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Link
                to="/plan-trip"
                state={{ preferences }}
                className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all"
              >
                Modify Trip Details
              </Link>

              <button
                type="button"
                onClick={handleSaveTrip}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center space-x-2"
              >
                <span>{isSaving ? 'Saving Trip Plan...' : 'Save Trip Plan'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
