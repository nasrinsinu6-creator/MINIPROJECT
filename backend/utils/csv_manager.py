import os
import math
import numpy as np
import pandas as pd
from backend.config import Config

try:
    import mysql.connector as mysql_connector
except ImportError:  # pragma: no cover - optional dependency
    mysql_connector = None

# Define database schemas for all CSV tables
SCHEMAS = {
    "users.csv": ["id", "name", "email", "password_hash", "phone", "created_at"],
    "admins.csv": ["id", "username", "password_hash"],
    "destinations.csv": ["id", "name", "state", "city", "local_cities", "category", "description", "best_time", "budget_min", "budget_max", "image_url"],
    "attractions.csv": ["id", "destination_id", "name", "description", "entry_fee", "visit_time"],
    "hotels.csv": ["id", "destination_id", "name", "hotel_type", "price_per_night", "rating", "address", "total_rooms", "available_rooms", "amenities", "room_type", "booking_url"],
    "restaurants.csv": ["id", "destination_id", "name", "cuisine", "avg_cost", "rating", "address"],
    "transportation.csv": ["id", "destination_id", "transport_type", "source", "destination", "travel_time", "fare", "distance", "availability"],
    "saved_trips.csv": ["id", "user_id", "destination_id", "source_location", "budget", "travelers", "duration_days", "interests", "itinerary_text", "estimated_cost", "travel_date", "transport_type", "transport_fare", "travel_time", "distance", "created_at"],
    "reviews.csv": ["id", "user_id", "destination_id", "rating", "review", "created_at"],
    "feedback.csv": ["id", "user_id", "feedback", "created_at"],
    "trip_diary.csv": ["id", "user_id", "destination_id", "diary", "photo_path", "rating", "created_at"],
    "complaints.csv": ["id", "user_id", "subject", "description", "status", "admin_reply", "created_at"],
    "weather_cache.csv": ["id", "destination_id", "temperature", "humidity", "weather", "updated_at"],
    "chatbot_logs.csv": ["id", "user_id", "message", "response", "created_at"],
    "trip_enquiries.csv": ["id", "user_id", "destination_id", "travel_date", "number_of_travelers", "message", "status", "admin_reply", "created_at"]
}


def get_storage_backend():
    """Return the active storage backend, defaulting to CSV unless MySQL is configured."""
    return "mysql" if Config.DB_BACKEND == "mysql" else "csv"


def get_mysql_connection():
    """Create a MySQL connection when the optional dependency and config are available."""
    if get_storage_backend() != "mysql":
        return None
    if mysql_connector is None:
        raise RuntimeError("mysql-connector-python is not installed")

    return mysql_connector.connect(
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DATABASE,
        autocommit=True,
    )


def normalize_filename(filename):
    """Ensure the file name uses the expected .csv suffix."""
    return filename if filename.endswith(".csv") else f"{filename}.csv"


def get_table_name(filename):
    """Return the database table name for a given filename."""
    return normalize_filename(filename).replace(".csv", "")


def get_schema_columns(filename):
    """Return the schema columns for a given table name."""
    return SCHEMAS.get(normalize_filename(filename), [])


def get_file_path(filename):
    """Returns the absolute path to the CSV file inside Config.CSV_DATA_DIR."""
    return os.path.join(Config.CSV_DATA_DIR, normalize_filename(filename))


def init_db():
    """Initialize the configured storage backend, falling back to CSV if MySQL is unavailable."""
    if get_storage_backend() == "mysql":
        try:
            conn = get_mysql_connection()
        except Exception as exc:
            print(f"MySQL unavailable, falling back to CSV: {exc}")
            conn = None
        if conn is not None:
            cursor = conn.cursor()
            for filename, cols in SCHEMAS.items():
                table_name = get_table_name(filename)
                columns_sql = ", ".join([f"`{col}` VARCHAR(255)" for col in cols])
                cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` ({columns_sql})")
            cursor.close()
            conn.close()
            print("Initialized MySQL tables")
            return

    for filename, cols in SCHEMAS.items():
        path = get_file_path(filename)
        if not os.path.exists(path):
            df = pd.DataFrame(columns=cols)
            df.to_csv(path, index=False)
            print(f"Initialized CSV table: {filename}")
        else:
            df = pd.read_csv(path)
            missing_cols = [col for col in cols if col not in df.columns]
            if missing_cols:
                for col in missing_cols:
                    df[col] = None
                other_cols = [col for col in df.columns if col not in cols]
                df = df[[*cols, *other_cols]]
                df.to_csv(path, index=False)
                print(f"Updated CSV schema with columns {missing_cols} in {filename}")


def _coerce_dataframe_types(df):
    """Normalize common numeric columns to preserve the existing app behavior."""
    int_cols = ["id", "destination_id", "user_id", "total_rooms", "available_rooms"]
    for col in int_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    float_cols = ["price_per_night", "avg_cost", "budget_min", "budget_max", "entry_fee", "fare", "distance", "rating"]
    for col in float_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0).astype(float)

    if "phone" in df.columns:
        def clean_phone(p):
            if pd.isna(p) or p is None or p == "":
                return ""
            p_str = str(p).strip()
            if p_str.endswith(".0"):
                p_str = p_str[:-2]
            return p_str
        df["phone"] = df["phone"].apply(clean_phone)

    return df


def load_csv(filename):
    """Load data from the configured storage backend and normalize it into a DataFrame."""
    if get_storage_backend() == "mysql":
        try:
            conn = get_mysql_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(f"SELECT * FROM `{get_table_name(filename)}`")
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            if rows:
                df = pd.DataFrame(rows)
                return _coerce_dataframe_types(df)
            return pd.DataFrame(columns=get_schema_columns(filename))
        except Exception as exc:
            print(f"Error loading {filename} from MySQL: {exc}")

    path = get_file_path(filename)
    if not os.path.exists(path):
        init_db()
    try:
        df = pd.read_csv(path)
        return _coerce_dataframe_types(df)
    except Exception as exc:
        print(f"Error loading {filename}: {exc}")
        return pd.DataFrame(columns=get_schema_columns(filename))


def save_csv(filename, df):
    """Save a DataFrame back to the configured storage backend."""
    if get_storage_backend() == "mysql":
        try:
            conn = get_mysql_connection()
            cursor = conn.cursor()
            table_name = get_table_name(filename)
            columns = get_schema_columns(filename)
            if not columns:
                columns = list(df.columns)
            if not columns:
                cursor.close()
                conn.close()
                return

            for col in columns:
                if col not in df.columns:
                    df[col] = None
            df = df[columns]

            cursor.execute(f"DELETE FROM `{table_name}`")
            if not df.empty:
                placeholders = ", ".join(["%s"] * len(columns))
                insert_sql = f"INSERT INTO `{table_name}` ({', '.join([f'`{col}`' for col in columns])}) VALUES ({placeholders})"
                for _, row in df.iterrows():
                    values = []
                    for col in columns:
                        value = row.get(col)
                        if isinstance(value, float) and math.isnan(value):
                            value = None
                        values.append(value)
                    cursor.execute(insert_sql, values)
            cursor.close()
            conn.close()
            return
        except Exception as exc:
            print(f"Error saving {filename} to MySQL: {exc}")

    path = get_file_path(filename)
    df.to_csv(path, index=False)


def insert_row(filename, row_dict):
    """
    Inserts a row into the storage backend.
    Automatically generates a new auto-incrementing integer ID.
    Returns the inserted row dictionary with its new ID.
    """
    df = load_csv(filename)

    if len(df) == 0:
        new_id = 1
    else:
        new_id = int(df["id"].max()) + 1

    row_dict = dict(row_dict)
    row_dict["id"] = new_id

    new_row_df = pd.DataFrame([row_dict])
    for col in df.columns:
        if col not in new_row_df.columns:
            new_row_df[col] = None
    new_row_df = new_row_df[df.columns]

    df = pd.concat([df, new_row_df], ignore_index=True)
    save_csv(filename, df)
    return row_dict


def update_row(filename, id_val, update_dict):
    """
    Updates a row in the storage backend matching the specified ID.
    Returns True if updated, False otherwise.
    """
    df = load_csv(filename)
    id_val = int(id_val)

    idx = df[df["id"] == id_val].index
    if not idx.empty:
        for col, val in update_dict.items():
            if col in df.columns and col != "id":
                if not isinstance(val, (int, float)) and df[col].dtype != object:
                    df[col] = df[col].astype(object)
                df.at[idx[0], col] = val
        save_csv(filename, df)
        return True
    return False


def delete_row(filename, id_val):
    """
    Deletes a row from the storage backend matching the specified ID.
    Returns True if deleted, False otherwise.
    """
    df = load_csv(filename)
    id_val = int(id_val)

    initial_len = len(df)
    df = df[df["id"] != id_val]
    if len(df) < initial_len:
        save_csv(filename, df)
        return True
    return False


def clean_val(v):
    """Recursively converts NaN, Infinity, pd.NA, and numpy scalar types to native JSON-compliant Python types."""
    if v is None:
        return None
    if isinstance(v, dict):
        return {k: clean_val(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [clean_val(item) for item in v]
    if isinstance(v, (float, np.floating)):
        if math.isnan(v) or math.isinf(v):
            return None
        return float(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    return v


def clean_dict(d):
    """Recursively replaces NaN/Inf values in a dictionary with None for JSON compliance."""
    if d is None:
        return None
    return {k: clean_val(v) for k, v in d.items()}


def clean_records(records):
    """Recursively replaces NaN/Inf values in a list of dictionaries with None."""
    if not records:
        return []
    return [clean_dict(r) for r in records]


def find_by_id(filename, id_val):
    """Finds a single row by ID and returns the row as a dictionary or None."""
    df = load_csv(filename)
    id_val = int(id_val)
    row = df[df["id"] == id_val]
    if not row.empty:
        return clean_dict(row.iloc[0].to_dict())
    return None


def find_by_field(filename, field_name, value):
    """Finds a single row by a matching field and returns a dictionary or None."""
    df = load_csv(filename)
    if field_name not in df.columns:
        return None
    if isinstance(value, str):
        row = df[df[field_name].astype(str).str.lower() == value.lower()]
    else:
        row = df[df[field_name] == value]

    if not row.empty:
        return clean_dict(row.iloc[0].to_dict())
    return None


def filter_rows(filename, filter_dict):
    """
    Filters rows in the storage backend that match all key-value pairs in filter_dict.
    Returns a list of dictionaries.
    """
    df = load_csv(filename)
    for col, val in filter_dict.items():
        if col in df.columns:
            if isinstance(val, (str, int, float)):
                df = df[df[col].astype(str).str.strip().str.lower() == str(val).strip().lower()]
            else:
                df = df[df[col] == val]
    return clean_records(df.to_dict(orient="records"))


def search_text(filename, col_name, search_query):
    """
    Searches a column for occurrences of a search query (substring search, case-insensitive).
    """
    df = load_csv(filename)
    if col_name in df.columns:
        filtered_df = df[df[col_name].astype(str).str.lower().str.contains(search_query.lower(), na=False)]
        return clean_records(filtered_df.to_dict(orient="records"))
    return []


# Initialize database schemas
init_db()
