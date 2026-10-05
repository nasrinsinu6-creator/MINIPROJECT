import datetime
from flask import Blueprint, request, jsonify
from backend.utils.csv_manager import load_csv, insert_row, update_row, find_by_field, find_by_id
from backend.utils.auth import hash_password, check_password, generate_token, token_required, is_valid_email, is_valid_password, is_valid_phone

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    phone = data.get("phone", "")
    
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required!"}), 400
        
    if not is_valid_email(email):
        return jsonify({"message": "Please enter a valid email address!"}), 400
        
    is_valid_pass, pass_err = is_valid_password(password)
    if not is_valid_pass:
        return jsonify({"message": pass_err}), 400
        
    # Check if user already exists
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
    
    # Generate token automatically after registration
    token = generate_token(new_user["id"], new_user["name"], is_admin=False)
    
    return jsonify({
        "message": "User registered successfully!",
        "token": token,
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "phone": new_user["phone"],
            "is_admin": False
        }
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"message": "Email and password are required!"}), 400
        
    user = find_by_field("users", "email", email)
    if not user or not check_password(user["password_hash"], password):
        return jsonify({"message": "Invalid email or password!"}), 401
        
    token = generate_token(user["id"], user["name"], is_admin=False)
    
    return jsonify({
        "message": "Login successful!",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "is_admin": False
        }
    }), 200

@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"message": "Username and password are required!"}), 400
        
    admin = find_by_field("admins", "username", username)
    if not admin or not check_password(admin["password_hash"], password):
        return jsonify({"message": "Invalid admin username or password!"}), 401
        
    token = generate_token(admin["id"], admin["username"], is_admin=True)
    
    return jsonify({
        "message": "Admin login successful!",
        "token": token,
        "user": {
            "id": admin["id"],
            "username": admin["username"],
            "is_admin": True
        }
    }), 200

@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    # Admins don't have separate profile tables beyond admins.csv
    if current_user.get("is_admin"):
        return jsonify({"user": current_user}), 200
        
    # Re-fetch from DB to get fresh data
    user = find_by_id("users", current_user["id"])
    if not user:
        return jsonify({"message": "User not found!"}), 404
        
    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "created_at": user["created_at"],
            "is_admin": False
        }
    }), 200

@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    if current_user.get("is_admin"):
        return jsonify({"message": "Admins cannot modify profile via this endpoint"}), 400
        
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone", "")
    password = data.get("password")
    
    update_data = {}
    if name is not None:
        name_clean = name.strip()
        if not name_clean or len(name_clean) < 2:
            return jsonify({"message": "Full name must be at least 2 characters long!"}), 400
        update_data["name"] = name_clean
    if email:
        email = email.strip().lower()
        if not is_valid_email(email):
            return jsonify({"message": "Please enter a valid email address!"}), 400
        # Check if email is already in use by someone else
        existing = find_by_field("users", "email", email)
        if existing and int(existing["id"]) != int(current_user["id"]):
            return jsonify({"message": "Email is already taken by another account!"}), 400
        update_data["email"] = email
    if phone is not None:
        phone_clean = phone.strip()
        if phone_clean and not is_valid_phone(phone_clean):
            return jsonify({"message": "Please enter a valid contact phone number (7 to 15 digits)!"}), 400
        update_data["phone"] = phone_clean
    if password:
        is_valid_pass, pass_err = is_valid_password(password)
        if not is_valid_pass:
            return jsonify({"message": pass_err}), 400
        update_data["password_hash"] = hash_password(password)
        
    if not update_data:
        return jsonify({"message": "No fields to update!"}), 400
        
    updated = update_row("users", current_user["id"], update_data)
    if not updated:
        return jsonify({"message": "Failed to update profile!"}), 500
        
    # Get updated user profile
    user = find_by_id("users", current_user["id"])
    
    return jsonify({
        "message": "Profile updated successfully!",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "is_admin": False
        }
    }), 200
