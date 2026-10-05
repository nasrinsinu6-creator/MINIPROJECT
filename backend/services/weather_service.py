import datetime
import random
from backend.utils.csv_manager import load_csv, insert_row, filter_rows, update_row, find_by_id

def get_weather_for_destination(destination_id, destination_name=None, category=None, days=5, travel_date=None):
    """
    Retrieves current weather data and multi-day forecast for a destination.
    Uses weather_cache.csv for current conditions and dynamically generates
    a realistic multi-day forecast tailored to the destination's climate,
    travel date, and duration.
    """
    destination_id = int(destination_id)

    # Hydrate name and category if not supplied
    if not destination_name or not category:
        dest_record = find_by_id("destinations", destination_id)
        if dest_record:
            destination_name = destination_name or dest_record.get("name", f"Destination {destination_id}")
            category = category or dest_record.get("category", "General")
        else:
            destination_name = destination_name or f"Destination {destination_id}"
            category = category or "General"

    cache = filter_rows("weather_cache", {"destination_id": destination_id})
    current_time = datetime.datetime.now()
    needs_update = True
    cached_data = None

    if cache:
        cached_data = cache[0]
        try:
            updated_at = datetime.datetime.strptime(cached_data["updated_at"], "%Y-%m-%d %H:%M:%S")
            if (current_time - updated_at).days < 1:
                needs_update = False
        except Exception:
            needs_update = True

    if not needs_update and cached_data:
        temp = float(cached_data["temperature"])
        humidity = float(cached_data["humidity"])
        weather = cached_data["weather"]
        wind_speed = 10.0 + (destination_id % 15)
        rain_prob = 15 + (destination_id % 70) if "rain" in weather.lower() or "cloud" in weather.lower() else 8
    else:
        cat_lower = str(category).lower()
        if "hill station" in cat_lower or "nature" in cat_lower:
            temp = round(random.uniform(14.0, 22.0), 1)
            humidity = round(random.uniform(60.0, 85.0), 1)
            weather = random.choice(["Cloudy", "Misty", "Light Rain", "Partly Cloudy"])
            wind_speed = round(random.uniform(5.0, 15.0), 1)
            rain_prob = round(random.uniform(20.0, 80.0), 1)
        elif "beach" in cat_lower:
            temp = round(random.uniform(27.0, 33.0), 1)
            humidity = round(random.uniform(70.0, 90.0), 1)
            weather = random.choice(["Sunny", "Clear", "Humid", "Partly Cloudy"])
            wind_speed = round(random.uniform(12.0, 25.0), 1)
            rain_prob = round(random.uniform(5.0, 30.0), 1)
        elif "heritage" in cat_lower or "pilgrimage" in cat_lower or "city tourism" in cat_lower:
            temp = round(random.uniform(22.0, 30.0), 1)
            humidity = round(random.uniform(45.0, 65.0), 1)
            weather = random.choice(["Sunny", "Clear", "Dry", "Partly Cloudy"])
            wind_speed = round(random.uniform(8.0, 18.0), 1)
            rain_prob = round(random.uniform(0.0, 20.0), 1)
        else:
            temp = round(random.uniform(20.0, 28.0), 1)
            humidity = round(random.uniform(50.0, 70.0), 1)
            weather = random.choice(["Clear", "Cloudy", "Partly Cloudy"])
            wind_speed = round(random.uniform(6.0, 16.0), 1)
            rain_prob = round(random.uniform(10.0, 40.0), 1)

        weather_row = {
            "destination_id": destination_id,
            "temperature": temp,
            "humidity": humidity,
            "weather": weather,
            "updated_at": current_time.strftime("%Y-%m-%d %H:%M:%S")
        }

        if cached_data:
            update_row("weather_cache", cached_data["id"], weather_row)
        else:
            insert_row("weather_cache", weather_row)

    # Current advice
    advice = "Suitable for sightseeing. Wear comfortable shoes and stay hydrated."
    weather_lower = weather.lower()
    if "rain" in weather_lower:
        advice = "💡 Carry an umbrella or raincoat. Avoid trekking and slippery outdoor trails."
    elif "misty" in weather_lower or "fog" in weather_lower:
        advice = "💡 Beautiful misty views! Drives may have low visibility, travel carefully."
    elif temp < 16.0:
        advice = "💡 Cool climate. Carry warm jackets or sweaters, especially for evening walks."
    elif "sunny" in weather_lower or temp > 30.0:
        advice = "💡 Bright and sunny. Perfect outdoor weather. Apply high SPF sunscreen and wear sunglasses."
    elif "humid" in weather_lower:
        advice = "💡 Warm and humid. Keep hydration levels high. Light cotton clothes recommended."

    # Parse start date for multi-day forecast
    days = max(1, min(14, int(days)))
    start_date = current_time.date()
    if travel_date:
        try:
            parsed_d = datetime.date.fromisoformat(str(travel_date).strip())
            if parsed_d >= start_date:
                start_date = parsed_d
        except Exception:
            pass

    # Generate multi-day forecast
    forecast = []
    cat_lower = str(category).lower()
    condition_pool_hill = [
        ("Cloudy", "cloudy", 16.0, 21.0, 65, 10.0, 35, 4, "Cool mountain breeze with soft cloud cover."),
        ("Partly Cloudy", "partly-cloudy", 17.0, 23.0, 60, 12.0, 20, 5, "Pleasant and clear; optimal for viewpoints."),
        ("Light Rain", "rain", 14.0, 19.0, 82, 14.0, 65, 3, "Intermittent misty drizzles; carry a rain jacket."),
        ("Misty Morning", "fog", 13.0, 20.0, 85, 8.0, 40, 4, "Scenic morning mist followed by bright afternoon skies."),
        ("Sunny Breaks", "sunny", 18.0, 24.0, 55, 9.0, 15, 6, "Crisp sunshine; ideal for tea garden strolls.")
    ]
    condition_pool_beach = [
        ("Sunny & Warm", "sunny", 27.0, 33.0, 72, 16.0, 10, 8, "Ideal beach weather. Stay hydrated and apply SPF 50+ sunscreen."),
        ("Partly Cloudy", "partly-cloudy", 26.0, 32.0, 75, 18.0, 20, 7, "Great afternoon sea breeze with gentle cloud cover."),
        ("Tropical Showers", "rain", 25.0, 29.0, 85, 22.0, 55, 5, "Passing coastal showers, drying out by evening."),
        ("Clear Sky", "sunny", 26.0, 34.0, 68, 14.0, 5, 9, "Crystal clear ocean views and vibrant golden hour sunset."),
        ("Breezy Coast", "partly-cloudy", 26.0, 31.0, 78, 24.0, 25, 6, "Active waves and refreshing coastal wind.")
    ]
    condition_pool_heritage = [
        ("Clear & Sunny", "sunny", 22.0, 30.0, 52, 12.0, 5, 7, "Clear visibility for temple and architectural monument tours."),
        ("Partly Cloudy", "partly-cloudy", 21.0, 29.0, 58, 14.0, 15, 6, "Mild breeze and pleasant temperature for walking tours."),
        ("Sunny & Dry", "sunny", 23.0, 32.0, 48, 10.0, 0, 8, "Warm and dry. Carry drinking water for outdoor ruins."),
        ("Overcast", "cloudy", 20.0, 27.0, 64, 15.0, 30, 5, "Comfortable overcast skies shielding from midday heat."),
        ("Scattered Clouds", "partly-cloudy", 22.0, 31.0, 50, 11.0, 10, 7, "Smooth travel conditions with gentle sunlight.")
    ]
    condition_pool_default = [
        ("Sunny", "sunny", 21.0, 29.0, 55, 11.0, 10, 7, "Bright and comfortable sightseeing conditions."),
        ("Partly Cloudy", "partly-cloudy", 20.0, 28.0, 62, 13.0, 25, 6, "Pleasant weather with mild cloud shading."),
        ("Light Showers", "rain", 19.0, 26.0, 75, 15.0, 50, 4, "Passing showers. Indoor exhibits or coffee stops advised."),
        ("Clear Skies", "sunny", 21.0, 30.0, 50, 10.0, 5, 8, "Great visibility for city exploration and transit.")
    ]

    if "hill station" in cat_lower or "nature" in cat_lower:
        active_pool = condition_pool_hill
    elif "beach" in cat_lower:
        active_pool = condition_pool_beach
    elif "heritage" in cat_lower or "pilgrimage" in cat_lower or "city tourism" in cat_lower:
        active_pool = condition_pool_heritage
    else:
        active_pool = condition_pool_default

    total_rain_prob = 0
    max_forecast_temp = -100
    min_forecast_temp = 100

    for i in range(days):
        forecast_date = start_date + datetime.timedelta(days=i)
        # Deterministic variation derived from destination_id and day index
        pool_idx = (destination_id * 3 + i * 2) % len(active_pool)
        cond_name, icon_code, base_min, base_max, base_hum, base_wind, base_rain, uv, day_advice = active_pool[pool_idx]

        # Subtle day-to-day drift
        drift = ((i % 3) - 1) * 0.7
        d_min = round(base_min + drift, 1)
        d_max = round(base_max + drift, 1)
        d_avg = round((d_min + d_max) / 2.0, 1)
        d_hum = max(35, min(95, int(base_hum + ((i * 5) % 15) - 7)))
        d_wind = round(max(3.0, base_wind + ((i * 2) % 6) - 3), 1)
        d_rain = max(0, min(100, int(base_rain + ((destination_id + i * 7) % 20) - 10)))

        total_rain_prob += d_rain
        max_forecast_temp = max(max_forecast_temp, d_max)
        min_forecast_temp = min(min_forecast_temp, d_min)

        forecast.append({
            "date": forecast_date.strftime("%Y-%m-%d"),
            "day_name": forecast_date.strftime("%a"),
            "full_day": forecast_date.strftime("%A"),
            "formatted_date": forecast_date.strftime("%d %b"),
            "temp_min": d_min,
            "temp_max": d_max,
            "temperature": d_avg,
            "weather": cond_name,
            "condition_code": icon_code,
            "humidity": d_hum,
            "wind_speed": d_wind,
            "rain_probability": d_rain,
            "uv_index": uv,
            "advice": day_advice
        })

    avg_rain_prob = total_rain_prob / max(1, days)
    # Calculate travel suitability score (1-100)
    suitability_score = int(max(40, min(98, 95 - (avg_rain_prob * 0.4) - (5 if max_forecast_temp > 33 else 0))))
    if suitability_score >= 85:
        suitability_label = "Optimal / Excellent"
    elif suitability_score >= 70:
        suitability_label = "Good Sightseeing Conditions"
    elif suitability_score >= 55:
        suitability_label = "Moderate / Rain Precautions Advised"
    else:
        suitability_label = "Challenging Weather Ahead"

    # Compile intelligent packing checklist
    packing_tips = [
        "Comfortable walking shoes with sturdy grip for daily sightseeing",
        "Personal hydration bottle and essential personal medication"
    ]
    if "hill station" in cat_lower or min_forecast_temp < 18.0:
        packing_tips.append("Warm fleece jacket or knitted sweater for chilly evenings")
        packing_tips.append("Thermal innerwear or windbreaker for mountain viewpoints")
    if "beach" in cat_lower or max_forecast_temp > 29.0:
        packing_tips.append("High SPF 50+ Sunscreen, UV polarized sunglasses & sun hat")
        packing_tips.append("Breathable quick-dry cotton/linen clothing and beachwear")
    if avg_rain_prob > 25.0:
        packing_tips.append("Compact windproof umbrella or hooded waterproof rain jacket")
        packing_tips.append("Water-resistant bag cover or ziplock pouches for electronics")
    if "nature" in cat_lower or "adventure" in cat_lower:
        packing_tips.append("Insect repellent cream and a portable emergency power bank")

    # Active weather alerts
    weather_alerts = []
    if avg_rain_prob >= 50.0:
        weather_alerts.append({
            "severity": "moderate",
            "title": "Frequent Showers Expected",
            "description": "High chance of precipitation during this trip window. Outdoor schedules should include backup indoor options."
        })
    elif max_forecast_temp >= 33.0:
        weather_alerts.append({
            "severity": "advisory",
            "title": "High Heat Index",
            "description": "Midday temperatures can be intense. Plan heavy outdoor sightseeing between 07:30-10:30 AM and after 04:30 PM."
        })
    else:
        weather_alerts.append({
            "severity": "positive",
            "title": "Clear Sightseeing Window",
            "description": "Pleasant conditions forecast with stable winds. Ideal for excursions and landscape photography."
        })

    return {
        # Backward-compatible fields
        "destination_id": destination_id,
        "destination_name": destination_name,
        "temperature": temp,
        "humidity": humidity,
        "weather": weather,
        "wind_speed": wind_speed,
        "rain_probability": rain_prob,
        "advice": advice,
        # Enhanced forecasting & advisory fields
        "category": category,
        "forecast_days": days,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "suitability_score": suitability_score,
        "suitability_label": suitability_label,
        "best_time_of_day": "Early Morning (07:00 - 10:30) & Golden Hour (16:30 - 18:45)",
        "packing_tips": packing_tips,
        "weather_alerts": weather_alerts,
        "forecast": forecast
    }
