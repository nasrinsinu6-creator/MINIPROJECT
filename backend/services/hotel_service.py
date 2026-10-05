import pandas as pd
from backend.utils.csv_manager import load_csv, update_row, find_by_id

def get_available_hotels(destination_id):
    """
    Returns all hotels for a destination that have at least 1 available room.
    """
    hotels_df = load_csv("hotels")
    if hotels_df.empty:
        return []
    
    # Filter by destination and availability
    available_hotels = hotels_df[
        (hotels_df["destination_id"] == int(destination_id)) & 
        (hotels_df["available_rooms"].astype(int) > 0)
    ]
    return available_hotels.to_dict(orient="records")

def book_hotel_room(hotel_id, count=1):
    """
    Decrements available rooms when a user books/saves a trip.
    """
    if not hotel_id:
        return False
    try:
        hotel = find_by_id("hotels", hotel_id)
        if hotel:
            avail = int(hotel.get("available_rooms", 0))
            if avail >= count:
                new_avail = avail - count
                update_row("hotels", hotel_id, {"available_rooms": new_avail})
                return True
    except Exception as e:
        print(f"Error booking hotel room for hotel_id {hotel_id}: {e}")
    return False

def release_hotel_room(hotel_id, count=1):
    """
    Increments available rooms if a booking is cancelled.
    """
    hotel = find_by_id("hotels", hotel_id)
    if hotel:
        avail = int(hotel["available_rooms"])
        total = int(hotel["total_rooms"])
        new_avail = min(total, avail + count)
        update_row("hotels", hotel_id, {"available_rooms": new_avail})
        return True
    return False
