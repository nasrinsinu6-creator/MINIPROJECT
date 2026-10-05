/**
 * @file TransportSelector.jsx
 * @description Recommended Transportation Options component.
 * Features side-by-side Source & Destination inputs, distance badge (~191.1 km Route),
 * Swap Origin & Destination toggle, Traveler count sync, dynamic distance/fare/duration calculations,
 * and responsive 2-column grid of transportation cards.
 */

import React, { useState, useEffect } from 'react';
import { 
  Compass, MapPin, Bus, Car, Train, 
  ArrowLeftRight, Clock, Check, Navigation, Users, Map
} from 'lucide-react';
import { 
  calculateRouteDistance, 
  generateTransportOptions 
} from '../utils/transportEngine';
import TravelMap from './TravelMap';

export default function TransportSelector({
  initialSource = 'Kochi',
  destinationName = 'Varkala',
  travelersCount = 2,
  onSelectTransport,
  selectedTransport = null
}) {
  const [source, setSource] = useState(initialSource || 'Kochi');
  const [destination, setDestination] = useState(destinationName || 'Varkala');
  const [travelers, setTravelers] = useState(travelersCount || 2);
  const [distance, setDistance] = useState(191.1);
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedTransport?.id || null);

  // Sync props if external changes occur
  useEffect(() => {
    if (initialSource && initialSource !== source) {
      setSource(initialSource);
    }
  }, [initialSource]);

  useEffect(() => {
    if (destinationName && destinationName !== destination) {
      setDestination(destinationName);
    }
  }, [destinationName]);

  useEffect(() => {
    if (travelersCount && travelersCount !== travelers) {
      setTravelers(travelersCount);
    }
  }, [travelersCount]);

  // Recalculate route & dynamic options
  const recalculateRoute = (srcVal, destVal, paxVal) => {
    if (!srcVal || !destVal) return;
    const dist = calculateRouteDistance(srcVal, destVal);
    setDistance(dist);

    const generated = generateTransportOptions(srcVal, destVal, paxVal, dist);
    setOptions(generated);

    if (generated.length > 0) {
      // Find matching selection by mode or default to first
      let match = generated.find(o => o.id === selectedId || o.mode === selectedTransport?.mode);
      if (!match) match = generated[0];
      setSelectedId(match.id);
      if (onSelectTransport) {
        onSelectTransport({
          ...match,
          source: srcVal,
          destination: destVal,
          distance: dist,
          travelers: paxVal
        });
      }
    }
  };

  // Run calculation on change of source, destination, or travelers
  useEffect(() => {
    recalculateRoute(source, destination, travelers);
  }, [source, destination, travelers]);

  // Handle Swap Origin & Destination
  const handleSwap = () => {
    const newSrc = destination;
    const newDest = source;
    setSource(newSrc);
    setDestination(newDest);
    recalculateRoute(newSrc, newDest, travelers);
  };

  // Select Option
  const handleOptionClick = (option) => {
    setSelectedId(option.id);
    if (onSelectTransport) {
      onSelectTransport({
        ...option,
        source,
        destination,
        distance,
        travelers
      });
    }
  };

  // Render Lucide Icon helper
  const renderIcon = (mode) => {
    switch (mode) {
      case 'bus':
        return <Bus className="h-5 w-5 text-emerald-500" />;
      case 'cab':
        return <Car className="h-5 w-5 text-sky-500" />;
      case 'train':
        return <Train className="h-5 w-5 text-purple-500" />;
      case 'selfdrive':
        return <Navigation className="h-5 w-5 text-amber-500" />;
      default:
        return <Compass className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[28px] p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-sm font-sans w-full overflow-hidden">
      
      {/* 1. TITLE & DISTANCE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 dark:text-white font-grotesk flex items-center space-x-2">
          <span>🚗 Recommended Transportation Options</span>
        </h3>

        <div className="px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 font-extrabold text-xs font-outfit flex items-center space-x-1.5 shrink-0 shadow-sm">
          <span>🗺️</span>
          <span>~{distance > 0 ? distance : 0} km Route</span>
        </div>
      </div>

      {/* 2. SOURCE & DESTINATION INPUT CARD */}
      <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800/80 space-y-4 w-full">
        
        {/* Side-by-Side Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
          
          {/* FROM (ORIGIN) */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
              <MapPin className="h-3 w-3 mr-1 text-emerald-500 shrink-0" /> FROM (ORIGIN)
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source location (e.g. Kochi)"
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
            />
          </div>

          {/* TO (DESTINATION) */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
              <Compass className="h-3 w-3 mr-1 text-secondary shrink-0" /> TO (DESTINATION)
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination location (e.g. Varkala)"
              className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Action Controls: Swap & Travelers Count */}
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

          {/* Travelers Count Badge */}
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5 shadow-sm shrink-0">
            <Users className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span>{travelers} Traveler{travelers > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* 2.5 INTERACTIVE LEAFLET ROUTE MAP */}
      <div className="space-y-2.5 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 font-outfit uppercase tracking-wider flex items-center">
            <Map className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Interactive Route Map
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Leaflet OpenStreetMap • Live Polyline
          </span>
        </div>
        <TravelMap
          source={source}
          destination={destination}
          className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
        />
      </div>

      {/* 3. TRANSPORTATION CARDS GRID (2 Columns on Desktop/Tablet, 1 Column on Mobile) */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 font-outfit">
          <span>Available Dynamic Routes</span>
          <span className="text-[10px] text-slate-400 font-normal">Fares estimated for {travelers} traveler{travelers > 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleOptionClick(opt)}
                className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-primary/20 dark:via-slate-950 dark:to-secondary/20 border-primary ring-2 ring-primary/40 shadow-md'
                    : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}
              >
                <div className="space-y-3.5">
                  
                  {/* Card Header: Title & Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-grotesk leading-tight truncate">
                        {opt.transport_type}
                      </h4>
                      {opt.subtitle && (
                        <p className="text-[11px] font-semibold text-slate-400 font-outfit truncate">
                          ({opt.subtitle})
                        </p>
                      )}
                    </div>
                    
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}>
                      {renderIcon(opt.mode)}
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-850 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-grotesk">
                        ₹{opt.total_fare.toLocaleString()}
                      </div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {opt.fare_label}
                      </div>
                    </div>
                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Estimated Fare • {opt.travelers} Pax
                    </div>
                  </div>

                  {/* Route & Duration Info */}
                  <div className="space-y-2 text-xs font-outfit">
                    
                    {/* Duration */}
                    <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-200">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span>⏱ Duration: {opt.travel_time}</span>
                    </div>

                    {/* Source -> Destination */}
                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                      {opt.source} → {opt.destination}
                    </div>

                    {/* Pickup / Drop info */}
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      📍 {opt.pickup_drop}
                    </div>
                  </div>
                </div>

                {/* Card Action & Recommendation Label */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-850 flex flex-wrap items-center justify-between gap-2">
                  
                  {/* Recommendation Badge */}
                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 shrink-0">
                    {opt.recommendation_label}
                  </span>

                  {/* Select Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick(opt);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ml-auto sm:ml-0 ${
                      isSelected
                        ? 'bg-primary text-white ring-2 ring-primary/40'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>✓ Selected</span>
                      </>
                    ) : (
                      <span>Select</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
