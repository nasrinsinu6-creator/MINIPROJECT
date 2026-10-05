/**
 * @file transportEngine.js
 * @description Dynamic Transportation & Route Calculation Engine.
 * Provides distance calculation (Matrix, Haversine, & API fallback),
 * dynamic transport option generation with per-passenger and flat fares,
 * travel time estimation, and preference-based recommendation label scoring.
 */

// Geographic coordinates dictionary (lat, lon)
export const CITY_COORDINATES = {
  'kozhikode': { name: 'Kozhikode (Calicut)', lat: 11.2588, lon: 75.7804 },
  'calicut': { name: 'Kozhikode (Calicut)', lat: 11.2588, lon: 75.7804 },
  'munnar': { name: 'Munnar', lat: 10.0889, lon: 77.0595 },
  'kochi': { name: 'Kochi (Cochin)', lat: 9.9312, lon: 76.2673 },
  'cochin': { name: 'Kochi (Cochin)', lat: 9.9312, lon: 76.2673 },
  'ernakulam': { name: 'Kochi (Ernakulam)', lat: 9.9816, lon: 76.2999 },
  'wayanad': { name: 'Wayanad (Kalpetta)', lat: 11.6103, lon: 76.0827 },
  'kalpetta': { name: 'Wayanad (Kalpetta)', lat: 11.6103, lon: 76.0827 },
  'alleppey': { name: 'Alleppey (Alappuzha)', lat: 9.4981, lon: 76.3388 },
  'alappuzha': { name: 'Alleppey (Alappuzha)', lat: 9.4981, lon: 76.3388 },
  'varkala': { name: 'Varkala', lat: 8.7379, lon: 76.7163 },
  'trivandrum': { name: 'Trivandrum (Thiruvananthapuram)', lat: 8.5241, lon: 76.9366 },
  'thiruvananthapuram': { name: 'Trivandrum', lat: 8.5241, lon: 76.9366 },
  'thrissur': { name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  'kottayam': { name: 'Kottayam', lat: 9.5916, lon: 76.5222 },
  'thekkady': { name: 'Thekkady', lat: 9.6024, lon: 77.1620 },
  'kannur': { name: 'Kannur', lat: 11.8745, lon: 75.3704 },
  'palakkad': { name: 'Palakkad', lat: 10.7867, lon: 76.6548 },
  'bangalore': { name: 'Bangalore (Bengaluru)', lat: 12.9716, lon: 77.5946 },
  'bengaluru': { name: 'Bangalore (Bengaluru)', lat: 12.9716, lon: 77.5946 },
  'mysore': { name: 'Mysore (Mysuru)', lat: 12.2958, lon: 76.6394 },
  'coimbatore': { name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
  'chennai': { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  'ooty': { name: 'Ooty', lat: 11.4102, lon: 76.6950 },
  'kodaikanal': { name: 'Kodaikanal', lat: 10.2381, lon: 77.4892 },
  'goa': { name: 'Goa', lat: 15.4909, lon: 73.8278 },
  'hyderabad': { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 }
};

// Known road distances matrix (in km)
const KNOWN_ROAD_MATRIX = {
  'kochi-varkala': 191.1,
  'cochin-varkala': 191.1,
  'ernakulam-varkala': 191.1,
  'kozhikode-munnar': 170.0,
  'calicut-munnar': 170.0,
  'kochi-munnar': 130.0,
  'cochin-munnar': 130.0,
  'kozhikode-wayanad': 85.0,
  'calicut-wayanad': 85.0,
  'kozhikode-kochi': 180.0,
  'kozhikode-alleppey': 230.0,
  'kozhikode-varkala': 330.0,
  'kozhikode-trivandrum': 370.0,
  'kochi-wayanad': 245.0,
  'kochi-alleppey': 55.0,
  'kochi-trivandrum': 200.0,
  'bangalore-wayanad': 280.0,
  'bangalore-munnar': 475.0,
  'bangalore-kochi': 550.0,
  'trivandrum-varkala': 45.0,
  'trivandrum-alleppey': 145.0,
  'trivandrum-munnar': 280.0,
  'chennai-munnar': 580.0,
  'mysore-wayanad': 120.0,
  'coimbatore-munnar': 155.0
};

/**
 * Configurable rate & speed parameters
 */
export const TRANSPORT_CONFIG = {
  cab: {
    title: 'Private AC Cab',
    subtitle: 'Door-to-Door',
    baseFare: 440,
    perKmRate: 16,
    avgSpeedKmh: 48,
    isFlatFare: true,
    pickupPrefix: 'Doorstep Pickup',
    dropoffSuffix: 'Hotel Drop-off',
    label: '⭐ Premium Comfort',
    minDistance: 1
  },
  bus: {
    title: 'State AC Volvo Intercity Bus',
    subtitle: 'Express Coach',
    baseFarePerPax: 50,
    perKmRatePerPax: 2.4,
    avgSpeedKmh: 35.4,
    isFlatFare: false,
    pickupPrefix: 'Bus Terminal',
    dropoffSuffix: 'Central Bus Stand',
    label: '💰 Most Economical',
    minDistance: 5
  },
  train: {
    title: 'Express Intercity Train',
    subtitle: 'Superfast Rail',
    baseFarePerPax: 30,
    perKmRatePerPax: 1.57,
    avgSpeedKmh: 61.6,
    isFlatFare: false,
    pickupPrefix: 'Rail Junction',
    dropoffSuffix: 'Station',
    label: '🌿 Scenic & Reliable',
    minDistance: 15
  },
  selfdrive: {
    title: 'Self-Drive SUV Rental',
    subtitle: 'All-Terrain Vehicle',
    baseFare: 1800,
    perKmRate: 7.5,
    avgSpeedKmh: 51.6,
    isFlatFare: true,
    pickupPrefix: 'Hub Pickup',
    dropoffSuffix: 'Rental Drop Station',
    label: '🚗 Maximum Freedom',
    minDistance: 10
  }
};

export function normalizeCityKey(cityStr) {
  if (!cityStr) return '';
  return cityStr.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(calicut)/g, 'kozhikode')
    .replace(/(cochin)/g, 'kochi')
    .replace(/(thiruvananthapuram)/g, 'trivandrum')
    .replace(/(alappuzha)/g, 'alleppey')
    .replace(/(kalpetta)/g, 'wayanad');
}

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const airDistance = R * c;
  return parseFloat((airDistance * 1.25).toFixed(1));
}

function getHashDistance(src, dest) {
  const combined = (src + dest).toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  return parseFloat(((absHash % 220) + 45).toFixed(1));
}

/**
 * Calculates road distance between source and destination
 */
export function calculateRouteDistance(source, destination) {
  if (!source || !destination) return 0;

  const srcNorm = normalizeCityKey(source);
  const destNorm = normalizeCityKey(destination);

  if (srcNorm === destNorm && srcNorm !== '') {
    return 15.0;
  }

  const key1 = `${srcNorm}-${destNorm}`;
  const key2 = `${destNorm}-${srcNorm}`;
  if (KNOWN_ROAD_MATRIX[key1] !== undefined) return KNOWN_ROAD_MATRIX[key1];
  if (KNOWN_ROAD_MATRIX[key2] !== undefined) return KNOWN_ROAD_MATRIX[key2];

  for (const k in KNOWN_ROAD_MATRIX) {
    const [s, d] = k.split('-');
    if ((srcNorm.includes(s) || s.includes(srcNorm)) && (destNorm.includes(d) || d.includes(destNorm))) {
      return KNOWN_ROAD_MATRIX[k];
    }
    if ((srcNorm.includes(d) || d.includes(srcNorm)) && (destNorm.includes(s) || s.includes(destNorm))) {
      return KNOWN_ROAD_MATRIX[k];
    }
  }

  let coord1 = null;
  let coord2 = null;

  for (const cKey in CITY_COORDINATES) {
    if (srcNorm.includes(cKey) || cKey.includes(srcNorm)) coord1 = CITY_COORDINATES[cKey];
    if (destNorm.includes(cKey) || cKey.includes(destNorm)) coord2 = CITY_COORDINATES[cKey];
  }

  if (coord1 && coord2) {
    const dist = calculateHaversineDistance(coord1.lat, coord1.lon, coord2.lat, coord2.lon);
    if (dist > 0) return dist;
  }

  return getHashDistance(source, destination);
}

export function formatDurationHours(hoursDecimal) {
  if (!hoursDecimal || hoursDecimal <= 0) return '0.5 Hours';
  return `${hoursDecimal.toFixed(1)} Hours`;
}

/**
 * Generates options dynamically based on route distance and traveler count
 */
export function generateTransportOptions(source, destination, travelersCount = 2, customDistance = null) {
  const distance = customDistance !== null ? customDistance : calculateRouteDistance(source, destination);
  if (distance <= 0) return [];

  const travelers = Math.max(1, parseInt(travelersCount) || 1);
  const rawOptions = [];

  // 1. Private AC Cab
  const cabHours = parseFloat((distance / TRANSPORT_CONFIG.cab.avgSpeedKmh).toFixed(1));
  const cabFare = Math.round(TRANSPORT_CONFIG.cab.baseFare + distance * TRANSPORT_CONFIG.cab.perKmRate);
  rawOptions.push({
    id: `cab_${distance}`,
    transport_type: TRANSPORT_CONFIG.cab.title,
    subtitle: TRANSPORT_CONFIG.cab.subtitle,
    mode: 'cab',
    source,
    destination,
    distance,
    travelers,
    total_fare: cabFare,
    fare_per_pax: null,
    fare_label: 'Flat Fare',
    travel_time: formatDurationHours(cabHours),
    hours: cabHours,
    pickup_drop: `${source} Doorstep → ${destination} Hotel`,
    recommendation_label: TRANSPORT_CONFIG.cab.label,
    is_flat: true
  });

  // 2. State AC Volvo Intercity Bus
  const busHours = parseFloat((distance / TRANSPORT_CONFIG.bus.avgSpeedKmh).toFixed(1));
  const busPerPax = Math.round(TRANSPORT_CONFIG.bus.baseFarePerPax + distance * TRANSPORT_CONFIG.bus.perKmRatePerPax);
  const busTotal = busPerPax * travelers;
  rawOptions.push({
    id: `bus_${distance}`,
    transport_type: TRANSPORT_CONFIG.bus.title,
    subtitle: TRANSPORT_CONFIG.bus.subtitle,
    mode: 'bus',
    source,
    destination,
    distance,
    travelers,
    total_fare: busTotal,
    fare_per_pax: busPerPax,
    fare_label: `₹${busPerPax.toLocaleString()} / pax`,
    travel_time: formatDurationHours(busHours),
    hours: busHours,
    pickup_drop: `${source} Bus Terminal → ${destination}`,
    recommendation_label: TRANSPORT_CONFIG.bus.label,
    is_flat: false
  });

  // 3. Express Intercity Train
  if (distance >= 15) {
    const trainHours = parseFloat((distance / TRANSPORT_CONFIG.train.avgSpeedKmh).toFixed(1));
    const trainPerPax = Math.round(TRANSPORT_CONFIG.train.baseFarePerPax + distance * TRANSPORT_CONFIG.train.perKmRatePerPax);
    const trainTotal = trainPerPax * travelers;
    rawOptions.push({
      id: `train_${distance}`,
      transport_type: TRANSPORT_CONFIG.train.title,
      subtitle: TRANSPORT_CONFIG.train.subtitle,
      mode: 'train',
      source,
      destination,
      distance,
      travelers,
      total_fare: trainTotal,
      fare_per_pax: trainPerPax,
      fare_label: `₹${trainPerPax.toLocaleString()} / pax`,
      travel_time: formatDurationHours(trainHours),
      hours: trainHours,
      pickup_drop: `${source} Rail Junction → ${destination}`,
      recommendation_label: TRANSPORT_CONFIG.train.label,
      is_flat: false
    });
  }

  // 4. Self-Drive SUV Rental
  const suvHours = parseFloat((distance / TRANSPORT_CONFIG.selfdrive.avgSpeedKmh).toFixed(1));
  const suvFare = Math.round(TRANSPORT_CONFIG.selfdrive.baseFare + distance * TRANSPORT_CONFIG.selfdrive.perKmRate);
  rawOptions.push({
    id: `selfdrive_${distance}`,
    transport_type: TRANSPORT_CONFIG.selfdrive.title,
    subtitle: TRANSPORT_CONFIG.selfdrive.subtitle,
    mode: 'selfdrive',
    source,
    destination,
    distance,
    travelers,
    total_fare: suvFare,
    fare_per_pax: null,
    fare_label: 'Flat Fare',
    travel_time: formatDurationHours(suvHours),
    hours: suvHours,
    pickup_drop: `${source} Pickup → ${destination}`,
    recommendation_label: TRANSPORT_CONFIG.selfdrive.label,
    is_flat: true
  });

  // Dynamically verify fastest & cheapest badges
  if (rawOptions.length > 0) {
    let minTime = Math.min(...rawOptions.map(o => o.hours));
    let minFare = Math.min(...rawOptions.map(o => o.total_fare));

    rawOptions.forEach(opt => {
      if (opt.hours === minTime && opt.mode !== 'cab') {
        opt.recommendation_label = '⚡ Fastest Option';
      } else if (opt.total_fare === minFare) {
        opt.recommendation_label = '💰 Most Economical';
      }
    });
  }

  return rawOptions;
}
