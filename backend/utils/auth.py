import datetime
import re
from functools import wraps
import jwt
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from backend.config import Config
from backend.utils.csv_manager import find_by_id

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$')

def is_valid_email(email):
    """Validates if an email string adheres to standard email formatting rules."""
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > 254 or ".." in email or email.startswith(".") or email.endswith("."):
        return False
    return bool(EMAIL_REGEX.match(email))

def is_valid_password(password):
    """Validates if a password meets security rules (min 6 chars, contains letter and digit)."""
    if not password or not isinstance(password, str):
        return False, "Password is required!"
    if len(password) < 6:
        return False, "Password must be at least 6 characters long!"
    if not re.search(r'[a-zA-Z]', password) or not re.search(r'\d', password):
        return False, "Password must contain at least one letter and one number!"
    return True, ""

PHONE_REGEX = re.compile(r'^\+?[0-9\s\-\(\)]{7,15}$')

def is_valid_phone(phone):
    """Validates if phone number is valid (optional field, but if provided must be 7-15 digits)."""
    if not phone or not isinstance(phone, str) or not phone.strip():
        return True
    phone_clean = phone.strip()
    digits_only = re.sub(r'\D', '', phone_clean)
    if len(digits_only) < 7 or len(digits_only) > 15:
        return False
    return bool(PHONE_REGEX.match(phone_clean))




def hash_password(password):
    """Hashes a password using Werkzeug's default pbkdf2:sha256 method."""
    return generate_password_hash(password)

def check_password(hashed_password, password):
    """Checks if a password matches its hashed form."""
    if not hashed_password or not password:
        return False
    return check_password_hash(hashed_password, password)

def generate_token(user_id, username, is_admin=False):
    """Generates a JWT token valid for 24 hours."""
    payload = {
        "user_id": int(user_id),
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def token_required(f):
    """Decorator to require JWT authentication for an endpoint."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check Authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
        
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user = None
            if data.get("is_admin"):
                # Handle admin
                admin = find_by_id("admins", data["user_id"])
                if admin:
                    current_user = {
                        "id": admin["id"],
                        "username": admin["username"],
                        "is_admin": True
                    }
            else:
                # Handle standard user
                user = find_by_id("users", data["user_id"])
                if user:
                    current_user = {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "phone": user.get("phone", ""),
                        "is_admin": False
                    }
            
            if not current_user:
                return jsonify({"message": "User not found!"}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token is invalid!"}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def optional_token(f):
    """Decorator that attaches current_user if authenticated, or defaults to fallback traveler user (ID 3)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        current_user = None
        if token:
            try:
                data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
                if data.get("is_admin"):
                    admin = find_by_id("admins", data["user_id"])
                    if admin:
                        current_user = {"id": admin["id"], "username": admin["username"], "is_admin": True}
                else:
                    user = find_by_id("users", data["user_id"])
                    if user:
                        current_user = {"id": user["id"], "name": user["name"], "email": user["email"], "phone": user.get("phone", ""), "is_admin": False}
            except Exception:
                pass
                
        if not current_user:
            current_user = {"id": 3, "name": "Traveler User", "email": "traveler@auratravel.ai", "is_admin": False}
            
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to require Admin privileges for an endpoint."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
            
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            if not data.get("is_admin"):
                return jsonify({"message": "Admin privileges required!"}), 403
                
            admin = find_by_id("admins", data["user_id"])
            if not admin:
                return jsonify({"message": "Admin user not found!"}), 401
                
            current_admin = {
                "id": admin["id"],
                "username": admin["username"],
                "is_admin": True
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token is invalid!"}), 401
            
        return f(current_admin, *args, **kwargs)
    return decorated
