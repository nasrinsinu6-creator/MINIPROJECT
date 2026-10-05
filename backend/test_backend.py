import unittest
import json
from unittest.mock import patch
from backend.app import app
from backend.utils import csv_manager
from backend.utils.csv_manager import load_csv, find_by_field
from backend.services.recommender import recommend_destinations
from backend.services.cost_estimator import estimate_trip_cost
from backend.services.itinerary_generator import generate_itinerary

class TestBackendServices(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_csv_init(self):
        """Verify CSV files were created and pre-populated."""
        dests = load_csv("destinations")
        self.assertFalse(dests.empty, "Destinations CSV should not be empty after seeding.")
        
        admins = load_csv("admins")
        self.assertFalse(admins.empty, "Admins CSV should contain the seeded administrator.")

    def test_recommender(self):
        """Verify recommender returns matching destinations sorted by score."""
        preferences = {
            "source_location": "Kochi",
            "destination_type": "hill station",
            "budget": 20000.0,
            "travelers": 2,
            "duration_days": 3,
            "interests": ["nature", "relaxation"],
            "group_type": "family"
        }
        recs = recommend_destinations(preferences)
        self.assertTrue(len(recs) > 0, "Recommender should return suggestions.")
        # Top choice should preferably be Munnar or Wayanad (hill stations)
        self.assertEqual(recs[0]["category"], "hill station", "Top recommended category should match the preference.")

    def test_recommender_strict_budget_filter(self):
        """Verify recommender strictly filters out any destinations exceeding budget."""
        # Scenario 1: Budget too low for multi-day 2-traveler trip (e.g. ₹5,000 for 2 travelers, 3 days, hill station)
        low_budget_prefs = {
            "source_location": "Kochi",
            "destination_type": "hill station",
            "budget": 5000.0,
            "travelers": 2,
            "duration_days": 3,
            "interests": ["nature"]
        }
        recs = recommend_destinations(low_budget_prefs)
        self.assertEqual(len(recs), 0, "Recommender should return NO destinations exceeding the budget.")

        # Also test via API endpoint
        response = self.app.post("/api/plan-trip", json=low_budget_prefs)
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data["recommendations"]), 0)
        self.assertEqual(data["message"], "No destination with that budget.")

        # Scenario 2: Budget fits single traveler short trip (e.g. ₹5,000 for 1 traveler, 1 day)
        moderate_prefs = {
            "source_location": "Kochi",
            "destination_type": "hill station",
            "budget": 5000.0,
            "travelers": 1,
            "duration_days": 1,
            "interests": ["nature"]
        }
        valid_recs = recommend_destinations(moderate_prefs)
        self.assertTrue(len(valid_recs) > 0, "Should return destinations that fit within budget.")
        for r in valid_recs:
            self.assertLessEqual(r["estimated_cost"]["total"], 5000.0, "Every recommended destination must be <= budget.")

    def test_travel_date_past_validation(self):
        """Verify that selecting a past travel date is rejected with 400 error."""
        past_prefs = {
            "source_location": "Kochi",
            "destination_type": "hill station",
            "budget": 10000.0,
            "travelers": 2,
            "duration_days": 3,
            "travel_date": "2020-01-01"
        }
        res = self.app.post("/api/plan-trip", json=past_prefs)
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertIn("cannot be in the past", data["message"])

    def test_duplicate_trip_prevention(self):
        """Verify that saving duplicate trips for the same user on the same date returns 400 error."""
        from backend.utils.auth import generate_token
        token = generate_token(1, "testuser@example.com", is_admin=False)
        headers = {"Authorization": f"Bearer {token}"}
        
        trip_payload = {
            "destination_id": 1,
            "source_location": "Kochi",
            "budget": 15000.0,
            "travelers": 2,
            "duration_days": 3,
            "travel_date": "2026-11-20",
            "estimated_cost": 12000.0
        }

        # First save attempt should succeed or be checked
        res1 = self.app.post("/api/save-trip", json=trip_payload, headers=headers)
        
        # Second save attempt on the same travel date for the same user MUST be blocked as duplicate
        res2 = self.app.post("/api/save-trip", json=trip_payload, headers=headers)
        self.assertEqual(res2.status_code, 400)
        data = json.loads(res2.data)
        self.assertIn("duplicate trips", data["message"].lower())

    def test_cost_estimator(self):
        """Verify cost estimation has positive sub-values and matches totals."""
        cost = estimate_trip_cost(destination_id=1, travelers=2, duration_days=3)
        self.assertIn("accommodation", cost)
        self.assertIn("food", cost)
        self.assertIn("total", cost)
        self.assertTrue(cost["total"] > 0, "Estimated total cost should be positive.")

    def test_health_endpoint(self):
        """Test public API health-check route."""
        response = self.app.get("/health")
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], "healthy")

    def test_storage_backend_respects_mysql_config(self):
        """The storage layer should expose the configured backend selection."""
        with patch.object(csv_manager.Config, "DB_BACKEND", "mysql"):
            self.assertEqual(csv_manager.get_storage_backend(), "mysql")

    def test_destination_detail_endpoint_returns_valid_json(self):
        """Destination detail payload should be JSON-serializable without NaN values."""
        response = self.app.get("/api/destinations/1")
        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.data)
        self.assertIn("destination", payload)
        self.assertTrue(payload["destination"]["hotels"])
        self.assertTrue(payload["destination"]["restaurants"])
        self.assertTrue(payload["destination"]["attractions"])
        self.assertNotIn("NaN", response.get_data(as_text=True))

    def test_analytics_endpoint(self):
        """Test admin analytics endpoint returns expected keys including total_reviews."""
        import jwt
        from backend.config import Config
        token = jwt.encode({"user_id": 1, "is_admin": True}, Config.SECRET_KEY, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.app.get("/api/admin/analytics", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("stats", data)
        self.assertIn("total_reviews", data["stats"])
        self.assertIn("average_rating", data["stats"])
        self.assertIn("trips_planned", data["stats"])

    def test_admin_user_management_endpoints(self):
        """Test creating, updating, and deleting users via admin endpoints."""
        import jwt
        from backend.config import Config
        from backend.utils.csv_manager import load_csv, find_by_field, insert_row, delete_row
        
        token = jwt.encode({"user_id": 1, "is_admin": True}, Config.SECRET_KEY, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Clean up any previous test user with same email
        old_test_user = find_by_field("users", "email", "admin_created@example.com")
        if old_test_user:
            delete_row("users", old_test_user["id"])

        # 1. Create a user
        user_data = {
            "name": "Admin Created User",
            "email": "admin_created@example.com",
            "password": "securepassword123",
            "phone": "9998887776"
        }
        res = self.app.post("/api/admin/users", headers=headers, json=user_data)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["name"], "Admin Created User")
        user_id = data["user"]["id"]
        
        # Verify user is in CSV
        db_user = find_by_field("users", "email", "admin_created@example.com")
        self.assertIsNotNone(db_user)
        
        # 2. Update the user
        update_data = {
            "name": "Admin Updated User",
            "phone": "1112223334"
        }
        res = self.app.put(f"/api/admin/users/{user_id}", headers=headers, json=update_data)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["user"]["name"], "Admin Updated User")
        self.assertEqual(data["user"]["phone"], "1112223334")
        
        # 3. Add some dependent data to verify cascading delete
        complaint_data = {
            "user_id": user_id,
            "subject": "Test complaint",
            "description": "Test description",
            "status": "Pending",
            "created_at": "2026-08-31 12:00:00"
        }
        insert_row("complaints", complaint_data)
        
        # Verify complaint exists
        complaints_df = load_csv("complaints")
        user_complaints = complaints_df[complaints_df["user_id"] == user_id]
        self.assertFalse(user_complaints.empty)
        
        # Test GET /api/admin/users
        res = self.app.get("/api/admin/users", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("users", data)
        user_emails = [u["email"] for u in data["users"]]
        self.assertIn("admin_created@example.com", user_emails)
        for u in data["users"]:
            self.assertNotIn("password_hash", u)

        # 4. Delete the user
        res = self.app.delete(f"/api/admin/users/{user_id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        
        # Verify user is deleted
        db_user_after = find_by_field("users", "id", user_id)
        self.assertIsNone(db_user_after)
        
        # Verify complaint is cascading-deleted
        complaints_df_after = load_csv("complaints")
        user_complaints_after = complaints_df_after[complaints_df_after["user_id"] == user_id]
        self.assertTrue(user_complaints_after.empty)

    def test_admin_destination_local_cities(self):
        """Test that local_cities field can be created, updated, and searched in destinations."""
        import jwt
        from backend.config import Config
        from backend.utils.csv_manager import load_csv, find_by_field, find_by_id
        
        token = jwt.encode({"user_id": 1, "is_admin": True}, Config.SECRET_KEY, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Create a destination with local cities
        dest_data = {
            "name": "Unique Test Munnar",
            "state": "Kerala",
            "city": "Idukki",
            "local_cities": "Devikulam, Marayoor, Chinnar",
            "category": "hill station",
            "description": "Scenic beauty with hills and tea gardens.",
            "best_time": "September to March",
            "budget_min": 6000,
            "budget_max": 18000,
            "image_url": "http://example.com/munnar.jpg"
        }
        res = self.app.post("/api/admin/destinations", headers=headers, json=dest_data)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertIn("destination", data)
        self.assertEqual(data["destination"]["local_cities"], "Devikulam, Marayoor, Chinnar")
        dest_id = data["destination"]["id"]
        
        # 2. Update local cities for the destination
        update_data = {
            "local_cities": "Devikulam, Marayoor, Chinnar, Rajamalai"
        }
        res = self.app.put(f"/api/admin/destinations/{dest_id}", headers=headers, json=update_data)
        self.assertEqual(res.status_code, 200)
        
        # Verify it was updated in DB
        db_dest = find_by_id("destinations", dest_id)
        self.assertEqual(db_dest["local_cities"], "Devikulam, Marayoor, Chinnar, Rajamalai")
        
        # 3. Test public search by local city
        res = self.app.get("/api/destinations?search=Rajamalai")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(len(data["destinations"]) > 0)
        self.assertEqual(data["destinations"][0]["name"], "Unique Test Munnar")
        
        # 4. Clean up created destination to leave DB clean
        res = self.app.delete(f"/api/admin/destinations/{dest_id}", headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_cost_estimator_with_restaurant_selection(self):
        """Verify cost estimation food cost calculates based on selected restaurant."""
        # Destination 1: Munnar has restaurants like Saravana Bhavan (id 2, avg_cost 150)
        cost_with_rest = estimate_trip_cost(destination_id=1, travelers=2, duration_days=3, restaurant_id=2)
        # Expected food cost = 150.0 * 2 travelers * 3 days * 3 meals = 2700.0
        self.assertEqual(cost_with_rest["food"], 2700.0)

        # Cost without restaurant uses average of all restaurants in destination
        cost_default = estimate_trip_cost(destination_id=1, travelers=2, duration_days=3)
        self.assertIn("food", cost_default)
        self.assertTrue(cost_default["food"] > 0)

    def test_generate_itinerary_with_restaurant_selection(self):
        """Verify itinerary generator incorporates the selected restaurant."""
        itinerary = generate_itinerary(destination_id=1, duration_days=2, hotel_id=1, restaurant_id=2)
        self.assertEqual(len(itinerary), 2)
        # Day 1 lunch or dinner should mention the selected restaurant
        day1_schedule = f"{itinerary[0]['lunch']} {itinerary[0]['dinner']}"
        self.assertIn("Saravana Bhavan", day1_schedule)

    def test_restaurants_public_endpoint(self):
        """Verify GET /api/restaurants/<destination_id> returns destinations restaurants."""
        res = self.app.get("/api/restaurants/1")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("restaurants", data)
        self.assertTrue(len(data["restaurants"]) > 0)
        rest_names = [r["name"] for r in data["restaurants"]]
        self.assertIn("Saravana Bhavan", rest_names)

    def test_api_estimate_cost_and_generate_itinerary_with_restaurant(self):
        """Verify API endpoints accept restaurant_id properly."""
        est_payload = {
            "destination_id": 1,
            "travelers": 2,
            "duration_days": 3,
            "restaurant_id": 2
        }
        res = self.app.post("/api/estimate-cost", json=est_payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["cost_estimation"]["food"], 2700.0)

        itin_payload = {
            "destination_id": 1,
            "duration_days": 2,
            "restaurant_id": 2
        }
        res = self.app.post("/api/generate-itinerary", json=itin_payload)
        self.assertEqual(res.status_code, 200)
        itin_data = json.loads(res.data)
        self.assertIn("itinerary", itin_data)
        day1_meals = f"{itin_data['itinerary'][0]['lunch']} {itin_data['itinerary'][0]['dinner']}"
        self.assertIn("Saravana Bhavan", day1_meals)

    def test_weather_forecast_multiday_and_suitability(self):
        """Verify multi-day weather forecast generation, suitability scores, and packing tips."""
        from backend.services.weather_service import get_weather_for_destination
        
        # Test 7-day forecast for Munnar (hill station, destination_id=1)
        weather_data = get_weather_for_destination(1, "Munnar", "hill station", days=7, travel_date="2026-10-15")
        self.assertIn("forecast", weather_data)
        self.assertEqual(len(weather_data["forecast"]), 7)
        self.assertEqual(weather_data["forecast"][0]["date"], "2026-10-15")
        self.assertEqual(weather_data["forecast"][6]["date"], "2026-10-21")
        
        # Verify daily attributes
        first_day = weather_data["forecast"][0]
        self.assertIn("temp_min", first_day)
        self.assertIn("temp_max", first_day)
        self.assertIn("rain_probability", first_day)
        self.assertIn("condition_code", first_day)
        self.assertIn("advice", first_day)
        
        # Verify suitability score and packing tips
        self.assertTrue(0 <= weather_data["suitability_score"] <= 100)
        self.assertTrue(len(weather_data["packing_tips"]) > 0)
        self.assertTrue(len(weather_data["weather_alerts"]) > 0)
        
        # Test via API route with query params
        res = self.app.get("/api/weather/1?days=6&travel_date=2026-11-01")
        self.assertEqual(res.status_code, 200)
        api_data = json.loads(res.data)
        self.assertEqual(len(api_data["weather"]["forecast"]), 6)
        self.assertEqual(api_data["weather"]["forecast"][0]["date"], "2026-11-01")

    def test_cost_estimator_budget_tiers_and_metrics(self):
        """Verify cost estimation supports budget tiers, per-person metrics, and tier comparisons."""
        from backend.services.cost_estimator import estimate_trip_cost
        
        # Budget tier vs Luxury tier for 2 travelers, 4 days
        budget_est = estimate_trip_cost(destination_id=1, travelers=2, duration_days=4, budget_tier="budget")
        standard_est = estimate_trip_cost(destination_id=1, travelers=2, duration_days=4, budget_tier="standard")
        luxury_est = estimate_trip_cost(destination_id=1, travelers=2, duration_days=4, budget_tier="luxury")
        
        self.assertLess(budget_est["total"], standard_est["total"], "Budget tier total should be lower than standard.")
        self.assertLess(standard_est["total"], luxury_est["total"], "Standard tier total should be lower than luxury.")
        
        # Verify enriched fields
        self.assertEqual(budget_est["travelers"], 2)
        self.assertEqual(budget_est["duration_days"], 4)
        self.assertAlmostEqual(budget_est["per_person_total"], budget_est["total"] / 2, places=1)
        self.assertIn("breakdown_percentages", budget_est)
        self.assertIn("accommodation", budget_est["breakdown_percentages"])
        self.assertIn("budget_tiers_comparison", standard_est)
        self.assertTrue(len(standard_est["money_saving_tips"]) > 0)
        
        # Test via API route
        payload = {
            "destination_id": 1,
            "travelers": 3,
            "duration_days": 5,
            "budget_tier": "luxury"
        }
        res = self.app.post("/api/estimate-cost", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["cost_estimation"]["budget_tier"], "luxury")
        self.assertEqual(data["cost_estimation"]["travelers"], 3)

    def test_user_registration_email_validation(self):
        """Verify email format validation during user registration."""
        from backend.utils.csv_manager import find_by_field, delete_row
        
        # Clean up any existing test user first
        existing = find_by_field("users", "email", "valid.traveler@example.com")
        if existing:
            delete_row("users", existing["id"])

        invalid_emails = [
            "invalidemail",
            "user@",
            "@domain.com",
            "user@domain",
            "user@@domain.com",
            "user@domain..com",
            "user space@domain.com"
        ]

        for bad_email in invalid_emails:
            payload = {
                "name": "Validation Test User",
                "email": bad_email,
                "password": "Password123!"
            }
            res = self.app.post("/api/register", json=payload)
            self.assertEqual(res.status_code, 400, f"Expected 400 for invalid email: {bad_email}")
            data = json.loads(res.data)
            self.assertEqual(data["message"], "Please enter a valid email address!")

        # Test valid email registration
        valid_payload = {
            "name": "Validation Test User",
            "email": "Valid.Traveler@Example.com ", # test trim and lowercase normalization
            "password": "Password123!"
        }
        res = self.app.post("/api/register", json=valid_payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data["user"]["email"], "valid.traveler@example.com")

        # Test duplicate registration with same normalized email
        res_dup = self.app.post("/api/register", json=valid_payload)
        self.assertEqual(res_dup.status_code, 400)
        dup_data = json.loads(res_dup.data)
        self.assertIn("already exists", dup_data["message"])

        # Clean up test user
        new_user = find_by_field("users", "email", "valid.traveler@example.com")
        if new_user:
            delete_row("users", new_user["id"])

    def test_user_registration_password_validation(self):
        """Verify password strength validation during user registration."""
        from backend.utils.csv_manager import find_by_field, delete_row

        # 1. Test short password (< 6 chars)
        res1 = self.app.post("/api/register", json={
            "name": "Pass Test User",
            "email": "pass.test1@example.com",
            "password": "12345"
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn("at least 6 characters", json.loads(res1.data)["message"])

        # 2. Test password without numbers (letters only)
        res2 = self.app.post("/api/register", json={
            "name": "Pass Test User",
            "email": "pass.test2@example.com",
            "password": "onlyletters"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("at least one letter and one number", json.loads(res2.data)["message"])

        # 3. Test password without letters (numbers only)
        res3 = self.app.post("/api/register", json={
            "name": "Pass Test User",
            "email": "pass.test3@example.com",
            "password": "12345678"
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("at least one letter and one number", json.loads(res3.data)["message"])

        # 4. Test valid password
        res4 = self.app.post("/api/register", json={
            "name": "Pass Test User",
            "email": "pass.test4@example.com",
            "password": "ValidPass123"
        })
        self.assertEqual(res4.status_code, 201)

        # Cleanup
        u = find_by_field("users", "email", "pass.test4@example.com")
        if u:
            delete_row("users", u["id"])

    def test_complaints_flow(self):
        """Test lodging a complaint as a user, fetching user complaints, listing complaints as admin, and replying/updating complaint status as admin."""
        import jwt
        from backend.config import Config
        from backend.utils.csv_manager import delete_row, find_by_field

        # Create user token and admin token
        user_token = jwt.encode({"user_id": 1, "is_admin": False}, Config.SECRET_KEY, algorithm="HS256")
        admin_token = jwt.encode({"user_id": 1, "is_admin": True}, Config.SECRET_KEY, algorithm="HS256")

        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. User submits a complaint
        payload = {
            "subject": "Booking Issue Test",
            "description": "Hotel fully booked in Munnar resort"
        }
        res = self.app.post("/api/complaints", headers=user_headers, json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertIn("complaint", data)
        complaint_id = data["complaint"]["id"]
        self.assertEqual(data["complaint"]["status"], "Pending")

        # 2. User gets own complaints
        res_user = self.app.get("/api/my-complaints", headers=user_headers)
        self.assertEqual(res_user.status_code, 200)
        user_complaints = json.loads(res_user.data).get("complaints", [])
        self.assertTrue(any(c["id"] == complaint_id for c in user_complaints))

        # 3. Admin gets all complaints
        res_admin = self.app.get("/api/admin/complaints", headers=admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        admin_complaints = json.loads(res_admin.data).get("complaints", [])
        target = next((c for c in admin_complaints if c["id"] == complaint_id), None)
        self.assertIsNotNone(target)
        self.assertIn("user_name", target)

        # 4. Admin replies and resolves complaint
        reply_payload = {
            "admin_reply": "We have arranged an alternative resort for your stay.",
            "status": "Resolved"
        }
        res_reply = self.app.put(f"/api/admin/complaints/{complaint_id}", headers=admin_headers, json=reply_payload)
        self.assertEqual(res_reply.status_code, 200)

        # 5. Verify user sees resolved complaint and admin reply
        res_user_after = self.app.get("/api/my-complaints", headers=user_headers)
        user_complaints_after = json.loads(res_user_after.data).get("complaints", [])
        resolved = next((c for c in user_complaints_after if c["id"] == complaint_id), None)
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["status"], "Resolved")
        self.assertEqual(resolved["admin_reply"], "We have arranged an alternative resort for your stay.")

        # Clean up created complaint
        delete_row("complaints", complaint_id)

    def test_multi_destination_recommender(self):
        """Verify multi-destination recommendation selection algorithm yields multiple destinations within budget and duration."""
        multi_prefs = {
            "source_location": "Kozhikode",
            "destination_type": "hill station",
            "budget": 25000.0,
            "travelers": 2,
            "duration_days": 7,
            "interests": ["nature", "adventure"],
            "group_type": "family"
        }
        recs = recommend_destinations(multi_prefs)
        self.assertGreaterEqual(len(recs), 2, "Should recommend 2 or more destinations for 7 days with ₹25,000 budget.")

        total_cost = sum(r["estimated_cost"]["total"] for r in recs)
        total_days = sum(r["allocated_days"] for r in recs)

        self.assertLessEqual(total_cost, 25000.0, "Total cost of all recommended destinations must not exceed budget.")
        self.assertLessEqual(total_days, 7, "Total allocated days of all recommended destinations must not exceed duration.")

        # Ensure no duplicate destinations
        dest_ids = [r["destination_id"] for r in recs]
        self.assertEqual(len(dest_ids), len(set(dest_ids)), "A destination must not appear more than once.")

        # Test API endpoint response includes trip_summary
        res = self.app.post("/api/plan-trip", json=multi_prefs)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("trip_summary", data)
        self.assertGreaterEqual(data["trip_summary"]["total_destinations"], 2)

if __name__ == "__main__":
    unittest.main()

