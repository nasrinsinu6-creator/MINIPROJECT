import pandas as pd
from backend.utils.csv_manager import load_csv, filter_rows, clean_records

def get_region_cluster(dest_name, dest_city, dest_state):
    """Helper to group Kerala destinations into geographic region clusters for route optimization."""
    name_str = f"{dest_name} {dest_city}".lower()
    
    north_keywords = ["kasaragod", "kannur", "wayanad", "kozhikode", "malappuram", "bekal", "ranipuram", 
                      "nileshwaram", "kappad", "beypore", "thusharagiri", "paithalmala", "muzhappilangad", 
                      "thalassery", "nilambur", "kottakkal", "kodikuthimala", "tanur", "kalpetta"]
    
    central_highland_keywords = ["palakkad", "thrissur", "ernakulam", "kochi", "idukki", "munnar", "thekkady", 
                                 "vagamon", "marayoor", "kanthalloor", "peermade", "ramakkalmedu", "athirappilly", 
                                 "guruvayur", "chavakkad", "nelliyampathy", "silent valley", "parambikulam", 
                                 "attappady", "kumily"]
    
    central_south_keywords = ["kottayam", "alappuzha", "alleppey", "kumarakom", "vaikom", "pathanamthitta", 
                              "gavi", "konni", "cherthala", "mararikulam"]
    
    south_keywords = ["kollam", "thiruvananthapuram", "varkala", "kovalam", "poovar", "ponmudi", 
                      "munroe island", "thenmala", "trivandrum"]

    for kw in north_keywords:
        if kw in name_str:
            return "NORTH"
    for kw in central_highland_keywords:
        if kw in name_str:
            return "CENTRAL_HIGHLAND"
    for kw in central_south_keywords:
        if kw in name_str:
            return "CENTRAL_SOUTH"
    for kw in south_keywords:
        if kw in name_str:
            return "SOUTH"

    return "CENTRAL_HIGHLAND"

def get_recommended_days_for_category(category, remaining_days, total_duration):
    """Determines recommended allocated days for a destination based on category and remaining trip days."""
    cat = str(category).lower()
    if remaining_days <= 1:
        return 1

    if cat in ["hill station", "nature", "heritage"]:
        if total_duration >= 6 and remaining_days >= 3:
            return 3
        return min(2, remaining_days)
    elif cat in ["backwaters", "beach", "wildlife", "eco tourism", "waterfall", "adventure"]:
        return min(2, remaining_days)
    else: # city tourism, pilgrimage, wellness, etc.
        return min(2, remaining_days)

def recommend_destinations(user_preferences):
    """
    Recommends a multi-destination itinerary when user budget and duration allow,
    or a single destination if budget/days are limited.
    Strictly satisfies:
      1. Combined estimated cost <= user budget
      2. Combined allocated days <= user duration
      3. Dynamic number of destinations (1, 2, 3, 4+)
      4. Geographic route feasibility and interest match
      5. No duplicate destinations
    """
    dest_df = load_csv("destinations")
    hotels_df = load_csv("hotels")
    rest_df = load_csv("restaurants")
    attract_df = load_csv("attractions")
    trans_df = load_csv("transportation")
    
    if dest_df.empty:
        return []
        
    source = user_preferences.get("source_location", "")
    pref_type_val = user_preferences.get("destination_type", "")
    if isinstance(pref_type_val, list):
        pref_types = [str(x).lower().strip() for x in pref_type_val if str(x).strip()]
    elif isinstance(pref_type_val, str) and "," in pref_type_val:
        pref_types = [x.lower().strip() for x in pref_type_val.split(",") if x.strip()]
    elif pref_type_val:
        pref_types = [str(pref_type_val).lower().strip()]
    else:
        pref_types = []

    budget = float(user_preferences.get("budget", 0))
    travelers = int(user_preferences.get("travelers", 1))
    duration = int(user_preferences.get("duration_days", 3))
    interests = [i.lower() for i in user_preferences.get("interests", [])]
    group_type = user_preferences.get("group_type", "family").lower()
    if group_type == "solo":
        travelers = 1
    pref_state = user_preferences.get("state", "")
    pref_target = user_preferences.get("target_destination") or user_preferences.get("destination_name")
    
    # 1. First, score all candidate destinations individually
    candidate_scored = []
    
    for _, dest in dest_df.iterrows():
        dest_id = int(dest["id"])
        dest_name = dest["name"]
        dest_category = str(dest["category"]).lower()
        dest_state = str(dest["state"]).lower()
        
        # Optional target destination filter (if specific target given and not 'all')
        is_target_match = False
        if pref_target and str(pref_target).lower() not in ["all", ""]:
            if str(pref_target).lower() in dest_name.lower():
                is_target_match = True
            elif not pref_target:
                pass

        # Optional state filter
        if pref_state and pref_state.lower() not in dest_state:
            continue
            
        score = 0
        reasons = []
        
        if is_target_match:
            score += 50
            reasons.append(f"Matches your specified destination target: {dest_name}.")
        
        # Category Match (30 pts max)
        if not pref_types or dest_category in pref_types:
            score += 30
            reasons.append(f"Matches preferred category: {dest['category']}.")
        elif "honeymoon" in pref_types and dest_category in ["beach", "hill station"]:
            score += 25
            reasons.append("Romantic escape for couples.")
        elif "family trip" in pref_types and dest_category in ["heritage", "pilgrimage", "city tourism"]:
            score += 25
            reasons.append("Great for family sightseeing.")
        elif "adventure" in pref_types and dest_category in ["adventure", "hill station", "nature"]:
            score += 20
            reasons.append("Offers exciting outdoor experiences.")
            
        # Interests Match (20 pts max)
        desc_lower = str(dest["description"]).lower()
        interest_hits = 0
        for interest in interests:
            if interest == "nature" and dest_category in ["nature", "hill station", "beach"]:
                interest_hits += 1
            elif interest == "history" and dest_category == "heritage":
                interest_hits += 1
            elif interest == "culture" and (dest_category in ["heritage", "pilgrimage"] or "culture" in desc_lower):
                interest_hits += 1
            elif interest == "relaxation" and dest_category in ["beach", "hill station", "nature"]:
                interest_hits += 1
            elif interest == "adventure" and (dest_category == "adventure" or "trek" in desc_lower or "safari" in desc_lower):
                interest_hits += 1
            elif interest == "food" and "food" in desc_lower:
                interest_hits += 1
            elif interest == "shopping" and "market" in desc_lower:
                interest_hits += 1
                
        if len(interests) > 0:
            interest_score = min(20, (interest_hits / len(interests)) * 20)
            score += interest_score
            if interest_hits > 0:
                reasons.append(f"Matches interests in {', '.join(interests[:3])}.")
                
        # Group Type Match (10 pts max)
        if group_type == "solo" and dest_category in ["adventure", "nature"]:
            score += 10
            reasons.append("Highly rated for solo explorers.")
        elif group_type == "honeymoon" and dest_category in ["beach", "hill station"]:
            score += 10
            reasons.append("Popular romantic destination.")
        elif group_type == "family" and dest_category in ["heritage", "pilgrimage", "city tourism"]:
            score += 10
            reasons.append("Family-friendly attractions.")
        else:
            score += 5
            
        region = get_region_cluster(dest_name, str(dest.get("city", "")), dest_state)
        
        candidate_scored.append({
            "dest_record": dest,
            "dest_id": dest_id,
            "name": dest_name,
            "category": dest_category,
            "state": dest["state"],
            "city": dest["city"],
            "local_cities": dest.get("local_cities", ""),
            "description": dest["description"],
            "image_url": dest.get("image_url", ""),
            "best_time": dest["best_time"],
            "base_score": score,
            "reasons": reasons,
            "region": region,
            "is_target_match": is_target_match
        })

    if not candidate_scored:
        return []

    # Function to estimate cost for a specific candidate & allocated days
    def estimate_destination_cost(dest_info, allocated_days):
        d_id = dest_info["dest_id"]
        dest_hotels = hotels_df[(hotels_df["destination_id"] == d_id) & (hotels_df["available_rooms"] > 0)]
        dest_restaurants = rest_df[rest_df["destination_id"] == d_id]
        dest_trans = trans_df[(trans_df["destination_id"] == d_id)]

        avg_meal_price = float(dest_restaurants["avg_cost"].mean()) if not dest_restaurants.empty else 300.0
        avg_trans_fare = float(dest_trans["fare"].mean()) if not dest_trans.empty else 500.0

        rooms_needed = max(1, -(-travelers // 2))
        nights = max(1, allocated_days - 1) if allocated_days > 1 else 1

        est_food = avg_meal_price * travelers * allocated_days * 2.5
        est_local_trans = avg_trans_fare * allocated_days * (1 if travelers <= 4 else 2)
        est_sightseeing = 200.0 * travelers * allocated_days

        if not dest_hotels.empty:
            avg_hotel_price = float(dest_hotels["price_per_night"].mean())
            if budget > 0:
                base_other = est_food + est_local_trans + est_sightseeing
                max_room_b = (budget - base_other) / (rooms_needed * nights) if (budget > base_other) else 0
                affordable = dest_hotels[dest_hotels["price_per_night"] <= max_room_b]
                if not affordable.empty:
                    best = affordable.sort_values(by=["rating", "price_per_night"], ascending=[False, True]).iloc[0]
                    sel_hotel_price = float(best["price_per_night"])
                    hotels_list = affordable.sort_values(by=["rating", "price_per_night"], ascending=[False, True]).head(10).to_dict(orient="records")
                else:
                    cheapest = dest_hotels.sort_values(by="price_per_night", ascending=True).iloc[0]
                    sel_hotel_price = float(cheapest["price_per_night"])
                    hotels_list = dest_hotels.sort_values(by="price_per_night", ascending=True).head(10).to_dict(orient="records")
            else:
                sel_hotel_price = avg_hotel_price
                hotels_list = dest_hotels.sort_values(by="rating", ascending=False).head(10).to_dict(orient="records")
        else:
            sel_hotel_price = 1500.0
            hotels_list = []

        est_accommodation = sel_hotel_price * rooms_needed * nights
        subtotal = est_accommodation + est_food + est_local_trans + est_sightseeing
        est_misc = subtotal * 0.08
        total_est_cost = subtotal + est_misc

        rest_list = dest_restaurants.sort_values(by="rating", ascending=False).head(15).to_dict(orient="records")
        attract_list = attract_df[attract_df["destination_id"] == d_id].head(6).to_dict(orient="records")
        transit_list = dest_trans.head(3).to_dict(orient="records")

        return {
            "est_accommodation": round(est_accommodation, 2),
            "est_food": round(est_food, 2),
            "est_local_trans": round(est_local_trans, 2),
            "est_sightseeing": round(est_sightseeing, 2),
            "est_misc": round(est_misc, 2),
            "total_est_cost": round(total_est_cost, 2),
            "hotels_list": hotels_list,
            "rest_list": rest_list,
            "attract_list": attract_list,
            "transit_list": transit_list
        }

    # 2. Multi-Destination Selection Algorithm
    remaining_budget = budget
    remaining_days = duration
    selected_itinerary = []
    used_ids = set()
    current_day = 1

    # Sort candidates by target match first, then base_score descending
    candidate_scored = sorted(candidate_scored, key=lambda x: (x["is_target_match"], x["base_score"]), reverse=True)

    while remaining_days > 0 and (budget <= 0 or remaining_budget > 0):
        best_candidate = None
        best_cand_days = 0
        best_cand_cost_details = None
        best_effective_score = -1

        for cand in candidate_scored:
            if cand["dest_id"] in used_ids:
                continue

            # Determine proposed days for this destination
            alloc_days = get_recommended_days_for_category(cand["category"], remaining_days, duration)
            if alloc_days <= 0:
                continue

            cost_details = estimate_destination_cost(cand, alloc_days)
            est_cost = cost_details["total_est_cost"]

            # Strict budget constraint check
            if budget > 0 and est_cost > remaining_budget:
                continue

            # Calculate score bonus for geographic route continuity
            eff_score = cand["base_score"]
            if selected_itinerary:
                last_region = selected_itinerary[-1]["region"]
                if cand["region"] == last_region:
                    eff_score += 20 # High continuity bonus for same region
                elif (last_region == "CENTRAL_HIGHLAND" and cand["region"] == "CENTRAL_SOUTH") or \
                     (last_region == "CENTRAL_SOUTH" and cand["region"] == "SOUTH") or \
                     (last_region == "NORTH" and cand["region"] == "CENTRAL_HIGHLAND"):
                    eff_score += 12 # Good bonus for adjacent region
            elif cand["is_target_match"]:
                eff_score += 30

            if eff_score > best_effective_score:
                best_effective_score = eff_score
                best_candidate = cand
                best_cand_days = alloc_days
                best_cand_cost_details = cost_details

        # If no candidate fits within remaining budget and days, stop selection
        if not best_candidate:
            break

        # Select best candidate and record details
        start_d = current_day
        end_d = current_day + best_cand_days - 1
        day_str = f"Day {start_d}–{end_d}" if start_d != end_d else f"Day {start_d}"

        # Budget fit reason update
        reasons = list(best_candidate["reasons"])
        reasons.append(f"Allocated {best_cand_days} day{'s' if best_cand_days > 1 else ''} ({day_str}) fitting your budget.")

        selected_item = {
            "destination_id": best_candidate["dest_id"],
            "name": best_candidate["name"],
            "state": best_candidate["state"],
            "city": best_candidate["city"],
            "local_cities": best_candidate["local_cities"],
            "category": best_candidate["category"],
            "description": best_candidate["description"],
            "image_url": best_candidate["image_url"],
            "best_time": best_candidate["best_time"],
            "matching_score": max(0, min(100, int((best_effective_score / 120) * 100))),
            "reasons": reasons,
            "region": best_candidate["region"],
            "allocated_days": best_cand_days,
            "start_day": start_d,
            "end_day": end_d,
            "day_range": day_str,
            "estimated_cost": {
                "accommodation": best_cand_cost_details["est_accommodation"],
                "food": best_cand_cost_details["est_food"],
                "local_transport": best_cand_cost_details["est_local_trans"],
                "sightseeing": best_cand_cost_details["est_sightseeing"],
                "miscellaneous": best_cand_cost_details["est_misc"],
                "total": best_cand_cost_details["total_est_cost"]
            },
            "hotels": best_cand_cost_details["hotels_list"],
            "restaurants": best_cand_cost_details["rest_list"],
            "attractions": best_cand_cost_details["attract_list"],
            "transportation": best_cand_cost_details["transit_list"]
        }

        selected_itinerary.append(selected_item)
        used_ids.add(best_candidate["dest_id"])
        
        current_day += best_cand_days
        remaining_days -= best_cand_days
        if budget > 0:
            remaining_budget -= best_cand_cost_details["total_est_cost"]

    # If no destination could be selected (budget too low), return []
    if not selected_itinerary:
        return []

    return clean_records(selected_itinerary)

