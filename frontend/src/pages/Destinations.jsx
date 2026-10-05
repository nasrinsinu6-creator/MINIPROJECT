/**
 * @file Destinations.jsx
 * @description Public Travel Destinations directory page component.
 * Displays searchable gallery of travel destinations with category filter tabs (Hill Station, Beach,
 * Heritage, Wildlife), price sorting options, and direct navigation links to detailed destination pages.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Compass, SlidersHorizontal, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotWidget from '../components/ChatbotWidget';
import { tripService } from '../services/api';

/**
 * Travel Destinations Directory view component.
 */
export default function Destinations() {

  const [searchParams, setSearchParams] = useSearchParams();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & filter state
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [budgetSort, setBudgetSort] = useState('none'); // none, asc, desc

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const categoryParam = selectedCategory === 'all' ? '' : selectedCategory;
        const res = await tripService.getDestinations({
          search: searchVal,
          category: categoryParam
        });
        
        let list = res.destinations;
        
        if (budgetSort === 'asc') {
          list = [...list].sort((a, b) => floatVal(a.budget_min) - floatVal(b.budget_min));
        } else if (budgetSort === 'desc') {
          list = [...list].sort((a, b) => floatVal(b.budget_min) - floatVal(a.budget_min));
        }
        
        setDestinations(list);
      } catch (err) {
        console.error("Error loading destinations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchVal, selectedCategory, budgetSort]);

  const floatVal = (v) => parseFloat(v || 0);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'beach', name: 'Beaches' },
    { id: 'hill station', name: 'Hill Stations' },
    { id: 'heritage', name: 'Heritage' },
    { id: 'nature', name: 'Nature & Wildlife' },
    { id: 'pilgrimage', name: 'Pilgrimage' },
    { id: 'city tourism', name: 'City Tourism' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 w-full animate-fade-in">
        {/* Title */}
        <div className="text-center md:text-left space-y-2 border-b border-slate-100 dark:border-slate-850 pb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Explore Destinations</h1>
          <p className="text-slate-450 text-xs font-outfit font-semibold">Browse tourism spots, check travel costs, and view local recommendations.</p>
        </div>

        {/* Filters and Search toolbar */}
        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl p-5 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col lg:flex-row gap-5 items-center justify-between font-outfit">
          
          {/* Search Input */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 w-full lg:max-w-md">
            <Search className="h-4.5 w-4.5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                setSearchParams({ search: e.target.value, category: selectedCategory });
              }}
              placeholder="Search by destination name, state, city..."
              className="w-full bg-transparent border-none text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none font-semibold"
            />
          </div>

          {/* Sort selection */}
          <div className="flex items-center space-x-3.5 w-full lg:w-auto justify-end font-bold">
            <SlidersHorizontal className="h-4.5 w-4.5 text-slate-400" />
            <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Sort Budget:</span>
            <select
              value={budgetSort}
              onChange={(e) => setBudgetSort(e.target.value)}
              className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-2xl focus:outline-none dark:text-white text-slate-700 font-semibold"
            >
              <option value="none">Default Match</option>
              <option value="asc">Low to High</option>
              <option value="desc">High to Low</option>
            </select>
          </div>
        </div>

        {/* Category horizontal tabs */}
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-3 scrollbar-hide font-outfit">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchParams({ search: searchVal, category: cat.id });
              }}
              className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all hover:scale-[1.03] ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20'
                  : 'bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Destinations list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white dark:bg-[#111827] rounded-[32px] h-96 animate-pulse border border-slate-105 dark:border-slate-850"></div>
            ))}
          </div>
        ) : (
          <>
            {destinations.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-4 max-w-lg mx-auto">
                <Compass className="h-11 w-11 text-slate-300 dark:text-slate-700 mx-auto animate-spin-slow" />
                <h3 className="text-lg font-bold text-slate-750 dark:text-slate-350 font-grotesk">No Destinations Found</h3>
                <p className="text-slate-400 text-xs font-outfit max-w-sm mx-auto leading-relaxed">We couldn't find matching records. Try modifying search query keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="bg-white dark:bg-[#111827] rounded-[32px] overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-800/80 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="relative h-56 bg-slate-200 shrink-0">
                      <img
                        src={dest.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                        alt={dest.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#0B0F19]/65 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase font-outfit">
                        {dest.category}
                      </div>
                      <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider font-outfit flex items-center space-x-1 shadow-md">
                        <Star className="h-3 w-3 fill-white text-white" />
                        <span>{dest.rating || '4.5'} ({dest.reviews_count || 0})</span>
                      </div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-grow space-y-4">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider font-outfit">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-primary mr-1 flex-shrink-0" />
                          <span>{dest.city}, {dest.state}</span>
                        </div>
                        <span className="text-amber-500 font-extrabold flex items-center">
                          ★ {dest.rating || '4.5'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight leading-tight">{dest.name}</h3>
                      
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed font-outfit font-medium">
                        {dest.description}
                      </p>
                      
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-auto font-outfit">
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Est. Budget Range</span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300 text-xs">₹{parseInt(dest.budget_min).toLocaleString()} - ₹{parseInt(dest.budget_max).toLocaleString()}</span>
                        </div>
                        <Link
                          to={`/destinations/${dest.id}`}
                          className="px-4.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 hover:bg-primary hover:text-white hover:border-transparent text-primary dark:text-white text-xs font-bold rounded-2xl transition-all duration-200"
                        >
                          Explore
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <ChatbotWidget />
    </div>
  );
}
