import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-ai-travel-planner")
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CSV_DATA_DIR = os.path.join(BASE_DIR, "csv_data")

    # Optional MySQL backend configuration
    DB_BACKEND = os.environ.get("DB_BACKEND", "csv").lower()
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3306"))
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "ai_travel_planner")

    # Ensure the CSV directory exists
    os.makedirs(CSV_DATA_DIR, exist_ok=True)

    # Uploads directory for user-uploaded images
    UPLOAD_DIR = os.path.join(CSV_DATA_DIR, "uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
