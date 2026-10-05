/**
 * @file TravelLocationSelector.jsx
 * @description Location search & selection component with Nominatim geocoding autocomplete,
 * coordinate storage, swap toggle, and route distance calculation.
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Compass, ArrowLeftRight, Check, Search, Loader2 } from 'lucide-react';
import { tripService } from '../services/api';

export default function TravelLocationSelector({
  initialSource = { name: 'Kochi', latitude: 9.9312, longitude: 76.2673 },
  initialDestination = { name: 'Varkala', latitude: 8.7379, longitude: 76.7163 },
  onLocationChange,
  travelersCount = 2
}) {
  const [source, setSource] = useState(initialSource);
  const [destination, setDestination] = useState(initialDestination);

  const [srcQuery, setSrcQuery] = useState(initialSource?.name || 'Kochi');
  const [destQuery, setDestQuery] = useState(initialDestination?.name || 'Varkala');

  const [srcSuggestions, setSrcSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const [isSrcLoading, setIsSrcLoading] = useState(false);
  const [isDestLoading, setIsDestLoading] = useState(false);

  const [showSrcDropdown, setShowSrcDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Sync initial props
  useEffect(() => {
    if (initialSource && initialSource.name !== source?.name) {
      setSource(initialSource);
      setSrcQuery(initialSource.name);
    }
  }, [initialSource]);

  useEffect(() => {
    if (initialDestination && initialDestination.name !== destination?.name) {
      setDestination(initialDestination);
      setDestQuery(initialDestination.name);
    }
  }, [initialDestination]);

  // Handle Source search input change with geocoding autocomplete
  const handleSrcQueryChange = async (val) => {
    setSrcQuery(val);
    if (!val || val.length < 2) {
      setSrcSuggestions([]);
      setShowSrcDropdown(false);
      return;
    }
    setIsSrcLoading(true);
    setShowSrcDropdown(true);

    try {
      const res = await tripService.geocode(val);
      setSrcSuggestions(res.results || []);
    } catch (err) {
      console.warn('Src geocode warning:', err);
    } finally {
      setIsSrcLoading(false);
    }
  };

  // Handle Destination search input change with geocoding autocomplete
  const handleDestQueryChange = async (val) => {
    setDestQuery(val);
    if (!val || val.length < 2) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    setIsDestLoading(true);
    setShowDestDropdown(true);

    try {
      const res = await tripService.geocode(val);
      setDestSuggestions(res.results || []);
    } catch (err) {
      console.warn('Dest geocode warning:', err);
    } finally {
      setIsDestLoading(false);
    }
  };

  // Select Source item
  const handleSelectSource = (item) => {
    setSource(item);
    setSrcQuery(item.name);
    setShowSrcDropdown(false);
    if (onLocationChange) {
      onLocationChange(item, destination);
    }
  };

  // Select Destination item
  const handleSelectDestination = (item) => {
    setDestination(item);
    setDestQuery(item.name);
    setShowDestDropdown(false);
    if (onLocationChange) {
      onLocationChange(source, item);
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const newSrc = destination;
    const newDest = source;

    setSource(newSrc);
    setDestination(newDest);

    setSrcQuery(newSrc?.name || '');
    setDestQuery(newDest?.name || '');

    if (onLocationChange) {
      onLocationChange(newSrc, newDest);
    }
  };

  return (
    <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800/80 space-y-4 w-full font-sans">
      
      {/* Side-by-Side Location Search Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        
        {/* FROM (ORIGIN) */}
        <div className="space-y-1.5 relative min-w-0">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
            <MapPin className="h-3 w-3 mr-1 text-emerald-500 shrink-0" /> FROM (ORIGIN)
          </label>
          <div className="relative">
            <input
              type="text"
              value={srcQuery}
              onChange={(e) => handleSrcQueryChange(e.target.value)}
              onFocus={() => srcSuggestions.length > 0 && setShowSrcDropdown(true)}
              placeholder="Search source origin (e.g. Kochi)"
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 pr-8 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
            />
            {isSrcLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 absolute right-3 top-3.5" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3.5" />
            )}
          </div>

          {/* Source Autocomplete Dropdown */}
          {showSrcDropdown && srcSuggestions.length > 0 && (
            <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 font-outfit">
              {srcSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSource(item)}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.label}</div>
                  </div>
                  {source?.name === item.name && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TO (DESTINATION) */}
        <div className="space-y-1.5 relative min-w-0">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
            <Compass className="h-3 w-3 mr-1 text-secondary shrink-0" /> TO (DESTINATION)
          </label>
          <div className="relative">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => handleDestQueryChange(e.target.value)}
              onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
              placeholder="Search destination (e.g. Varkala)"
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 pr-8 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all shadow-inner"
            />
            {isDestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 absolute right-3 top-3.5" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3.5" />
            )}
          </div>

          {/* Destination Autocomplete Dropdown */}
          {showDestDropdown && destSuggestions.length > 0 && (
            <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 font-outfit">
              {destSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDestination(item)}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-secondary/10 hover:text-secondary transition-colors flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.label}</div>
                  </div>
                  {destination?.name === item.name && <Check className="h-3.5 w-3.5 text-secondary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls: Swap & Traveler Count */}
      <div className="pt-2 border-t border-slate-200/40 dark:border-slate-850 flex flex-wrap items-center justify-between gap-3 text-xs font-outfit">
        
        {/* Swap Origin & Destination Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-secondary hover:border-primary/40 font-bold transition-all flex items-center space-x-2 shadow-sm"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Swap Origin & Destination</span>
        </button>

        {/* Selected Coordinates Indicator */}
        <div className="text-[10px] text-slate-400 font-medium">
          {source?.latitude ? `📍 ${source.name} (${source.latitude.toFixed(2)}, ${source.longitude.toFixed(2)})` : ''}
          {destination?.latitude ? ` → 🏁 ${destination.name} (${destination.latitude.toFixed(2)}, ${destination.longitude.toFixed(2)})` : ''}
        </div>
      </div>
    </div>
  );
}
