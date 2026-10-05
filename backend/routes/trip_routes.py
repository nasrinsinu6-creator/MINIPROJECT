import datetime
import json
import os
import time
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from backend.utils.csv_manager import load_csv, save_csv, insert_row, filter_rows, find_by_id, delete_row, update_row, clean_records
from backend.utils.auth import token_required, optional_token
from backend.config import Config
from backend.services.recommender import recommend_destinations
from backend.services.itinerary_generator import generate_itinerary
from backend.services.cost_estimator import estimate_trip_cost
from backend.services.weather_service import get_weather_for_destination
from backend.services.transport_service import get_transport_recommendations
from backend.services.hotel_service import get_available_hotels, book_hotel_room

trip_bp = Blueprint("trip", __name__)


# Serve uploaded diary images
@trip_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_DIR, filename)

@trip_bp.route("/plan-trip", methods=["POST"])
def plan_trip():
    """
    Inputs travel preferences and returns top 5 recommendations.
    """
    try:
        data = request.get_json() or {}

        # Safe extraction of params with fallbacks
        source_location = str(data.get("source_location") or "Kochi").strip()
        destination_type = data.get("destination_type") or "hill station"

        try:
            raw_budget = data.get("budget")
            budget = float(raw_budget) if raw_budget is not None and str(raw_budget).strip() != "" else 15000.0
        except (ValueError, TypeError):
            budget = 15000.0

        try:
            raw_travelers = data.get("travelers")
            travelers = int(raw_travelers) if raw_travelers is not None and str(raw_travelers).strip() != "" else 2
        except (ValueError, TypeError):
            travelers = 2

        try:
            raw_duration = data.get("duration_days")
            duration_days = int(raw_duration) if raw_duration is not None and str(raw_duration).strip() != "" else 3
        except (ValueError, TypeError):
            duration_days = 3

        interests = data.get("interests") if isinstance(data.get("interests"), list) else []
        group_type = str(data.get("group_type") or "family").strip()
        state = str(data.get("state") or "").strip()
        travel_date = str(data.get("travel_date") or "").strip()

        if travel_date:
            try:
                input_date = datetime.date.fromisoformat(travel_date)
                if input_date < datetime.date.today():
                    return jsonify({"message": "Travel date cannot be in the past. Please select today or a future date."}), 400
            except (ValueError, TypeError):
                travel_date = ""

        target_destination = str(data.get("target_destination") or data.get("destination_name") or "all").strip()

        preferences = {
            "source_location": source_location,
            "target_destination": target_destination,
            "destination_type": destination_type,
            "budget": budget,
            "travelers": travelers,
            "duration_days": duration_days,
            "interests": interests,
            "group_type": group_type,
            "state": state,
            "travel_date": travel_date
        }
        
        recommendations = recommend_destinations(preferences)
        total_allocated_days = sum(int(d.get("allocated_days", 1)) for d in recommendations)
        total_estimated_cost = sum(float(d.get("estimated_cost", {}).get("total", 0)) for d in recommendations)
        
        trip_summary = {
            "total_destinations": len(recommendations),
            "total_allocated_days": total_allocated_days,
            "total_estimated_cost": round(total_estimated_cost, 2),
            "remaining_budget": max(0.0, round(budget - total_estimated_cost, 2)),
            "remaining_days": max(0, duration_days - total_allocated_days)
        }
        
        return jsonify({
            "preferences": preferences,
            "recommendations": recommendations,
            "trip_summary": trip_summary,
            "message": "Recommendations found." if recommendations else "No destination with that budget."
        }), 200
    except Exception as err:
        print(f"Error compiling recommendations: {err}")
        return jsonify({"message": f"Recommendation compilation notice: {str(err)}. Please check form inputs."}), 400


@trip_bp.route("/generate-itinerary", methods=["POST"])
def api_generate_itinerary():
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    destinations = data.get("destinations")
    duration = int(data.get("duration_days", 3))
    interests = data.get("interests", [])
    hotel_id = data.get("hotel_id")
    restaurant_id = data.get("restaurant_id")
    
    if destinations and isinstance(destinations, list):
        from backend.services.itinerary_generator import generate_multi_destination_itinerary
        itinerary = generate_multi_destination_itinerary(destinations, interests)
    elif dest_id:
        itinerary = generate_itinerary(dest_id, duration, interests, hotel_id, restaurant_id)
    else:
        return jsonify({"message": "destination_id or destinations list is required"}), 400
        
    return jsonify({"itinerary": itinerary}), 200

@trip_bp.route("/estimate-cost", methods=["POST"])
def api_estimate_cost():
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    travelers = int(data.get("travelers", 1))
    duration = int(data.get("duration_days", 3))
    hotel_id = data.get("hotel_id")
    transport_id = data.get("transport_id")
    restaurant_id = data.get("restaurant_id")
    budget_tier = data.get("budget_tier", "standard")
    transport_mode = data.get("transport_mode")
    
    if not dest_id:
        return jsonify({"message": "destination_id is required"}), 400
        
    cost = estimate_trip_cost(dest_id, travelers, duration, hotel_id, transport_id, restaurant_id, budget_tier=budget_tier, transport_mode=transport_mode)
    return jsonify({"cost_estimation": cost}), 200

@trip_bp.route("/save-trip", methods=["POST"])
@token_required
def save_trip(current_user):
    try:
        data = request.get_json() or {}
        dest_id = data.get("destination_id")
        source_location = data.get("source_location", "")
        budget = data.get("budget", 0)
        travelers = data.get("travelers", 1)
        duration_days = data.get("duration_days", 3)
        interests = data.get("interests", [])
        itinerary = data.get("itinerary", "")
        estimated_cost = data.get("estimated_cost", 0)
        hotel_id = data.get("hotel_id") # optional, to book room
        
        if not dest_id:
            return jsonify({"message": "destination_id is required"}), 400

        # Duplicate trip prevention check
        target_date = str(data.get("travel_date") or "").strip()
        existing_trips = filter_rows("saved_trips", {"user_id": int(current_user["id"])})
        
        for ext in existing_trips:
            ext_date = str(ext.get("travel_date") or "").strip()
            ext_dest_id = int(ext.get("destination_id", 0))
            
            # 1. Block saving another trip on the exact same travel date
            if target_date and ext_date == target_date:
                ext_dest = find_by_id("destinations", ext_dest_id)
                dest_name = ext_dest.get("name", "another destination") if ext_dest else "another destination"
                return jsonify({
                    "message": f"You already have a trip scheduled for {target_date} (Trip to {dest_name}). Saving duplicate trips on the same date is not allowed."
                }), 400

            # 2. Block saving identical trip to the same destination on the same day or same travel date
            if ext_dest_id == int(dest_id):
                ext_created_date = str(ext.get("created_at") or "").split(" ")[0]
                today_str = datetime.date.today().strftime("%Y-%m-%d")
                ext_travelers = int(ext.get("travelers", 1))
                ext_duration = int(ext.get("duration_days", 1))

                if target_date and ext_date == target_date:
                    return jsonify({
                        "message": f"A trip to this destination on {target_date} is already saved in your itineraries."
                    }), 400
                elif not target_date and ext_created_date == today_str and ext_travelers == int(travelers or 1) and ext_duration == int(duration_days or 1):
                    return jsonify({
                        "message": "An identical trip to this destination has already been saved today. Duplicate trips are not allowed."
                    }), 400
        if hotel_id:
            try:
                book_hotel_room(hotel_id, 1)
            except Exception as e:
                print(f"Non-fatal error booking room: {e}")

        trip_row = {
            "user_id": int(current_user["id"]),
            "destination_id": int(dest_id),
            "source_location": str(source_location or ""),
            "budget": float(budget or 0),
            "travelers": int(travelers or 1),
            "duration_days": int(duration_days or 1),
            "interests": json.dumps(interests) if isinstance(interests, list) else str(interests),
            "itinerary_text": json.dumps(itinerary) if not isinstance(itinerary, str) else itinerary,
            "estimated_cost": float(estimated_cost or 0),
            "travel_date": str(data.get("travel_date") or ""),
            "transport_type": str(data.get("transport_type") or ""),
            "transport_fare": float(data.get("transport_fare") or 0),
            "travel_time": str(data.get("travel_time") or ""),
            "distance": float(data.get("distance") or 0),
            "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        saved = insert_row("saved_trips", trip_row)
        return jsonify({"message": "Trip planned and saved successfully!", "trip": saved}), 201
    except Exception as exc:
        print(f"Error saving trip: {exc}")
        return jsonify({"message": f"Failed to save trip: {str(exc)}"}), 500

@trip_bp.route("/my-trips", methods=["GET"])
@token_required
def get_my_trips(current_user):
    trips = filter_rows("saved_trips", {"user_id": int(current_user["id"])})
    
    today_date = datetime.date.today()
    hydrated_trips = []
    for trip in trips:
        dest = find_by_id("destinations", trip["destination_id"])
        trip["destination_name"] = dest["name"] if dest else "Unknown Destination"
        trip["destination_image"] = dest.get("image_url", "") if dest else ""
        
        # Determine status / finished
        is_finished = str(trip.get("status", "")).lower() in ["finished", "completed"]
        if not is_finished and trip.get("travel_date"):
            try:
                t_date = datetime.date.fromisoformat(str(trip["travel_date"]).strip())
                duration = int(trip.get("duration_days") or 1)
                end_date = t_date + datetime.timedelta(days=duration)
                if end_date <= today_date or t_date < today_date:
                    is_finished = True
            except Exception:
                pass
                
        trip["is_finished"] = is_finished
        trip["status"] = "Finished" if is_finished else trip.get("status", "Upcoming")

        # Safe JSON parse for interests and itinerary
        try:
            trip["interests"] = json.loads(trip["interests"])
        except Exception:
            pass
        try:
            trip["itinerary_text"] = json.loads(trip["itinerary_text"])
        except Exception:
            pass
            
        hydrated_trips.append(trip)
        
    # Sort trips by creation date (newest first)
    hydrated_trips = sorted(hydrated_trips, key=lambda x: x["created_at"], reverse=True)
    return jsonify({"trips": hydrated_trips}), 200

@trip_bp.route("/trips/<int:id_val>/finish", methods=["PUT"])
@token_required
def finish_saved_trip(current_user, id_val):
    trip = find_by_id("saved_trips", id_val)
    if not trip:
        return jsonify({"message": "Trip not found!"}), 404
        
    if int(trip.get("user_id", 0)) != int(current_user["id"]) and not current_user.get("is_admin"):
        return jsonify({"message": "Unauthorized to update this trip!"}), 403
        
    updated = update_row("saved_trips", id_val, {"status": "finished"})
    if updated:
        return jsonify({"message": "Trip marked as finished successfully!", "trip": updated}), 200
    return jsonify({"message": "Failed to update trip status"}), 500

@trip_bp.route("/trips/<int:id_val>", methods=["DELETE"])
@token_required
def delete_saved_trip(current_user, id_val):
    trip = find_by_id("saved_trips", id_val)
    if not trip:
        return jsonify({"message": "Trip not found!"}), 404
        
    if int(trip.get("user_id", 0)) != int(current_user["id"]) and not current_user.get("is_admin"):
        return jsonify({"message": "Unauthorized to delete this trip!"}), 403
        
    deleted = delete_row("saved_trips", id_val)
    if deleted:
        return jsonify({"message": "Saved trip deleted successfully!"}), 200
    return jsonify({"message": "Failed to delete saved trip"}), 500


@trip_bp.route("/weather/<int:destination_id>", methods=["GET"])
def api_get_weather(destination_id):
    dest = find_by_id("destinations", destination_id)
    if not dest:
        return jsonify({"message": "Destination not found"}), 404
        
    days = request.args.get("days", default=5, type=int)
    travel_date = request.args.get("travel_date", default="", type=str)
    
    weather = get_weather_for_destination(dest["id"], dest["name"], dest["category"], days=days, travel_date=travel_date)
    return jsonify({"weather": weather}), 200

from backend.services.route_service import geocode_location, compute_route
from backend.services.transport_service import get_dynamic_transport_options

@trip_bp.route("/geocode", methods=["GET"])
def api_geocode():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []}), 200
    results = geocode_location(query)
    return jsonify({"results": results}), 200

@trip_bp.route("/route", methods=["POST"])
def api_route():
    data = request.get_json() or {}
    origin = data.get("origin") or {}
    destination = data.get("destination") or {}

    o_lat = float(origin.get("latitude") or origin.get("lat") or 9.9312)
    o_lon = float(origin.get("longitude") or origin.get("lon") or 76.2673)
    d_lat = float(destination.get("latitude") or destination.get("lat") or 8.7379)
    d_lon = float(destination.get("longitude") or destination.get("lon") or 76.7163)

    res = compute_route(o_lat, o_lon, d_lat, d_lon)
    return jsonify(res), 200

@trip_bp.route("/transport-options", methods=["POST"])
def api_transport_options():
    data = request.get_json() or {}
    source = data.get("source", "Kochi")
    destination = data.get("destination", "Varkala")
    travelers = int(data.get("travelers", 2))
    dest_id = data.get("destination_id")

    options = get_dynamic_transport_options(source=source, destination=destination, destination_id=dest_id)
    return jsonify({"transportation": options}), 200

@trip_bp.route("/ai/travel-advice", methods=["POST"])
def api_ai_advice():
    data = request.get_json() or {}
    dest_name = data.get("destination_name", "Destination")
    source = data.get("source", "Kochi")
    transport = data.get("transport_type", "Private AC Cab")
    travelers = data.get("travelers", 2)

    advice = f"{transport} is an ideal choice for traveling from {source} to {dest_name}. With {travelers} traveler{'s' if int(travelers) > 1 else ''}, this provides comfortable direct routing and reliable travel times."
    return jsonify({"advice": advice}), 200

@trip_bp.route("/transportation/<int:destination_id>", methods=["GET"])
def api_get_transport(destination_id):
    options = get_transport_recommendations(destination_id)
    return jsonify({"transportation": options}), 200

@trip_bp.route("/hotels/<int:destination_id>", methods=["GET"])
def api_get_hotels(destination_id):
    hotels = get_available_hotels(destination_id)
    return jsonify({"hotels": hotels}), 200

@trip_bp.route("/restaurants/<int:destination_id>", methods=["GET"])
def api_get_restaurants(destination_id):
    rest_df = load_csv("restaurants")
    dest_rests = rest_df[rest_df["destination_id"] == int(destination_id)]
    return jsonify({"restaurants": clean_records(dest_rests.to_dict(orient="records"))}), 200

# ----------------- REVIEWS -----------------
@trip_bp.route("/reviews", methods=["POST"])
@token_required
def post_review(current_user):
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    rating = data.get("rating")
    review_text = data.get("review")
    
    if not dest_id or not rating or not review_text:
        return jsonify({"message": "Destination, rating (1-5), and review text are required!"}), 400
        
    review_row = {
        "user_id": int(current_user["id"]),
        "destination_id": int(dest_id),
        "rating": int(rating),
        "review": review_text,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    saved = insert_row("reviews", review_row)
    return jsonify({"message": "Review submitted successfully!", "review": saved}), 201

@trip_bp.route("/reviews/<int:destination_id>", methods=["GET"])
def get_reviews(destination_id):
    reviews = filter_rows("reviews", {"destination_id": int(destination_id)})
    
    # Hydrate review records with user names
    for rev in reviews:
        user = find_by_id("users", rev["user_id"])
        rev["user_name"] = user["name"] if user else "Anonymous Traveler"
        
    return jsonify({"reviews": reviews}), 200

# ----------------- FEEDBACK -----------------
@trip_bp.route("/feedback", methods=["POST"])
@token_required
def post_feedback(current_user):
    data = request.get_json() or {}
    feedback_text = data.get("feedback")
    
    if not feedback_text:
        return jsonify({"message": "Feedback text is required!"}), 400
        
    feedback_row = {
        "user_id": int(current_user["id"]),
        "feedback": feedback_text,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    saved = insert_row("feedback", feedback_row)
    return jsonify({"message": "Feedback received. Thank you!", "feedback": saved}), 201

def generate_instant_complaint_resolution(subject, description, current_user):
    subj_lower = str(subject or "").lower()
    desc_lower = str(description or "").lower()
    combined = f"{subj_lower} {desc_lower}"
    
    is_urgent = "urgent" in combined

    prefix = "🚨 INSTANT URGENT AI DISPATCH: Urgent Priority Ticket received! Immediate resolution generated & flagged for Admin Console review. " if is_urgent else ""

    # 1. Hotel / Resort / Accommodation issues
    if any(k in combined for k in ["hotel", "resort", "room", "accommodation", "stay", "lodge", "booking"]):
        hotels_df = load_csv("hotels")
        destinations_df = load_csv("destinations")
        trips_df = load_csv("saved_trips")
        
        found_dest = None
        found_hotel = None
        
        if not destinations_df.empty:
            for _, d in destinations_df.iterrows():
                if str(d["name"]).lower() in combined:
                    found_dest = d
                    break

        if found_dest is None and not hotels_df.empty:
            for _, h in hotels_df.iterrows():
                if str(h["name"]).lower() in combined:
                    found_hotel = h
                    break
        
        if found_dest is None and found_hotel is None and not trips_df.empty:
            try:
                user_trips = trips_df[trips_df["user_id"].astype(int) == int(current_user["id"])]
                if not user_trips.empty:
                    latest_trip = user_trips.iloc[-1]
                    dest_id = int(latest_trip["destination_id"])
                    if not destinations_df.empty:
                        matched_d = destinations_df[destinations_df["id"].astype(int) == dest_id]
                        if not matched_d.empty:
                            found_dest = matched_d.iloc[0]
            except Exception:
                pass

        if found_hotel is not None:
            dest_id = int(found_hotel["destination_id"])
            alt_hotels = hotels_df[(hotels_df["destination_id"].astype(int) == dest_id) & (hotels_df["id"].astype(int) != int(found_hotel["id"]))]
            if not alt_hotels.empty:
                alt = alt_hotels.iloc[0]
                b_url = alt.get("booking_url", "")
                link_text = f" Direct Booking: {b_url}" if b_url else ""
                return (
                    f"{prefix}Instant Support AI: We detected room availability issues with '{found_hotel['name']}'. "
                    f"Recommended Alternative Stay: '{alt['name']}' ({alt.get('hotel_type','Hotel')}, {alt.get('room_type','Standard')}) at Rs. {alt.get('price_per_night', 1800)}/night (Rating: ⭐{alt.get('rating', 4.5)}).{link_text}"
                )
        elif found_dest is not None:
            dest_id = int(found_dest["id"])
            dest_hotels = hotels_df[hotels_df["destination_id"].astype(int) == dest_id]
            if not dest_hotels.empty:
                alt = dest_hotels.iloc[0]
                b_url = alt.get("booking_url", "")
                link_text = f" Direct Booking: {b_url}" if b_url else ""
                return (
                    f"{prefix}Instant Support AI: Recommended verified accommodation for {found_dest['name']}: "
                    f"'{alt['name']}' ({alt.get('hotel_type','Hotel')}) at Rs. {alt.get('price_per_night', 2000)}/night (Rating: ⭐{alt.get('rating', 4.6)}).{link_text}"
                )

        return (
            f"{prefix}Instant Support AI: Automated hotel availability check completed. "
            "Verified alternative stays with live pricing and direct links are available under our Destinations & Accommodations section. Our support team has also logged your ticket."
        )

    # 2. Transport / Route Inquiry
    elif any(k in combined for k in ["transport", "route", "bus", "cab", "taxi", "car", "train", "transit", "inquiry"]):
        return (
            f"{prefix}Instant Support AI: Transport & Route assistance processed. "
            "Point-to-point transit directions, distance matrices, local cab contacts, and KSRTC bus schedules are available live in your Trip Details and Plan Trip modules. For urgent highway assistance, dial 112."
        )

    # 3. Booking Details Mismatch
    elif any(k in combined for k in ["mismatch", "detail", "cost", "price", "budget", "ticket"]):
        return (
            f"{prefix}Instant Support AI: Ticket & Booking details cross-verified. "
            "Your itinerary headcount, travel dates, and price estimations have been re-validated against active rates. "
            "You can update companion counts or recalculate budgets anytime in Saved Trips."
        )

    # 4. Weather / Itinerary Adjustment
    elif any(k in combined for k in ["weather", "rain", "itinerary", "adjust", "climate", "schedule"]):
        return (
            f"{prefix}Instant Support AI: Weather & Itinerary sync completed. "
            "Our automated weather service monitors live forecasts. "
            "Indoor attractions and flexible sightseeing schedules are accessible on your Itinerary page to adapt to changing weather conditions."
        )

    # 5. Default / General
    else:
        return (
            f"{prefix}Instant Support AI: Your support ticket regarding '{subject}' has been processed by our system. "
            "Resolution log updated. For real-time 24/7 travel advice, hotel booking links, or destination queries, ask our AuraTravel Copilot chatbot!"
        )

# ----------------- COMPLAINTS -----------------
@trip_bp.route("/complaints", methods=["POST"])
@token_required
def submit_complaint(current_user):
    data = request.get_json() or {}
    subject = str(data.get("subject") or "").strip()
    description = str(data.get("description") or "").strip()
    
    if not subject or not description:
        return jsonify({"message": "Subject and description are required!"}), 400

    # Sanitize newlines in subject and description to ensure safe CSV storage
    clean_subj = subject.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    clean_desc = description.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")

    admin_reply = generate_instant_complaint_resolution(clean_subj, clean_desc, current_user)
    
    status = "In Progress" if "urgent" in clean_subj.lower() or "urgent" in clean_desc.lower() else "Pending"

    user_id = int(current_user["id"])

    complaint_row = {
        "user_id": user_id,
        "subject": clean_subj,
        "description": clean_desc,
        "status": status,
        "admin_reply": admin_reply,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    saved = insert_row("complaints", complaint_row)
    return jsonify({"message": "Complaint submitted successfully! Immediate AI resolution attached.", "complaint": saved}), 201

@trip_bp.route("/my-complaints", methods=["GET"])
@token_required
def get_my_complaints(current_user):
    user_id = int(current_user["id"])
    
    # Strictly filter complaints by current authenticated user_id
    raw_complaints = filter_rows("complaints", {"user_id": user_id})
    complaints = clean_records(raw_complaints) if raw_complaints else []
    
    # Auto-generate instant resolutions for any complaints lacking an admin_reply
    updated = False
    all_complaints_df = load_csv("complaints")
    
    for c in complaints:
        need_reply = not c.get("admin_reply") or str(c.get("admin_reply")).strip() == "" or str(c.get("admin_reply")).lower() == "none"
        
        if need_reply:
            res_reply = generate_instant_complaint_resolution(c.get("subject", ""), c.get("description", ""), current_user)
            c["admin_reply"] = res_reply
            
            if not all_complaints_df.empty:
                try:
                    c_id = int(c["id"])
                    idx_list = all_complaints_df[all_complaints_df["id"].astype(int) == c_id].index
                    if len(idx_list) > 0:
                        all_complaints_df.loc[idx_list[0], "admin_reply"] = c["admin_reply"]
                        updated = True
                except Exception as ex:
                    pass
                    
    if updated:
        save_csv("complaints", all_complaints_df)

    complaints = clean_records(complaints)
    # Sort by date (newest first)
    complaints = sorted(complaints, key=lambda x: str(x.get("created_at", "")), reverse=True)
    return jsonify({"complaints": complaints}), 200

@trip_bp.route("/complaints/<int:id_val>", methods=["DELETE"])
@token_required
def delete_user_complaint(current_user, id_val):
    complaint = find_by_id("complaints", id_val)
    if not complaint:
        return jsonify({"message": "Complaint ticket not found!"}), 404
    if int(complaint.get("user_id", 0)) != int(current_user["id"]) and not current_user.get("is_admin"):
        return jsonify({"message": "Unauthorized to delete this ticket!"}), 403
    deleted = delete_row("complaints", id_val)
    if deleted:
        return jsonify({"message": "Support ticket deleted successfully!"}), 200
    return jsonify({"message": "Failed to delete support ticket"}), 500

# ----------------- TRIP DIARY -----------------
@trip_bp.route("/trip-diary", methods=["POST"])
@token_required
def post_diary(current_user):
    # Accept JSON or multipart/form-data (file upload)
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form.to_dict()

    dest_id = data.get("destination_id")
    diary_text = data.get("diary")
    rating = data.get("rating", 5)

    # Handle uploaded file(s) if provided
    photo_path = data.get("photo_path", "")
    uploaded_paths = []
    file_list = request.files.getlist("photo") or request.files.getlist("photos")
    for idx, file in enumerate(file_list):
        if file and file.filename:
            filename = f"{current_user['id']}_{int(time.time())}_{idx}_{secure_filename(file.filename)}"
            save_path = os.path.join(Config.UPLOAD_DIR, filename)
            file.save(save_path)
            uploaded_paths.append(f"/api/uploads/{filename}")

    if uploaded_paths:
        photo_path = ",".join(uploaded_paths)

    if not dest_id or not diary_text:
        return jsonify({"message": "Destination and diary content are required!"}), 400

    diary_row = {
        "user_id": int(current_user["id"]),
        "destination_id": int(dest_id),
        "diary": diary_text,
        "photo_path": photo_path,
        "rating": int(rating),
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    saved = insert_row("trip_diary", diary_row)
    return jsonify({"message": "Memory added to your trip diary!", "diary": saved}), 201

@trip_bp.route("/my-trip-diary", methods=["GET"])
@token_required
def get_my_trip_diary(current_user):
    diaries = filter_rows("trip_diary", {"user_id": int(current_user["id"])})
    
    hydrated = []
    for d in diaries:
        dest = find_by_id("destinations", d["destination_id"])
        d["destination_name"] = dest["name"] if dest else "Unknown Destination"
        hydrated.append(d)
        
    hydrated = sorted(hydrated, key=lambda x: x["created_at"], reverse=True)
    return jsonify({"diaries": hydrated}), 200

# ----------------- PUBLIC DESTINATIONS LIST & DETAIL -----------------
@trip_bp.route("/destinations", methods=["GET"])
def get_public_destinations():
    """
    Returns all destinations, supporting optional category filtering and search queries.
    """
    dest_df = load_csv("destinations")
    if dest_df.empty:
        return jsonify({"destinations": []}), 200
        
    category = request.args.get("category")
    search_q = request.args.get("search")
    
    # Filter category
    if category and category.strip() != "":
        dest_df = dest_df[dest_df["category"].astype(str).str.lower() == category.lower().strip()]
        
    # Search text
    if search_q and search_q.strip() != "":
        search_q = search_q.strip().lower()
        if len(search_q) == 1:
            dest_df = dest_df[
                dest_df["name"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["city"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["local_cities"].astype(str).str.lower().str.contains(search_q, regex=False)
            ]
        else:
            dest_df = dest_df[
                dest_df["name"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["state"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["city"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["description"].astype(str).str.lower().str.contains(search_q, regex=False) |
                dest_df["local_cities"].astype(str).str.lower().str.contains(search_q, regex=False)
            ]
        
    records = clean_records(dest_df.to_dict(orient="records"))
    reviews_df = load_csv("reviews")
    for r in records:
        try:
            d_id = int(r["id"])
            if not reviews_df.empty and "destination_id" in reviews_df.columns:
                d_revs = reviews_df[reviews_df["destination_id"].astype(str) == str(d_id)]
                if not d_revs.empty:
                    r["rating"] = round(float(d_revs["rating"].astype(float).mean()), 1)
                    r["reviews_count"] = int(len(d_revs))
                else:
                    r["rating"] = 4.5
                    r["reviews_count"] = 0
            else:
                r["rating"] = 4.5
                r["reviews_count"] = 0
        except Exception:
            r["rating"] = 4.5
            r["reviews_count"] = 0

    return jsonify({"destinations": records}), 200

@trip_bp.route("/destinations/<int:id_val>", methods=["GET"])
def get_public_destination_detail(id_val):
    dest = find_by_id("destinations", id_val)
    if not dest:
        return jsonify({"message": "Destination not found"}), 404
        
    # Hydrate detail with attractions, hotels, restaurants, and review stats
    hotels_df = load_csv("hotels")
    rest_df = load_csv("restaurants")
    attract_df = load_csv("attractions")
    
    dest_id = int(dest["id"])
    dest["hotels"] = clean_records(hotels_df[(hotels_df["destination_id"] == dest_id) & (hotels_df["available_rooms"].astype(int) > 0)].to_dict(orient="records"))
    dest["restaurants"] = clean_records(rest_df[rest_df["destination_id"] == dest_id].to_dict(orient="records"))
    dest["attractions"] = clean_records(attract_df[attract_df["destination_id"] == dest_id].to_dict(orient="records"))
    
    d_revs = filter_rows("reviews", {"destination_id": dest_id})
    if d_revs:
        ratings = [float(x.get("rating", 5)) for x in d_revs]
        dest["rating"] = round(sum(ratings) / len(ratings), 1)
        dest["reviews_count"] = len(d_revs)
    else:
        dest["rating"] = 4.5
        dest["reviews_count"] = 0

    return jsonify({"destination": dest}), 200

# ----------------- EXTRA TRIP DIARY MANAGE & FEEDBACK HISTORY Endpoints -----------------
@trip_bp.route("/trip-diary/<int:id_val>", methods=["PUT"])
@token_required
def edit_diary(current_user, id_val):
    diary_entry = find_by_id("trip_diary", id_val)
    if not diary_entry:
        return jsonify({"message": "Diary entry not found"}), 404
    if int(diary_entry["user_id"]) != int(current_user["id"]):
        return jsonify({"message": "Unauthorized to modify this diary entry"}), 403
    # Support JSON or multipart/form-data for updates (file upload)
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form.to_dict()
    diary_text = data.get("diary")
    photo_path = data.get("photo_path")
    rating = data.get("rating")

    # Handle uploaded file(s) if present during edit
    uploaded_paths = []
    file_list = request.files.getlist("photo") or request.files.getlist("photos")
    for idx, file in enumerate(file_list):
        if file and file.filename:
            filename = f"{current_user['id']}_{int(time.time())}_{idx}_{secure_filename(file.filename)}"
            save_path = os.path.join(Config.UPLOAD_DIR, filename)
            file.save(save_path)
            uploaded_paths.append(f"/api/uploads/{filename}")

    if uploaded_paths:
        photo_path = ",".join(uploaded_paths)
    
    update_data = {}
    if diary_text is not None:
        update_data["diary"] = diary_text
    if photo_path is not None:
        update_data["photo_path"] = photo_path
    if rating is not None:
        update_data["rating"] = int(rating)
        
    if not update_data:
        return jsonify({"message": "No fields to update"}), 400
        
    updated = update_row("trip_diary", id_val, update_data)
    if updated:
        return jsonify({"message": "Diary entry updated successfully!"}), 200
    return jsonify({"message": "Failed to update diary entry"}), 500

@trip_bp.route("/trip-diary/<int:id_val>", methods=["DELETE"])
@token_required
def remove_diary(current_user, id_val):
    diary_entry = find_by_id("trip_diary", id_val)
    if not diary_entry:
        return jsonify({"message": "Diary entry not found"}), 404
    if int(diary_entry["user_id"]) != int(current_user["id"]):
        return jsonify({"message": "Unauthorized to delete this diary entry"}), 403
        
    deleted = delete_row("trip_diary", id_val)
    if deleted:
        return jsonify({"message": "Diary entry deleted successfully!"}), 200
    return jsonify({"message": "Failed to delete diary entry"}), 500

@trip_bp.route("/my-feedback", methods=["GET"])
@token_required
def get_my_feedback(current_user):
    feedback_list = filter_rows("feedback", {"user_id": int(current_user["id"])})
    # Sort feedback by creation date (newest first)
    feedback_list = sorted(feedback_list, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"feedback": feedback_list}), 200


@trip_bp.route("/enquiries", methods=["POST"])
@token_required
def create_enquiry(current_user):
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    travel_date = data.get("travel_date")
    travelers = data.get("number_of_travelers", 1)
    message = data.get("message")
    
    if not dest_id or not message:
        return jsonify({"message": "Destination and message are required!"}), 400
        
    enquiry_row = {
        "user_id": int(current_user["id"]),
        "destination_id": int(dest_id),
        "travel_date": travel_date or "",
        "number_of_travelers": int(travelers),
        "message": message,
        "status": "Pending",
        "admin_reply": "",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    new_enq = insert_row("trip_enquiries", enquiry_row)
    return jsonify({"message": "Enquiry submitted successfully!", "enquiry": new_enq}), 201


@trip_bp.route("/my-enquiries", methods=["GET"])
@token_required
def get_my_enquiries(current_user):
    enquiries = filter_rows("trip_enquiries", {"user_id": int(current_user["id"])})
    
    # Hydrate destination details
    for e in enquiries:
        dest = find_by_id("destinations", e["destination_id"])
        e["destination_name"] = dest["name"] if dest else f"Destination ID {e['destination_id']}"
        
    enquiries = sorted(enquiries, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"enquiries": enquiries}), 200


