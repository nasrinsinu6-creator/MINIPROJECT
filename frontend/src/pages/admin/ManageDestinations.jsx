/**
 * @file ManageDestinations.jsx
 * @description Administrative Destination & Tourist Attraction Management page component.
 * Supports full CRUD management of travel destinations (name, state, city, category, budget estimate,
 * image URL upload) and key tourist attractions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Edit2, Trash2, Plus, X, AlertCircle, Upload, Image as ImageIcon, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { tripService, adminService } from '../../services/api';

/**
 * Admin Destination & Attraction Management component.
 */
export default function ManageDestinations() {

  const [searchParams, setSearchParams] = useSearchParams();
  const showAllAttractions = searchParams.get('showAllAttractions');

  // UI Tabs & State
  const [activeTab, setActiveTab] = useState('destinations');
  const [destinations, setDestinations] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Destination Form State
  const [isDestFormOpen, setIsDestFormOpen] = useState(false);
  const [editDestId, setEditDestId] = useState(null);
  const [destName, setDestName] = useState('');
  const [destState, setDestState] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destCategory, setDestCategory] = useState('nature');
  const [destDescription, setDestDescription] = useState('');
  const [destBestTime, setDestBestTime] = useState('');
  const [destBudgetMin, setDestBudgetMin] = useState('');
  const [destBudgetMax, setDestBudgetMax] = useState('');
  const [destImageUrl, setDestImageUrl] = useState('');
  const [destLocalCities, setDestLocalCities] = useState('');
  const fileInputRef = useRef(null);
  const [destImageFile, setDestImageFile] = useState(null);
  const [destImagePreview, setDestImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('browse'); // 'browse' or 'url'

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 10MB.');
      return;
    }

    setErrorMsg('');
    setDestImageFile(file);
    const localPreview = URL.createObjectURL(file);
    setDestImagePreview(localPreview);

    // Auto-upload to backend server
    setUploadingImage(true);
    try {
      const res = await adminService.uploadImage(file);
      if (res.image_url) {
        setDestImageUrl(res.image_url);
      }
    } catch (uploadErr) {
      console.warn('Backend image upload warning, falling back to base64 preview:', uploadErr);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDestImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setDestImageFile(null);
    setDestImagePreview('');
    setDestImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Attraction Form State
  const [filterDestId, setFilterDestId] = useState('');
  const [isAttrFormOpen, setIsAttrFormOpen] = useState(false);
  const [editAttrId, setEditAttrId] = useState(null);
  const [attrName, setAttrName] = useState('');
  const [attrDescription, setAttrDescription] = useState('');
  const [attrEntryFee, setAttrEntryFee] = useState('');
  const [attrVisitTime, setAttrVisitTime] = useState('2 Hours');
  const [attrDestId, setAttrDestId] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [attrSearchQuery, setAttrSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const destRes = await tripService.getDestinations();
      const destList = Array.isArray(destRes?.destinations) ? destRes.destinations : [];
      destList.sort((a, b) => a.name.localeCompare(b.name));
      setDestinations(destList);

      const attrRes = await adminService.getAllAttractions();
      const attrList = Array.isArray(attrRes?.attractions) ? attrRes.attractions : [];
      attrList.sort((a, b) => a.name.localeCompare(b.name));
      setAttractions(attrList);

      // Handle deep links or set defaults
      if (showAllAttractions === 'true') {
        setActiveTab('attractions');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load catalog data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update default filters once destinations load
  useEffect(() => {
    if (destinations.length > 0 && !filterDestId) {
      setFilterDestId(destinations[0].id.toString());
    }
  }, [destinations, filterDestId]);

  // Destination actions
  const handleDestSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const trimmedName = destName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setErrorMsg('Destination Name must be at least 3 characters long.');
      return;
    }

    const trimmedCity = destCity.trim();
    if (trimmedCity && trimmedCity.length < 2) {
      setErrorMsg('City Name must be at least 2 characters long if provided.');
      return;
    }

    const trimmedState = destState.trim();
    if (trimmedState && trimmedState.length < 2) {
      setErrorMsg('State Name must be at least 2 characters long if provided.');
      return;
    }

    const trimmedBestTime = destBestTime.trim();
    if (trimmedBestTime && trimmedBestTime.length < 3) {
      setErrorMsg('Best Season must be at least 3 characters long if provided.');
      return;
    }

    const trimmedDesc = destDescription.trim();
    if (trimmedDesc && trimmedDesc.length < 10) {
      setErrorMsg('Description must be at least 10 characters long if provided.');
      return;
    }

    let minBudget = 0;
    if (destBudgetMin !== '') {
      minBudget = parseFloat(destBudgetMin);
      if (isNaN(minBudget) || minBudget < 0) {
        setErrorMsg('Min Budget must be a positive number.');
        return;
      }
    } else {
      minBudget = 5000;
    }

    let maxBudget = 0;
    if (destBudgetMax !== '') {
      maxBudget = parseFloat(destBudgetMax);
      if (isNaN(maxBudget) || maxBudget < 0) {
        setErrorMsg('Max Budget must be a positive number.');
        return;
      }
    } else {
      maxBudget = 15000;
    }

    if (destBudgetMin !== '' && destBudgetMax !== '' && minBudget > maxBudget) {
      setErrorMsg('Max Budget must be greater than or equal to Min Budget.');
      return;
    }

    const trimmedImageUrl = destImageUrl.trim();
    if (trimmedImageUrl) {
      if (!trimmedImageUrl.startsWith('/api/') && !trimmedImageUrl.startsWith('data:') && !trimmedImageUrl.startsWith('blob:')) {
        try {
          const url = new URL(trimmedImageUrl);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            setErrorMsg('Banner Image URL must use HTTP or HTTPS protocol.');
            return;
          }
        } catch (_) {
          setErrorMsg('Banner Image must be a valid image file or URL.');
          return;
        }
      }
    }

    const payload = {
      name: trimmedName,
      state: trimmedState,
      city: trimmedCity,
      local_cities: destLocalCities.trim(),
      category: destCategory,
      description: trimmedDesc,
      best_time: trimmedBestTime,
      budget_min: minBudget,
      budget_max: maxBudget,
      image_url: trimmedImageUrl
    };

    setLoading(true);
    try {
      if (editDestId) {
        await adminService.updateDestination(editDestId, payload);
        setSuccessMsg('Destination updated successfully!');
      } else {
        await adminService.createDestination(payload);
        setSuccessMsg('Destination created successfully!');
      }
      resetDestForm();
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save destination.';
      setErrorMsg(msg);
      if (msg === 'already existed') {
        alert('already existed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDestDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this destination? This may affect linked hotels and attractions.')) return;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await adminService.deleteDestination(id);
      setSuccessMsg('Destination deleted successfully.');
      await loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete destination.');
    } finally {
      setLoading(false);
    }
  };

  const handleDestEditClick = (d) => {
    setEditDestId(d.id);
    setDestName(d.name || '');
    setDestState(d.state || '');
    setDestCity(d.city || '');
    setDestLocalCities(d.local_cities || '');
    setDestCategory(d.category || 'nature');
    setDestDescription(d.description || '');
    setDestBestTime(d.best_time || '');
    setDestBudgetMin(d.budget_min || '');
    setDestBudgetMax(d.budget_max || '');
    setDestImageUrl(d.image_url || '');
    setDestImagePreview(d.image_url || '');
    setDestImageFile(null);
    setImageInputMode(d.image_url ? 'browse' : 'browse');
    setIsDestFormOpen(true);
  };

  const resetDestForm = () => {
    setEditDestId(null);
    setDestName('');
    setDestState('');
    setDestCity('');
    setDestLocalCities('');
    setDestCategory('nature');
    setDestDescription('');
    setDestBestTime('');
    setDestBudgetMin('');
    setDestBudgetMax('');
    setDestImageUrl('');
    setDestImagePreview('');
    setDestImageFile(null);
    setImageInputMode('browse');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsDestFormOpen(false);
  };

  // Attraction actions
  const handleAttrSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!attrDestId) {
      setErrorMsg('Destination city selection is required.');
      return;
    }

    const trimmedName = attrName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setErrorMsg('Attraction Name must be at least 3 characters long.');
      return;
    }

    const trimmedDesc = attrDescription.trim();
    if (trimmedDesc && trimmedDesc.length < 10) {
      setErrorMsg('Attraction Description must be at least 10 characters long if provided.');
      return;
    }

    const trimmedVisitTime = attrVisitTime.trim();
    if (trimmedVisitTime && trimmedVisitTime.length < 3) {
      setErrorMsg('Estimated Visit Duration must be at least 3 characters long.');
      return;
    }

    let entryFee = 0;
    if (attrEntryFee !== '') {
      entryFee = parseFloat(attrEntryFee);
      if (isNaN(entryFee) || entryFee < 0) {
        setErrorMsg('Entry Fee must be a non-negative number.');
        return;
      }
    }

    const payload = {
      destination_id: parseInt(attrDestId),
      name: trimmedName,
      description: trimmedDesc,
      entry_fee: entryFee,
      visit_time: trimmedVisitTime
    };

    setLoading(true);
    try {
      if (editAttrId) {
        await adminService.updateAttraction(editAttrId, payload);
        setSuccessMsg('Attraction updated successfully!');
      } else {
        await adminService.createAttraction(payload);
        setSuccessMsg('Attraction created successfully!');
      }
      resetAttrForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save attraction details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttrDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attraction?')) return;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await adminService.deleteAttraction(id);
      setSuccessMsg('Attraction deleted successfully.');
      await loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete attraction.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttrEditClick = (a) => {
    setEditAttrId(a.id);
    setAttrName(a.name || '');
    setAttrDescription(a.description || '');
    setAttrEntryFee(a.entry_fee || '');
    setAttrVisitTime(a.visit_time || '2 Hours');
    setAttrDestId(a.destination_id.toString());
    setIsAttrFormOpen(true);
  };

  const resetAttrForm = () => {
    setEditAttrId(null);
    setAttrName('');
    setAttrDescription('');
    setAttrEntryFee('');
    setAttrVisitTime('2 Hours');
    setAttrDestId(filterDestId || (destinations[0]?.id?.toString() || ''));
    setIsAttrFormOpen(false);
  };

  const handleViewAttractions = (destId) => {
    setFilterDestId(destId.toString());
    setActiveTab('attractions');
  };

  const handleAddAttractionClick = () => {
    setAttrDestId(filterDestId || (destinations[0]?.id?.toString() || ''));
    setIsAttrFormOpen(true);
  };

  if (loading && destinations.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filtered destinations for display
  const filteredDestinations = destinations.filter((d) => {
    const q = destSearchQuery.trim().toLowerCase();
    if (!q) return true;
    if (q.length === 1) {
      return d.name.toLowerCase().includes(q) || (d.city && d.city.toLowerCase().includes(q));
    }
    return (
      d.name.toLowerCase().includes(q) ||
      (d.city && d.city.toLowerCase().includes(q)) ||
      (d.state && d.state.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q))
    );
  });

  // Filtered attractions for display
  const filteredAttractions = attractions.filter(
    (a) =>
      a.destination_id.toString() === filterDestId &&
      a.name.toLowerCase().includes(attrSearchQuery.toLowerCase())
  );

  const getHeaderTitleAndSubtitle = () => {
    if (activeTab === 'destinations') {
      if (isDestFormOpen) {
        if (editDestId) {
          return {
            title: "Edit Destination",
            sub: "Modify destination parameters in the catalog."
          };
        } else {
          return {
            title: "Add Destination",
            sub: "Create a new destination entry in the catalog."
          };
        }
      } else {
        return {
          title: "List of Destinations",
          sub: "Manage public destinations."
        };
      }
    } else {
      if (isAttrFormOpen) {
        if (editAttrId) {
          return {
            title: "Edit Attraction",
            sub: "Modify sightseeing attraction parameters."
          };
        } else {
          return {
            title: "Add Attraction",
            sub: "Create a new sightseeing attraction."
          };
        }
      } else {
        return {
          title: "List of Attractions",
          sub: "View and manage sightseeing attractions."
        };
      }
    }
  };

  const headerInfo = getHeaderTitleAndSubtitle();

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-105 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
            {headerInfo.title}
          </h1>
          <p className="text-xs text-slate-455 font-outfit font-semibold">
            {headerInfo.sub}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab('destinations');
            resetDestForm();
            resetAttrForm();
          }}
          className={`px-6 py-3 font-grotesk text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'destinations'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-455 hover:text-primary dark:text-slate-400'
          }`}
        >
          Destinations List
        </button>
        <button
          onClick={() => {
            setActiveTab('attractions');
            resetDestForm();
            resetAttrForm();
          }}
          className={`px-6 py-3 font-grotesk text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'attractions'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-455 hover:text-primary dark:text-slate-400'
          }`}
        >
          Sightseeing Attractions
        </button>
      </div>

      {successMsg && (
        <p className="text-xs text-secondary font-bold font-outfit animate-pulse">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-rose-500 font-bold font-outfit flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}
        </p>
      )}

      {/* destinations tab view */}
      {activeTab === 'destinations' && (
        <div className="space-y-8">
          {/* Header Action */}
          {!isDestFormOpen && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-grow max-w-md">
                <input
                  type="text"
                  placeholder="Search destinations by name, city, state or category..."
                  value={destSearchQuery}
                  onChange={(e) => setDestSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white font-semibold text-slate-700 placeholder-slate-400"
                />
              </div>
              <button
                onClick={() => setIsDestFormOpen(true)}
                className="px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 font-outfit shrink-0"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Add Destination</span>
              </button>
            </div>
          )}

          {/* Destination Form */}
          {isDestFormOpen && (
            <form
              onSubmit={handleDestSubmit}
              className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 animate-scale-up font-outfit"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                  {editDestId ? 'Modify Destination Details' : 'Add New Destination Catalog'}
                </h3>
                <button
                  type="button"
                  onClick={resetDestForm}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-450"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Destination Name *
                  </label>
                  <input
                    type="text"
                    value={destName}
                    onChange={(e) => setDestName(e.target.value)}
                    required
                    minLength={3}
                    placeholder="e.g. Munnar"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    City Name
                  </label>
                  <input
                    type="text"
                    value={destCity}
                    onChange={(e) => setDestCity(e.target.value)}
                    minLength={2}
                    placeholder="e.g. Idukki"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={destState}
                    onChange={(e) => setDestState(e.target.value)}
                    minLength={2}
                    placeholder="e.g. Kerala"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Category Theme
                  </label>
                  <select
                    value={destCategory}
                    onChange={(e) => setDestCategory(e.target.value)}
                    className="w-full text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold text-slate-700"
                  >
                    <option value="nature">Nature & Scenic</option>
                    <option value="adventure">Adventure & Sport</option>
                    <option value="spiritual">Spiritual & Temple</option>
                    <option value="heritage">Heritage & Historic</option>
                    <option value="beach">Coastal Beach</option>
                    <option value="wildlife">Wildlife Safari</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Min Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={destBudgetMin}
                    onChange={(e) => setDestBudgetMin(e.target.value)}
                    min={0}
                    placeholder="e.g. 5000"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Max Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={destBudgetMax}
                    onChange={(e) => setDestBudgetMax(e.target.value)}
                    min={0}
                    placeholder="e.g. 15000"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Best Season / Visit Period
                  </label>
                  <input
                    type="text"
                    value={destBestTime}
                    onChange={(e) => setDestBestTime(e.target.value)}
                    minLength={3}
                    placeholder="e.g. September to March"
                    className="w-full text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Local Cities / Nearby Towns
                  </label>
                  <input
                    type="text"
                    value={destLocalCities}
                    onChange={(e) => setDestLocalCities(e.target.value)}
                    placeholder="e.g. Devikulam, Marayoor"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <ImageIcon className="h-3.5 w-3.5 mr-1 text-primary" />
                      Banner Image (Browse or URL)
                    </label>
                    <div className="flex items-center space-x-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('browse')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                          imageInputMode === 'browse'
                            ? 'bg-white dark:bg-slate-800 text-primary shadow-xs font-black'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        <span>Browse Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                          imageInputMode === 'url'
                            ? 'bg-white dark:bg-slate-800 text-primary shadow-xs font-black'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span>Image URL</span>
                      </button>
                    </div>
                  </div>

                  {/* Hidden file input for native file browsing */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {imageInputMode === 'browse' ? (
                    <div>
                      {destImagePreview || destImageUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 group">
                          <img
                            src={destImagePreview || destImageUrl}
                            alt="Banner Preview"
                            className="w-full h-44 object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 p-4">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3.5 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl shadow-md hover:bg-slate-100 transition-all flex items-center space-x-1.5"
                            >
                              <Upload className="h-3.5 w-3.5 text-primary" />
                              <span>Browse Another Image</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="px-3.5 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md hover:bg-rose-600 transition-all flex items-center space-x-1.5"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                          {uploadingImage && (
                            <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center space-x-2 text-white text-xs font-bold">
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Uploading image...</span>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] text-white font-medium flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{destImageFile?.name || (destImageUrl.length > 40 ? `${destImageUrl.slice(0, 40)}...` : destImageUrl)}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/60 dark:bg-slate-955/60 group"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Upload className="h-6 w-6" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Click to browse and upload image
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Select PNG, JPG, JPEG, WEBP from your device (Max 10MB)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="url"
                          value={destImageUrl}
                          onChange={(e) => {
                            setDestImageUrl(e.target.value);
                            setDestImagePreview(e.target.value);
                          }}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                        />
                        {destImageUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {destImageUrl && (
                        <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                          <img
                            src={destImageUrl}
                            alt="URL Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Description Details
                </label>
                <textarea
                  value={destDescription}
                  onChange={(e) => setDestDescription(e.target.value)}
                  minLength={10}
                  placeholder="Tell traveler highlights about this tourist place..."
                  rows="3"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetDestForm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-all"
                >
                  {editDestId ? 'Save Changes' : 'Create Destination'}
                </button>
              </div>
            </form>
          )}

          {/* Destinations Table Card */}
          {!isDestFormOpen && (
            <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden font-outfit">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                      <th className="p-4 pl-6 w-16">S.No.</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Best Period</th>
                      <th className="p-4">Budget Span (Per Head)</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                    {filteredDestinations.map((d, idx) => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold"
                      >
                        <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white py-4">
                          {d.name}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200">
                          <div>{d.city || 'N/A'}, {d.state || 'N/A'}</div>
                          {d.local_cities && (
                            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]" title={d.local_cities}>
                              Nearby: {d.local_cities}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {d.category || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200 font-medium">
                          {d.best_time || 'N/A'}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200 font-medium">
                          ₹{d.budget_min || '0'} - ₹{d.budget_max || '0'}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => handleViewAttractions(d.id)}
                              className="text-primary hover:text-secondary transition-colors flex items-center gap-1 font-bold text-xs mr-2"
                              title="View attractions mapped here"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Attractions</span>
                            </button>
                            <button
                              onClick={() => handleDestEditClick(d)}
                              className="p-2 text-slate-400 hover:text-primary rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDestDelete(d.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredDestinations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-455 font-semibold text-sm">
                    No destinations found matching your criteria.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* attractions tab view */}
      {activeTab === 'attractions' && (
        <div className="space-y-8">
          {/* Destination Selector and Button */}
          <div className="bg-white dark:bg-[#111827] p-4.5 rounded-[24px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-outfit">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-grow">
              <div className="flex items-center space-x-3.5 shrink-0">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Select Destination city:
                </span>
                <select
                  value={filterDestId}
                  onChange={(e) => {
                    setFilterDestId(e.target.value);
                    resetAttrForm();
                  }}
                  className="bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dark:text-white font-semibold text-slate-700"
                >
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id.toString()}>
                      {d.name} ({d.state})
                    </option>
                  ))}
                </select>
              </div>
              
              {!isAttrFormOpen && (
                <div className="flex-grow max-w-xs">
                  <input
                    type="text"
                    placeholder="Search attractions..."
                    value={attrSearchQuery}
                    onChange={(e) => setAttrSearchQuery(e.target.value)}
                    className="w-full text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white font-semibold text-slate-700 placeholder-slate-400"
                  />
                </div>
              )}
            </div>
            {!isAttrFormOpen && (
              <button
                onClick={handleAddAttractionClick}
                className="px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 font-outfit shrink-0"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Add Sightseeing Attraction</span>
              </button>
            )}
          </div>

          {/* Attraction Edit/Add Form */}
          {isAttrFormOpen && (
            <form
              onSubmit={handleAttrSubmit}
              className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-6 animate-scale-up font-outfit"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-grotesk">
                  {editAttrId ? 'Modify Attraction Parameters' : 'Add New Local Sightseeing Attraction'}
                </h3>
                <button
                  type="button"
                  onClick={resetAttrForm}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-455"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Destination *
                  </label>
                  <select
                    value={attrDestId}
                    onChange={(e) => setAttrDestId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-55 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold text-slate-700"
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.name} ({d.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Attraction Name *
                  </label>
                  <input
                    type="text"
                    value={attrName}
                    onChange={(e) => setAttrName(e.target.value)}
                    required
                    minLength={3}
                    placeholder="e.g. Eravikulam National Park"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Entry Fee Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={attrEntryFee}
                    onChange={(e) => setAttrEntryFee(e.target.value)}
                    min={0}
                    placeholder="0 (leave empty if free entry)"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Estimated Visit Duration
                  </label>
                  <input
                    type="text"
                    value={attrVisitTime}
                    onChange={(e) => setAttrVisitTime(e.target.value)}
                    minLength={3}
                    placeholder="e.g. 2 Hours, 3 Hours, Half Day"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Attraction Description
                </label>
                <textarea
                  value={attrDescription}
                  onChange={(e) => setAttrDescription(e.target.value)}
                  minLength={10}
                  placeholder="Detail sightseeing spots, viewpoints, or historical background..."
                  rows="3"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAttrForm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-all"
                >
                  {editAttrId ? 'Save Changes' : 'Create Attraction'}
                </button>
              </div>
            </form>
          )}

          {/* Attractions Table */}
          {!isAttrFormOpen && (
            <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden font-outfit">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                      <th className="p-4 pl-6 w-16">S.No.</th>
                      <th className="p-4">Attraction Name</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Entry Fee</th>
                      <th className="p-4">Visit Duration</th>
                      <th className="p-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                    {filteredAttractions.map((a, idx) => (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold"
                      >
                        <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white py-4 max-w-xs truncate">
                          {a.name}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200 max-w-sm truncate" title={a.description}>
                          {a.description || <span className="italic text-slate-400">None</span>}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200 font-bold">
                          {parseFloat(a.entry_fee) > 0 ? `₹${a.entry_fee}` : 'Free'}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-200 font-medium">
                          {a.visit_time || '2 Hours'}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => handleAttrEditClick(a)}
                              className="p-2 text-slate-400 hover:text-primary rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAttrDelete(a.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAttractions.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-455 font-semibold">
                          No sightseeing places mapped for this destination city yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
