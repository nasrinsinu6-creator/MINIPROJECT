import re
import pandas as pd
from backend.utils.csv_manager import load_csv

def respond_to_query(user_message, user_id=None):
    """
    Analyzes the user_message using rule-based/keyword matching and looks up CSV data
    to return a descriptive travel assistance response.
    """
    message = user_message.strip().lower()
    
    # Load resources for lookups
    dest_df = load_csv("destinations")
    hotels_df = load_csv("hotels")
    rest_df = load_csv("restaurants")
    attract_df = load_csv("attractions")
    
    # Extract destination names from user input
    mentioned_dest = None
    dest_row = None
    if not dest_df.empty:
        for _, row in dest_df.iterrows():
            name = str(row["name"]).lower()
            if name in message:
                mentioned_dest = row["name"]
                dest_row = row
                break

    # 1. GREETINGS
    if any(greet in message for greet in ["hi", "hello", "hey", "hola", "greetings"]):
        return ("Hello! I am your AI Travel Assistant. How can I help you plan your dream trip today?\n\n"
                "You can ask me questions like:\n"
                "- 'Suggest places under Rs.15,000'\n"
                "- 'What is the best time to visit Munnar?'\n"
                "- 'What should I pack for Wayanad?'\n"
                "- 'Show restaurants in Goa'\n"
                "- 'Suggest hotels in Varkala'")

    # 2. EMERGENCY CONTACTS
    if any(keyword in message for keyword in ["emergency", "hospital", "police", "help", "security"]):
        return ("🚨 **Emergency Services & Help Desk** 🚨\n\n"
                "• **National Emergency Number**: 112\n"
                "• **Police**: 100\n"
                "• **Ambulance**: 102\n"
                "• **Tourist Helpline**: 1800-11-1363 (Toll-Free)\n"
                "• **Local Hospitals**: We recommend checking the *Emergency Contacts* section on your dashboard for nearby healthcare options for your selected destination.\n"
                "• **Admin Support**: You can file a formal complaint or request support in the *Contact Admin* page, and our administrative team will get back to you shortly.")

    # 3. TOP DESTINATIONS / POPULAR PLACES
    if any(keyword in message for keyword in ["top travel", "top destination", "popular destination", "best destination", "where to travel", "suggest destination"]):
        if not dest_df.empty:
            dest_list = []
            for _, row in dest_df.head(4).iterrows():
                dest_list.append(f"🌟 **{row['name']}** ({row['category']})\n   • Budget range: Rs.{int(row['budget_min'])} - Rs.{int(row['budget_max'])}\n   • Best time to visit: {row['best_time']}\n   • Highlights: {str(row['description'])[:90]}...")
            return "Here are our top recommended travel destinations:\n\n" + "\n\n".join(dest_list) + "\n\nWhich one would you like to explore?"

    # 4. BUDGET TRIPS (e.g. "places under 10000")
    price_match = re.search(r'(?:under|below|budget|less than|rs\.?|Rs.)\s?(\d{4,6})', message)
    if price_match or "budget" in message:
        max_budget = float(price_match.group(1)) if price_match else 15000.0
        if not dest_df.empty:
            # Find destinations where budget_min <= max_budget
            matches = dest_df[dest_df["budget_min"].astype(float) <= max_budget]
            if not matches.empty:
                dest_list = []
                for _, row in matches.head(3).iterrows():
                    dest_list.append(f"• **{row['name']}** ({row['category']}) - Budget range: Rs.{int(row['budget_min'])} to Rs.{int(row['budget_max'])}. Best time: {row['best_time']}.")
                response = f"Here are a few amazing places you can visit under or around **Rs.{int(max_budget)}**:\n\n" + "\n".join(dest_list) + "\n\nWould you like me to generate a detailed itinerary or cost breakdown for any of these?"
                return response
            else:
                return f"I couldn't find any destinations in our catalog with an estimated budget under Rs.{int(max_budget)}. However, places like Wayanad or Alleppey are quite economical if planned with budget accommodations!"

    # 4. PACKING ADVICE
    if any(keyword in message for keyword in ["pack", "packing", "carry", "clothes", "luggage"]):
        if mentioned_dest:
            category = str(dest_row["category"]).lower()
            desc = str(dest_row["description"]).lower()
            
            common_packing = "Comfortable walking shoes, reusable water bottle, sunscreen, essential personal medications, toiletries, power bank, and a camera."
            
            if "hill station" in category or "wayanad" in mentioned_dest.lower() or "munnar" in mentioned_dest.lower() or "manali" in mentioned_dest.lower() or "coorg" in mentioned_dest.lower() or "kodaikanal" in mentioned_dest.lower() or "vagamon" in mentioned_dest.lower():
                return f"🧳 **Packing Checklist for {mentioned_dest} (Hill Station)**:\n\n" \
                       f"• **Clothing**: Warm jackets/sweaters, thermal innerwear (if visiting in winter), long trousers, and cardigans.\n" \
                       f"• **Footwear**: Sturdy trekking shoes/boots with good grip.\n" \
                       f"• **Essentials**: Umbrella/raincoat (hills get sudden showers), moisturizer/lip balm.\n" \
                       f"• **Standard items**: {common_packing}"
            elif "beach" in category or "goa" in mentioned_dest.lower() or "varkala" in mentioned_dest.lower() or "kovalam" in mentioned_dest.lower() or "alleppey" in mentioned_dest.lower():
                return f"🧳 **Packing Checklist for {mentioned_dest} (Beach/Backwaters)**:\n\n" \
                       f"• **Clothing**: Light cotton clothes, t-shirts, shorts, swimwear, sunglasses, and a wide-brimmed sun hat.\n" \
                       f"• **Skincare**: High SPF sunscreen, insect repellent, aloe vera gel.\n" \
                       f"• **Footwear**: Sandals, flip-flops, or water shoes.\n" \
                       f"• **Standard items**: {common_packing}"
            else:
                return f"🧳 **Packing Checklist for {mentioned_dest}**:\n\n" \
                       f"• **Clothing**: Light, breathable cotton outfits for daytime sightseeing. Modest clothing if you plan to visit religious heritage places.\n" \
                       f"• **Standard items**: {common_packing}"
        else:
            return "Please specify which destination you are packing for (e.g. 'What should I pack for Munnar?') so I can give you a tailored packing checklist!"

    # 5. BEST TIME TO VISIT
    if any(keyword in message for keyword in ["best time", "when to visit", "weather", "season", "month"]):
        if mentioned_dest:
            return f"🗓️ The best time to visit **{mentioned_dest}** is during **{dest_row['best_time']}**.\n\nDescription: {dest_row['description']}"
        else:
            return "Could you specify which destination you'd like to check the best time to visit for? (e.g. 'Best time to visit Goa')"

    # 6. RESTAURANTS / DINING RECOMMENDATIONS
    if any(keyword in message for keyword in ["restaurant", "food", "eat", "dining", "cuisine", "dinner", "lunch"]):
        if mentioned_dest:
            dest_id = int(dest_row["id"])
            dest_rests = rest_df[rest_df["destination_id"] == dest_id]
            if not dest_rests.empty:
                rest_list = []
                for _, r in dest_rests.head(3).iterrows():
                    rest_list.append(f"🍽️ **{r['name']}** - Cuisine: {r['cuisine']} (Avg cost: Rs.{int(r['avg_cost'])} per meal, Rated: {r['rating']}⭐)\n   *Address: {r['address']}*")
                return f"Here are the top-rated restaurants in **{mentioned_dest}**:\n\n" + "\n\n".join(rest_list)
            else:
                return f"I couldn't find registered restaurants in {mentioned_dest} in our database, but you can find great local eateries serving traditional dishes in the main city market!"
        else:
            return "Please name the destination you want food recommendations for (e.g., 'Restaurants in Munnar')."

    # 7. HOTELS / ACCOMMODATION
    if any(keyword in message for keyword in ["hotel", "stay", "resort", "room", "accommodation"]):
        if mentioned_dest:
            dest_id = int(dest_row["id"])
            dest_hotels = hotels_df[(hotels_df["destination_id"] == dest_id) & (hotels_df["available_rooms"] > 0)]
            if not dest_hotels.empty:
                hotel_list = []
                for _, h in dest_hotels.head(3).iterrows():
                    hotel_list.append(f"🏨 **{h['name']}** ({h['hotel_type']}) - Rs.{int(h['price_per_night'])}/night\n   *Rooms available: {h['available_rooms']} | Rating: {h['rating']}⭐ | Amenities: {h['amenities']}*")
                return f"Here are highly recommended hotels in **{mentioned_dest}** with room availability:\n\n" + "\n\n".join(hotel_list)
            else:
                return f"All hotels in **{mentioned_dest}** are currently fully booked or unavailable. Please contact admin support or try another destination!"
        else:
            return "Which destination are you looking to stay at? (e.g., 'Hotels in Wayanad')"

    # 8. SIGHTSEEING / ATTRACTIONS
    if any(keyword in message for keyword in ["attraction", "sightseeing", "places to see", "visit", "tourist", "spot", "monument"]):
        if mentioned_dest:
            dest_id = int(dest_row["id"])
            dest_attracts = attract_df[attract_df["destination_id"] == dest_id]
            if not dest_attracts.empty:
                att_list = []
                for _, a in dest_attracts.head(4).iterrows():
                    att_list.append(f"📍 **{a['name']}** - {a['description']} (Entry fee: Rs.{int(a['entry_fee'])} | Visit time: {a['visit_time']})")
                return f"Here are the top attractions you must visit in **{mentioned_dest}**:\n\n" + "\n\n".join(att_list)
            else:
                return f"We are currently updating the attractions catalog for {mentioned_dest}. Stay tuned!"
        else:
            return "Please specify the destination name to view tourist spots (e.g., 'What are the main attractions in Kochi?')."

    # Default fall-through response
    return ("I'm not sure how to answer that question. I can assist you with:\n"
            "- Recommending tourist destinations matching your budget\n"
            "- Finding hotels with room availability and restaurant recommendations\n"
            "- Weather advisories and best seasons to travel\n"
            "- Packing checklists and travel safety tips\n"
            "- Lodging formal complaints to the Admin team\n\n"
            "Try specifying a destination name like 'Munnar', 'Wayanad', or 'Goa' in your question!")
