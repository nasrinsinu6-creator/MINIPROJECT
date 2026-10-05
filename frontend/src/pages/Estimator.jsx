/**
 * @file Estimator.jsx
 * @description Smart Travel Expense Estimator page component.
 * Calculates interactive cost breakdowns for trip duration, hotel tier selections, restaurant choices,
 * local transportation modes, and activities. Generates weather-based packing recommendations and itemized expense charts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CloudSun, Sun, CloudRain, Cloud, Wind, Droplets, Compass,
  Receipt, Wallet, Users, Calendar, MapPin, Sparkles, CheckCircle2,
  AlertTriangle, ShieldCheck, CheckSquare, Square, ChevronRight,
  TrendingDown, TrendingUp, ArrowRight, Printer, Share2, Info,
  Sliders, ArrowUpRight, Umbrella, Shirt, Thermometer, ExternalLink
} from 'lucide-react';
import { tripService, getHotelWebsiteUrl } from '../services/api';

/**
 * Travel Expense Estimator component.
 */
export default function Estimator() {

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Destination & Inputs
  const [destinations, setDestinations] = useState([]);
  const [selectedDestId, setSelectedDestId] = useState(
    searchParams.get('destId') ? parseInt(searchParams.get('destId')) : ''
  );
  const [travelDate, setTravelDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0];
  });
  const [durationDays, setDurationDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [budgetTier, setBudgetTier] = useState('standard'); // 'budget', 'standard', 'luxury'
  const [transportMode, setTransportMode] = useState('');
  const [userTargetBudget, setUserTargetBudget] = useState('');

  // Loaded data
  const [loading, setLoading] = useState(true);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'weather', 'expenses'
  const [costViewMode, setCostViewMode] = useState('total'); // 'total' | 'per_person'
  const [selectedForecastDayIndex, setSelectedForecastDayIndex] = useState(0);

  // Interactive Packing Checklist state
  const [checkedPackItems, setCheckedPackItems] = useState({});

  // 1. Initial fetch of destinations
  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await tripService.getDestinations();
        const dests = res.destinations || [];
        setDestinations(dests);
        if (dests.length > 0 && !selectedDestId) {
          setSelectedDestId(dests[0].id);
        }
      } catch (err) {
        console.error('Failed to load destinations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDestinations();
  }, []);

  const currentDestination = useMemo(() => {
    return destinations.find(d => d.id === parseInt(selectedDestId)) || null;
  }, [destinations, selectedDestId]);

  // 2. Fetch Weather & Cost Data when params change
  useEffect(() => {
    if (!selectedDestId) return;

    let isMounted = true;
    async function fetchForecastAndCost() {
      setLoadingEstimate(true);
      try {
        // Parallel fetch for speed
        const [wRes, cRes] = await Promise.all([
          tripService.getWeather(selectedDestId, {
            days: Math.max(3, Math.min(14, durationDays)),
            travel_date: travelDate
          }),
          tripService.estimateCost({
            destination_id: selectedDestId,
            travelers: travelers,
            duration_days: durationDays,
            budget_tier: budgetTier,
            transport_mode: transportMode || undefined
          })
        ]);

        if (isMounted) {
          setWeatherData(wRes.weather);
          setCostData(cRes.cost_estimation);
          setSelectedForecastDayIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch forecast or cost estimate:', err);
      } finally {
        if (isMounted) setLoadingEstimate(false);
      }
    }

    fetchForecastAndCost();
    return () => { isMounted = false; };
  }, [selectedDestId, travelDate, durationDays, travelers, budgetTier, transportMode]);

  const togglePackItem = (itemText) => {
    setCheckedPackItems(prev => ({
      ...prev,
      [itemText]: !prev[itemText]
    }));
  };

  const handlePlanTripWithSettings = () => {
    // Store in localStorage to auto-populate the trip planning wizard
    const prefill = {
      preferences: {
        source_location: 'Kochi',
        destination_type: currentDestination?.category ? [currentDestination.category.toLowerCase()] : ['hill station'],
        budget: costData?.total ? String(costData.total) : '15000',
        travelers: String(travelers),
        duration_days: String(durationDays),
        group_type: travelers === 1 ? 'solo' : (travelers === 2 ? 'honeymoon' : 'family'),
        travel_date: travelDate,
        state: currentDestination?.state || ''
      }
    };
    localStorage.setItem('recommendation_results', JSON.stringify(prefill));
    navigate('/plan-trip', { state: prefill });
  };

  const getWeatherIcon = (condCode, size = "h-5 w-5") => {
    const code = (condCode || "").toLowerCase();
    if (code.includes('sun') || code.includes('clear')) {
      return <Sun className={`${size} text-amber-400`} />;
    }
    if (code.includes('rain')) {
      return <CloudRain className={`${size} text-sky-400`} />;
    }
    if (code.includes('fog') || code.includes('mist')) {
      return <Cloud className={`${size} text-slate-300`} />;
    }
    return <CloudSun className={`${size} text-teal-400`} />;
  };

  // Target budget comparison
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

  const activeForecastDay = useMemo(() => {
    if (!weatherData?.forecast || weatherData.forecast.length === 0) return null;
    return weatherData.forecast[selectedForecastDayIndex] || weatherData.forecast[0];
  }, [weatherData, selectedForecastDayIndex]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans animate-fade-in">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-primary/95 to-slate-950 p-8 sm:p-12 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold font-grotesk tracking-wide uppercase text-sky-200">
              <CloudSun className="h-4 w-4 text-amber-300 animate-pulse" />
              <span>Climate & Budget Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-grotesk tracking-tight leading-tight">
              Weather Forecasting & Expense Estimator
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-outfit font-light leading-relaxed">
              Plan with confidence. Inspect multi-day meteorological forecasts, analyze weather suitability, and dynamically simulate travel expenses across budget tiers.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => window.print()}
              id="export-print-btn"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs backdrop-blur-md transition-all shadow-md"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Export</span>
            </button>
            <button
              onClick={handlePlanTripWithSettings}
              id="proceed-to-planner-btn"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-secondary to-accent hover:scale-[1.02] active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg transition-all"
            >
              <span>Launch Itinerary Builder</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: Destination, Dates, Travelers, Tiers */}
      <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk flex items-center">
              <Sliders className="h-4.5 w-4.5 text-primary mr-2" />
              Trip Configuration & Simulation
            </h2>
            <p className="text-xs text-slate-400 font-outfit">
              Adjust destination, travel window, party size, and travel style to recalculate forecasts and expenses.
            </p>
          </div>

          {/* Tab Filter buttons */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-850 rounded-2xl text-xs font-bold font-outfit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'all' ? 'bg-white dark:bg-[#111827] text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              All Insights
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'weather' ? 'bg-white dark:bg-[#111827] text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Weather Studio
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-[#111827] text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Expense Calculator
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-outfit">

          {/* Destination Selector */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="destination-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1 text-primary" /> Destination
            </label>
            <select
              id="destination-select"
              value={selectedDestId}
              onChange={(e) => setSelectedDestId(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              {destinations.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.category}) - {d.state}
                </option>
              ))}
            </select>
          </div>

          {/* Travel Date */}
          <div className="space-y-1.5">
            <label htmlFor="travel-date-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1 text-secondary" /> Travel Date
            </label>
            <input
              type="date"
              id="travel-date-input"
              value={travelDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Duration in Days */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Duration</span>
              <span className="text-primary dark:text-secondary">{durationDays} Days</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                id="duration-slider"
                min="1"
                max="14"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs font-extrabold w-8 text-right text-slate-700 dark:text-slate-300">{durationDays}d</span>
            </div>
          </div>

          {/* Travelers */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Travelers</span>
              <span className="text-accent">{travelers} {travelers === 1 ? 'Person' : 'People'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setTravelers(Math.max(1, travelers - 1))}
                className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-sm"
              >
                -
              </button>
              <div className="flex-1 text-center py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-extrabold text-xs">
                {travelers}
              </div>
              <button
                type="button"
                onClick={() => setTravelers(Math.min(15, travelers + 1))}
                className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Budget Tier Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Wallet className="h-3.5 w-3.5 mr-1 text-primary" /> Budget Tier
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                id="tier-budget-btn"
                onClick={() => setBudgetTier('budget')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all ${budgetTier === 'budget' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Budget
              </button>
              <button
                type="button"
                id="tier-standard-btn"
                onClick={() => setBudgetTier('standard')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all ${budgetTier === 'standard' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Standard
              </button>
              <button
                type="button"
                id="tier-luxury-btn"
                onClick={() => setBudgetTier('luxury')}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all ${budgetTier === 'luxury' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
              >
                Luxury
              </button>
            </div>
          </div>

        </div>

        {/* Selected Destination Preview Strip */}
        {currentDestination && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent border border-primary/10">
            <div className="flex items-center space-x-3.5">
              <img
                src={currentDestination.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'}
                alt={currentDestination.name}
                className="h-12 w-12 rounded-xl object-cover shadow-sm border border-white/20"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">{currentDestination.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary capitalize font-outfit">
                    {currentDestination.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-outfit mt-0.5 line-clamp-1">
                  {currentDestination.description}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs font-outfit">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Best Season</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{currentDestination.best_time}</span>
              </div>
              <Link
                to={`/destinations/${currentDestination.id}`}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1"
              >
                <span>Full Guide</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {loadingEstimate && (
        <div className="p-8 text-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 animate-pulse">
          <CloudSun className="h-10 w-10 text-primary mx-auto animate-spin-slow" />
          <p className="text-xs font-bold text-slate-500 font-outfit">Synthesizing meteorological forecasts and computing detailed expense models...</p>
        </div>
      )}

      {/* Main Content Grid */}
      {!loadingEstimate && (
        <div className="space-y-8">

          {/* ---------------- SECTION 1: WEATHER FORECASTING STUDIO ---------------- */}
          {(activeTab === 'all' || activeTab === 'weather') && weatherData && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-2 text-primary font-bold text-xs font-grotesk uppercase tracking-wider">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span>Meteorological Intelligence</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                    {weatherData.destination_name} Weather Forecast ({weatherData.forecast_days}-Day Outlook)
                  </h2>
                </div>

                {/* Travel Suitability Pill */}
                <div className="hidden sm:flex items-center space-x-3 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-outfit text-xs font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Suitability: {weatherData.suitability_label} ({weatherData.suitability_score}/100)</span>
                </div>
              </div>

              {/* Weather Hero Card & Today Highlight */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Live Current Weather Banner */}
                <div className="lg:col-span-2 bg-gradient-to-br from-primary via-indigo-950 to-slate-900 text-white rounded-[32px] p-6 sm:p-8 border border-primary/20 shadow-xl relative overflow-hidden space-y-6">
                  <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-secondary/20 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200 flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-secondary" /> {weatherData.destination_name} Climate
                      </span>
                      <p className="text-xs text-slate-300 font-light font-outfit">
                        Observed for {weatherData.category} terrain • Forecast window: {weatherData.start_date}
                      </p>
                    </div>

                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold font-grotesk">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Live Sync Cached</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-baseline space-x-3">
                      <span className="text-5xl sm:text-6xl font-black font-grotesk tracking-tight">
                        {weatherData.temperature}°C
                      </span>
                      <span className="text-base sm:text-lg font-bold text-sky-200 capitalize font-outfit">
                        {weatherData.weather}
                      </span>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
                      {getWeatherIcon(weatherData.weather, "h-12 w-12")}
                    </div>
                  </div>

                  {/* 4 Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-outfit text-xs">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                        <Droplets className="h-3 w-3 mr-1 text-sky-300" /> Humidity
                      </span>
                      <p className="text-base font-extrabold">{weatherData.humidity}%</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                        <Wind className="h-3 w-3 mr-1 text-teal-300" /> Wind Speed
                      </span>
                      <p className="text-base font-extrabold">{weatherData.wind_speed} km/h</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                        <CloudRain className="h-3 w-3 mr-1 text-cyan-300" /> Rain Chance
                      </span>
                      <p className="text-base font-extrabold">{weatherData.rain_probability}%</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                        <Thermometer className="h-3 w-3 mr-1 text-amber-300" /> UV Index
                      </span>
                      <p className="text-base font-extrabold">6 / 10</p>
                    </div>
                  </div>

                  {/* Advisory Notice */}
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex items-start space-x-3 text-xs leading-relaxed text-slate-100 font-outfit font-light">
                    <Info className="h-4.5 w-4.5 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-white font-grotesk text-[11px] uppercase tracking-wide">Weather Travel Advisory</span>
                      <p>{weatherData.advice}</p>
                    </div>
                  </div>
                </div>

                {/* Suitability & Active Alert Card */}
                <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6 font-outfit">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-grotesk">Travel Suitability</h3>
                      <span className="text-xs font-extrabold text-emerald-500">{weatherData.suitability_score}% Match</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-400 via-primary to-emerald-400 transition-all duration-500"
                          style={{ width: `${weatherData.suitability_score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {weatherData.suitability_label}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Optimal Daily Sightseeing Window</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{weatherData.best_time_of_day}</p>
                    </div>
                  </div>

                  {/* Weather Alert */}
                  {weatherData.weather_alerts && weatherData.weather_alerts.length > 0 && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                      weatherData.weather_alerts[0].severity === 'moderate'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300'
                    }`}>
                      <div className="flex items-center space-x-1.5 font-bold font-grotesk text-[11px] uppercase">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{weatherData.weather_alerts[0].title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-light">
                        {weatherData.weather_alerts[0].description}
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Multi-Day Daily Forecast Carousel/Grid */}
              <div className="space-y-3 font-outfit">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-grotesk uppercase tracking-wider">
                    📅 Daily Forecast Breakdown (Click day to inspect)
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">
                    {weatherData.forecast?.length || 0} Days Available
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weatherData.forecast?.map((day, idx) => {
                    const isSelected = idx === selectedForecastDayIndex;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedForecastDayIndex(idx)}
                        className={`p-4 rounded-3xl text-left transition-all border flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                            : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                            {day.day_name}
                          </span>
                          <span className={`text-[11px] font-extrabold ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {day.formatted_date}
                          </span>
                        </div>

                        <div className="my-1 flex items-center justify-center">
                          {getWeatherIcon(day.condition_code, "h-8 w-8")}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-sm">{Math.round(day.temperature)}°C</span>
                            <span className={`text-[10px] ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                              {Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°
                            </span>
                          </div>

                          {/* Rain Probability Bar */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] font-bold">
                              <span className={isSelected ? 'text-sky-200' : 'text-slate-400'}>Rain</span>
                              <span>{day.rain_probability}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              <div
                                className={`h-full rounded-full ${isSelected ? 'bg-amber-300' : 'bg-sky-400'}`}
                                style={{ width: `${day.rain_probability}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <p className={`text-[10px] line-clamp-1 capitalize font-medium ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {day.weather}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Day Inspector Card */}
                {activeForecastDay && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-outfit">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        {getWeatherIcon(activeForecastDay.condition_code, "h-6 w-6")}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                            {activeForecastDay.full_day}, {activeForecastDay.formatted_date}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                            {activeForecastDay.weather}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          💡 {activeForecastDay.advice}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Temp Range</span>
                        <span>{activeForecastDay.temp_min}°C — {activeForecastDay.temp_max}°C</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Wind</span>
                        <span>{activeForecastDay.wind_speed} km/h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Humidity</span>
                        <span>{activeForecastDay.humidity}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Weather-Based Packing Assistant */}
              <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 font-outfit">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-grotesk uppercase tracking-wider flex items-center">
                      <Shirt className="h-4 w-4 text-secondary mr-2" />
                      Climate-Driven Packing Assistant
                    </h3>
                    <p className="text-xs text-slate-400 font-light">
                      Dynamically compiled based on {weatherData.destination_name} ({weatherData.category}) weather and rain probability.
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-primary">
                    {Object.values(checkedPackItems).filter(Boolean).length} / {weatherData.packing_tips?.length || 0} Packed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {weatherData.packing_tips?.map((tip, idx) => {
                    const isChecked = !!checkedPackItems[tip];
                    return (
                      <div
                        key={idx}
                        onClick={() => togglePackItem(tip)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 line-through opacity-80'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-primary/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs font-medium leading-relaxed">{tip}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>
          )}

          {/* ---------------- SECTION 2: TRAVEL EXPENSE & BUDGET CALCULATOR ---------------- */}
          {(activeTab === 'all' || activeTab === 'expenses') && costData && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-2 text-secondary font-bold text-xs font-grotesk uppercase tracking-wider">
                    <Receipt className="h-4 w-4 text-secondary" />
                    <span>Cost Estimation Studio</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
                    Estimated Travel Expenses ({travelers} Travelers • {durationDays} Days)
                  </h2>
                </div>

                {/* Per Person vs Total toggle */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-850 rounded-2xl text-xs font-bold font-outfit">
                  <button
                    onClick={() => setCostViewMode('total')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${costViewMode === 'total' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    Total Trip
                  </button>
                  <button
                    onClick={() => setCostViewMode('per_person')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${costViewMode === 'per_person' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    Per Person
                  </button>
                </div>
              </div>

              {/* Big Cost Banner & Visual Breakdown Progress */}
              <div className="bg-white dark:bg-[#111827] rounded-[36px] p-6 sm:p-10 border border-slate-100 dark:border-slate-850 shadow-sm space-y-8 font-outfit">
                
                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-grotesk">
                      {costViewMode === 'total' ? 'Total Estimated Travel Cost' : 'Per Person Estimated Cost'}
                    </span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl sm:text-5xl font-black font-grotesk text-primary dark:text-secondary">
                        ₹{Math.round(costViewMode === 'total' ? costData.total : costData.per_person_total).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-400">INR</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tier: <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{costData.budget_tier}</span> • All taxes & buffers included
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-grotesk">Daily Burn Rate</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl sm:text-4xl font-black font-grotesk text-slate-800 dark:text-white">
                        ₹{Math.round(costViewMode === 'total' ? costData.daily_average : costData.per_person_per_day).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ Day</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Average expense across {durationDays} days for {travelers} traveler(s)
                    </p>
                  </div>

                  {/* Target Budget Check */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-400 font-grotesk">
                      <span>Target Budget Check</span>
                      {budgetHealth && (
                        <span className={`font-extrabold ${budgetHealth.isUnder ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {budgetHealth.isUnder ? `+₹${Math.round(budgetHealth.diff).toLocaleString()} Surplus` : `-₹${Math.round(Math.abs(budgetHealth.diff)).toLocaleString()} Deficit`}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter your target budget (e.g. 20000)"
                        value={userTargetBudget}
                        onChange={(e) => setUserTargetBudget(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-secondary/30 text-slate-800 dark:text-white"
                      />
                    </div>
                    {budgetHealth && (
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${budgetHealth.isUnder ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, budgetHealth.pct)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Expense Distribution Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold font-grotesk text-slate-700 dark:text-slate-300">
                    <span>Expense Distribution Breakdown</span>
                    <span className="text-slate-400 text-[11px]">100% Normalized</span>
                  </div>

                  <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex p-0.5">
                    <div
                      className="bg-primary h-full rounded-l-xl transition-all"
                      style={{ width: `${costData.breakdown_percentages?.accommodation || 30}%` }}
                      title={`Accommodation: ${costData.breakdown_percentages?.accommodation}%`}
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
                      style={{ width: `${costData.breakdown_percentages?.sightseeing || 15}%` }}
                      title={`Sightseeing: ${costData.breakdown_percentages?.sightseeing}%`}
                    ></div>
                    <div
                      className="bg-slate-400 h-full rounded-r-xl transition-all"
                      style={{ width: `${costData.breakdown_percentages?.miscellaneous || 10}%` }}
                      title={`Misc Buffer: ${costData.breakdown_percentages?.miscellaneous}%`}
                    ></div>
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-md bg-primary shrink-0"></span>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Lodging</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          ₹{Math.round(costViewMode === 'total' ? costData.accommodation : costData.accommodation / travelers).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-md bg-secondary shrink-0"></span>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Dining & Food</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          ₹{Math.round(costViewMode === 'total' ? costData.food : costData.food / travelers).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-md bg-accent shrink-0"></span>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Transportation</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          ₹{Math.round(costViewMode === 'total' ? costData.local_transport : costData.local_transport / travelers).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-md bg-teal-500 shrink-0"></span>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Sightseeing</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          ₹{Math.round(costViewMode === 'total' ? costData.sightseeing : costData.sightseeing / travelers).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-md bg-slate-400 shrink-0"></span>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Buffer (8%)</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          ₹{Math.round(costViewMode === 'total' ? costData.miscellaneous : costData.miscellaneous / travelers).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Item Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 font-outfit text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-500">🏨 Accommodation Details</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        ₹{costData.hotel_price_per_night}/night
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400 truncate">
                        Basis: <strong className="text-slate-700 dark:text-slate-200">{costData.hotel_name}</strong> • {costData.rooms_needed} room(s) for {costData.nights} night(s)
                      </p>
                      <a
                        href={getHotelWebsiteUrl(costData.hotel_name, destinations.find(d => d.id === selectedDestId)?.name || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[10px] text-primary hover:underline font-bold bg-primary/10 px-2 py-0.5 rounded-md shrink-0"
                        title="Visit official hotel website"
                      >
                        <span>Hotel Site</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-500">🍽️ Dining Allowance</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        ₹{costData.avg_meal_price}/meal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Covers 3 meals daily across {durationDays} days for {travelers} traveler(s)
                    </p>
                  </div>
                </div>

                {/* 3-Tier Budget Comparison Table/Card */}
                {costData.budget_tiers_comparison && (
                  <div className="space-y-3 pt-4 font-outfit">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-grotesk uppercase tracking-wider">
                      📊 Side-by-Side Budget Tier Comparison ({durationDays} Days, {travelers} Travelers)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Budget */}
                      <div className={`p-5 rounded-3xl border transition-all ${budgetTier === 'budget' ? 'bg-primary/5 border-primary shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'}`}>
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

                      {/* Standard */}
                      <div className={`p-5 rounded-3xl border transition-all ${budgetTier === 'standard' ? 'bg-primary/5 border-primary shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold font-grotesk uppercase text-primary">Standard / Balanced</span>
                          {budgetTier === 'standard' && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">Active</span>}
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-black font-grotesk text-slate-900 dark:text-white">
                            ₹{Math.round(costData.budget_tiers_comparison.standard).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">3-star hotels, casual restaurants, mix of transit</p>
                      </div>

                      {/* Luxury */}
                      <div className={`p-5 rounded-3xl border transition-all ${budgetTier === 'luxury' ? 'bg-primary/5 border-primary shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold font-grotesk uppercase text-amber-500">Luxury Premium</span>
                          {budgetTier === 'luxury' && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">Active</span>}
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-black font-grotesk text-slate-900 dark:text-white">
                            ₹{Math.round(costData.budget_tiers_comparison.luxury).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Resorts & spas, private AC cabs, fine dining</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Money Saving Recommendations */}
                {costData.money_saving_tips && (
                  <div className="p-5 rounded-3xl bg-secondary/5 border border-secondary/20 space-y-2 font-outfit text-xs">
                    <span className="font-extrabold text-secondary uppercase tracking-wider block font-grotesk flex items-center">
                      <Sparkles className="h-4 w-4 mr-1.5" /> AI Budget Optimization Strategies
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
            </section>
          )}

        </div>
      )}

      {/* Bottom Sticky Action Bar for Mobile & Desktop */}
      <div className="sticky bottom-4 z-40 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl rounded-[28px] p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-outfit">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center font-bold">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Ready to generate your custom travel itinerary?
            </span>
            <p className="text-[11px] text-slate-400">
              Transfer this estimate and parameters into our Day-wise Agenda Compiler.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Back to Top
          </button>
          <button
            onClick={handlePlanTripWithSettings}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-extrabold shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <span>Plan Trip with these Settings</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
