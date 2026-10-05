/**
 * @file App.jsx
 * @description Main application routing component using React Router v6.
 * Defines public routes (Home, Login, Register, Destinations, About) and authenticated layout-wrapped
 * routes (Dashboard, Trip Planning, User Profile, Admin Management Console).
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Wrappers
import DashboardLayout from './layouts/DashboardLayout';

// Public & Main Pages
import About from './pages/About';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PlanTrip from './pages/PlanTrip';
import Recommendations from './pages/Recommendations';
import Itinerary from './pages/Itinerary';
import SavedTrips from './pages/SavedTrips';
import TripDetails from './pages/TripDetails';
import Destinations from './pages/Destinations';
import DestinationDetails from './pages/DestinationDetails';
import Estimator from './pages/Estimator';
import Estimation from './pages/Estimation';
import Support from './pages/Support';
import FeedbackReviews from './pages/FeedbackReviews';
import Diaries from './pages/Diaries';

// Admin Management Console Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageTrips from './pages/admin/ManageTrips';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDestinations from './pages/admin/ManageDestinations';
import ManageHotels from './pages/admin/ManageHotels';
import ManageRestaurants from './pages/admin/ManageRestaurants';
import ManageTransportation from './pages/admin/ManageTransportation';
import ManageComplaints from './pages/admin/ManageComplaints';
import ManageDiaries from './pages/admin/ManageDiaries';
import ManageReviewsFeedback from './pages/admin/ManageReviewsFeedback';

/**
 * Root Application component defining client-side route mapping.
 */
export default function App() {
  return (
    <Routes>
      {/* ==================== Public Unauthenticated Routes ==================== */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/destinations" element={<Destinations />} />
      <Route path="/destinations/:id" element={<DestinationDetails />} />
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />

      {/* ==================== Authenticated Routes wrapped in DashboardLayout ==================== */}
      <Route element={<DashboardLayout />}>
        {/* User Application Dashboard & Features */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plan-trip" element={<PlanTrip />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/itinerary" element={<Itinerary />} />
        <Route path="/my-trips" element={<SavedTrips />} />
        <Route path="/saved-trips" element={<SavedTrips />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/estimation" element={<Estimation />} />
        <Route path="/estimator" element={<Estimator />} />
        <Route path="/support" element={<Support />} />
        <Route path="/feedback-reviews" element={<FeedbackReviews />} />
        <Route path="/feedback" element={<FeedbackReviews />} />
        <Route path="/reviews" element={<FeedbackReviews />} />
        <Route path="/diaries" element={<Diaries />} />
        <Route path="/trip-diary" element={<Diaries />} />

        {/* Administrative Console Management Views */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/trips" element={<ManageTrips />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/destinations" element={<ManageDestinations />} />
        <Route path="/admin/hotels" element={<ManageHotels />} />
        <Route path="/admin/restaurants" element={<ManageRestaurants />} />
        <Route path="/admin/transportation" element={<ManageTransportation />} />
        <Route path="/admin/complaints" element={<ManageComplaints />} />
        <Route path="/admin/diaries" element={<ManageDiaries />} />
        <Route path="/admin/reviews" element={<ManageReviewsFeedback />} />
      </Route>

      {/* ==================== Fallback Route for Undefined Paths ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

