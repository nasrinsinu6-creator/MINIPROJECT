import pandas as pd
from backend.utils.csv_manager import load_csv, find_by_id

def generate_multi_destination_itinerary(destinations_list, interests=None):
    """
    Generates a structured multi-destination day-wise itinerary across multiple stops.
    destinations_list: list of dicts/records representing stops in order.
    """
    interests = [i.lower() for i in (interests or [])]
    itinerary = []
    
    current_day = 1
    total_stops = len(destinations_list)

    for dest_idx, dest_info in enumerate(destinations_list):
        dest_name = dest_info.get("name", "Destination")
        alloc_days = int(dest_info.get("allocated_days") or dest_info.get("duration_days") or 1)
        
        attracts = dest_info.get("attractions") or []
        hotels = dest_info.get("hotels") or []
        rests = dest_info.get("restaurants") or []
        
        hotel_name = hotels[0]["name"] if (hotels and isinstance(hotels, list)) else "your hotel"
        
        att_idx = 0
        num_att = len(attracts)
        
        for stop_day in range(1, alloc_days + 1):
            day_num = current_day
            
            lunch_place = rests[stop_day % len(rests)]["name"] if rests else "a local restaurant"
            dinner_place = rests[(stop_day + 1) % len(rests)]["name"] if rests else "a recommended diner"
            
            day_schedule = {
                "day": day_num,
                "destination_name": dest_name,
                "morning": "",
                "lunch": f"Enjoy lunch at **{lunch_place}**.",
                "afternoon": "",
                "evening": "",
                "dinner": f"Dine at **{dinner_place}**."
            }
            
            if stop_day == 1:
                if dest_idx == 0:
                    day_schedule["morning"] = f"Arrive in **{dest_name}**, check-in to **{hotel_name}**, and refresh."
                else:
                    prev_name = destinations_list[dest_idx - 1].get("name", "previous stop")
                    day_schedule["morning"] = f"Travel from {prev_name} to **{dest_name}**, check-in at **{hotel_name}**, and settle in."
            else:
                if att_idx < num_att:
                    att = attracts[att_idx]
                    att_name = att.get("name", "Attraction") if isinstance(att, dict) else str(att)
                    att_desc = att.get("description", "") if isinstance(att, dict) else ""
                    day_schedule["morning"] = f"Start early and visit **{att_name}** - {att_desc}."
                    att_idx += 1
                else:
                    day_schedule["morning"] = f"Morning sightseeing walk around {dest_name}."

            if att_idx < num_att:
                att = attracts[att_idx]
                att_name = att.get("name", "Attraction") if isinstance(att, dict) else str(att)
                att_desc = att.get("description", "") if isinstance(att, dict) else ""
                day_schedule["afternoon"] = f"Visit **{att_name}** - {att_desc}."
                att_idx += 1
            else:
                day_schedule["afternoon"] = f"Explore key sights and photo viewpoints in {dest_name}."

            if "shopping" in interests:
                day_schedule["evening"] = f"Shop for souvenirs and local specialties in {dest_name} markets."
            elif "nature" in interests or "relaxation" in interests:
                day_schedule["evening"] = f"Sunset stroll and tea break around {dest_name} scenic spots."
            else:
                day_schedule["evening"] = f"Evening guided walk and cafe hop in {dest_name}."
                
            itinerary.append(day_schedule)
            current_day += 1

    return itinerary

def generate_itinerary(destination_id, duration_days, interests=None, hotel_id=None, restaurant_id=None):
    """
    Generates a structured day-wise itinerary based on destination attractions,
    restaurants, and user interests.
    """
    destination_id = int(destination_id)
    duration_days = max(1, int(duration_days))
    interests = [i.lower() for i in (interests or [])]
    
    # Load data
    dest = find_by_id("destinations", destination_id)
    attracts_df = load_csv("attractions")
    rests_df = load_csv("restaurants")
    hotels_df = load_csv("hotels")
    
    # Filter for destination
    dest_attracts = attracts_df[attracts_df["destination_id"] == destination_id].to_dict(orient="records")
    dest_rests = rests_df[rests_df["destination_id"] == destination_id].to_dict(orient="records")
    
    # Hotel details
    selected_hotel_name = "your hotel"
    if hotel_id:
        hotel = find_by_id("hotels", hotel_id)
        if hotel:
            selected_hotel_name = hotel["name"]
    else:
        dest_hotels = hotels_df[hotels_df["destination_id"] == destination_id]
        if not dest_hotels.empty:
            selected_hotel_name = dest_hotels.iloc[0]["name"]

    # Restaurant details
    selected_restaurant_name = None
    if restaurant_id:
        selected_rest = find_by_id("restaurants", restaurant_id)
        if selected_rest:
            selected_restaurant_name = selected_rest["name"]

    itinerary = []
    
    # Track which attractions have been scheduled to avoid duplicates
    attraction_idx = 0
    num_attractions = len(dest_attracts)
    
    # Prioritize attractions based on interests if possible
    if num_attractions > 1 and len(interests) > 0:
        def get_priority(att):
            desc = str(att["description"]).lower()
            name = str(att["name"]).lower()
            weight = 0
            for interest in interests:
                if interest in desc or interest in name:
                    weight += 1
            return weight
        dest_attracts = sorted(dest_attracts, key=get_priority, reverse=True)

    for day in range(1, duration_days + 1):
        day_schedule = {
            "day": day,
            "morning": "",
            "lunch": "",
            "afternoon": "",
            "evening": "",
            "dinner": ""
        }
        
        # Lunch and dinner options
        lunch_place = "a popular local eatery"
        dinner_place = "a highly recommended restaurant"
        if selected_restaurant_name:
            if day == 1:
                lunch_place = selected_restaurant_name
                other_rests = [r["name"] for r in dest_rests if r["name"] != selected_restaurant_name]
                dinner_place = other_rests[0] if other_rests else selected_restaurant_name
            elif day % 2 == 1:
                lunch_place = selected_restaurant_name
                dinner_place = dest_rests[day % len(dest_rests)]["name"] if dest_rests else selected_restaurant_name
            else:
                lunch_place = dest_rests[day % len(dest_rests)]["name"] if dest_rests else selected_restaurant_name
                dinner_place = selected_restaurant_name
        elif len(dest_rests) > 0:
            lunch_place = dest_rests[day % len(dest_rests)]["name"]
            dinner_place = dest_rests[(day + 1) % len(dest_rests)]["name"]

        # Day 1 special check-in
        if day == 1:
            day_schedule["morning"] = f"Arrive at {dest['name'] if dest else 'destination'}, check-in to {selected_hotel_name}, and refresh."
            day_schedule["lunch"] = f"Enjoy a welcoming lunch at **{lunch_place}** trying out local cuisines."
            
            if attraction_idx < num_attractions:
                att = dest_attracts[attraction_idx]
                day_schedule["afternoon"] = f"Visit **{att['name']}** - {att['description']}."
                attraction_idx += 1
            else:
                day_schedule["afternoon"] = "Explore the streets surrounding your hotel and take in the local environment."
                
            day_schedule["evening"] = "Take a peaceful evening walk around the town center, checking out nearby sights."
            day_schedule["dinner"] = f"Dine at **{dinner_place}** to wrap up your first day."
            
        else:
            # Morning activity
            if attraction_idx < num_attractions:
                att = dest_attracts[attraction_idx]
                day_schedule["morning"] = f"Start early and visit **{att['name']}** - {att['description']}."
                attraction_idx += 1
            else:
                day_schedule["morning"] = "Enjoy a hearty breakfast at your hotel followed by a morning walk."
                
            day_schedule["lunch"] = f"Head to **{lunch_place}** for a relaxing mid-day lunch."
            
            # Afternoon activity
            if attraction_idx < num_attractions:
                att = dest_attracts[attraction_idx]
                day_schedule["afternoon"] = f"Head towards **{att['name']}** - {att['description']}."
                attraction_idx += 1
            else:
                day_schedule["afternoon"] = "Enjoy a leisure afternoon photography session or visit local heritage sites."
                
            # Evening activity (Customized based on interest)
            if "shopping" in interests:
                day_schedule["evening"] = "Spend your evening shopping for unique souvenirs and handicrafts in the local market."
            elif "nature" in interests or "relaxation" in interests:
                day_schedule["evening"] = "Unwind at a scenic sunset point, enjoying tea and the tranquil evening breeze."
            elif "nightlife" in interests:
                day_schedule["evening"] = "Check out the popular local cafes, live music spots, or lounges in the town."
            else:
                day_schedule["evening"] = "Enjoy a guided walking tour of the local streets, clicking photos and tasting street food."
                
            day_schedule["dinner"] = f"Wrap up the day with a delicious dinner at **{dinner_place}**."

        itinerary.append(day_schedule)
        
    return itinerary

