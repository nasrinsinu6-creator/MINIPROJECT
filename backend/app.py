from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.utils.csv_manager import init_db
from backend.utils.seed_data import seed_all_data
from backend.routes.auth_routes import auth_bp
from backend.routes.trip_routes import trip_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.chatbot_routes import chatbot_bp

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for the frontend origin
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize CSV tables and seed mock data
init_db()
seed_all_data()

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(trip_bp, url_prefix="/api")
app.register_blueprint(chatbot_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "AI Travel Planner API"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
