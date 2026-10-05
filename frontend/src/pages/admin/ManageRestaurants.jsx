/**
 * @file ManageRestaurants.jsx
 * @description Administrative Dining & Restaurant Management page component.
 * Enables CRUD operations for restaurant records assigned to destinations, specifying cuisine types,
 * average cost per meal, rating, and address location.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Utensils, X, Save, AlertCircle } from 'lucide-react';
import { tripService, adminService } from '../../services/api';

const POPULAR_CUISINES = [
  'South Indian',
  'North Indian',
  'Chinese',
  'Continental',
  'Kerala Traditional',
  'Fast Food',
  'Seafood',
  'Italian',
  'Multi-Cuisine'
];

/**
 * Admin Restaurant & Dining Management component.
 */
export default function ManageRestaurants() {

  const [restaurants, setRestaurants] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [destinationId, setDestinationId] = useState('');
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('South Indian, North Indian, Chinese');
  const [availableCuisines, setAvailableCuisines] = useState(POPULAR_CUISINES);
  const [newCuisineInput, setNewCuisineInput] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [rating, setRating] = useState('4.0');
  const [address, setAddress] = useState('');

  const [filterDestId, setFilterDestId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const destRes = await tripService.getDestinations();
      const destList = Array.isArray(destRes?.destinations) ? destRes.destinations : [];
      destList.sort((a, b) => a.name.localeCompare(b.name));
      setDestinations(destList);
      if (destList.length > 0) {
        setDestinationId(destList[0].id);
        setFilterDestId(destList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRestaurantsForDest = async () => {
    if (!filterDestId) return;
    try {
      const res = await adminService.getRestaurants(filterDestId);
      const restaurantList = Array.isArray(res?.restaurants) ? res.restaurants : [];
      restaurantList.sort((a, b) => a.name.localeCompare(b.name));
      setRestaurants(restaurantList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRestaurantsForDest();
  }, [filterDestId]);

  const resetForm = () => {
    setName('');
    setCuisine('South Indian, North Indian, Chinese');
    setNewCuisineInput('');
    setAvgCost('');
    setRating('4.0');
    setAddress('');
    setEditId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (r) => {
    setEditId(r.id);
    setDestinationId(r.destination_id);
    setName(r.name || '');
    const currentCuisineStr = r.cuisine || 'South Indian, North Indian, Chinese';
    setCuisine(currentCuisineStr);

    // Merge any custom cuisines from current restaurant into availableCuisines tags
    const existingTags = currentCuisineStr.split(',').map(s => s.trim()).filter(Boolean);
    setAvailableCuisines(prev => {
      const updated = [...prev];
      existingTags.forEach(t => {
        if (!updated.some(item => item.toLowerCase() === t.toLowerCase())) {
          updated.push(t);
        }
      });
      return updated;
    });

    setAvgCost(r.avg_cost || '');
    setRating(r.rating || '4.0');
    setAddress(r.address || '');
    setIsFormOpen(true);
  };

  const handleToggleCuisineTag = (tag) => {
    let currentTags = cuisine ? cuisine.split(',').map(s => s.trim()).filter(Boolean) : [];
    const exists = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      currentTags = currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase());
    } else {
      currentTags.push(tag);
    }
    setCuisine(currentTags.join(', '));
  };

  const handleAddCustomCuisine = (e) => {
    if (e) e.preventDefault();
    const trimmed = newCuisineInput.trim();
    if (!trimmed) return;

    // Add to availableCuisines if not already listed
    if (!availableCuisines.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setAvailableCuisines([...availableCuisines, trimmed]);
    }

    // Toggle / select into current cuisine string
    let currentTags = cuisine ? cuisine.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!currentTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      currentTags.push(trimmed);
      setCuisine(currentTags.join(', '));
    }
    setNewCuisineInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!destinationId) {
      setErrorMsg('Destination city selection is required.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setErrorMsg('Restaurant Name must be at least 3 characters long.');
      return;
    }

    const trimmedCuisine = cuisine.trim();
    if (trimmedCuisine && trimmedCuisine.length < 2) {
      setErrorMsg('Available Cuisines must be provided.');
      return;
    }

    const trimmedAddress = address.trim();
    if (trimmedAddress && trimmedAddress.length < 3) {
      setErrorMsg('Address must be at least 3 characters long if provided.');
      return;
    }

    let parsedAvgCost = 0;
    if (avgCost !== '') {
      parsedAvgCost = parseFloat(avgCost);
      if (isNaN(parsedAvgCost) || parsedAvgCost < 0) {
        setErrorMsg('Average Cost must be a positive number.');
        return;
      }
    } else {
      parsedAvgCost = 400;
    }

    let parsedRating = 4.0;
    if (rating !== '') {
      parsedRating = parseFloat(rating);
      if (isNaN(parsedRating) || parsedRating < 1.0 || parsedRating > 5.0) {
        setErrorMsg('Foodie Rating must be a number between 1.0 and 5.0.');
        return;
      }
    }

    const payload = {
      destination_id: parseInt(destinationId),
      name: trimmedName,
      cuisine: trimmedCuisine,
      avg_cost: parsedAvgCost,
      rating: parsedRating,
      address: trimmedAddress
    };

    setLoading(true);
    try {
      if (editId) {
        await adminService.updateRestaurant(editId, payload);
        setSuccessMsg('Restaurant details updated successfully!');
      } else {
        await adminService.createRestaurant(payload);
        setSuccessMsg('Restaurant entry created successfully!');
      }
      resetForm();
      loadRestaurantsForDest();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save restaurant details.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dining listing?')) return;
    try {
      await adminService.deleteRestaurant(id);
      setSuccessMsg('Restaurant deleted successfully.');
      loadRestaurantsForDest();
    } catch (err) {
      setErrorMsg('Failed to delete restaurant.');
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Dining & Restaurant Management</h1>
          <p className="text-xs text-slate-500 font-outfit font-semibold mt-1">Configure local dining recommendations, multi-cuisine offerings, and food prices.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 font-outfit"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add Restaurant</span>
          </button>
        )}
      </div>

      {successMsg && <p className="text-xs text-secondary font-bold font-outfit animate-pulse">{successMsg}</p>}
      {errorMsg && <p className="text-xs text-rose-500 font-bold font-outfit flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}</p>}

      {/* Destination filter selector */}
      {!isFormOpen && (
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-outfit">
          <div className="flex items-center space-x-3.5 shrink-0">
            <Utensils className="h-5 w-5 text-secondary shrink-0" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Select Destination City:</span>
            <select
              value={filterDestId}
              onChange={(e) => setFilterDestId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dark:text-white font-semibold text-slate-700"
            >
              {destinations.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.state})</option>
              ))}
            </select>
          </div>
          
          <div className="flex-grow max-w-xs">
            <input
              type="text"
              placeholder="Search by restaurant or cuisine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>
      )}

      {/* Editor Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 animate-scale-up font-outfit">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">{editId ? 'Modify Dining Specifications' : 'Register New Dining Entry'}</h3>
            <button type="button" onClick={resetForm} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-450"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Destination City *</label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold text-slate-700"
              >
                {destinations.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.state})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Restaurant / Hotel Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                placeholder="e.g. Saravana Bhavan & Multi-Cuisine Restaurant"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
            </div>

            {/* Multi-Cuisine Selection Field */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Cuisines / Multi-Cuisine Offerings *</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                required
                minLength={2}
                placeholder="e.g. South Indian, North Indian, Chinese, Continental"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Click tags to add/remove multiple cuisines:</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableCuisines.map((tag) => {
                    const isSelected = cuisine.split(',').map(s => s.trim().toLowerCase()).includes(tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleCuisineTag(tag)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-secondary text-white border-secondary shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Cuisine Field */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newCuisineInput}
                    onChange={(e) => setNewCuisineInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCuisine();
                      }
                    }}
                    placeholder="Add custom cuisine option (e.g. Thai, Mexican, Street Food)..."
                    className="text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none dark:text-white font-semibold flex-grow max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCuisine}
                    disabled={!newCuisineInput.trim()}
                    className="px-3.5 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Cuisine Option</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Cost (₹)</label>
              <input
                type="number"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                min={0}
                placeholder="e.g. 500"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foodie Rating (1.0 - 5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Main Street, Near Bus Stand, Munnar"
              className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 focus:outline-none dark:text-white font-semibold"
            />
          </div>

          <div className="flex justify-end space-x-3.5 pt-2 font-bold">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 rounded-xl text-xs"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs flex items-center space-x-1.5 shadow"
            >
              <Save className="h-4 w-4" />
              <span>{editId ? 'Apply Edits' : 'Save Dining Entry'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Restaurant Listings Table */}
      {!isFormOpen && (
        <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden font-outfit">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                  <th className="p-4 pl-6 w-16">S.No.</th>
                  <th className="p-4">Restaurant</th>
                  <th className="p-4">Available Cuisines</th>
                  <th className="p-4">Address</th>
                  <th className="p-4">Average Cost</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((r, idx) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                    <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white py-4">
                      <span>{r.name}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(r.cuisine || 'Multi-Cuisine').split(',').map((c, i) => (
                          <span key={i} className="text-[9px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full">
                            {c.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-350">{r.address || 'Local town center'}</td>
                    <td className="p-4 font-extrabold text-slate-700 dark:text-slate-300">₹{parseInt(r.avg_cost).toLocaleString()}</td>
                    <td className="p-4 text-amber-500 font-bold">⭐ {r.rating}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end space-x-2.5">
                        <button
                          onClick={() => handleEditClick(r)}
                          className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-primary/10 text-primary dark:text-secondary rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-rose-500/10 text-rose-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold font-outfit">No dining listings found under this destination city.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
