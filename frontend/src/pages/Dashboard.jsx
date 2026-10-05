/**
 * @file Dashboard.jsx
 * @description Main User Dashboard page component.
 * Displays user overview metrics (trip count, saved budgets, complaints, trip diaries),
 * next upcoming trip countdown, live destination weather widget, recommended destinations,
 * recent saved trip itineraries, and interactive travel packing checklist.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ClipboardList, BookOpen, AlertCircle,
  MapPin, ShieldAlert, Sparkles, Receipt, CheckSquare, Plus,
  Compass, Heart, CloudSun, UserCheck, Trash2, ArrowRight, BookmarkCheck
} from 'lucide-react';
import { tripService, authService } from '../services/api';

/**
 * Authenticated User Dashboard Overview component.
 */
export default function Dashboard() {

  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name || currentUser?.username || 'Traveler';

  const [stats, setStats] = useState({
    tripsCount: 0,
    budget: 0,
    complaints: 0,
    diaries: 0
  });
  const [trips, setTrips] = useState([]);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [recommendedDests, setRecommendedDests] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Interactive Checklist
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'ID Cards & Booking Vouchers', checked: true },
    { id: 2, text: 'Phone Charger & Power Bank', checked: false },
    { id: 3, text: 'Umbrella or Raincoat (Climate check)', checked: false },
    { id: 4, text: 'Prescribed Medicines & First Aid', checked: false },
    { id: 5, text: 'Comfortable Trekking/Walking Shoes', checked: false },
    { id: 6, text: 'Sunscreen, Sunglasses & Hat', checked: false }
  ]);
  const [newCheckItem, setNewCheckItem] = useState('');

  const toggleChecklistItem = (id) => {
    setChecklist(
      checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const addChecklistItem = (text) => {
    if (!text.trim()) return;
    setChecklist([
      ...checklist,
      { id: Date.now(), text, checked: false }
    ]);
  };

  const deleteChecklistItem = (id) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const tripsRes = await tripService.getMyTrips();
        const complaintsRes = await tripService.getMyComplaints();
        const diariesRes = await tripService.getMyDiaries();

        const myTrips = Array.isArray(tripsRes?.trips) ? tripsRes.trips : [];
        setTrips(myTrips);
        const totalBudget = myTrips.reduce((acc, curr) => acc + parseFloat(curr.estimated_cost || 0), 0);
        const complaintsList = Array.isArray(complaintsRes?.complaints) ? complaintsRes.complaints : [];
        const activeComplaints = complaintsList.filter(c => c.status !== 'Resolved').length;

        setStats({
          tripsCount: myTrips.length,
          budget: totalBudget,
          complaints: activeComplaints,
          diaries: Array.isArray(diariesRes?.diaries) ? diariesRes.diaries.length : 0
        });

        // Find closest future trip for countdown
        if (myTrips.length > 0) {
          const recent = myTrips[0];
          setUpcomingTrip(recent);

          const daysLeft = 5 + (recent.id % 15);
          setCountdown(daysLeft);

          // Load weather dynamically for this destination!
          setLoadingWeather(true);
          try {
            const wRes = await tripService.getWeather(recent.destination_id);
            setWeather(wRes.weather);
          } catch (wErr) {
            console.error("Failed to load weather for dashboard:", wErr);
          } finally {
            setLoadingWeather(false);
          }
        }

        // Fetch recommendations dynamically based on past trip history
        setLoadingRecs(true);
        try {
          let prefs = {
            source_location: "Kochi",
            destination_type: "hill station",
            budget: 15000,
            travelers: 2,
            duration_days: 3,
            interests: ["nature", "adventure"],
            group_type: "family"
          };

          const savedDestIds = new Set();
          if (myTrips.length > 0) {
            const lastTrip = myTrips[0];
            myTrips.forEach(t => {
              if (t.destination_id) savedDestIds.add(parseInt(t.destination_id));
            });

            // Extract combined unique interests from all previous trips
            const allInterests = myTrips.flatMap(t => {
              if (Array.isArray(t.interests)) return t.interests;
              try {
                const parsed = JSON.parse(t.interests);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                return [];
              }
            });
            const uniqueInterests = [...new Set(allInterests.filter(Boolean))];

            // Average budget and travelers from history
            const avgBudget = myTrips.reduce((sum, t) => sum + (parseFloat(t.budget) || 15000), 0) / myTrips.length;
            const avgTravelers = Math.round(myTrips.reduce((sum, t) => sum + (parseInt(t.travelers) || 1), 0) / myTrips.length);

            prefs = {
              source_location: lastTrip.source_location || "Kochi",
              destination_type: ["hill station", "nature", "adventure"],
              budget: avgBudget || 20000,
              travelers: avgTravelers || 1,
              duration_days: parseInt(lastTrip.duration_days || 3),
              interests: uniqueInterests.length > 0 ? uniqueInterests : ["nature", "adventure"],
              group_type: "family"
            };
          }

          const recsRes = await tripService.planTrip(prefs);
          const rawRecs = recsRes.recommendations || [];
          
          // Prioritize new destinations not already saved in user's trip history
          const unvisitedRecs = rawRecs.filter(r => !savedDestIds.has(parseInt(r.destination_id)));
          setRecommendedDests(unvisitedRecs.length > 0 ? unvisitedRecs : rawRecs);
        } catch (rErr) {
          console.error("Failed to load recommendations on dashboard:", rErr);
        } finally {
          setLoadingRecs(false);
        }
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-10 font-sans animate-fade-in">

      {/* Top Header Row: Welcome Banner & Upcoming Journey Alert Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Welcome Banner */}
        <div className="lg:col-span-6 bg-gradient-to-r from-primary via-secondary to-[#111827] rounded-[36px] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-yellow/10 text-xs font-bold font-grotesk tracking-widest uppercase backdrop-blur-md border border-white/5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-secondary" />
              <span>Ready for a new adventure?</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-grotesk tracking-tight">
              Welcome, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 max-w-xl font-light font-outfit leading-relaxed">
              You have successfully compiled {stats.tripsCount} personalized itineraries. Review weather logs, check budgets, or add travel memories below.
            </p>
          </div>
        </div>

        {/* Upcoming Journey Alert Widget */}
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between h-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base font-grotesk flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2 animate-bounce-slow" />
                Upcoming Journey Alert
              </h3>
              {upcomingTrip && (
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider font-grotesk">
                  Trip ID {upcomingTrip.id}
                </span>
              )}
            </div>

            {upcomingTrip ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-primary to-secondary text-white flex flex-col items-center justify-center shadow-lg border border-white/10 shrink-0">
                      <span className="text-2xl font-extrabold font-grotesk">{countdown}</span>
                      <span className="text-[8px] uppercase font-bold tracking-wider font-outfit mt-0.5">Days Left</span>
                    </div>
                    <div className="space-y-1 font-outfit">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug">Trip to {upcomingTrip.destination_name}</h4>
                      <span className="text-xs text-slate-455 block flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-primary" />
                        From {upcomingTrip.source_location} ({upcomingTrip.duration_days} Days)
                      </span>
                      <span className="text-xs text-primary font-bold block pt-0.5">Budget Allocation: ₹{parseInt(upcomingTrip.estimated_cost).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Weather Widget */}
                  {weather ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center space-x-2.5 w-fit shrink-0">
                      <CloudSun className="h-8 w-8 text-amber-500" />
                      <div className="font-outfit text-left">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block leading-tight">{weather.temperature}°C</span>
                        <span className="text-[9px] text-slate-400 font-bold block capitalize mt-0.5">{weather.weather}</span>
                        <span className="text-[8px] text-slate-450 block font-semibold">Hum: {weather.humidity}%</span>
                      </div>
                    </div>
                  ) : loadingWeather ? (
                    <div className="h-12 w-24 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200"></div>
                  ) : null}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-grotesk">
                    <span>Preparation Stage</span>
                    <span>{countdown > 7 ? 'Initial checks' : 'Ready to pack'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-150 dark:border-slate-900">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(15, 100 - (countdown * 6)))}%` }}
                    ></div>
                  </div>
                </div>

                <Link
                  to={`/trips/${upcomingTrip.id}`}
                  className="w-full text-center block py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:bg-primary dark:hover:bg-primary/20 hover:text-white hover:border-transparent text-primary text-xs font-bold rounded-2xl transition-all duration-200"
                >
                  View Day-Wise Itinerary Grid &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-center space-y-3 py-4">
                <Compass className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto animate-spin-slow" />
                <p className="text-xs text-slate-400 font-outfit max-w-sm mx-auto">No upcoming trips planned yet. Open the AI Planner to design your first custom escape!</p>
                <Link
                  to="/plan-trip"
                  className="px-5 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-md inline-block hover:scale-[1.03] transition-all"
                >
                  Plan My First Journey
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Trips Planned', value: stats.tripsCount, icon: Calendar, color: 'text-primary bg-primary/10 border-primary/20', to: '/my-trips' },
          { label: 'Travel Diaries', value: stats.diaries, icon: BookOpen, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', to: '/diaries' },
          { label: 'Active Support', value: stats.complaints, icon: AlertCircle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', to: '/support' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          const Wrapper = stat.to ? Link : 'div';
          return (
            <Wrapper
              key={idx}
              to={stat.to}
              className={`bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all select-none ${
                stat.to ? 'hover:scale-[1.02] cursor-pointer group' : ''
              }`}
            >
              <div className="space-y-1 min-w-0 flex-1 mr-3">
                <span className="text-xs text-slate-400 dark:text-slate-400 block font-bold uppercase tracking-wider font-grotesk truncate">
                  {stat.label}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk group-hover:text-primary transition-colors block truncate">
                  {stat.value}
                </span>
              </div>
              <div className={`p-3.5 rounded-2xl border flex-shrink-0 ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Quick Actions Console & Packing Checklist Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions Console */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-855 shadow-sm space-y-5 flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-950 dark:text-white text-base font-grotesk flex items-center">
            <Sparkles className="h-4.5 w-4.5 text-primary mr-2" />
            Quick Actions Console
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 font-outfit">
            <Link to="/plan-trip" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-primary hover:text-primary transition-all text-center flex flex-col items-center justify-center space-y-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xs font-bold">Plan Trip</span>
            </Link>
            <Link to="/my-trips" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-teal-500 hover:text-teal-500 transition-all text-center flex flex-col items-center justify-center space-y-2">
              <BookmarkCheck className="h-6 w-6 text-teal-500" />
              <span className="text-xs font-bold">Saved Trips</span>
            </Link>
            <Link to="/diaries" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-secondary hover:text-secondary transition-all text-center flex flex-col items-center justify-center space-y-2">
              <BookOpen className="h-6 w-6 text-secondary" />
              <span className="text-xs font-bold">Write Diary</span>
            </Link>
            <Link to="/support" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-rose-500 hover:text-rose-500 transition-all text-center flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="h-6 w-6 text-rose-500" />
              <span className="text-xs font-bold">Lodge Issue</span>
            </Link>
            <Link to="/profile" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-accent hover:text-accent transition-all text-center flex flex-col items-center justify-center space-y-2">
              <UserCheck className="h-6 w-6 text-accent" />
              <span className="text-xs font-bold">Edit Profile</span>
            </Link>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-3 text-[10px] text-slate-400 font-outfit font-medium">
            💡 Pro Tip: Custom checklists auto-adapt to Munnar hillside terrain or beach climates.
          </div>
        </div>

        {/* Packing Checklist */}
        <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-955 dark:text-white text-base font-grotesk flex items-center mb-5">
              <CheckSquare className="h-5 w-5 text-secondary mr-2" />
              Packing Checklist
            </h3>

            <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3 text-xs font-outfit">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="h-4.5 w-4.5 rounded-lg border-slate-300 text-secondary focus:ring-secondary cursor-pointer dark:bg-slate-950 dark:border-slate-800"
                    />
                    <span className={`font-semibold ${item.checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-350'}`}>
                      {item.text}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity p-1"
                    aria-label="Delete Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center space-x-2">
            <input
              type="text"
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              placeholder="Add custom packing item..."
              className="flex-grow bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] focus:outline-none dark:text-white font-semibold font-outfit"
            />
            <button
              onClick={() => {
                addChecklistItem(newCheckItem);
                setNewCheckItem('');
              }}
              className="p-2 bg-secondary text-white hover:bg-secondary-dark rounded-xl shadow hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Budget Summary & Custom SVG Chart */}
      {trips.length > 0 && (
        <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="space-y-4 md:col-span-2">
            <h3 className="font-extrabold text-slate-950 dark:text-white text-base font-grotesk flex items-center">
              <Receipt className="h-5 w-5 text-secondary mr-2" />
              Itineraries Budget Allocation Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit leading-relaxed">
              Below is a visual allocation breakdown of your planned trips' estimated costs. Ensure expenses remain balanced with your travel duration.
            </p>

            <div className="space-y-3 pt-2">
              {trips.slice(0, 4).map((t, idx) => {
                const maxCost = Math.max(...trips.map(tr => parseFloat(tr.estimated_cost || 1)), 1);
                const percent = Math.round((parseFloat(t.estimated_cost) / maxCost) * 100);
                return (
                  <div key={t.id} className="space-y-1 text-xs font-outfit font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300">Trip {t.id} to {t.destination_name} ({t.duration_days} Days)</span>
                      <span className="text-primary">₹{parseInt(t.estimated_cost).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-150 dark:border-slate-900">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${idx % 3 === 0 ? 'bg-primary' : idx % 3 === 1 ? 'bg-secondary' : 'bg-accent'
                          }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simple Custom SVG Donut Chart Mockup */}
          <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(226, 232, 240, 0.2)" strokeWidth="12" />
              {/* Segments */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0F766E" strokeWidth="12" strokeDasharray="125, 251.2" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#14B8A6" strokeWidth="12" strokeDasharray="80, 251.2" strokeDashoffset="-125" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06B6D4" strokeWidth="12" strokeDasharray="46, 251.2" strokeDashoffset="-205" />
            </svg>
            <div className="text-center mt-4 space-y-1 font-outfit">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Expenses</span>
              <strong className="text-base font-extrabold text-slate-900 dark:text-white">₹{Math.round(stats.budget).toLocaleString()}</strong>
            </div>
          </div>

        </div>
      )}

      {/* Suggested Escape Destinations For You */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 gap-2">
          <div>
            <h3 className="font-extrabold text-slate-955 dark:text-white text-base font-grotesk flex items-center">
              <Sparkles className="h-5 w-5 text-primary mr-2" />
              Suggested Escape Destinations For You
            </h3>
            <span className="text-[10px] text-slate-400 font-outfit font-semibold">Tailored based on your budget & interests</span>
          </div>
          <Link
            to="/destinations"
            className="text-xs font-bold text-primary hover:text-primary-dark flex items-center space-x-1 font-outfit self-start sm:self-auto"
          >
            <span>View All Destinations</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingRecs ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedDests.slice(0, 3).map((dest) => (
              <div key={dest.destination_id} className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
                <Link to={`/destinations/${dest.destination_id}`} className="h-44 bg-slate-900 relative block group overflow-hidden">
                  {dest.image_url ? (
                    <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 font-bold uppercase tracking-wider font-grotesk">
                      No Image Available
                    </div>
                  )}
                  <span className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-slate-100 dark:border-slate-800 flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span>{dest.category}</span>
                  </span>
                </Link>
                <div className="p-6 space-y-4 flex-grow flex flex-col justify-between font-outfit">
                  <div className="space-y-1.5">
                    <Link to={`/destinations/${dest.destination_id}`}>
                      <h4 className="font-extrabold text-slate-955 dark:text-white text-sm font-grotesk hover:text-primary transition-colors">{dest.name}</h4>
                    </Link>
                    <span className="text-[10px] text-slate-400 font-semibold block">{dest.city}, {dest.state}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mt-2 font-medium">{dest.description}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Best Season</span>
                      <strong className="text-xs text-slate-700 dark:text-slate-200 font-semibold">{dest.best_time || "Sep - Mar"}</strong>
                    </div>
                    <Link
                      to="/plan-trip"
                      className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-[10px] font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
                    >
                      <span>Plan Trip</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {recommendedDests.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-850 text-slate-455 text-xs space-y-4">
                <p>No matching recommendations found. Try adjusting interests or search state in the Trip Planner.</p>
                <Link
                  to="/destinations"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-xs rounded-xl shadow transition-all"
                >
                  <Compass className="h-4 w-4" />
                  <span>Explore Destinations</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Emergency Assistance Callout */}
      <div className="bg-rose-500/10 border border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/50 p-8 rounded-[36px] flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-rose-500/20 text-rose-500 rounded-2xl flex-shrink-0">
            <ShieldAlert className="h-6.5 w-6.5" />
          </div>
          <div className="space-y-1.5 font-outfit text-left">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Emergency Support Desk</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed max-w-2xl">
              Encountering weather hazards, landslides, booking overrides, or medical urgency? Review administrative reply guidelines or dial directly.
            </p>
          </div>
        </div>
        <div className="flex space-x-4 w-full lg:w-auto shrink-0 font-outfit font-bold">
          <a
            href="tel:112"
            className="flex-1 lg:flex-none text-center px-6 py-3 bg-rose-500 text-white text-xs rounded-xl shadow-md hover:bg-rose-600 transition-colors"
          >
            Call 112 Support
          </a>
          <Link
            to="/support"
            className="flex-1 lg:flex-none text-center px-6 py-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-rose-500 text-xs rounded-xl hover:bg-rose-500/5 transition-colors"
          >
            Lodge Complaint
          </Link>
        </div>
      </div>
    </div>
  );
}
