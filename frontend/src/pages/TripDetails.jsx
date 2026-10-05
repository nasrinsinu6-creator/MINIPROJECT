/**
 * @file TripDetails.jsx
 * @description Saved Trip Detail View page component.
 * Displays stored itinerary breakdown for a saved trip ID, including destination header,
 * live destination weather forecast, costs, and day-by-day activity schedule.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Compass, Calendar, MapPin, Users, Hourglass, 
  Receipt, ShieldAlert, ArrowLeft, Sun, Share2, Printer, Map, CheckCircle2, BookOpen
} from 'lucide-react';
import { tripService } from '../services/api';
import ItineraryView from '../components/ItineraryView';

/**
 * Single Saved Trip Detail View component.
 */
export default function TripDetails() {

  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState('');
  const [finishMsg, setFinishMsg] = useState('');

  useEffect(() => {
    async function loadTripDetail() {
      try {
        const res = await tripService.getMyTrips();
        const selected = res.trips.find(t => t.id === parseInt(id));
        if (selected) {
          setTrip(selected);
          const weatherRes = await tripService.getWeather(selected.destination_id, {
            days: selected.duration_days || 3,
            travel_date: selected.travel_date || ''
          });
          setWeather(weatherRes.weather);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTripDetail();
  }, [id]);

  const handleFinishTrip = async () => {
    if (!trip) return;
    try {
      await tripService.finishTrip(trip.id);
      setTrip(prev => ({ ...prev, is_finished: true, status: 'Finished' }));
      setFinishMsg('Trip marked as finished! You can now write a travel diary.');
    } catch (err) {
      console.error('Failed to finish trip', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareMsg('Itinerary link copied to clipboard!');
    setTimeout(() => setShareMsg(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20 font-sans space-y-4 max-w-sm mx-auto">
        <Compass className="h-12 w-12 text-slate-350 dark:text-slate-700 mx-auto animate-spin-slow" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">Trip Plan Not Found</h2>
        <Link to="/my-trips" className="text-primary hover:underline text-xs font-bold block mt-2">Back to Trips History</Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans animate-fade-in print:bg-white print:p-0">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden border-b border-slate-100 dark:border-slate-850 pb-6">
        <Link
          to="/my-trips"
          className="flex items-center space-x-1.5 text-slate-500 hover:text-primary font-bold text-xs"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          <span className="font-outfit">Back to History</span>
        </Link>

        <div className="flex items-center space-x-3.5 self-end font-outfit">
          {shareMsg && (
            <span className="text-[10px] text-secondary font-bold mr-2 animate-pulse">{shareMsg}</span>
          )}
          {finishMsg && (
            <span className="text-[10px] text-emerald-500 font-bold mr-2 animate-fade-in">{finishMsg}</span>
          )}

          {trip.is_finished ? (
            <Link
              to={`/diaries?destId=${trip.destination_id}`}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              <span>✍️ Write Travel Diary</span>
            </Link>
          ) : (
            <button
              onClick={handleFinishTrip}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Trip Finished</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <Share2 className="h-4 w-4 text-primary" />
            <span>Share Trip</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Hero card details */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[36px] p-6 sm:p-10 border border-slate-100 dark:border-slate-850 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="px-3.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider font-grotesk">
                AI Travel Plan
              </span>
              {trip.is_finished ? (
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-wider font-grotesk flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Finished Trip
                </span>
              ) : (
                <span className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-wider font-grotesk flex items-center">
                  <Hourglass className="h-3 w-3 mr-1 text-amber-500" /> Upcoming Trip
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight leading-tight">
              Journey to {trip.destination_name}
            </h1>
            <div className="flex flex-wrap gap-5 text-xs text-slate-400 font-bold font-outfit uppercase tracking-wider">
              <span className="flex items-center text-primary dark:text-secondary">
                <Calendar className="h-4.5 w-4.5 mr-1.5" /> Travel Date: {trip.travel_date || 'Not Specified'}
              </span>
              <span className="flex items-center">
                <MapPin className="h-4.5 w-4.5 mr-1 text-primary" /> Source: {trip.source_location}
              </span>
              <span className="flex items-center">
                <Hourglass className="h-4.5 w-4.5 mr-1 text-primary" /> {trip.duration_days} Days
              </span>
              <span className="flex items-center">
                <Users className="h-4.5 w-4.5 mr-1 text-primary" /> {trip.travelers} Persons
              </span>
            </div>

            {/* Transport details if available */}
            {trip.transport_type && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-outfit">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5 border border-slate-200/60 dark:border-slate-700/60">
                  <Compass className="h-3.5 w-3.5 text-secondary" />
                  <span>Transit: {trip.transport_type}</span>
                </span>
                {trip.distance > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    Route Distance: {trip.distance} km
                  </span>
                )}
                {trip.travel_time && (
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    Duration: {trip.travel_time}
                  </span>
                )}
                {trip.transport_fare > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Est. Fare: ₹{Math.round(trip.transport_fare).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-slate-100 dark:border-slate-850 pl-4 md:pl-0 md:pr-6 font-outfit">
            <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Estimated Cost</span>
            <span className="text-2xl font-black text-primary dark:text-secondary">₹{Math.round(trip.estimated_cost).toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-semibold">Allocated Budget: ₹{Math.round(trip.budget).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Itinerary & Weather/Cost grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline days itinerary */}
        <div className="lg:col-span-2">
          <ItineraryView itinerary={trip.itinerary_text} travelDate={trip.travel_date || ''} title="Personalized Day–Wise Itinerary" />
        </div>

        {/* Cost breakdown & Weather side panel */}
        <div className="space-y-6">
          
          {/* Weather Advisory & Outlook */}
          {weather && (
            <div className="bg-gradient-to-br from-primary via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-[32px] border border-primary/20 shadow-md space-y-4 font-outfit">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs flex items-center font-grotesk tracking-wide uppercase text-sky-200">
                  <Sun className="h-4 w-4 text-amber-300 mr-1.5 animate-spin-slow" /> Weather Forecast & Outlook
                </h3>
                {weather.suitability_label && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {weather.suitability_label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-extrabold font-grotesk">{weather.temperature}°C</span>
                  <span className="text-xs text-slate-300 block capitalize font-semibold">{weather.weather}</span>
                </div>
                <div className="text-right text-xs text-slate-300 space-y-0.5">
                  <div>Humidity: <span className="font-bold text-white">{weather.humidity}%</span></div>
                  <div>Rain Chance: <span className="font-bold text-cyan-300">{weather.rain_probability || 10}%</span></div>
                </div>
              </div>

              {/* Multi-day strip */}
              {weather.forecast && weather.forecast.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-sky-200 block">Itinerary Daily Forecast</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-center text-xs">
                    {weather.forecast.slice(0, 4).map((f) => (
                      <div key={f.date} className="p-1.5 rounded-xl bg-white/10 border border-white/5">
                        <span className="text-[9px] font-bold text-slate-300 block">{f.day_name}</span>
                        <span className="text-xs font-black block">{Math.round(f.temperature)}°</span>
                        <span className="text-[8px] text-sky-200 truncate block">{f.rain_probability}% rain</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/5 flex items-start space-x-2 text-xs leading-relaxed font-light text-slate-200">
                <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <p>{weather.advice}</p>
              </div>

              {/* Link to full Weather & Expense Studio */}
              <Link
                to={`/estimator?destId=${trip?.destination_id}`}
                className="w-full text-center block py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-all text-sky-200"
              >
                Open Full Weather & Expense Studio →
              </Link>
            </div>
          )}

          {/* Navigation link map */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-[28px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center font-grotesk">
              <Map className="h-4.5 w-4.5 text-secondary mr-1.5" />
              Local Route Mapping
            </h3>
            <p className="text-[11px] text-slate-450 leading-relaxed font-outfit">
              View travel nodes and local coordinates mapped on external maps.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination_name + " tourism")}`}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center block py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-secondary hover:text-white text-secondary text-xs font-bold rounded-2xl transition-all"
            >
              Open Google Maps Route
            </a>
          </div>

          {/* Local Hospitals Emergency Contact */}
          <div className="bg-rose-500/10 border border-rose-500/20 dark:bg-rose-955/20 dark:border-rose-900/50 p-6 rounded-[28px] space-y-3.5 font-outfit">
            <h3 className="font-bold text-rose-500 text-xs flex items-center font-grotesk tracking-wide uppercase text-[10px]">
              <ShieldAlert className="h-4.5 w-4.5 mr-1.5" /> Emergency Support Desk
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-light">
              If you require emergency medical assistance or a nearby hospital listing, dial **112** immediately or consult local tourist directories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
