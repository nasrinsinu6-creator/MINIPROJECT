import math
import pandas as pd
from backend.utils.csv_manager import load_csv, find_by_id

# Geographic coordinates dictionary for distance calculations
CITY_COORDINATES = {
    'kozhikode': (11.2588, 75.7804),
    'calicut': (11.2588, 75.7804),
    'munnar': (10.0889, 77.0595),
    'kochi': (9.9312, 76.2673),
    'ernakulam': (9.9816, 76.2999),
    'wayanad': (11.6103, 76.0827),
    'kalpetta': (11.6103, 76.0827),
    'alleppey': (9.4981, 76.3388),
    'alappuzha': (9.4981, 76.3388),
    'varkala': (8.7379, 76.7163),
    'trivandrum': (8.5241, 76.9366),
    'thiruvananthapuram': (8.5241, 76.9366),
    'bangalore': (12.9716, 77.5946),
    'bengaluru': (12.9716, 77.5946),
    'mysore': (12.2958, 76.6394),
    'coimbatore': (11.0168, 76.9558),
    'chennai': (13.0827, 80.2707)
}

# Pre-defined known actual road matrix (in km)
KNOWN_MATRIX = {
    ('kozhikode', 'munnar'): 170,
    ('calicut', 'munnar'): 170,
    ('kozhikode', 'wayanad'): 85,
    ('calicut', 'wayanad'): 85,
    ('kozhikode', 'kochi'): 180,
    ('kozhikode', 'alleppey'): 230,
    ('kozhikode', 'varkala'): 330,
    ('kozhikode', 'trivandrum'): 370,
    ('kochi', 'munnar'): 130,
    ('kochi', 'wayanad'): 245,
    ('kochi', 'alleppey'): 55,
    ('kochi', 'varkala'): 160,
    ('kochi', 'trivandrum'): 200,
    ('bangalore', 'wayanad'): 280,
    ('bangalore', 'munnar'): 475,
    ('trivandrum', 'varkala'): 45,
    ('trivandrum', 'alleppey'): 145,
    ('trivandrum', 'munnar'): 280
}

def calculate_distance(source, destination):
    """
    Calculates estimated road distance between source and destination.
    """
    if not source or not destination:
        return 120

    s_clean = str(source).lower().strip()
    d_clean = str(destination).lower().strip()

    if s_clean == d_clean:
        return 15

    # 1. Check known matrix
    for (s, d), dist in KNOWN_MATRIX.items():
        if (s in s_clean and d in d_clean) or (d in s_clean and s in d_clean):
            return dist

    # 2. Check Haversine distance formula
    c1, c2 = None, None
    for k, v in CITY_COORDINATES.items():
        if k in s_clean:
            c1 = v
        if k in d_clean:
            c2 = v

    if c1 and c2:
        dlat = math.radians(c2[0] - c1[0])
        dlon = math.radians(c2[1] - c1[1])
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(c1[0])) * math.cos(math.radians(c2[0])) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(6371 * c * 1.25)

    # 3. Deterministic hash calculation for custom place inputs
    combined = (s_clean + d_clean)
    val = sum(ord(ch) for ch in combined)
    return (val % 285) + 35

def get_dynamic_transport_options(source="Kozhikode", destination="Munnar", destination_id=None):
    """
    Generates dynamic route-based transportation options with custom fare and travel time.
    """
    if destination_id and not destination:
        dest_record = find_by_id("destinations", destination_id)
        if dest_record:
            destination = dest_record.get("name", "Munnar")

    dist = calculate_distance(source, destination)

    options = [
        {
            "id": 1,
            "destination_id": destination_id or 1,
            "transport_type": "KSRTC Bus",
            "source": source,
            "destination": destination,
            "distance": dist,
            "fare": round(20 + dist * 1.5),
            "travel_time": f"{round(dist / 40.0, 1)} Hours",
            "availability": "available"
        },
        {
            "id": 2,
            "destination_id": destination_id or 1,
            "transport_type": "Private AC Cab",
            "source": source,
            "destination": destination,
            "distance": dist,
            "fare": round(300 + dist * 18),
            "travel_time": f"{round(dist / 55.0, 1)} Hours",
            "availability": "available"
        },
        {
            "id": 3,
            "destination_id": destination_id or 1,
            "transport_type": "Rental Bike (Royal Enfield)",
            "source": source,
            "destination": destination,
            "distance": dist,
            "fare": 800,  # Per Day
            "travel_time": f"{round(dist / 45.0, 1)} Hours",
            "availability": "available"
        }
    ]

    if dist >= 25:
        options.append({
            "id": 4,
            "destination_id": destination_id or 1,
            "transport_type": "Express Train",
            "source": source,
            "destination": destination,
            "distance": dist,
            "fare": round(50 + dist * 0.8),
            "travel_time": f"{round(dist / 65.0, 1)} Hours",
            "availability": "available"
        })

    return options

def get_transport_recommendations(destination_id, source="Kozhikode"):
    """
    Returns available dynamic transportation options for a given destination and source.
    """
    dest_record = find_by_id("destinations", destination_id)
    dest_name = dest_record.get("name", "Munnar") if dest_record else "Destination"
    return get_dynamic_transport_options(source=source, destination=dest_name, destination_id=destination_id)
