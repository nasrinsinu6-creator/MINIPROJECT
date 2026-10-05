/**
 * @file ManageHotels.jsx
 * @description Administrative Accommodation / Hotel Management page component.
 * Enables CRUD operations for hotel listings associated with destinations, including price per night,
 * rating, address, booking URL, and filtering by destination.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, X, Save, AlertCircle, ExternalLink, Star, MapPin } from 'lucide-react';
import { tripService, adminService } from '../../services/api';

/**
 * Admin Hotel & Accommodation Management component.
 */
export default function ManageHotels() {

  const [hotels, setHotels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State - Streamlined to specified core accommodation fields
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [destinationId, setDestinationId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [rating, setRating] = useState('4.0');
  const [pricePerDay, setPricePerDay] = useState('2000');

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

  // Whenever filterDestId changes, load hotels for that destination
  useEffect(() => {
    async function loadHotelsForDest() {
      if (!filterDestId) return;
      try {
        const res = await adminService.getHotels(filterDestId);
        const hotelList = Array.isArray(res?.hotels) ? res.hotels : [];
        hotelList.sort((a, b) => a.name.localeCompare(b.name));
        setHotels(hotelList);
      } catch (err) {
        console.error(err);
      }
    }
    loadHotelsForDest();
  }, [filterDestId]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setBookingUrl('');
    setRating('4.0');
    setPricePerDay('2000');
    setEditId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (h) => {
    setEditId(h.id);
    setDestinationId(h.destination_id);
    setName(h.name || '');
    setAddress(h.address || '');
    setBookingUrl(h.booking_url || '');
    setRating(h.rating || '4.0');
    setPricePerDay(h.price_per_night !== undefined && h.price_per_night !== null ? String(h.price_per_night) : '2000');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!destinationId) {
      setErrorMsg('Destination selection is required.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Accommodation / Hotel Name must be at least 2 characters long.');
      return;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress || trimmedAddress.length < 3) {
      setErrorMsg('Address Location must be provided.');
      return;
    }

    let parsedPrice = 2000;
    if (pricePerDay !== '') {
      parsedPrice = parseFloat(pricePerDay);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setErrorMsg('Price per day must be a valid non-negative number.');
        return;
      }
    }

    let parsedRating = 4.0;
    if (rating !== '') {
      parsedRating = parseFloat(rating);
      if (isNaN(parsedRating) || parsedRating < 1.0 || parsedRating > 5.0) {
        setErrorMsg('Star Rating must be a number between 1.0 and 5.0.');
        return;
      }
    }

    const trimmedBookingUrl = bookingUrl.trim();
    if (trimmedBookingUrl) {
      try {
        const url = new URL(trimmedBookingUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          setErrorMsg('Hotel website link must use HTTP or HTTPS protocol.');
          return;
        }
      } catch (_) {
        setErrorMsg('Hotel website link must be a valid URL format.');
        return;
      }
    }

    const payload = {
      destination_id: parseInt(destinationId),
      name: trimmedName,
      address: trimmedAddress,
      booking_url: trimmedBookingUrl,
      rating: parsedRating,
      total_rooms: 10,
      available_rooms: 10,
      hotel_type: 'Hotel',
      price_per_night: parsedPrice,
      room_type: 'Standard'
    };

    setLoading(true);
    try {
      if (editId) {
        await adminService.updateHotel(editId, payload);
        setSuccessMsg('Accommodation details updated successfully!');
      } else {
        await adminService.createHotel(payload);
        setSuccessMsg('Accommodation added successfully!');
      }
      resetForm();
      const res = await adminService.getHotels(filterDestId);
      const hotelList = Array.isArray(res?.hotels) ? res.hotels : [];
      hotelList.sort((a, b) => a.name.localeCompare(b.name));
      setHotels(hotelList);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save accommodation.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accommodation listing?')) return;
    try {
      await adminService.deleteHotel(id);
      setSuccessMsg('Accommodation deleted successfully.');
      const res = await adminService.getHotels(filterDestId);
      const hotelList = Array.isArray(res?.hotels) ? res.hotels : [];
      hotelList.sort((a, b) => a.name.localeCompare(b.name));
      setHotels(hotelList);
    } catch (err) {
      setErrorMsg('Failed to delete accommodation.');
    }
  };

  const filteredHotels = hotels.filter((h) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      (h.address && h.address.toLowerCase().includes(q))
    );
  });

  const selectedDestObj = destinations.find(d => String(d.id) === String(filterDestId));

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">Accommodation Management</h1>
          <p className="text-xs text-slate-500 font-outfit font-semibold mt-1">
            Add hotels, set destination addresses, prices per day, ratings, total room capacities, and official booking/availability website links.
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 font-outfit"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add Accommodation</span>
          </button>
        )}
      </div>

      {successMsg && <p className="text-xs text-secondary font-bold font-outfit animate-pulse">{successMsg}</p>}
      {errorMsg && <p className="text-xs text-rose-500 font-bold font-outfit flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}</p>}

      {/* Destination filter selector */}
      {!isFormOpen && (
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-outfit">
          <div className="flex items-center space-x-3.5 shrink-0">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
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
              placeholder="Search by hotel name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>
      )}

      {/* Simplified Editor Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 animate-scale-up font-outfit">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">{editId ? 'Edit Accommodation Details' : 'Add New Accommodation Option'}</h3>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accommodation / Hotel Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="e.g. Grand Palace Hotel & Resort"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotel Address Location *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                minLength={3}
                placeholder="e.g. Near Lake View Point, Munnar"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 focus:outline-none dark:text-white font-semibold"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotel Website Link (For user availability checking & booking) *</label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://example-hotel.com/availability"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 focus:outline-none dark:text-white font-semibold"
              />
              <p className="text-[10px] text-slate-400">Users will click this link to inspect real-time room availability and book on the hotel's website.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price per Day (₹) *</label>
              <input
                type="number"
                step="1"
                min="0"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                required
                placeholder="e.g. 2500"
                className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Star Rating (1.0 - 5.0)</label>
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
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs flex items-center space-x-1.5 shadow"
            >
              <Save className="h-4 w-4" />
              <span>{editId ? 'Apply Edits' : 'Save Accommodation'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Hotel Listings Grid / Table */}
      {!isFormOpen && (
        <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden font-outfit">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showing Accommodations for: <strong className="text-slate-900 dark:text-white">{selectedDestObj ? selectedDestObj.name : 'Selected Destination'}</strong> ({filteredHotels.length} listings)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                  <th className="p-4 pl-6 w-16">S.No.</th>
                  <th className="p-4">Hotel / Accommodation Name</th>
                  <th className="p-4">Address Location</th>
                  <th className="p-4">Price per Day</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Hotel Link (Availability & Booking)</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHotels.map((h, idx) => (
                  <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                    <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white py-4">
                      <span>{h.name}</span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center text-xs">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                        <span>{h.address || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 font-outfit">
                      ₹{Number(h.price_per_night || 0).toLocaleString()}/day
                    </td>
                    <td className="p-4 text-amber-500 font-bold">
                      <div className="flex items-center">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />
                        <span>{h.rating}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {h.booking_url ? (
                        <a
                          href={h.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-[11px] font-bold transition-all"
                          title="Test open hotel website link in new tab"
                        >
                          <span>Check Link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No link added</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end space-x-2.5">
                        <button
                          onClick={() => handleEditClick(h)}
                          className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-primary/10 text-primary dark:text-secondary rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-rose-500/10 text-rose-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredHotels.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold font-outfit">
                      No accommodations added under this destination city yet. Click "Add Accommodation" to add one.
                    </td>
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

