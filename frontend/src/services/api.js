/**
 * @file api.js
 * @description Central API service layer for AuraTravel AI.
 * Configures the Axios client instance with base URL, automatically injects JWT Bearer tokens
 * for authenticated requests, and exports structured service objects (`authService`, `tripService`, 
 * `chatbotService`, `adminService`) for frontend-backend integration.
 */

import axios from 'axios';

/**
 * Custom Axios instance configured for API requests.
 */
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Automatically attaches JWT bearer authentication token
 * from browser LocalStorage to outgoing request headers if available.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// Authentication & User Profile Service
// ============================================================================

export const authService = {
  /**
   * Registers a new user account.
   * @param {Object} userData - User registration details (username, email, password, etc.)
   */
  register: async (userData) => {
    const res = await api.post('/register', userData);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  
  /**
   * Authenticates a user with email/username and password.
   * @param {Object} credentials - Login credentials ({ email, password })
   */
  login: async (credentials) => {
    const res = await api.post('/login', credentials);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  
  /**
   * Authenticates an administrative user.
   * @param {Object} credentials - Admin credentials ({ username, password })
   */
  adminLogin: async (credentials) => {
    const res = await api.post('/admin/login', credentials);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  
  /**
   * Logs out the user by clearing local authentication session storage.
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  /**
   * Fetches the current authenticated user's profile information.
   */
  getProfile: async () => {
    const res = await api.get('/profile');
    return res.data;
  },
  
  /**
   * Updates user profile information.
   * @param {Object} profileData - Updated user fields
   */
  updateProfile: async (profileData) => {
    const res = await api.put('/profile', profileData);
    if (res.data.user) {
      const current = JSON.parse(localStorage.getItem('user') || '{}');
      const updated = { ...current, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updated));
    }
    return res.data;
  },
  
  /**
   * Retrieves the current user session object cached in LocalStorage.
   * @returns {Object|null} Cached user object or null if unauthenticated.
   */
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
};

// ============================================================================
// Travel & Trip Management Service
// ============================================================================

export const tripService = {
  /**
   * Submits user travel preferences for AI trip planning.
   */
  planTrip: async (preferences) => {
    const res = await api.post('/plan-trip', preferences);
    return res.data;
  },
  
  /**
   * Generates a detailed day-by-day travel itinerary.
   */
  generateItinerary: async (params) => {
    const res = await api.post('/generate-itinerary', params);
    return res.data;
  },
  
  /**
   * Calculates cost estimations for a travel itinerary.
   */
  estimateCost: async (params) => {
    const res = await api.post('/estimate-cost', params);
    return res.data;
  },
  
  /**
   * Saves a generated trip to user's saved trips.
   */
  saveTrip: async (tripData) => {
    const res = await api.post('/save-trip', tripData);
    return res.data;
  },
  
  /**
   * Fetches all saved trips for the authenticated user.
   */
  getMyTrips: async () => {
    const res = await api.get('/my-trips');
    return res.data;
  },

  /**
   * Deletes a saved trip by ID.
   */
  deleteTrip: async (id) => {
    const res = await api.delete(`/trips/${id}`);
    return res.data;
  },

  /**
   * Marks a trip as finished/completed.
   */
  finishTrip: async (id) => {
    const res = await api.put(`/trips/${id}/finish`);
    return res.data;
  },
  
  /**
   * Retrieves destination weather forecasts.
   */
  getWeather: async (destId, params = {}) => {
    const res = await api.get(`/weather/${destId}`, { params });
    return res.data;
  },
  
  /**
   * Geocodes location query using backend endpoint.
   */
  geocode: async (query) => {
    const res = await api.get('/geocode', { params: { q: query } });
    return res.data;
  },

  /**
   * Computes route distance, duration, and geometry polyline via backend.
   */
  getRoute: async (origin, destination) => {
    const res = await api.post('/route', { origin, destination });
    return res.data;
  },

  /**
   * Fetches dynamic route-based transport options.
   */
  getTransportOptions: async (params) => {
    const res = await api.post('/transport-options', params);
    return res.data;
  },

  /**
   * Fetches AI personalized travel advice.
   */
  getAITravelAdvice: async (params) => {
    const res = await api.post('/ai/travel-advice', params);
    return res.data;
  },

  /**
   * Retrieves available transit options for a destination.
   */
  getTransport: async (destId) => {
    const res = await api.get(`/transportation/${destId}`);
    return res.data;
  },
  
  /**
   * Fetches hotel accommodations for a given destination.
   */
  getHotels: async (destId) => {
    const res = await api.get(`/hotels/${destId}`);
    return res.data;
  },
  
  /**
   * Fetches dining recommendations for a given destination.
   */
  getRestaurants: async (destId) => {
    const res = await api.get(`/restaurants/${destId}`);
    return res.data;
  },
  
  /**
   * Fetches list of public travel destinations.
   */
  getDestinations: async (params = {}) => {
    const res = await api.get('/destinations', { params });
    return res.data;
  },
  
  /**
   * Fetches detailed information for a single destination by ID.
   */
  getDestinationDetail: async (id) => {
    const res = await api.get(`/destinations/${id}`);
    return res.data;
  },
  
  /**
   * Fetches user reviews for a destination.
   */
  getReviews: async (destId) => {
    const res = await api.get(`/reviews/${destId}`);
    return res.data;
  },
  
  /**
   * Submits a user review for a destination.
   */
  postReview: async (reviewData) => {
    const res = await api.post('/reviews', reviewData);
    return res.data;
  },
  
  /**
   * Submits user feedback regarding the application.
   */
  postFeedback: async (feedback) => {
    const res = await api.post('/feedback', { feedback });
    return res.data;
  },
  
  /**
   * Submits a customer complaint ticket.
   */
  submitComplaint: async (complaintData) => {
    const res = await api.post('/complaints', complaintData);
    return res.data;
  },
  
  /**
   * Fetches complaints submitted by current user.
   */
  getMyComplaints: async () => {
    const res = await api.get('/my-complaints');
    return res.data;
  },

  /**
   * Deletes a customer complaint ticket by ID.
   */
  deleteComplaint: async (id) => {
    const res = await api.delete(`/complaints/${id}`);
    return res.data;
  },
  
  /**
   * Posts a trip memory diary entry (supports file uploads).
   */
  postDiary: async (diaryData) => {
    const files = diaryData.photoFiles || (diaryData.photoFile ? [diaryData.photoFile] : []);
    if (files.length > 0) {
      const form = new FormData();
      form.append('destination_id', diaryData.destination_id);
      form.append('diary', diaryData.diary);
      form.append('rating', diaryData.rating || 5);
      files.forEach((file) => {
        form.append('photo', file);
      });
      const res = await api.post('/trip-diary', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    }
    const res = await api.post('/trip-diary', diaryData);
    return res.data;
  },
  
  /**
   * Fetches trip diaries created by current user.
   */
  getMyDiaries: async () => {
    const res = await api.get('/my-trip-diary');
    return res.data;
  },

  /**
   * Updates an existing trip diary entry.
   */
  updateDiary: async (id, diaryData) => {
    const files = diaryData.photoFiles || (diaryData.photoFile ? [diaryData.photoFile] : []);
    if (files.length > 0) {
      const form = new FormData();
      if (diaryData.diary) form.append('diary', diaryData.diary);
      if (diaryData.rating !== undefined) form.append('rating', diaryData.rating);
      files.forEach((file) => {
        form.append('photo', file);
      });
      const res = await api.put(`/trip-diary/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    }
    const res = await api.put(`/trip-diary/${id}`, diaryData);
    return res.data;
  },

  /**
   * Deletes a trip diary entry by ID.
   */
  deleteDiary: async (id) => {
    const res = await api.delete(`/trip-diary/${id}`);
    return res.data;
  },

  /**
   * Fetches feedback submission history for current user.
   */
  getMyFeedback: async () => {
    const res = await api.get('/my-feedback');
    return res.data;
  },

  /**
   * Submits a trip inquiry ticket.
   */
  submitEnquiry: async (enquiryData) => {
    const res = await api.post('/enquiries', enquiryData);
    return res.data;
  },

  /**
   * Fetches trip inquiries submitted by current user.
   */
  getMyEnquiries: async () => {
    const res = await api.get('/my-enquiries');
    return res.data;
  }
};

// ============================================================================
// Interactive AI Chatbot Service
// ============================================================================

export const chatbotService = {
  /**
   * Sends a user query to the AI chatbot assistant backend.
   * @param {string} message - User query prompt
   */
  sendMessage: async (message) => {
    const res = await api.post('/chatbot', { message });
    return res.data;
  }
};

// ============================================================================
// Admin Management Console Service
// ============================================================================

export const adminService = {
  /** Retrieves system analytics summary. */
  getAnalytics: async () => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },

  /** Uploads image file for administrative content management. */
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/admin/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  
  // Destination Management
  createDestination: async (data) => {
    const res = await api.post('/admin/destinations', data);
    return res.data;
  },
  updateDestination: async (id, data) => {
    const res = await api.put(`/admin/destinations/${id}`, data);
    return res.data;
  },
  deleteDestination: async (id) => {
    const res = await api.delete(`/admin/destinations/${id}`);
    return res.data;
  },
  
  // Hotel Management
  getHotels: async (destId) => {
    const res = await api.get('/admin/hotels', { params: { destination_id: destId } });
    return res.data;
  },
  createHotel: async (data) => {
    const res = await api.post('/admin/hotels', data);
    return res.data;
  },
  updateHotel: async (id, data) => {
    const res = await api.put(`/admin/hotels/${id}`, data);
    return res.data;
  },
  deleteHotel: async (id) => {
    const res = await api.delete(`/admin/hotels/${id}`);
    return res.data;
  },
  
  // Restaurant Management
  getRestaurants: async (destId) => {
    const res = await api.get('/admin/restaurants', { params: { destination_id: destId } });
    return res.data;
  },
  createRestaurant: async (data) => {
    const res = await api.post('/admin/restaurants', data);
    return res.data;
  },
  updateRestaurant: async (id, data) => {
    const res = await api.put(`/admin/restaurants/${id}`, data);
    return res.data;
  },
  deleteRestaurant: async (id) => {
    const res = await api.delete(`/admin/restaurants/${id}`);
    return res.data;
  },
  
  // Attraction Management
  getAllAttractions: async () => {
    const res = await api.get('/admin/attractions');
    return res.data;
  },
  createAttraction: async (data) => {
    const res = await api.post('/admin/attractions', data);
    return res.data;
  },
  updateAttraction: async (id, data) => {
    const res = await api.put(`/admin/attractions/${id}`, data);
    return res.data;
  },
  deleteAttraction: async (id) => {
    const res = await api.delete(`/admin/attractions/${id}`);
    return res.data;
  },
  
  // Transit Management
  getTransport: async (destId) => {
    const res = await api.get('/admin/transportation', { params: { destination_id: destId } });
    return res.data;
  },
  createTransport: async (data) => {
    const res = await api.post('/admin/transportation', data);
    return res.data;
  },
  updateTransport: async (id, data) => {
    const res = await api.put(`/admin/transportation/${id}`, data);
    return res.data;
  },
  deleteTransport: async (id) => {
    const res = await api.delete(`/admin/transportation/${id}`);
    return res.data;
  },
  
  // User Management
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  createUser: async (data) => {
    const res = await api.post('/admin/users', data);
    return res.data;
  },
  updateUser: async (id, data) => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
  
  // System Records Management
  getTrips: async () => {
    const res = await api.get('/admin/trips');
    return res.data;
  },
  deleteTrip: async (id) => {
    const res = await api.delete(`/admin/trips/${id}`);
    return res.data;
  },
  getFeedback: async () => {
    const res = await api.get('/admin/feedback');
    return res.data;
  },
  deleteFeedback: async (id) => {
    const res = await api.delete(`/admin/feedback/${id}`);
    return res.data;
  },
  getChatLogs: async () => {
    const res = await api.get('/admin/chatbot-logs');
    return res.data;
  },
  
  // Complaints Management
  getComplaints: async () => {
    const res = await api.get('/admin/complaints');
    return res.data;
  },
  replyComplaint: async (id, replyData) => {
    const res = await api.put(`/admin/complaints/${id}`, replyData);
    return res.data;
  },
  deleteComplaint: async (id) => {
    const res = await api.delete(`/admin/complaints/${id}`);
    return res.data;
  },
  
  // Reviews Management
  getReviews: async () => {
    const res = await api.get('/admin/reviews');
    return res.data;
  },
  deleteReview: async (id) => {
    const res = await api.delete(`/admin/reviews/${id}`);
    return res.data;
  },

  // Weather Cache Management
  getWeatherCache: async () => {
    const res = await api.get('/admin/weather');
    return res.data;
  },
  createWeatherCache: async (data) => {
    const res = await api.post('/admin/weather', data);
    return res.data;
  },
  updateWeatherCache: async (id, data) => {
    const res = await api.put(`/admin/weather/${id}`, data);
    return res.data;
  },
  deleteWeatherCache: async (id) => {
    const res = await api.delete(`/admin/weather/${id}`);
    return res.data;
  },

  // Diary Moderation
  getDiaries: async () => {
    const res = await api.get('/admin/diaries');
    return res.data;
  },
  deleteDiary: async (id) => {
    const res = await api.delete(`/admin/diaries/${id}`);
    return res.data;
  },

  // Trip Enquiries Management
  getEnquiries: async () => {
    const res = await api.get('/admin/enquiries');
    return res.data;
  },
  replyEnquiry: async (id, replyData) => {
    const res = await api.put(`/admin/enquiries/${id}`, replyData);
    return res.data;
  }
};

/**
 * Helper function: Resolves direct booking or website link for a hotel.
 * Generates an official Google Travel search query URL if custom website URL is missing or placeholder.
 * 
 * @param {Object|string} hotel - Hotel data object or name string
 * @param {string} [destName=''] - Destination location name context
 * @returns {string} Fully qualified web URL for booking or website lookup
 */
export const getHotelWebsiteUrl = (hotel, destName = '') => {
  if (!hotel) return 'https://www.google.com/travel/hotels';
  const url = typeof hotel === 'string' ? '' : (hotel.booking_url || hotel.website_url || '');
  if (url && typeof url === 'string' && url.trim().startsWith('http') && !url.includes('.example.com')) {
    return url.trim();
  }
  const hotelName = typeof hotel === 'string' ? hotel : (hotel.name || 'Hotel');
  const hotelAddr = typeof hotel === 'object' && hotel?.address ? hotel.address : '';
  const query = `${hotelName} ${hotelAddr} ${destName} official hotel website booking`.replace(/\s+/g, ' ').trim();
  return `https://www.google.com/travel/hotels?q=${encodeURIComponent(query)}`;
};

export default api;

