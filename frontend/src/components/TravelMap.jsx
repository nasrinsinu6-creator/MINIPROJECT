/**
 * @file TravelMap.jsx
 * @description Interactive Leaflet / OpenStreetMap component.
 * Features:
 * - Dynamic Tile Layer Switcher (Streets, Satellite, Dark Mode, Terrain)
 * - Interactive Marker Filters & Legend Toggles
 * - Popup CTAs (Select Hotel, Select Restaurant, Add/Remove Sightseeing places)
 * - Quick Jump Location Focus Camera
 * - Fullscreen Exploration Overlay Mode
 * - Click-on-Map Pin & Distance Calculator
 * - Scroll Zoom Toggle & Smooth Controls
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCcw, Compass, MapPin, Navigation, Eye, EyeOff, Sparkles, Crosshair
} from 'lucide-react';

// City Coordinates Database for Source Lookup
const CITY_COORDINATES = {
  'kochi': { lat: 9.9312, lon: 76.2673 },
  'cochin': { lat: 9.9312, lon: 76.2673 },
  'trivandrum': { lat: 8.5241, lon: 76.9366 },
  'thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
  'calicut': { lat: 11.2588, lon: 75.7804 },
  'kozhikode': { lat: 11.2588, lon: 75.7804 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'bengaluru': { lat: 12.9716, lon: 77.5946 },
  'chennai': { lat: 13.0827, lon: 80.2707 },
  'hyderabad': { lat: 17.3850, lon: 78.4867 },
  'mumbai': { lat: 19.0760, lon: 72.8777 },
  'delhi': { lat: 28.6139, lon: 77.2090 },
  'coimbatore': { lat: 11.0168, lon: 76.9558 },
  'madurai': { lat: 9.9252, lon: 78.1198 },
  'mysore': { lat: 12.2958, lon: 76.6394 },
  'mysuru': { lat: 12.2958, lon: 76.6394 },
  'munnar': { lat: 10.0889, lon: 77.0595 },
  'alleppey': { lat: 9.4981, lon: 76.3388 },
  'alappuzha': { lat: 9.4981, lon: 76.3388 },
  'wayanad': { lat: 11.6854, lon: 76.1320 },
  'thekkady': { lat: 9.6031, lon: 77.1610 },
  'vagamon': { lat: 9.6865, lon: 76.9056 },
  'kovalam': { lat: 8.4004, lon: 76.9787 },
  'ooty': { lat: 11.4102, lon: 76.6950 },
  'kodaikanal': { lat: 10.2381, lon: 77.4892 },
  'goa': { lat: 15.2993, lon: 74.1240 },
  'varkala': { lat: 8.7379, lon: 76.7163 },
  'pondicherry': { lat: 11.9416, lon: 79.8083 },
  'chikmagalur': { lat: 13.3161, lon: 75.7720 },
  'coorg': { lat: 12.4244, lon: 75.7382 },
  'manali': { lat: 32.2432, lon: 77.1892 },
  'shimla': { lat: 31.1048, lon: 77.1734 },
  'jaipur': { lat: 26.9124, lon: 75.7873 },
  'udaipur': { lat: 24.5854, lon: 73.7125 }
};

// Haversine distance formula in kilometers
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Helper SVG Icon Generator for Leaflet Markers
const createCustomIcon = (color, symbol, isSelected = false, badgeText = null) => {
  const shadowFilter = isSelected ? 'drop-shadow(0px 4px 10px rgba(99, 102, 241, 0.6))' : 'drop-shadow(0px 2px 5px rgba(0,0,0,0.3))';
  const strokeColor = isSelected ? '#6366F1' : '#FFFFFF';
  const strokeWidth = isSelected ? '3.5' : '2.0';
  const scaleClass = isSelected ? 'scale-110' : '';

  const svg = `
    <div class="relative flex items-center justify-center ${scaleClass} transition-all duration-300">
      ${isSelected ? `<div class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></div>` : ''}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="34" height="44" style="filter: ${shadowFilter};">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
        <circle cx="12" cy="12" r="8.5" fill="#FFFFFF" />
        <text x="12" y="16" font-size="11" text-anchor="middle" font-weight="bold" fill="${color}">${symbol}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker-wrapper',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40]
  });
};

// Tile Layer Configuration Options
const TILE_LAYERS = {
  streets: {
    name: 'Streets',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  dark: {
    name: 'Dark',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  terrain: {
    name: 'Terrain',
    icon: '⛰️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map &copy; OpenTopoMap'
  }
};

export default function TravelMap({
  source = null,
  destination = null,
  routePolyline = [],
  selectedHotel = null,
  allHotels = [],
  selectedRestaurant = null,
  allRestaurants = [],
  attractions = [],
  allAttractions = [],
  selectedAttractionsList = [],
  onSelectHotel = null,
  onSelectRestaurant = null,
  onToggleAttraction = null,
  className = "h-80 sm:h-[450px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const layerGroupRef = useRef(null);
  const clickMarkerRef = useRef(null);

  // Interactive Map States
  const [activeTile, setActiveTile] = useState('streets');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrollZoom, setScrollZoom] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  
  // Category visibility toggles
  const [filters, setFilters] = useState({
    source: true,
    destination: true,
    hotel: true,
    restaurant: true,
    attraction: true
  });

  // Target Focus Location for Jump Dropdown
  const [selectedFocus, setSelectedFocus] = useState('');

  // Resolve source coordinates cleanly
  const resolvedSource = useMemo(() => {
    if (!source) return null;
    let name = typeof source === 'string' ? source : (source.name || 'Origin');
    let lat = source.latitude;
    let lon = source.longitude;

    if (!lat || !lon) {
      const cityKey = String(name).toLowerCase().trim();
      const match = CITY_COORDINATES[cityKey];
      if (match) {
        lat = match.lat;
        lon = match.lon;
      } else {
        // Fallback offset near destination if destination exists
        const destLat = destination?.latitude || 10.0889;
        const destLon = destination?.longitude || 77.0595;
        lat = destLat - 0.8;
        lon = destLon - 0.8;
      }
    }
    return { name, latitude: lat, longitude: lon, label: source.label || '' };
  }, [source, destination]);

  const resolvedDestination = useMemo(() => {
    if (!destination) return null;
    let name = typeof destination === 'string' ? destination : (destination.name || 'Destination');
    let lat = destination.latitude || 10.0889;
    let lon = destination.longitude || 77.0595;
    return { name, latitude: lat, longitude: lon, label: destination.label || '' };
  }, [destination]);

  // Total Straight Line Distance calculation
  const totalDistanceKm = useMemo(() => {
    if (!resolvedSource?.latitude || !resolvedDestination?.latitude) return null;
    return calculateHaversineDistance(
      resolvedSource.latitude, resolvedSource.longitude,
      resolvedDestination.latitude, resolvedDestination.longitude
    );
  }, [resolvedSource, resolvedDestination]);

  // Combine lists for markers
  const hotelsList = useMemo(() => {
    if (allHotels && allHotels.length > 0) return allHotels;
    return selectedHotel ? [selectedHotel] : [];
  }, [allHotels, selectedHotel]);

  const restaurantsList = useMemo(() => {
    if (allRestaurants && allRestaurants.length > 0) return allRestaurants;
    return selectedRestaurant ? [selectedRestaurant] : [];
  }, [allRestaurants, selectedRestaurant]);

  const attractionsListToRender = useMemo(() => {
    if (allAttractions && allAttractions.length > 0) return allAttractions;
    return attractions || [];
  }, [allAttractions, attractions]);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialLat = resolvedDestination?.latitude || resolvedSource?.latitude || 10.0889;
    const initialLon = resolvedDestination?.longitude || resolvedSource?.longitude || 77.0595;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLon],
      zoom: 10,
      zoomControl: false,
      scrollWheelZoom: scrollZoom
    });

    const tileLayer = L.tileLayer(TILE_LAYERS.streets.url, {
      attribution: TILE_LAYERS.streets.attribution,
      maxZoom: 19
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Attach click handler on map canvas to place interactive coordinate measurement pin
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (clickMarkerRef.current) {
        layerGroup.removeLayer(clickMarkerRef.current);
      }

      const distToDest = resolvedDestination?.latitude 
        ? calculateHaversineDistance(lat, lng, resolvedDestination.latitude, resolvedDestination.longitude)
        : null;

      const popupHTML = `
        <div class="font-sans text-xs space-y-1.5 p-1 min-w-[170px]">
          <div class="font-extrabold text-indigo-600 uppercase text-[10px] tracking-wider flex items-center">
            📍 Custom Pin
          </div>
          <div class="text-[11px] text-slate-700 font-semibold">
            Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}
          </div>
          ${distToDest !== null ? `
            <div class="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1 rounded-md border border-emerald-500/20">
              📏 ${distToDest} km to ${resolvedDestination?.name || 'Destination'}
            </div>
          ` : ''}
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon('#6366F1', '🎯')
      }).bindPopup(popupHTML);

      marker.addTo(layerGroup);
      marker.openPopup();
      clickMarkerRef.current = marker;
    });

    // Handle popup button action delegation (React callback integration)
    map.on('popupopen', (e) => {
      const container = e.popup.getElement();
      if (!container) return;
      
      const actionBtns = container.querySelectorAll('[data-map-action]');
      actionBtns.forEach(btn => {
        btn.onclick = (evt) => {
          evt.stopPropagation();
          const action = btn.getAttribute('data-map-action');
          const payloadStr = btn.getAttribute('data-payload');
          const payload = payloadStr ? JSON.parse(payloadStr) : null;

          if (action === 'select-hotel' && onSelectHotel && payload) {
            onSelectHotel(payload);
            map.closePopup();
          } else if (action === 'select-restaurant' && onSelectRestaurant && payload) {
            onSelectRestaurant(payload);
            map.closePopup();
          } else if (action === 'toggle-attraction' && onToggleAttraction && payload) {
            onToggleAttraction(payload.name);
            map.closePopup();
          }
        };
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Handle Scroll Zoom state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (scrollZoom) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [scrollZoom]);

  // 3. Handle Tile Layer switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !TILE_LAYERS[activeTile]) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTile = TILE_LAYERS[activeTile];
    const newLayer = L.tileLayer(newTile.url, {
      attribution: newTile.attribution,
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeTile]);

  // 4. Update Markers, Routes, and Bounds when props or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    clickMarkerRef.current = null;
    const bounds = [];

    // --- 1. Source Marker ---
    if (filters.source && resolvedSource && resolvedSource.latitude && resolvedSource.longitude) {
      const sLatLon = [resolvedSource.latitude, resolvedSource.longitude];
      bounds.push(sLatLon);

      const popupContent = `
        <div class="font-sans text-xs space-y-1.5 p-1 min-w-[180px]">
          <div class="font-extrabold text-emerald-600 uppercase text-[10px] tracking-wider">📍 Origin / Departure</div>
          <div class="font-extrabold text-slate-900 text-sm">${resolvedSource.name}</div>
          ${totalDistanceKm ? `<div class="text-[10px] font-bold text-slate-500">Est. Distance to Destination: <span class="text-indigo-600 font-extrabold">${totalDistanceKm} km</span></div>` : ''}
        </div>
      `;
      L.marker(sLatLon, { icon: createCustomIcon('#10B981', '📍') })
        .bindPopup(popupContent)
        .addTo(layerGroup);
    }

    // --- 2. Destination Marker ---
    if (filters.destination && resolvedDestination && resolvedDestination.latitude && resolvedDestination.longitude) {
      const dLatLon = [resolvedDestination.latitude, resolvedDestination.longitude];
      bounds.push(dLatLon);

      const popupContent = `
        <div class="font-sans text-xs space-y-1.5 p-1 min-w-[180px]">
          <div class="font-extrabold text-rose-600 uppercase text-[10px] tracking-wider">🏁 Target Destination</div>
          <div class="font-extrabold text-slate-900 text-sm">${resolvedDestination.name}</div>
          <div class="text-[10px] text-slate-500 font-medium">${resolvedDestination.label || 'Primary Travel Destination'}</div>
        </div>
      `;
      L.marker(dLatLon, { icon: createCustomIcon('#EF4444', '🏁') })
        .bindPopup(popupContent)
        .addTo(layerGroup);
    }

    // --- 3. Route Polyline ---
    if (filters.source && filters.destination) {
      if (routePolyline && routePolyline.length > 0) {
        L.polyline(routePolyline, {
          color: '#6366F1',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8'
        }).addTo(layerGroup);
        routePolyline.forEach(pt => bounds.push(pt));
      } else if (resolvedSource?.latitude && resolvedDestination?.latitude) {
        const fallbackLine = [
          [resolvedSource.latitude, resolvedSource.longitude],
          [resolvedDestination.latitude, resolvedDestination.longitude]
        ];
        L.polyline(fallbackLine, {
          color: '#6366F1',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8'
        }).addTo(layerGroup);
      }
    }

    // --- 4. Hotel Markers ---
    if (filters.hotel && hotelsList.length > 0 && resolvedDestination?.latitude) {
      hotelsList.forEach((hotel, idx) => {
        const hLat = hotel.latitude || (resolvedDestination.latitude + 0.012 + (idx * 0.008));
        const hLon = hotel.longitude || (resolvedDestination.longitude + 0.015 - (idx * 0.005));
        const hLatLon = [hLat, hLon];
        bounds.push(hLatLon);

        const isSelected = selectedHotel?.id ? (hotel.id === selectedHotel.id) : (idx === 0);

        const hotelJson = JSON.stringify({
          id: hotel.id,
          name: hotel.name,
          price_per_night: hotel.price_per_night,
          address: hotel.address,
          latitude: hLat,
          longitude: hLon
        }).replace(/"/g, '&quot;');

        const popupContent = `
          <div class="font-sans text-xs space-y-2 p-1 min-w-[200px]">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-blue-600 uppercase text-[9px] tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">🏨 Accommodation</span>
              ${isSelected ? `<span class="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active Stay ✓</span>` : ''}
            </div>
            <div class="font-extrabold text-slate-900 text-sm leading-tight">${hotel.name || 'Local Hotel'}</div>
            <div class="text-[11px] font-bold text-blue-600">₹${hotel.price_per_night || 0} / night</div>
            <div class="text-[10px] text-slate-500 line-clamp-2">${hotel.address || hotel.location || 'Local lodging'}</div>
            ${onSelectHotel ? `
              <button 
                data-map-action="select-hotel" 
                data-payload="${hotelJson}"
                class="w-full mt-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all text-center cursor-pointer"
              >
                ${isSelected ? 'Currently Selected ✓' : 'Select as Active Stay'}
              </button>
            ` : ''}
          </div>
        `;

        L.marker(hLatLon, { icon: createCustomIcon('#3B82F6', '🏨', isSelected) })
          .bindPopup(popupContent)
          .addTo(layerGroup);
      });
    }

    // --- 5. Restaurant Markers ---
    if (filters.restaurant && restaurantsList.length > 0 && resolvedDestination?.latitude) {
      restaurantsList.forEach((rest, idx) => {
        const rLat = rest.latitude || (resolvedDestination.latitude - 0.015 + (idx * 0.006));
        const rLon = rest.longitude || (resolvedDestination.longitude - 0.012 - (idx * 0.007));
        const rLatLon = [rLat, rLon];
        bounds.push(rLatLon);

        const isSelected = selectedRestaurant?.id ? (rest.id === selectedRestaurant.id) : (idx === 0);

        const restJson = JSON.stringify({
          id: rest.id,
          name: rest.name,
          cuisine: rest.cuisine,
          avg_cost: rest.avg_cost,
          latitude: rLat,
          longitude: rLon
        }).replace(/"/g, '&quot;');

        const popupContent = `
          <div class="font-sans text-xs space-y-2 p-1 min-w-[200px]">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-amber-600 uppercase text-[9px] tracking-wider bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">🍴 Restaurant</span>
              ${isSelected ? `<span class="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active Dining ✓</span>` : ''}
            </div>
            <div class="font-extrabold text-slate-900 text-sm leading-tight">${rest.name || 'Local Restaurant'}</div>
            <div class="text-[11px] font-bold text-amber-600">${rest.cuisine || 'Regional Dining'} • ₹${rest.avg_cost || 300}/meal</div>
            ${onSelectRestaurant ? `
              <button 
                data-map-action="select-restaurant" 
                data-payload="${restJson}"
                class="w-full mt-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all text-center cursor-pointer"
              >
                ${isSelected ? 'Currently Selected Dining ✓' : 'Select as Active Dining'}
              </button>
            ` : ''}
          </div>
        `;

        L.marker(rLatLon, { icon: createCustomIcon('#F59E0B', '🍴', isSelected) })
          .bindPopup(popupContent)
          .addTo(layerGroup);
      });
    }

    // --- 6. Attraction Markers ---
    if (filters.attraction && attractionsListToRender.length > 0 && resolvedDestination?.latitude) {
      attractionsListToRender.forEach((attr, idx) => {
        const offsetLat = resolvedDestination.latitude + (idx === 0 ? 0.022 : idx === 1 ? -0.025 : idx === 2 ? 0.03 : idx === 3 ? -0.018 : 0.015);
        const offsetLon = resolvedDestination.longitude + (idx === 0 ? -0.018 : idx === 1 ? 0.024 : idx === 2 ? 0.015 : idx === 3 ? -0.028 : -0.02);
        const aLatLon = [attr.latitude || offsetLat, attr.longitude || offsetLon];
        bounds.push(aLatLon);

        const isAdded = selectedAttractionsList.includes(attr.name || attr.id);

        const attrJson = JSON.stringify({
          name: attr.name
        }).replace(/"/g, '&quot;');

        const popupContent = `
          <div class="font-sans text-xs space-y-2 p-1 max-w-[210px]">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-purple-600 uppercase text-[9px] tracking-wider bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">📸 Attraction</span>
              ${isAdded ? `<span class="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">In Trip ✓</span>` : ''}
            </div>
            <div class="font-extrabold text-slate-900 text-sm leading-tight">${attr.name}</div>
            <div class="text-[10px] text-slate-500 line-clamp-2 font-medium">${attr.description || 'Scenic sightseeing location.'}</div>
            ${attr.entry_fee ? `<div class="text-[10px] font-extrabold text-emerald-600">Entry: ${attr.entry_fee}</div>` : ''}
            ${onToggleAttraction ? `
              <button 
                data-map-action="toggle-attraction" 
                data-payload="${attrJson}"
                class="w-full mt-1 py-1.5 px-3 ${isAdded ? 'bg-slate-700 hover:bg-slate-800' : 'bg-purple-600 hover:bg-purple-700'} text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all text-center cursor-pointer"
              >
                ${isAdded ? 'Remove from Trip' : '+ Add to Trip Plan'}
              </button>
            ` : ''}
          </div>
        `;

        L.marker(aLatLon, { icon: createCustomIcon('#8B5CF6', '📸', isAdded) })
          .bindPopup(popupContent)
          .addTo(layerGroup);
      });
    }

    // Fit Map View Bounds smoothly
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
      } catch (err) {
        console.warn('Map fit bounds notice:', err);
      }
    }
  }, [
    resolvedSource, resolvedDestination, routePolyline, 
    hotelsList, selectedHotel, restaurantsList, selectedRestaurant, 
    attractionsListToRender, selectedAttractionsList, filters
  ]);

  // Handle Quick Jump to Specific Location
  const handleJumpToLocation = (targetKey) => {
    setSelectedFocus(targetKey);
    const map = mapInstanceRef.current;
    if (!map) return;

    let targetCoords = null;
    if (targetKey === 'source' && resolvedSource?.latitude) {
      targetCoords = [resolvedSource.latitude, resolvedSource.longitude];
    } else if (targetKey === 'destination' && resolvedDestination?.latitude) {
      targetCoords = [resolvedDestination.latitude, resolvedDestination.longitude];
    } else if (targetKey === 'hotel' && (selectedHotel?.latitude || resolvedDestination?.latitude)) {
      targetCoords = [selectedHotel?.latitude || resolvedDestination.latitude + 0.012, selectedHotel?.longitude || resolvedDestination.longitude + 0.015];
    } else if (targetKey === 'restaurant' && (selectedRestaurant?.latitude || resolvedDestination?.latitude)) {
      targetCoords = [selectedRestaurant?.latitude || resolvedDestination.latitude - 0.015, selectedRestaurant?.longitude || resolvedDestination.longitude - 0.012];
    } else if (targetKey.startsWith('attr_')) {
      const idx = parseInt(targetKey.replace('attr_', ''), 10);
      const attr = attractionsListToRender[idx];
      if (attr && resolvedDestination?.latitude) {
        targetCoords = [attr.latitude || (resolvedDestination.latitude + 0.02), attr.longitude || (resolvedDestination.longitude - 0.018)];
      }
    }

    if (targetCoords) {
      map.flyTo(targetCoords, 14, { animate: true, duration: 1.2 });
    }
  };

  // Reset Map View to default fit bounds
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = [];
    if (resolvedSource?.latitude) bounds.push([resolvedSource.latitude, resolvedSource.longitude]);
    if (resolvedDestination?.latitude) bounds.push([resolvedDestination.latitude, resolvedDestination.longitude]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  };

  // Toggle category filter
  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md p-4 flex flex-col w-full h-full"
    : "relative w-full";

  const mapWrapperClasses = isFullscreen
    ? "w-full h-full rounded-2xl overflow-hidden shadow-2xl relative"
    : className;

  return (
    <div className={containerClasses}>
      <div className={mapWrapperClasses}>
        
        {/* Leaflet Map DOM Canvas */}
        <div ref={mapRef} className="w-full h-full z-0" />

        {/* TOP FLOATING TOOLBAR */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          
          {/* Quick Jump Location Dropdown */}
          <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-1.5 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center space-x-1.5">
            <Compass className="h-4 w-4 text-primary ml-1 shrink-0" />
            <select
              value={selectedFocus}
              onChange={(e) => handleJumpToLocation(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-2"
            >
              <option value="" className="dark:bg-slate-900">🎯 Jump to location...</option>
              {resolvedSource && <option value="source" className="dark:bg-slate-900">📍 Origin: {resolvedSource.name}</option>}
              {resolvedDestination && <option value="destination" className="dark:bg-slate-900">🏁 Destination: {resolvedDestination.name}</option>}
              {selectedHotel && <option value="hotel" className="dark:bg-slate-900">🏨 Hotel: {selectedHotel.name}</option>}
              {selectedRestaurant && <option value="restaurant" className="dark:bg-slate-900">🍴 Dining: {selectedRestaurant.name}</option>}
              {attractionsListToRender.map((att, i) => (
                <option key={i} value={`attr_${i}`} className="dark:bg-slate-900">📸 {att.name}</option>
              ))}
            </select>
          </div>

          {/* Action Tools & Layer Controls */}
          <div className="pointer-events-auto flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
            
            {/* Tile Layer Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLayerMenu(prev => !prev)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1 transition-all"
                title="Switch Map Tiles"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{TILE_LAYERS[activeTile].name}</span>
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 top-10 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-[1001] space-y-0.5">
                  {Object.keys(TILE_LAYERS).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveTile(key);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
                        activeTile === key
                          ? 'bg-primary text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{TILE_LAYERS[key].icon}</span>
                      <span>{TILE_LAYERS[key].name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scroll Zoom Toggle */}
            <button
              type="button"
              onClick={() => setScrollZoom(prev => !prev)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                scrollZoom
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
              title={scrollZoom ? "Scroll Zoom Enabled" : "Scroll Zoom Disabled"}
            >
              <span>{scrollZoom ? "📜 Zoom: ON" : "📜 Zoom: OFF"}</span>
            </button>

            {/* Reset View Button */}
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
              title="Reset View Bounds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 transition-all shadow-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Explore in Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

        </div>

        {/* BOTTOM FLOATING LEGEND & CATEGORY FILTERS */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-slate-950/90 backdrop-blur-md rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl max-w-[92vw] sm:max-w-md font-sans text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold flex items-center">
              <Sparkles className="h-3 w-3 mr-1 text-primary" /> Interactive Map Filters
            </span>
            {totalDistanceKm && (
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-500/20">
                📏 {totalDistanceKm} km
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => toggleFilter('source')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 transition-all ${
                filters.source
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}
            >
              <span>📍</span>
              <span>Origin</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFilter('destination')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 transition-all ${
                filters.destination
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}
            >
              <span>🏁</span>
              <span>Destination</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFilter('hotel')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 transition-all ${
                filters.hotel
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}
            >
              <span>🏨</span>
              <span>Hotels ({hotelsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFilter('restaurant')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 transition-all ${
                filters.restaurant
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}
            >
              <span>🍴</span>
              <span>Dining ({restaurantsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFilter('attraction')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 transition-all ${
                filters.attraction
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}
            >
              <span>📸</span>
              <span>Places ({attractionsListToRender.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

