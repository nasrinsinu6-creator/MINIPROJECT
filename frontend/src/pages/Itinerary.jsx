/**
 * @file Itinerary.jsx
 * @description Dedicated Day-Wise Itinerary & Weather Forecast page component.
 * Displays live destination weather forecasting, clothing advisory tips, and a full
 * day-by-day travel agenda schedule for the selected destination.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Compass, Calendar, MapPin, Sparkles, Sun, ShieldAlert,
  ArrowLeft, ArrowRight, Printer, Share2, ShieldCheck, CheckCircle2, Users
} from 'lucide-react';
import { tripService } from '../services/api';
import ItineraryView from '../components/ItineraryView';
import { generateTransportOptions } from '../utils/transportEngine';

/**
 * Dedicated Day-Wise Travel Itinerary & Weather Forecast view component.
 */
export default function Itinerary() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state || {};

  // Retrieve saved trip state from router location or localStorage
  const savedState = useMemo(() => {
    if (routeState.recommendations && routeState.preferences) {
      return routeState;
    }
    if (routeState.selectedDest && routeState.preferences) {
      return {
        recommendations: [routeState.selectedDest],
        preferences: routeState.preferences,
        ...routeState
      };
    }
    try {
      const stored = localStorage.getItem('recommendation_results');
      if (stored) return JSON.parse(stored);
      const activeEst = localStorage.getItem('active_trip_estimation');
      if (activeEst) {
        const parsed = JSON.parse(activeEst);
        if (parsed.selectedDest && parsed.preferences) {
          return {
            recommendations: [parsed.selectedDest],
            preferences: parsed.preferences,
            ...parsed
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse stored itinerary data:', e);
    }
    return {};
  }, [routeState]);

  const data = savedState;
  const recs = data.recommendations || [];
  const preferences = data.preferences || null;

  const currentDest = recs[0] || null;
  const destId = currentDest?.destination_id || currentDest?.id;
  const duration = preferences?.duration_days ? parseInt(preferences.duration_days) : 3;
  const travelers = preferences?.travelers ? parseInt(preferences.travelers) : 2;
  const currentSource = preferences?.source_location || 'Kochi';

  const selectedHotels = data.selectedHotels || {};
  const selectedRestaurants = data.selectedRestaurants || {};
  const selectedTransports = data.selectedTransports || {};
  const selectedAttractionsMap = data.selectedAttractions || {};

  const currentHotelId = selectedHotels[destId] || currentDest?.hotels?.[0]?.id || null;
  const currentHotel = currentDest?.hotels?.find(h => h.id === currentHotelId) || currentDest?.hotels?.[0] || null;

  const currentRestId = selectedRestaurants[destId] || currentDest?.restaurants?.[0]?.id || null;
  const currentRestaurant = currentDest?.restaurants?.find(r => r.id === currentRestId) || currentDest?.restaurants?.[0] || null;

  const currentTransport = selectedTransports[destId] || generateTransportOptions(currentSource, currentDest?.name || 'Munnar')[0];

  const selectedAttractionsList = useMemo(() => {
    if (!currentDest || !currentDest.attractions) return [];
    const saved = selectedAttractionsMap[destId];
    if (Array.isArray(saved)) return saved;
    return currentDest.attractions.map(a => a.name || a.id);
  }, [currentDest, destId, selectedAttractionsMap]);

  // Weather forecast state
  const [weatherData, setWeatherData] = useState(data.previewWeather || null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Saving trip state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  // Fetch live weather forecast if not present
  useEffect(() => {
    if (!currentDest?.name || weatherData) return;
    let isMounted = true;
    async function fetchWeather() {
      setLoadingWeather(true);
      try {
        const res = await tripService.getWeather(currentDest.name);
        if (isMounted && res.weather_forecast) {
          setWeatherData(res.weather_forecast);
        }
      } catch (err) {
        console.error("Failed to fetch weather for itinerary page:", err);
      } finally {
        if (isMounted) setLoadingWeather(false);
      }
    }
    fetchWeather();
    return () => { isMounted = false; };
  }, [currentDest, weatherData]);

  // Construct Day-Wise Itinerary Agenda (Multi-Destination & Single Destination support)
  const dynamicItinerary = useMemo(() => {
    if (data.previewItinerary && Array.isArray(data.previewItinerary) && data.previewItinerary.length > 0) {
      return data.previewItinerary;
    }
    if (recs && recs.length > 1) {
      const daysArr = [];
      let dayCounter = 1;
      recs.forEach((stop, stopIdx) => {
        const stopAttractions = stop.attractions || [];
        const stopHotels = stop.hotels || [];
        const stopRests = stop.restaurants || [];
        const stopHotelName = stopHotels[0]?.name || 'Hotel';
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

          let lunch = `Lunch at **${stopRests[dayInStop % (stopRests.length || 1)]?.name || 'Local Restaurant'}**`;
          let evening = (stopIdx === recs.length - 1 && dayInStop === allocDays)
            ? `Souvenir shopping, local market visit, and return departure towards ${currentSource}.`
            : `Evening tea & sunset stroll around ${stop.city || stop.name}`;
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
    }

    if (!currentDest) return [];
    const daysArr = [];
    const attractions = currentDest.attractions?.filter(a => selectedAttractionsList.includes(a.name)) || [];

    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const dayAttractions = attractions.slice((dayNum - 1) * 2, dayNum * 2);

      let morning = dayAttractions[0]
        ? `Visit ${dayAttractions[0].name} (${dayAttractions[0].visit_time || '1-2 hours'})`
        : `Explore scenic spots & viewpoints in ${currentDest.name}`;

      let afternoon = dayAttractions[1]
        ? `Excursion to ${dayAttractions[1].name} — ${dayAttractions[1].description || 'Guided tour'}`
        : `Relaxing afternoon sightseeing & local photo tour`;

      if (dayNum === 1) {
        morning = `Travel from ${currentSource} to ${currentDest.name} via ${currentTransport.transport_type || 'transit'}. Check-in at ${currentHotel?.name || 'hotel'}.`;
      }

      let lunch = `Lunch at ${currentRestaurant?.name || 'Local Restaurant'} (${currentRestaurant?.cuisine || 'Authentic delicacies'})`;
      let evening = dayNum === duration ? `Departure preparation & final photos` : `Evening tea & sunset stroll around ${currentDest.city || currentDest.name}`;
      let dinner = `Dinner at ${currentRestaurant?.name || 'Local Restaurant'} — ${currentRestaurant?.cuisine || 'Regional dishes'}`;

      daysArr.push({
        day: dayNum,
        destination_name: currentDest.name,
        morning,
        lunch,
        afternoon,
        evening,
        dinner
      });
    }

    return daysArr;
  }, [data.previewItinerary, recs, currentDest, selectedAttractionsList, duration, currentSource, currentTransport, currentHotel, currentRestaurant]);

  // Save Trip handler
  const handleSaveTrip = async () => {
    if (!currentDest) return;
    setIsSaving(true);
    setSaveStatusMsg('');

    try {
      await tripService.saveTrip({
        destination_id: currentDest.destination_id || currentDest.id,
        source_location: currentTransport.source || currentSource,
        budget: preferences.budget,
        travelers: preferences.travelers,
        duration_days: preferences.duration_days,
        interests: preferences.interests,
        itinerary: dynamicItinerary,
        estimated_cost: currentDest.estimated_cost || 15000,
        hotel_id: currentHotel?.id || null,
        restaurant_id: currentRestaurant?.id || null,
        travel_date: preferences.travel_date,
        transport_type: currentTransport.transport_type || '',
        transport_fare: currentTransport.fare || 0,
        travel_time: currentTransport.travel_time || '',
        distance: currentTransport.distance || 0
      });

      setSaveStatusMsg('Trip saved successfully! Redirecting to saved trips...');
      setTimeout(() => navigate('/my-trips'), 1200);
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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback('Link copied to clipboard!');
      setTimeout(() => setShareFeedback(''), 3000);
    }
  };

  if (!currentDest || !preferences) {
    return (
      <div className="text-center py-24 font-sans space-y-4 max-w-md mx-auto animate-fade-in">
        <Compass className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto animate-spin-slow" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">No Active Itinerary Found</h2>
        <p className="text-xs text-slate-400 font-outfit leading-relaxed">
          Please select your travel parameters and generate recommendations to view your personalized itinerary.
        </p>
        <Link to="/plan-trip" className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          Go to Trip Planner
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans animate-fade-in pb-16 print:p-0">
      
      {/* =========================================================================
          TOP HEADER & NAVIGATION BANNER
          ========================================================================= */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-850 font-outfit">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider font-grotesk">
              <Compass className="h-3.5 w-3.5" />
              <span>Day-Wise Travel Itinerary & Weather Studio</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight leading-tight">
              {currentDest.name} — Itinerary & Weather Outlook
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1">
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Origin: <strong className="ml-1 text-slate-900 dark:text-white">{currentSource}</strong>
              </span>
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-rose-500" /> Destination: <strong className="ml-1 text-slate-900 dark:text-white">{currentDest.name}</strong>
              </span>
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" /> Duration: <strong className="ml-1 text-slate-900 dark:text-white">{duration} Days</strong>
              </span>
              <span className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <Users className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Travelers: <strong className="ml-1 text-slate-900 dark:text-white">{travelers} Person{travelers > 1 ? 's' : ''}</strong>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center font-outfit">
            <button
              type="button"
              onClick={() => navigate('/recommendations', { state: data })}
              className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 hover:text-primary font-bold text-xs py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Recommendations</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/estimation', { state: data })}
              className="flex items-center space-x-1.5 text-white font-extrabold text-xs py-3 px-5 bg-gradient-to-r from-emerald-500 to-primary hover:scale-[1.02] shadow-lg shadow-emerald-500/20 rounded-2xl transition-all"
            >
              <span>💰 View Estimated Cost Page</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleShare}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:scale-105 transition-all"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-primary" />
            </button>

            <button
              onClick={() => window.print()}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:scale-105 transition-all"
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
        {shareFeedback && (
          <p className="text-xs font-bold text-emerald-500 animate-fade-in font-outfit">{shareFeedback}</p>
        )}
      </div>

      {/* =========================================================================
          ITINERARY TIMELINE & SIDE PANEL GRID (MATCHING SAVED TRIPS DESIGN)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Day-Wise Timeline Itinerary (Primary 2-Column Section) */}
        <div className="lg:col-span-2 space-y-6">
          <ItineraryView
            itinerary={dynamicItinerary}
            title={`Personalized ${duration}-Day Itinerary for ${currentDest.name}`}
            travelDate={preferences.travel_date}
          />
        </div>

        {/* Weather Forecast & Side Panel */}
        <div className="space-y-6">
          {loadingWeather ? (
            <div className="p-6 rounded-[28px] bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-slate-100 dark:border-slate-850 text-xs text-slate-500 text-center flex items-center justify-center space-x-2 font-outfit shadow-sm">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Fetching live weather forecast...</span>
            </div>
          ) : weatherData ? (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 rounded-[32px] border border-white/10 shadow-md space-y-4 font-outfit">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs flex items-center font-grotesk tracking-wide uppercase text-sky-200">
                  <Sun className="h-4 w-4 text-amber-300 mr-1.5 animate-spin-slow" /> Weather Forecast & Outlook
                </h3>
                {weatherData.suitability_label && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {weatherData.suitability_label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-extrabold font-grotesk">{weatherData.temperature}°C</span>
                  <span className="text-xs text-slate-300 block capitalize font-semibold">{weatherData.weather}</span>
                </div>
                <div className="text-right text-xs text-slate-300 space-y-0.5">
                  <div>Humidity: <span className="font-bold text-white">{weatherData.humidity}%</span></div>
                  <div>Rain Chance: <span className="font-bold text-cyan-300">{weatherData.rain_probability || 10}%</span></div>
                </div>
              </div>

              {/* Multi-day strip */}
              {weatherData.forecast && weatherData.forecast.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-sky-200 block font-grotesk tracking-wider">Itinerary Daily Forecast</span>
                  <div className="grid grid-cols-2 gap-1.5 text-center text-xs">
                    {weatherData.forecast.slice(0, 4).map((f) => (
                      <div key={f.date} className="p-2 rounded-xl bg-white/10 border border-white/5">
                        <span className="text-[9px] font-bold text-slate-300 block">{f.day_name}</span>
                        <span className="text-xs font-black block">{Math.round(f.temperature)}°C</span>
                        <span className="text-[8px] text-sky-200 truncate block">{f.rain_probability}% rain</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weatherData.advice && (
                <div className="bg-white/10 p-3.5 rounded-2xl border border-white/5 flex items-start space-x-2 text-xs leading-relaxed font-light text-slate-200">
                  <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                  <p>{weatherData.advice}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl p-5 rounded-[28px] border border-slate-100 dark:border-slate-850 text-xs text-slate-400 font-outfit text-center shadow-sm">
              Live weather forecast currently unavailable for {currentDest.name}.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ACTION BAR: SAVE TRIP & MODIFY
          ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-850 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 font-outfit print:hidden">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
            <ShieldCheck className="h-4.5 w-4.5 mr-1.5 text-secondary" /> Save this personalized trip plan?
          </span>
          <p className="text-[11px] text-slate-450">
            Saving will store this itinerary agenda and weather details in your travel account.
          </p>
          {saveStatusMsg && (
            <p className="text-xs font-bold text-secondary animate-pulse mt-1">{saveStatusMsg}</p>
          )}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/plan-trip', { state: { preferences } })}
            className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all"
          >
            Modify Trip Details
          </button>

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
  );
}
