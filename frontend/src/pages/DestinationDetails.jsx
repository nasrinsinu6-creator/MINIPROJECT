/**
 * @file DestinationDetails.jsx
 * @description Single Destination Detail View page component.
 * Displays comprehensive destination details including hero banner, key attractions, weather forecast,
 * hotels & resorts, restaurants, transit options, user reviews & submission form, and quick planning CTA.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Calendar, Sun, Building2, Utensils, Compass, Car, 
  Star, MessageSquare, ShieldAlert, Thermometer, Droplets, Wind, PlusCircle, CheckCircle,
  Receipt, CloudSun, CloudRain, ArrowRight, Wallet, Shirt, ExternalLink
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotWidget from '../components/ChatbotWidget';
import { tripService, authService, getHotelWebsiteUrl } from '../services/api';

/**
 * Destination Details view component.
 */
export default function DestinationDetails() {

  const { id } = useParams();
  const [destination, setDestination] = useState(null);
  const [weather, setWeather] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  const currentUser = authService.getCurrentUser();

  const loadData = async () => {
    try {
      const detailRes = await tripService.getDestinationDetail(id);
      setDestination(detailRes.destination);
      
      const weatherRes = await tripService.getWeather(id);
      setWeather(weatherRes.weather);
      
      const reviewsRes = await tripService.getReviews(id);
      setReviews(reviewsRes.reviews);
    } catch (err) {
      console.error("Failed to load destination details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    
    setSubmittingReview(true);
    setReviewMsg('');
    try {
      await tripService.postReview({
        destination_id: parseInt(id),
        rating: rating,
        review: reviewText
      });
      setReviewText('');
      setReviewMsg('Review submitted successfully!');
      const reviewsRes = await tripService.getReviews(id);
      setReviews(reviewsRes.reviews);
    } catch (err) {
      setReviewMsg('Failed to post review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
        <Navbar />
        <div className="flex-1 text-center py-24 space-y-4 max-w-sm mx-auto">
          <Compass className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto animate-spin-slow" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">Destination Not Found</h2>
          <p className="text-slate-400 text-xs font-outfit leading-relaxed">The requested tourist destination details do not exist.</p>
          <Link to="/destinations" className="text-primary font-bold hover:underline text-xs block pt-2">Back to Destinations</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar />

      {/* Hero Header */}
      <div className="relative h-[420px] w-full bg-slate-900 overflow-hidden">
        <img
          src={destination.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'}
          alt={destination.name}
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-8 max-w-7xl mx-auto right-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-3 text-white font-outfit">
            <div className="flex items-center space-x-2">
              <span className="px-3.5 py-1 rounded-full bg-primary/20 backdrop-blur-md text-white border border-primary/30 text-[9px] font-bold uppercase tracking-wider capitalize">
                {destination.category}
              </span>
              <button 
                onClick={() => setActiveTab('reviews')}
                className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center space-x-1 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{destination.rating || '4.5'} ({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})</span>
              </button>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-grotesk tracking-tight leading-none">{destination.name}</h1>
            <div className="flex items-center text-slate-350 text-xs font-semibold uppercase tracking-wider">
              <MapPin className="h-4 w-4 mr-1 text-primary" />
              <span>{destination.city}, {destination.state}</span>
            </div>
          </div>
          
          <Link
            to="/plan-trip"
            state={{
              preferences: {
                destination_type: [destination.category?.toLowerCase() || 'hill station'],
                budget: destination.budget_min ? String(destination.budget_min) : '15000',
                state: destination.state || ''
              }
            }}
            className="px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-center font-outfit"
          >
            Plan Journey Here
          </Link>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-850 sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-8 overflow-x-auto h-14 scrollbar-hide font-outfit">
          {[
            { id: 'overview', label: 'Overview & Climate', icon: Compass },
            { id: 'hotels', label: 'Hotel Allocations', icon: Building2 },
            { id: 'restaurants', label: 'Local Food Dining', icon: Utensils },
            { id: 'transport', label: 'Transit Routes', icon: Car },
            { id: 'reviews', label: 'Traveler Reviews', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 h-full border-b-2 font-bold text-xs transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full animate-fade-in">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Description & Attractions */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-[#111827] p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-850 space-y-5">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-grotesk">About the Destination</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-outfit font-medium">{destination.description}</p>
                
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-8 text-xs font-outfit font-bold">
                  <div>
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[9px]">Best Time to Visit</span>
                    <strong className="text-slate-700 dark:text-slate-200 flex items-center">
                      <Calendar className="h-4.5 w-4.5 text-primary mr-1 flex-shrink-0" />
                      {destination.best_time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[9px]">Average Budget Range</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-grotesk text-sm">
                      ₹{parseInt(destination.budget_min).toLocaleString()} - ₹{parseInt(destination.budget_max).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Attractions Checklist */}
              <div className="bg-white dark:bg-[#111827] p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-850 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-grotesk">Main Attractions & Sightseeing</h2>
                  {currentUser?.is_admin && (
                    <Link
                      to="/admin/destinations?showAllAttractions=true#admin-attractions"
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-2xl bg-primary text-white hover:bg-primary-dark transition-all"
                    >
                      Manage Attractions
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {destination.attractions && destination.attractions.map((attr) => (
                    <div key={attr.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 space-y-3 font-outfit">
                      <h3 className="font-bold text-xs text-slate-800 dark:text-white font-grotesk">{attr.name}</h3>
                      <p className="text-xs text-slate-450 leading-relaxed font-medium">{attr.description}</p>
                      <div className="pt-3 flex justify-between text-[10px] border-t border-slate-200/50 dark:border-slate-850 font-bold">
                        <span className="text-slate-400">Fee: <strong className="text-slate-700 dark:text-slate-300">₹{attr.entry_fee || 'Free'}</strong></span>
                        <span className="text-slate-400">Duration: <strong className="text-slate-700 dark:text-slate-300">{attr.visit_time}</strong></span>
                      </div>
                    </div>
                  ))}
                  {(!destination.attractions || destination.attractions.length === 0) && (
                    <p className="text-slate-400 text-xs font-outfit col-span-2 py-4">No sightseeing places mapped in database yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Weather & Expense Estimation Panels */}
            <div className="space-y-6">
              {weather ? (
                <div className="bg-gradient-to-br from-primary to-slate-900 text-white p-6 sm:p-8 rounded-[32px] shadow-lg space-y-6 border border-primary/20 font-outfit">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm tracking-wide uppercase text-[10px] text-sky-200 font-grotesk">Local Climate Intelligence</h3>
                      <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
                        {weather.suitability_label ? `Suitability: ${weather.suitability_label} (${weather.suitability_score}/100)` : 'Live Synced'}
                      </span>
                    </div>
                    <Sun className="h-8 w-8 text-amber-300 animate-spin-slow" />
                  </div>
                  
                  <div className="flex items-center space-x-5">
                    <span className="text-4xl sm:text-5xl font-black font-grotesk tracking-tight">{weather.temperature}°C</span>
                    <div className="text-xs">
                      <span className="font-extrabold block text-sm capitalize">{weather.weather}</span>
                      <span className="text-sky-200 font-medium">{weather.advice ? 'Weather Advisory Active' : 'Optimal Season'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <Droplets className="h-4 w-4 text-sky-300" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Humidity</span>
                        <span className="font-bold">{weather.humidity}%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <Wind className="h-4 w-4 text-teal-300" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Wind speed</span>
                        <span className="font-bold">{weather.wind_speed || '12'} km/h</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <CloudRain className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Rain Prob.</span>
                        <span className="font-bold">{weather.rain_probability || 10}%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <Thermometer className="h-4 w-4 text-amber-300" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase tracking-wider">UV Index</span>
                        <span className="font-bold">6 Moderate</span>
                      </div>
                    </div>
                  </div>

                  {/* 5-Day Mini Outlook Strip */}
                  {weather.forecast && weather.forecast.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 block font-grotesk">
                        Upcoming 5-Day Outlook
                      </span>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        {weather.forecast.slice(0, 5).map((f) => (
                          <div key={f.date} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 space-y-1">
                            <span className="text-[9px] font-bold text-slate-300 block">{f.day_name}</span>
                            <span className="text-xs font-black block">{Math.round(f.temperature)}°</span>
                            <span className="text-[8px] text-sky-200 block truncate">{f.weather}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {weather.advice && (
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex items-start space-x-2 text-xs leading-relaxed font-light text-slate-100">
                      <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                      <p>{weather.advice}</p>
                    </div>
                  )}

                  {/* Packing Tips */}
                  {weather.packing_tips && weather.packing_tips.length > 0 && (
                    <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 flex items-center">
                        <Shirt className="h-3.5 w-3.5 mr-1" /> Smart Climate Packing
                      </span>
                      <ul className="text-[11px] text-slate-200 space-y-1 pl-1">
                        {weather.packing_tips.slice(0, 3).map((tip, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-secondary font-bold">•</span>
                            <span className="line-clamp-1">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111827] p-8 text-center rounded-[32px] border border-slate-100 dark:border-slate-850 text-slate-450 text-xs">
                  Weather forecast currently loading...
                </div>
              )}

              {/* Quick Expense Estimator Promo Card */}
              <div className="bg-white dark:bg-[#111827] rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5 font-outfit">
                <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider font-grotesk">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Cost Estimation Studio</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-grotesk">
                  Estimate Total Trip Expenses for {destination?.name}
                </h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Calculate lodging, transport, meal allowances, and sightseeing tickets tailored to your group size and budget tier.
                </p>
                <Link
                  to={`/estimator?destId=${id}`}
                  className="w-full text-center block py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <span>Open Interactive Estimator</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Registered Accommodations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {destination.hotels && destination.hotels.length > 0 ? (
                destination.hotels.map((hotel) => (
                  <div key={hotel.id} className="bg-white dark:bg-[#111827] rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-850 p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow font-outfit">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <a
                            href={getHotelWebsiteUrl(hotel, destination?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-extrabold text-lg text-slate-900 dark:text-white font-grotesk leading-tight hover:text-primary transition-colors flex items-center gap-1.5 group"
                            title={`Visit official website for ${hotel.name}`}
                          >
                            <span>{hotel.name}</span>
                            <ExternalLink className="h-4 w-4 text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                          <p className="text-xs text-slate-400 font-semibold flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                            {hotel.address || 'Address provided by admin'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hotel.price_per_night && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                              ₹{Number(hotel.price_per_night).toLocaleString()}/day
                            </span>
                          )}
                          <span className="bg-amber-500/10 text-amber-500 text-xs px-2.5 py-1 rounded-full font-bold flex items-center shrink-0 border border-amber-500/20">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />
                            {hotel.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400 font-medium">Click below to check real-time availability:</span>
                      <a
                        href={getHotelWebsiteUrl(hotel, destination?.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow hover:scale-105 active:scale-95 transition-all shrink-0"
                        title="Visit official hotel website to check availability"
                      >
                        <span>Check Availability & Book</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs font-outfit col-span-2 py-10 text-center bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850">
                  No accommodations are currently registered for this destination.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Local Dining & Restaurants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {destination.restaurants && destination.restaurants.map((rest) => (
                <div key={rest.id} className="bg-white dark:bg-[#111827] rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-48 h-44 bg-slate-200 dark:bg-slate-950 shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80"
                      alt={rest.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex flex-col justify-between flex-grow space-y-2 font-outfit">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(rest.cuisine || 'Multi-Cuisine').split(',').map((c, i) => (
                              <span key={i} className="text-[9px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20 tracking-wider">
                                {c.trim()}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-grotesk leading-tight">{rest.name}</h3>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center border border-emerald-500/20 shrink-0">
                          <Star className="h-3 w-3 fill-emerald-500 text-emerald-500 mr-1" />
                          {rest.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-0.5 text-slate-400" />
                        {rest.address}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-850 font-bold font-outfit">
                      <span className="text-slate-400 text-[9px] block uppercase tracking-wider">Average Cost</span>
                      <span className="text-base font-extrabold text-slate-750 dark:text-slate-300">₹{parseInt(rest.avg_cost).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!destination.restaurants || destination.restaurants.length === 0) && (
                <p className="text-slate-450 text-xs font-outfit col-span-2 py-10 text-center bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850">
                  No local restaurants registered in this area yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Transport Tab */}
        {activeTab === 'transport' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Transportation Options</h2>
            <p className="text-xs text-slate-450 font-outfit font-semibold mb-6">Compare fares, distances, and travel times to reach this tourist destination.</p>
            <TransportPanel destinationId={id} />
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews list */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-grotesk">Traveler Reviews ({reviews.length})</h2>
              
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white dark:bg-[#111827] p-6 rounded-[24px] border border-slate-105 dark:border-slate-850 shadow-sm space-y-4 font-outfit">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {rev.user_name ? rev.user_name[0].toUpperCase() : 'A'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 font-grotesk">{rev.user_name}</h4>
                          <span className="text-[9px] text-slate-400 font-bold">{rev.created_at}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-500 space-x-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-250 dark:text-slate-800'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{rev.review}</p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-slate-450 text-xs font-outfit py-10 text-center bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850">
                    No reviews yet. Be the first to share your travel memories!
                  </p>
                )}
              </div>
            </div>

            {/* Write a review card */}
            <div>
              {currentUser ? (
                <div className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-850 space-y-5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm font-grotesk">Write a Review</h3>
                  
                  {reviewMsg && (
                    <p className="text-xs text-primary font-bold font-outfit animate-pulse">{reviewMsg}</p>
                  )}

                  <form onSubmit={handlePostReview} className="space-y-4 font-outfit">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating Score</label>
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button; button"
                            onClick={() => setRating(stars)}
                            className="p-1 text-amber-500 hover:scale-110 transition-transform focus:outline-none"
                          >
                            <Star className={`h-6 w-6 ${stars <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-800'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share your experience</label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="What did you explore? How was the local environment?"
                        rows="4"
                        className="w-full text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-semibold"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview || !reviewText.trim()}
                      className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-xl shadow transition-all hover:scale-102 disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-850 text-center space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm font-grotesk">Review this Place</h3>
                  <p className="text-xs text-slate-450 leading-relaxed font-outfit font-medium">You must be logged in as a traveler to write a review.</p>
                  <Link
                    to="/login"
                    className="w-full block py-3 bg-slate-50 dark:bg-slate-900 hover:bg-primary hover:text-white text-primary font-bold text-xs rounded-xl border border-slate-200/50 dark:border-slate-800/80 transition-all font-outfit"
                  >
                    Log In to Review
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <ChatbotWidget />
    </div>
  );
}

// Subcomponent to fetch transportation on tab load
function TransportPanel({ destinationId }) {
  const [transit, setTransit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransit() {
      try {
        const res = await tripService.getTransport(destinationId);
        setTransit(res.transportation);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTransit();
  }, [destinationId]);

  if (loading) return <div className="text-slate-400 text-xs font-outfit font-semibold">Loading local transit options...</div>;

  if (transit.length === 0) {
    return (
      <div className="p-10 text-center bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 text-slate-450 text-xs font-outfit font-semibold">
        No direct transit options are registered for this destination.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden font-outfit">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[9px] font-grotesk">
              <th className="p-4 pl-6">Transit Type</th>
              <th className="p-4">Source Route</th>
              <th className="p-4">Travel Duration</th>
              <th className="p-4">Estimated Fare</th>
              <th className="p-4 pr-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {transit.map((tr) => (
              <tr key={tr.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center space-x-2.5 py-5">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Car className="h-4 w-4" />
                  </div>
                  <span>{tr.transport_type}</span>
                </td>
                <td className="p-4 text-slate-550 dark:text-slate-350">{tr.source} &rarr; {tr.destination || 'Sightseeing'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{tr.travel_time}</td>
                <td className="p-4 font-extrabold text-slate-900 dark:text-white">₹{parseInt(tr.fare).toLocaleString()}</td>
                <td className="p-4 pr-6 text-right">
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                    {tr.availability}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
