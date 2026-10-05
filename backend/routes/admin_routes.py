import datetime
import os
import time
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.config import Config
from backend.utils.csv_manager import load_csv, save_csv, insert_row, update_row, delete_row, find_by_id, find_by_field, filter_rows, clean_records
from backend.utils.auth import admin_required, hash_password, is_valid_email, is_valid_password

admin_bp = Blueprint("admin", __name__)

# Helper to cast types safely
def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default

# ----------------- ANALYTICS -----------------
@admin_bp.route("/analytics", methods=["GET"])
@admin_required
def get_analytics(current_admin):
    """
    Returns high-level statistics for the admin dashboard.
    """
    users_df = load_csv("users")
    dest_df = load_csv("destinations")
    hotels_df = load_csv("hotels")
    trips_df = load_csv("saved_trips")
    complaints_df = load_csv("complaints")
    reviews_df = load_csv("reviews")
    
    total_users = len(users_df)
    total_destinations = len(dest_df)
    total_trips = len(trips_df)
    total_complaints = len(complaints_df)
    
    pending_complaints = len(complaints_df[complaints_df["status"].astype(str).str.lower() == "pending"]) if not complaints_df.empty else 0
    import pandas as pd
    total_reviews = len(reviews_df)
    avg_rating = 0.0
    if not reviews_df.empty:
        ratings = pd.to_numeric(reviews_df["rating"], errors="coerce").dropna()
        if not ratings.empty:
            avg_rating = round(float(ratings.mean()), 1)

    
    # Destination share in planned trips
    dest_distribution = {}
    if not trips_df.empty and not dest_df.empty:
        counts = trips_df["destination_id"].value_counts().to_dict()
        for dest_id, count in counts.items():
            dest_name = dest_df[dest_df["id"] == int(dest_id)]
            name = dest_name.iloc[0]["name"] if not dest_name.empty else f"ID {dest_id}"
            dest_distribution[name] = int(count)

    return jsonify({
        "stats": {
            "users": total_users,
            "destinations": total_destinations,
            "trips_planned": total_trips,
            "total_complaints": total_complaints,
            "pending_complaints": pending_complaints,
            "average_rating": avg_rating,
            "total_reviews": total_reviews
        },
        "dest_distribution": dest_distribution
    }), 200

# ----------------- IMAGE UPLOAD -----------------
@admin_bp.route("/upload-image", methods=["POST"])
@admin_required
def upload_image(current_admin):
    if "image" not in request.files and "file" not in request.files and "photo" not in request.files:
        return jsonify({"message": "No image file provided"}), 400
    file = request.files.get("image") or request.files.get("file") or request.files.get("photo")
    if not file or not file.filename:
        return jsonify({"message": "Invalid image file"}), 400

    filename = f"dest_{int(time.time())}_{secure_filename(file.filename)}"
    save_path = os.path.join(Config.UPLOAD_DIR, filename)
    file.save(save_path)
    image_url = f"http://localhost:5000/api/uploads/{filename}"
    return jsonify({
        "message": "Image uploaded successfully!",
        "image_url": image_url,
        "relative_url": f"/api/uploads/{filename}"
    }), 201

# ----------------- DESTINATIONS -----------------
@admin_bp.route("/destinations", methods=["POST"])
@admin_required
def create_destination(current_admin):
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"message": "Destination name is required"}), 400
        
    dest_df = load_csv("destinations")
    if not dest_df.empty:
        exists = dest_df[dest_df["name"].astype(str).str.lower() == name.lower()]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    dest_row = {
        "name": name,
        "state": data.get("state", ""),
        "city": data.get("city", ""),
        "local_cities": data.get("local_cities", ""),
        "category": data.get("category", "nature").lower(),
        "description": data.get("description", ""),
        "best_time": data.get("best_time", ""),
        "budget_min": safe_float(data.get("budget_min"), 5000),
        "budget_max": safe_float(data.get("budget_max"), 15000),
        "image_url": data.get("image_url", "")
    }
    
    new_dest = insert_row("destinations", dest_row)
    return jsonify({"message": "Destination created successfully!", "destination": new_dest}), 201

@admin_bp.route("/destinations/<int:id_val>", methods=["PUT"])
@admin_required
def edit_destination(current_admin, id_val):
    data = request.get_json() or {}
    
    existing = find_by_id("destinations", id_val)
    if not existing:
        return jsonify({"message": "Destination not found"}), 404
        
    new_name = data.get("name", existing.get("name", ""))
    dest_df = load_csv("destinations")
    if not dest_df.empty:
        exists = dest_df[(dest_df["name"].astype(str).str.lower() == new_name.lower()) & (dest_df["id"] != int(id_val))]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    update_data = {}
    for col in ["name", "state", "city", "local_cities", "category", "description", "best_time", "image_url"]:
        if col in data:
            update_data[col] = data[col]
            if col == "category":
                update_data[col] = update_data[col].lower()
                
    if "budget_min" in data:
        update_data["budget_min"] = safe_float(data["budget_min"])
    if "budget_max" in data:
        update_data["budget_max"] = safe_float(data["budget_max"])
        
    updated = update_row("destinations", id_val, update_data)
    if updated:
        return jsonify({"message": "Destination updated successfully!"}), 200
    return jsonify({"message": "Destination not found"}), 404

@admin_bp.route("/destinations/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_destination(current_admin, id_val):
    deleted = delete_row("destinations", id_val)
    if deleted:
        return jsonify({"message": "Destination deleted successfully!"}), 200
    return jsonify({"message": "Destination not found"}), 404

# ----------------- HOTELS -----------------
@admin_bp.route("/hotels", methods=["POST"])
@admin_required
def create_hotel(current_admin):
    data = request.get_json() or {}
    name = data.get("name")
    dest_id = data.get("destination_id")
    if not name or not dest_id:
        return jsonify({"message": "Hotel name and destination_id are required"}), 400
        
    hotels_df = load_csv("hotels")
    if not hotels_df.empty:
        room_type = data.get("room_type", "Standard")
        exists = hotels_df[(hotels_df["destination_id"] == safe_int(dest_id)) & 
                           (hotels_df["name"].astype(str).str.lower() == name.lower()) & 
                           (hotels_df["room_type"].astype(str).str.lower() == room_type.lower())]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    price_val = data.get("price_per_night") if data.get("price_per_night") is not None else data.get("price_per_day")
    hotel_row = {
        "destination_id": safe_int(dest_id),
        "name": name,
        "hotel_type": data.get("hotel_type", "Hotel"),
        "price_per_night": safe_float(price_val, 1500.0),
        "rating": safe_float(data.get("rating"), 4.0),
        "address": data.get("address", ""),
        "total_rooms": safe_int(data.get("total_rooms"), 10),
        "available_rooms": safe_int(data.get("available_rooms"), 10),
        "amenities": data.get("amenities", ""),
        "room_type": data.get("room_type", "Standard"),
        "booking_url": data.get("booking_url", "")
    }
    
    new_hotel = insert_row("hotels", hotel_row)
    return jsonify({"message": "Hotel created successfully!", "hotel": new_hotel}), 201

@admin_bp.route("/hotels/<int:id_val>", methods=["PUT"])
@admin_required
def edit_hotel(current_admin, id_val):
    data = request.get_json() or {}
    
    existing = find_by_id("hotels", id_val)
    if not existing:
        return jsonify({"message": "Hotel not found"}), 404
        
    new_name = data.get("name", existing.get("name", ""))
    new_dest_id = safe_int(data.get("destination_id", existing.get("destination_id", 0)))
    new_room_type = data.get("room_type", existing.get("room_type", "Standard"))
    
    hotels_df = load_csv("hotels")
    if not hotels_df.empty:
        exists = hotels_df[(hotels_df["destination_id"] == new_dest_id) & 
                           (hotels_df["name"].astype(str).str.lower() == new_name.lower()) & 
                           (hotels_df["room_type"].astype(str).str.lower() == new_room_type.lower()) & 
                           (hotels_df["id"] != int(id_val))]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    update_data = {}
    for col in ["name", "hotel_type", "address", "amenities", "room_type", "booking_url"]:
        if col in data:
            update_data[col] = data[col]
            
    if "destination_id" in data:
        update_data["destination_id"] = safe_int(data["destination_id"])
    if "price_per_night" in data or "price_per_day" in data:
        price_val = data.get("price_per_night") if "price_per_night" in data else data.get("price_per_day")
        update_data["price_per_night"] = safe_float(price_val)
    if "rating" in data:
        update_data["rating"] = safe_float(data["rating"])
    if "total_rooms" in data:
        update_data["total_rooms"] = safe_int(data["total_rooms"])
    if "available_rooms" in data:
        update_data["available_rooms"] = safe_int(data["available_rooms"])
        
    updated = update_row("hotels", id_val, update_data)
    if updated:
        return jsonify({"message": "Hotel updated successfully!"}), 200
    return jsonify({"message": "Hotel not found"}), 404

@admin_bp.route("/hotels/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_hotel(current_admin, id_val):
    deleted = delete_row("hotels", id_val)
    if deleted:
        return jsonify({"message": "Hotel deleted successfully!"}), 200
    return jsonify({"message": "Hotel not found"}), 404

# ----------------- RESTAURANTS -----------------
@admin_bp.route("/restaurants", methods=["POST"])
@admin_required
def create_restaurant(current_admin):
    data = request.get_json() or {}
    name = data.get("name")
    dest_id = data.get("destination_id")
    if not name or not dest_id:
        return jsonify({"message": "Restaurant name and destination_id are required"}), 400
        
    rest_df = load_csv("restaurants")
    if not rest_df.empty:
        exists = rest_df[(rest_df["destination_id"] == safe_int(dest_id)) & (rest_df["name"].astype(str).str.lower() == name.lower())]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    rest_row = {
        "destination_id": safe_int(dest_id),
        "name": name,
        "cuisine": data.get("cuisine", "Local Cuisine"),
        "avg_cost": safe_float(data.get("avg_cost"), 300.0),
        "rating": safe_float(data.get("rating"), 4.0),
        "address": data.get("address", "")
    }
    
    new_rest = insert_row("restaurants", rest_row)
    return jsonify({"message": "Restaurant created successfully!", "restaurant": new_rest}), 201

@admin_bp.route("/restaurants/<int:id_val>", methods=["PUT"])
@admin_required
def edit_restaurant(current_admin, id_val):
    data = request.get_json() or {}
    
    existing = find_by_id("restaurants", id_val)
    if not existing:
        return jsonify({"message": "Restaurant not found"}), 404
        
    new_name = data.get("name", existing.get("name", ""))
    new_dest_id = safe_int(data.get("destination_id", existing.get("destination_id", 0)))
    
    rest_df = load_csv("restaurants")
    if not rest_df.empty:
        exists = rest_df[(rest_df["destination_id"] == new_dest_id) & 
                        (rest_df["name"].astype(str).str.lower() == new_name.lower()) & 
                        (rest_df["id"] != int(id_val))]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    update_data = {}
    for col in ["name", "cuisine", "address"]:
        if col in data:
            update_data[col] = data[col]
            
    if "destination_id" in data:
        update_data["destination_id"] = safe_int(data["destination_id"])
    if "avg_cost" in data:
        update_data["avg_cost"] = safe_float(data["avg_cost"])
    if "rating" in data:
        update_data["rating"] = safe_float(data["rating"])
        
    updated = update_row("restaurants", id_val, update_data)
    if updated:
        return jsonify({"message": "Restaurant updated successfully!"}), 200
    return jsonify({"message": "Restaurant not found"}), 404

@admin_bp.route("/restaurants/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_restaurant(current_admin, id_val):
    deleted = delete_row("restaurants", id_val)
    if deleted:
        return jsonify({"message": "Restaurant deleted successfully!"}), 200
    return jsonify({"message": "Restaurant not found"}), 404

# ----------------- ATTRACTIONS -----------------
@admin_bp.route("/attractions", methods=["GET"])
@admin_required
def get_attractions(current_admin):
    attractions_df = load_csv("attractions")
    attractions = clean_records(attractions_df.to_dict(orient="records")) if not attractions_df.empty else []
    return jsonify({"attractions": attractions}), 200


@admin_bp.route("/attractions", methods=["POST"])
@admin_required
def create_attraction(current_admin):
    data = request.get_json() or {}
    name = data.get("name")
    dest_id = data.get("destination_id")
    if not name or not dest_id:
        return jsonify({"message": "Attraction name and destination_id are required"}), 400
        
    attr_row = {
        "destination_id": safe_int(dest_id),
        "name": name,
        "description": data.get("description", ""),
        "entry_fee": safe_float(data.get("entry_fee"), 0.0),
        "visit_time": data.get("visit_time", "2 Hours")
    }
    
    new_attr = insert_row("attractions", attr_row)
    return jsonify({"message": "Attraction created successfully!", "attraction": new_attr}), 201

@admin_bp.route("/attractions/<int:id_val>", methods=["PUT"])
@admin_required
def edit_attraction(current_admin, id_val):
    data = request.get_json() or {}
    update_data = {}
    
    for col in ["name", "description", "visit_time"]:
        if col in data:
            update_data[col] = data[col]
            
    if "destination_id" in data:
        update_data["destination_id"] = safe_int(data["destination_id"])
    if "entry_fee" in data:
        update_data["entry_fee"] = safe_float(data["entry_fee"])
        
    updated = update_row("attractions", id_val, update_data)
    if updated:
        return jsonify({"message": "Attraction updated successfully!"}), 200
    return jsonify({"message": "Attraction not found"}), 404

@admin_bp.route("/attractions/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_attraction(current_admin, id_val):
    deleted = delete_row("attractions", id_val)
    if deleted:
        return jsonify({"message": "Attraction deleted successfully!"}), 200
    return jsonify({"message": "Attraction not found"}), 404

# ----------------- TRANSPORTATION -----------------
@admin_bp.route("/transportation", methods=["POST"])
@admin_required
def create_transport(current_admin):
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    trans_type = data.get("transport_type")
    if not dest_id or not trans_type:
        return jsonify({"message": "destination_id and transport_type are required"}), 400
        
    trans_df = load_csv("transportation")
    if not trans_df.empty:
        src = data.get("source", "Kochi")
        dest = data.get("destination", "")
        exists = trans_df[
            (trans_df["destination_id"] == safe_int(dest_id)) & 
            (trans_df["transport_type"].astype(str).str.lower() == trans_type.lower()) & 
            (trans_df["source"].astype(str).str.lower() == src.lower()) & 
            (trans_df["destination"].astype(str).str.lower() == dest.lower())
        ]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    trans_row = {
        "destination_id": safe_int(dest_id),
        "transport_type": trans_type,
        "source": data.get("source", "Kochi"),
        "destination": data.get("destination", ""),
        "travel_time": data.get("travel_time", "2 Hours"),
        "fare": safe_float(data.get("fare"), 500.0),
        "distance": safe_float(data.get("distance"), 100.0),
        "availability": data.get("availability", "available")
    }
    
    new_trans = insert_row("transportation", trans_row)
    return jsonify({"message": "Transportation option added successfully!", "transportation": new_trans}), 201

@admin_bp.route("/transportation/<int:id_val>", methods=["PUT"])
@admin_required
def edit_transport(current_admin, id_val):
    data = request.get_json() or {}
    
    existing = find_by_id("transportation", id_val)
    if not existing:
        return jsonify({"message": "Transportation not found"}), 404
        
    new_dest_id = safe_int(data.get("destination_id", existing.get("destination_id", 0)))
    new_trans_type = data.get("transport_type", existing.get("transport_type", ""))
    new_source = data.get("source", existing.get("source", "Kochi"))
    new_destination = data.get("destination", existing.get("destination", ""))
    
    trans_df = load_csv("transportation")
    if not trans_df.empty:
        exists = trans_df[
            (trans_df["destination_id"] == new_dest_id) & 
            (trans_df["transport_type"].astype(str).str.lower() == new_trans_type.lower()) & 
            (trans_df["source"].astype(str).str.lower() == new_source.lower()) & 
            (trans_df["destination"].astype(str).str.lower() == new_destination.lower()) & 
            (trans_df["id"] != int(id_val))
        ]
        if not exists.empty:
            return jsonify({"message": "already existed"}), 400

    update_data = {}
    for col in ["transport_type", "source", "destination", "travel_time", "availability"]:
        if col in data:
            update_data[col] = data[col]
            
    if "destination_id" in data:
        update_data["destination_id"] = safe_int(data["destination_id"])
    if "fare" in data:
        update_data["fare"] = safe_float(data["fare"])
    if "distance" in data:
        update_data["distance"] = safe_float(data["distance"])
        
    updated = update_row("transportation", id_val, update_data)
    if updated:
        return jsonify({"message": "Transportation updated successfully!"}), 200
    return jsonify({"message": "Transportation not found"}), 404

@admin_bp.route("/transportation/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_transport(current_admin, id_val):
    deleted = delete_row("transportation", id_val)
    if deleted:
        return jsonify({"message": "Transportation deleted successfully!"}), 200
    return jsonify({"message": "Transportation not found"}), 404

# ----------------- USERS & TRIPS OVERVIEW -----------------
@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users(current_admin):
    users = clean_records(load_csv("users").to_dict(orient="records"))
    # Strip passwords
    for u in users:
        u.pop("password_hash", None)
    return jsonify({"users": users}), 200

@admin_bp.route("/users", methods=["POST"])
@admin_required
def create_user(current_admin):
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = data.get("phone", "")
    password = data.get("password")
    
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required!"}), 400
        
    if len(name) < 3:
        return jsonify({"message": "Name must be at least 3 characters long!"}), 400
        
    if not is_valid_email(email):
        return jsonify({"message": "Please enter a valid email address!"}), 400
        
    is_valid_pass, pass_err = is_valid_password(password)
    if not is_valid_pass:
        return jsonify({"message": pass_err}), 400
        
    # Check if email is already taken
    existing_user = find_by_field("users", "email", email)
    if existing_user:
        return jsonify({"message": "User with this email already exists!"}), 400
        
    user_row = {
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "phone": phone,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    new_user = insert_row("users", user_row)
    
    # Strip password hash before returning
    new_user.pop("password_hash", None)
    
    return jsonify({
        "message": "User created successfully!",
        "user": new_user
    }), 201

@admin_bp.route("/users/<int:id_val>", methods=["PUT"])
@admin_required
def update_user(current_admin, id_val):
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    
    user = find_by_id("users", id_val)
    if not user:
        return jsonify({"message": "User not found!"}), 404
        
    update_data = {}
    if name:
        if len(name) < 3:
            return jsonify({"message": "Name must be at least 3 characters long!"}), 400
        update_data["name"] = name
        
    if email:
        email = email.strip().lower()
        if not is_valid_email(email):
            return jsonify({"message": "Please enter a valid email address!"}), 400
        # Check if email is already in use by someone else
        existing = find_by_field("users", "email", email)
        if existing and int(existing["id"]) != id_val:
            return jsonify({"message": "Email is already taken by another account!"}), 400
        update_data["email"] = email
        
    if phone is not None:
        update_data["phone"] = phone
        
    if password:
        is_valid_pass, pass_err = is_valid_password(password)
        if not is_valid_pass:
            return jsonify({"message": pass_err}), 400
        update_data["password_hash"] = hash_password(password)
        
    if not update_data:
        return jsonify({"message": "No fields to update!"}), 400
        
    updated = update_row("users", id_val, update_data)
    if not updated:
        return jsonify({"message": "Failed to update user profile!"}), 500
        
    # Get updated user profile
    updated_user = find_by_id("users", id_val)
    updated_user.pop("password_hash", None)
    
    return jsonify({
        "message": "User profile updated successfully!",
        "user": updated_user
    }), 200

@admin_bp.route("/trips", methods=["GET"])
@admin_required
def get_all_trips(current_admin):
    raw_trips = load_csv("saved_trips").to_dict(orient="records")
    trips = clean_records(raw_trips) if raw_trips else []
    
    # Hydrate user details and destination details
    for t in trips:
        user = find_by_id("users", t.get("user_id"))
        dest = find_by_id("destinations", t.get("destination_id"))
        
        t["user_name"] = user.get("name") if user else f"User ID {t.get('user_id')}"
        t["user_email"] = user.get("email") if user else ""
        t["destination_name"] = dest.get("name") if dest else f"Dest ID {t.get('destination_id')}"
        t["destination_image"] = dest.get("image_url", "") if dest else ""

    # Sort trips by creation date (newest first)
    trips = sorted(trips, key=lambda x: str(x.get("created_at", "")), reverse=True)
    return jsonify({"trips": trips}), 200

@admin_bp.route("/trips/<int:id_val>", methods=["DELETE"])
@admin_required
def delete_admin_trip(current_admin, id_val):
    success = delete_row("saved_trips", id_val)
    if success:
        return jsonify({"message": "Planned trip deleted successfully!"}), 200
    return jsonify({"message": "Trip not found"}), 404

# ----------------- COMPLAINTS -----------------
@admin_bp.route("/complaints", methods=["GET"])
@admin_required
def get_all_complaints(current_admin):
    complaints = clean_records(load_csv("complaints").to_dict(orient="records"))
    
    for c in complaints:
        user = find_by_id("users", c["user_id"])
        c["user_name"] = user["name"] if user else f"User ID {c['user_id']}"
        c["user_email"] = user["email"] if user else ""
        
    # Newest first
    complaints = sorted(complaints, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"complaints": complaints}), 200

@admin_bp.route("/complaints/<int:id_val>", methods=["PUT"])
@admin_required
def reply_complaint(current_admin, id_val):
    data = request.get_json() or {}
    admin_reply = data.get("admin_reply")
    status = data.get("status")  # Pending, In Progress, Resolved
    priority = data.get("priority") # Low, Medium, High, Urgent
    
    update_data = {}
    if admin_reply is not None:
        update_data["admin_reply"] = admin_reply
    if status:
        update_data["status"] = status

    if priority:
        complaint = find_by_id("complaints", id_val)
        if complaint and complaint.get("subject"):
            subj = complaint.get("subject", "")
            if subj.startswith("["):
                parts = subj.split("]", 1)
                display_subj = parts[1].strip() if len(parts) > 1 else subj
                update_data["subject"] = f"[{priority}] {display_subj}"
            else:
                update_data["subject"] = f"[{priority}] {subj}"
        
    if not update_data:
        return jsonify({"message": "No reply content or status provided"}), 400
        
    updated = update_row("complaints", id_val, update_data)
    if updated:
        return jsonify({"message": "Complaint updated successfully!"}), 200
    return jsonify({"message": "Complaint not found"}), 404

@admin_bp.route("/complaints/<int:id_val>", methods=["DELETE"])
@admin_required
def delete_complaint(current_admin, id_val):
    success = delete_row("complaints", id_val)
    if success:
        return jsonify({"message": "Complaint deleted successfully!"}), 200
    return jsonify({"message": "Complaint not found"}), 404

# ----------------- REVIEWS -----------------
@admin_bp.route("/reviews", methods=["GET"])
@admin_required
def get_all_reviews(current_admin):
    reviews = load_csv("reviews").to_dict(orient="records")
    for r in reviews:
        user = find_by_id("users", r["user_id"])
        dest = find_by_id("destinations", r["destination_id"])
        r["user_name"] = user["name"] if user else f"User ID {r['user_id']}"
        r["destination_name"] = dest["name"] if dest else f"Dest ID {r['destination_id']}"
        
    reviews = sorted(reviews, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"reviews": reviews}), 200

@admin_bp.route("/reviews/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_review(current_admin, id_val):
    deleted = delete_row("reviews", id_val)
    if deleted:
        return jsonify({"message": "Review deleted successfully!"}), 200
    return jsonify({"message": "Review not found"}), 404

# ----------------- FEEDBACK -----------------
@admin_bp.route("/feedback", methods=["GET"])
@admin_required
def get_all_feedback(current_admin):
    feedback = load_csv("feedback").to_dict(orient="records")
    for f in feedback:
        user = find_by_id("users", f["user_id"])
        f["user_name"] = user["name"] if user else f"User ID {f['user_id']}"
        
    feedback = sorted(feedback, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"feedback": feedback}), 200

# ----------------- CHATBOT LOGS -----------------
@admin_bp.route("/chatbot-logs", methods=["GET"])
@admin_required
def get_chatbot_logs(current_admin):
    logs = load_csv("chatbot_logs").to_dict(orient="records")
    for l in logs:
        if l["user_id"] != 0:
            user = find_by_id("users", l["user_id"])
            l["user_name"] = user["name"] if user else f"User ID {l['user_id']}"
        else:
            l["user_name"] = "Anonymous Guest"
            
    logs = sorted(logs, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"logs": logs}), 200

# ----------------- WEATHER CACHE MANAGEMENT -----------------
@admin_bp.route("/weather", methods=["GET"])
@admin_required
def get_weather_cache(current_admin):
    weather_data = load_csv("weather_cache").to_dict(orient="records")
    for w in weather_data:
        dest = find_by_id("destinations", w["destination_id"])
        w["destination_name"] = dest["name"] if dest else f"Destination ID {w['destination_id']}"
    return jsonify({"weather": weather_data}), 200

@admin_bp.route("/weather", methods=["POST"])
@admin_required
def create_weather_cache(current_admin):
    data = request.get_json() or {}
    dest_id = data.get("destination_id")
    if not dest_id:
        return jsonify({"message": "destination_id is required"}), 400
        
    weather_row = {
        "destination_id": safe_int(dest_id),
        "temperature": safe_float(data.get("temperature"), 25.0),
        "humidity": safe_float(data.get("humidity"), 60.0),
        "weather": data.get("weather", "Sunny"),
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    new_weather = insert_row("weather_cache", weather_row)
    return jsonify({"message": "Weather cache record created!", "weather": new_weather}), 201

@admin_bp.route("/weather/<int:id_val>", methods=["PUT"])
@admin_required
def edit_weather_cache(current_admin, id_val):
    data = request.get_json() or {}
    update_data = {}
    
    if "destination_id" in data:
        update_data["destination_id"] = safe_int(data["destination_id"])
    if "temperature" in data:
        update_data["temperature"] = safe_float(data["temperature"])
    if "humidity" in data:
        update_data["humidity"] = safe_float(data["humidity"])
    if "weather" in data:
        update_data["weather"] = data["weather"]
        
    update_data["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    updated = update_row("weather_cache", id_val, update_data)
    if updated:
        return jsonify({"message": "Weather cache record updated successfully!"}), 200
    return jsonify({"message": "Weather cache record not found"}), 404

@admin_bp.route("/weather/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_weather_cache(current_admin, id_val):
    deleted = delete_row("weather_cache", id_val)
    if deleted:
        return jsonify({"message": "Weather cache record deleted successfully!"}), 200
    return jsonify({"message": "Weather cache record not found"}), 404

# ----------------- TRIP DIARY MANAGEMENT -----------------
@admin_bp.route("/diaries", methods=["GET"])
@admin_required
def get_all_diaries(current_admin):
    diaries = load_csv("trip_diary").to_dict(orient="records")
    for d in diaries:
        user = find_by_id("users", d["user_id"])
        dest = find_by_id("destinations", d["destination_id"])
        d["user_name"] = user["name"] if user else f"User ID {d['user_id']}"
        d["destination_name"] = dest["name"] if dest else f"Dest ID {d['destination_id']}"
        
    diaries = sorted(diaries, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"diaries": diaries}), 200

@admin_bp.route("/diaries/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_diary(current_admin, id_val):
    deleted = delete_row("trip_diary", id_val)
    if deleted:
        return jsonify({"message": "Diary entry deleted successfully!"}), 200
    return jsonify({"message": "Diary entry not found"}), 404

# ----------------- DELETE USERS & FEEDBACK -----------------
@admin_bp.route("/users/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_user(current_admin, id_val):
    user = find_by_id("users", id_val)
    if not user:
        return jsonify({"message": "User not found!"}), 404

    deleted = delete_row("users", id_val)
    if deleted:
        # Cascading delete of user-related data
        for table_name in ["saved_trips", "reviews", "feedback", "trip_diary", "complaints", "chatbot_logs", "trip_enquiries"]:
            try:
                df = load_csv(table_name)
                if not df.empty and "user_id" in df.columns:
                    df = df[pd.to_numeric(df["user_id"], errors="coerce") != int(id_val)]
                    save_csv(table_name, df)
            except Exception as e:
                print(f"Error cascading delete for {table_name}: {e}")
        return jsonify({"message": "User and associated records deleted successfully!"}), 200
    return jsonify({"message": "Failed to delete user!"}), 500

@admin_bp.route("/feedback/<int:id_val>", methods=["DELETE"])
@admin_required
def remove_feedback(current_admin, id_val):
    deleted = delete_row("feedback", id_val)
    if deleted:
        return jsonify({"message": "Feedback deleted successfully!"}), 200
    return jsonify({"message": "Feedback not found"}), 404

# ----------------- ADMIN LIST UNFILTERED ENDPOINTS -----------------
@admin_bp.route("/hotels", methods=["GET"])
@admin_required
def list_hotels(current_admin):
    dest_id = request.args.get("destination_id")
    df = load_csv("hotels")
    if df.empty:
        return jsonify({"hotels": []}), 200
    if dest_id:
        df = df[df["destination_id"] == int(dest_id)]
    return jsonify({"hotels": clean_records(df.to_dict(orient="records"))}), 200

@admin_bp.route("/restaurants", methods=["GET"])
@admin_required
def list_restaurants(current_admin):
    dest_id = request.args.get("destination_id")
    df = load_csv("restaurants")
    if df.empty:
        return jsonify({"restaurants": []}), 200
    if dest_id:
        df = df[df["destination_id"] == int(dest_id)]
    return jsonify({"restaurants": clean_records(df.to_dict(orient="records"))}), 200

@admin_bp.route("/transportation", methods=["GET"])
@admin_required
def list_transportation(current_admin):
    dest_id = request.args.get("destination_id")
    df = load_csv("transportation")
    if df.empty:
        return jsonify({"transportation": []}), 200
    if dest_id:
        df = df[df["destination_id"] == int(dest_id)]
    return jsonify({"transportation": clean_records(df.to_dict(orient="records"))}), 200


# ----------------- TRIP ENQUIRIES -----------------
@admin_bp.route("/enquiries", methods=["GET"])
@admin_required
def get_all_enquiries(current_admin):
    enquiries = load_csv("trip_enquiries").to_dict(orient="records")
    for e in enquiries:
        user = find_by_id("users", e["user_id"])
        dest = find_by_id("destinations", e["destination_id"])
        e["user_name"] = user["name"] if user else f"User ID {e['user_id']}"
        e["user_email"] = user["email"] if user else "N/A"
        e["destination_name"] = dest["name"] if dest else f"Dest ID {e['destination_id']}"
        
    enquiries = sorted(enquiries, key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify({"enquiries": clean_records(enquiries)}), 200


@admin_bp.route("/enquiries/<int:id_val>", methods=["PUT"])
@admin_required
def reply_enquiry(current_admin, id_val):
    data = request.get_json() or {}
    admin_reply = data.get("admin_reply")
    status = data.get("status", "Resolved")
    
    if not admin_reply:
        return jsonify({"message": "admin_reply is required!"}), 400
        
    update_data = {
        "admin_reply": admin_reply,
        "status": status
    }
    
    updated = update_row("trip_enquiries", id_val, update_data)
    if updated:
        return jsonify({"message": "Enquiry resolved successfully!"}), 200
    return jsonify({"message": "Enquiry not found!"}), 404


