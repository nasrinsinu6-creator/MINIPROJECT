import math
from backend.utils.csv_manager import find_by_id, load_csv

def estimate_trip_cost(destination_id, travelers, duration_days, hotel_id=None, transport_id=None, restaurant_id=None, budget_tier="standard", transport_mode=None):
    """
    Estimates the detailed cost of a trip to a given destination.
    Supports budget tiers (budget, standard, luxury), specific transport modes,
    and returns rich cost metrics including per-person, daily averages,
    percentage distributions, tier comparisons, and money-saving tips.
    """
    travelers = max(1, int(travelers))
    duration_days = max(1, int(duration_days))
    budget_tier = str(budget_tier or "standard").lower()

    # 1. ACCOMMODATION COST
    hotel_price = 1500.0  # default baseline
    hotel_name = "Recommended Hotel"
    hotels_df = load_csv("hotels")
    dest_hotels = hotels_df[hotels_df["destination_id"] == int(destination_id)] if not hotels_df.empty else None

    if hotel_id:
        hotel = find_by_id("hotels", hotel_id)
        if hotel:
            hotel_price = float(hotel.get("price_per_night", 1500.0))
            hotel_name = hotel.get("name", "Selected Hotel")
    elif dest_hotels is not None and not dest_hotels.empty:
        if budget_tier == "budget":
            cheapest = dest_hotels.sort_values(by="price_per_night", ascending=True).iloc[0]
            hotel_price = float(cheapest["price_per_night"])
            hotel_name = cheapest.get("name", "Budget Lodge / Homestay")
        elif budget_tier == "luxury":
            priciest = dest_hotels.sort_values(by="price_per_night", ascending=False).iloc[0]
            hotel_price = float(priciest["price_per_night"])
            hotel_name = priciest.get("name", "Luxury Resort & Spa")
        else:
            hotel_price = float(dest_hotels["price_per_night"].mean())
            hotel_name = "Comfort 3-Star Hotel (Average)"
    else:
        if budget_tier == "budget":
            hotel_price = 950.0
        elif budget_tier == "luxury":
            hotel_price = 4500.0
        else:
            hotel_price = 1800.0

    rooms_needed = math.ceil(travelers / 2.0)
    nights = max(1, duration_days - 1)  # N days trip usually has N-1 nights
    accommodation_cost = hotel_price * rooms_needed * nights

    # 2. FOOD COST
    avg_meal_price = 300.0
    rest_df = load_csv("restaurants")
    dest_rests = rest_df[rest_df["destination_id"] == int(destination_id)] if not rest_df.empty else None

    if restaurant_id:
        restaurant = find_by_id("restaurants", restaurant_id)
        if restaurant and restaurant.get("avg_cost") is not None:
            try:
                avg_meal_price = float(restaurant["avg_cost"])
            except (ValueError, TypeError):
                avg_meal_price = 300.0
    elif dest_rests is not None and not dest_rests.empty:
        if budget_tier == "budget":
            avg_meal_price = max(120.0, float(dest_rests["avg_cost"].min()))
        elif budget_tier == "luxury":
            avg_meal_price = float(dest_rests["avg_cost"].max())
        else:
            avg_meal_price = float(dest_rests["avg_cost"].mean())
    else:
        if budget_tier == "budget":
            avg_meal_price = 180.0
        elif budget_tier == "luxury":
            avg_meal_price = 650.0
        else:
            avg_meal_price = 320.0

    food_cost = avg_meal_price * travelers * duration_days * 3

    # 3. TRANSPORT COST
    transport_fare = 600.0
    is_flat_rate = False
    trans_df = load_csv("transportation")
    dest_trans = trans_df[trans_df["destination_id"] == int(destination_id)] if not trans_df.empty else None

    if transport_id:
        transport = find_by_id("transportation", transport_id)
        if transport:
            transport_fare = float(transport.get("fare", 600.0))
            if str(transport.get("transport_type", "")).lower() in ["taxi", "rental car", "rental bike", "private cab", "luxury taxi"]:
                is_flat_rate = True
    elif transport_mode and dest_trans is not None and not dest_trans.empty:
        mode_matches = dest_trans[dest_trans["transport_type"].astype(str).str.lower().str.contains(transport_mode.lower())]
        if not mode_matches.empty:
            transport_fare = float(mode_matches["fare"].mean())
            first_match = mode_matches.iloc[0]
            if str(first_match.get("transport_type", "")).lower() in ["taxi", "rental car", "rental bike", "private cab", "luxury taxi"]:
                is_flat_rate = True
        else:
            transport_fare = 500.0
    elif dest_trans is not None and not dest_trans.empty:
        if budget_tier == "budget":
            # Prefer buses or trains
            budget_trans = dest_trans[dest_trans["transport_type"].astype(str).str.lower().str.contains("bus|train|metro")]
            if not budget_trans.empty:
                transport_fare = float(budget_trans["fare"].min())
            else:
                transport_fare = float(dest_trans["fare"].min())
            is_flat_rate = False
        elif budget_tier == "luxury":
            # Prefer private cab or taxi
            luxury_trans = dest_trans[dest_trans["transport_type"].astype(str).str.lower().str.contains("cab|taxi|rental")]
            if not luxury_trans.empty:
                transport_fare = float(luxury_trans["fare"].max())
                is_flat_rate = True
            else:
                transport_fare = float(dest_trans["fare"].max())
        else:
            transport_fare = float(dest_trans["fare"].mean())
    else:
        if budget_tier == "budget":
            transport_fare = 250.0
        elif budget_tier == "luxury":
            transport_fare = 2500.0
            is_flat_rate = True
        else:
            transport_fare = 600.0

    if is_flat_rate:
        # E.g. Cab or rental vehicle per day
        transport_cost = transport_fare * duration_days
    else:
        # Per person transit ticket + local auto/cab buffer per day
        local_daily_allowance = 150.0 if budget_tier == "budget" else (400.0 if budget_tier == "luxury" else 250.0)
        transport_cost = (transport_fare * travelers) + (local_daily_allowance * duration_days)

    # 4. SIGHTSEEING COST
    sightseeing_cost = 0.0
    attract_df = load_csv("attractions")
    dest_attracts = attract_df[attract_df["destination_id"] == int(destination_id)] if not attract_df.empty else None

    if dest_attracts is not None and not dest_attracts.empty:
        if budget_tier == "budget":
            # Pick only affordable/free entry attractions
            fees = dest_attracts["entry_fee"].astype(float)
            sightseeing_cost = fees[fees <= 100].sum() * travelers
            if sightseeing_cost == 0:
                sightseeing_cost = 50.0 * travelers * duration_days
        elif budget_tier == "luxury":
            # All attractions + priority guide pass
            total_fees = dest_attracts["entry_fee"].astype(float).sum()
            sightseeing_cost = (total_fees * travelers) + (500.0 * duration_days)
        else:
            total_fees = dest_attracts["entry_fee"].astype(float).sum()
            sightseeing_cost = total_fees * travelers
    else:
        rate = 80.0 if budget_tier == "budget" else (350.0 if budget_tier == "luxury" else 150.0)
        sightseeing_cost = rate * travelers * duration_days

    # 5. MISCELLANEOUS COST (Buffer: 8% for contingency)
    subtotal = accommodation_cost + food_cost + transport_cost + sightseeing_cost
    misc_pct = 0.06 if budget_tier == "budget" else (0.10 if budget_tier == "luxury" else 0.08)
    misc_cost = subtotal * misc_pct
    total_cost = subtotal + misc_cost

    # Per-person & daily metrics
    per_person_total = round(total_cost / travelers, 2)
    per_person_per_day = round(total_cost / (travelers * duration_days), 2)
    daily_average = round(total_cost / duration_days, 2)

    # Breakdown percentages
    pct_hotel = round((accommodation_cost / total_cost) * 100, 1) if total_cost > 0 else 0
    pct_food = round((food_cost / total_cost) * 100, 1) if total_cost > 0 else 0
    pct_trans = round((transport_cost / total_cost) * 100, 1) if total_cost > 0 else 0
    pct_sight = round((sightseeing_cost / total_cost) * 100, 1) if total_cost > 0 else 0
    pct_misc = round((misc_cost / total_cost) * 100, 1) if total_cost > 0 else 0

    # Quick comparison of all 3 tiers
    def _quick_tier_total(tier_name):
        if tier_name == budget_tier:
            return round(total_cost, 2)
        h_p = 950.0 if tier_name == "budget" else (4500.0 if tier_name == "luxury" else 1800.0)
        if dest_hotels is not None and not dest_hotels.empty:
            if tier_name == "budget":
                h_p = float(dest_hotels["price_per_night"].min())
            elif tier_name == "luxury":
                h_p = float(dest_hotels["price_per_night"].max())
            else:
                h_p = float(dest_hotels["price_per_night"].mean())
        acc = h_p * rooms_needed * nights

        f_p = 180.0 if tier_name == "budget" else (650.0 if tier_name == "luxury" else 320.0)
        if dest_rests is not None and not dest_rests.empty:
            if tier_name == "budget":
                f_p = max(120.0, float(dest_rests["avg_cost"].min()))
            elif tier_name == "luxury":
                f_p = float(dest_rests["avg_cost"].max())
            else:
                f_p = float(dest_rests["avg_cost"].mean())
        fd = f_p * travelers * duration_days * 3

        if tier_name == "budget":
            tr = (180.0 * travelers) + (150.0 * duration_days)
            sg = 80.0 * travelers * duration_days
        elif tier_name == "luxury":
            tr = 2200.0 * duration_days
            sg = 350.0 * travelers * duration_days
        else:
            tr = (500.0 * travelers) + (250.0 * duration_days)
            sg = 150.0 * travelers * duration_days

        sub = acc + fd + tr + sg
        return round(sub * 1.08, 2)

    tier_comparison = {
        "budget": _quick_tier_total("budget"),
        "standard": _quick_tier_total("standard"),
        "luxury": _quick_tier_total("luxury")
    }

    # Money saving tips
    money_saving_tips = [
        f"Sharing twin/double rooms reduces accommodation to Rs. {round(hotel_price / 2, 2)} per person per night.",
        "Choosing KSRTC express buses or local passenger trains can reduce transit expenses by up to 60% compared to private cabs.",
        "Visiting popular viewpoints and temples in the early morning often avoids peak parking and entry surcharge fees."
    ]
    if budget_tier == "luxury":
        money_saving_tips.append("Pre-booking resort package deals often bundles breakfast and complimentary sight transfers.")
    else:
        money_saving_tips.append("Eating at local South Indian dhabas provides authentic regional flavor at Rs. 120-Rs. 200 per meal.")

    return {
        # Backward-compatible keys
        "accommodation": round(accommodation_cost, 2),
        "food": round(food_cost, 2),
        "local_transport": round(transport_cost, 2),
        "sightseeing": round(sightseeing_cost, 2),
        "miscellaneous": round(misc_cost, 2),
        "total": round(total_cost, 2),
        # Enhanced breakdown & budgeting fields
        "budget_tier": budget_tier,
        "travelers": travelers,
        "duration_days": duration_days,
        "hotel_name": hotel_name,
        "hotel_price_per_night": round(hotel_price, 2),
        "rooms_needed": rooms_needed,
        "nights": nights,
        "avg_meal_price": round(avg_meal_price, 2),
        "transport_fare": round(transport_fare, 2),
        "per_person_total": per_person_total,
        "per_person_per_day": per_person_per_day,
        "daily_average": daily_average,
        "breakdown_percentages": {
            "accommodation": pct_hotel,
            "food": pct_food,
            "local_transport": pct_trans,
            "sightseeing": pct_sight,
            "miscellaneous": pct_misc
        },
        "budget_tiers_comparison": tier_comparison,
        "money_saving_tips": money_saving_tips
    }
