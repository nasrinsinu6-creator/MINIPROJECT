"""
@file route_service.py
@description Geocoding & Routing service using OpenStreetMap Nominatim and OSRM/OpenRouteService.
"""

import json
import math
import urllib.request
import urllib.parse

# Known fallback database of cities & places with coordinates
KNOWN_PLACES = {
    "kochi": {"name": "Kochi", "label": "Kochi, Ernakulam, Kerala, India", "latitude": 9.9312, "longitude": 76.2673},
    "cochin": {"name": "Kochi", "label": "Kochi, Ernakulam, Kerala, India", "latitude": 9.9312, "longitude": 76.2673},
    "varkala": {"name": "Varkala", "label": "Varkala, Thiruvananthapuram, Kerala, India", "latitude": 8.7379, "longitude": 76.7163},
    "munnar": {"name": "Munnar", "label": "Munnar, Idukki, Kerala, India", "latitude": 10.0889, "longitude": 77.0595},
    "kozhikode": {"name": "Kozhikode", "label": "Kozhikode (Calicut), Kerala, India", "latitude": 11.2588, "longitude": 75.7804},
    "calicut": {"name": "Kozhikode", "label": "Kozhikode (Calicut), Kerala, India", "latitude": 11.2588, "longitude": 75.7804},
    "wayanad": {"name": "Wayanad", "label": "Wayanad (Kalpetta), Kerala, India", "latitude": 11.6103, "longitude": 76.0827},
    "alleppey": {"name": "Alleppey", "label": "Alleppey (Alappuzha), Kerala, India", "latitude": 9.4981, "longitude": 76.3388},
    "alappuzha": {"name": "Alleppey", "label": "Alleppey (Alappuzha), Kerala, India", "latitude": 9.4981, "longitude": 76.3388},
    "trivandrum": {"name": "Trivandrum", "label": "Thiruvananthapuram, Kerala, India", "latitude": 8.5241, "longitude": 76.9366},
    "bangalore": {"name": "Bangalore", "label": "Bengaluru, Karnataka, India", "latitude": 12.9716, "longitude": 77.5946},
    "mysore": {"name": "Mysore", "label": "Mysuru, Karnataka, India", "latitude": 12.2958, "longitude": 76.6394},
    "coimbatore": {"name": "Coimbatore", "label": "Coimbatore, Tamil Nadu, India", "latitude": 11.0168, "longitude": 76.9558},
    "chennai": {"name": "Chennai", "label": "Chennai, Tamil Nadu, India", "latitude": 13.0827, "longitude": 80.2707},
    "goa": {"name": "Goa", "label": "Goa, India", "latitude": 15.4909, "longitude": 73.8278}
}

def geocode_location(query):
    """
    Geocodes a location query using OpenStreetMap Nominatim with offline fallback.
    """
    if not query:
        return []

    q_clean = query.strip().lower()

    # Check online OpenStreetMap Nominatim
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query)}&limit=5"
        req = urllib.request.Request(url, headers={'User-Agent': 'AITravelPlanner/1.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data:
                results = []
                for item in data:
                    results.append({
                        "name": item.get("display_name", "").split(",")[0],
                        "label": item.get("display_name", ""),
                        "latitude": float(item.get("lat")),
                        "longitude": float(item.get("lon"))
                    })
                return results
    except Exception as e:
        print(f"Geocoding online lookup notice: {e}")

    # Fallback to local dictionary
    results = []
    for k, place in KNOWN_PLACES.items():
        if q_clean in k or k in q_clean or q_clean in place["name"].lower():
            results.append(place)

    if not results:
        # Generic fallback
        results.append({
            "name": query.title(),
            "label": f"{query.title()}, India",
            "latitude": 9.9312,
            "longitude": 76.2673
        })

    return results

def calculate_haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c * 1.25, 1)

def compute_route(origin_lat, origin_lon, dest_lat, dest_lon):
    """
    Computes road route distance, duration, and geometry polyline coordinates using OSRM.
    """
    # 1. Try OSRM routing API
    try:
        url = f"https://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson"
        req = urllib.request.Request(url, headers={'User-Agent': 'AITravelPlanner/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            if data.get("routes") and len(data["routes"]) > 0:
                route = data["routes"][0]
                distance_km = round(route.get("distance", 0) / 1000.0, 1)
                duration_minutes = round(route.get("duration", 0) / 60.0)
                coords = route.get("geometry", {}).get("coordinates", [])
                # OSRM returns [lon, lat], convert to Leaflet [lat, lon]
                leaflet_coords = [[c[1], c[0]] for c in coords]
                return {
                    "distance_km": distance_km,
                    "duration_minutes": duration_minutes,
                    "geometry": leaflet_coords
                }
    except Exception as e:
        print(f"OSRM routing notice: {e}")

    # Fallback route computation
    dist_km = calculate_haversine(origin_lat, origin_lon, dest_lat, dest_lon)
    duration_mins = round((dist_km / 50.0) * 60)

    # Generate smooth 10-point interpolation line for map display
    interpolated = []
    steps = 10
    for i in range(steps + 1):
        ratio = i / steps
        lat = origin_lat + (dest_lat - origin_lat) * ratio
        lon = origin_lon + (dest_lon - origin_lon) * ratio
        interpolated.append([lat, lon])

    return {
        "distance_km": dist_km,
        "duration_minutes": duration_mins,
        "geometry": interpolated
    }
