import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Star, Sparkles, Image, Compass, Save, AlertCircle, Trash2, Edit3, X } from 'lucide-react';
import { tripService } from '../services/api';

export default function Diaries() {
  const [searchParams] = useSearchParams();
  const paramDestId = searchParams.get('destId');

  const [diaries, setDiaries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Create Form Fields
  const [selectedDestId, setSelectedDestId] = useState(paramDestId || '');
  const [diaryText, setDiaryText] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal States
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDiaryText, setEditDiaryText] = useState('');
  const [editPhotoPath, setEditPhotoPath] = useState('');
  const [editPhotoFiles, setEditPhotoFiles] = useState([]);
  const [editRating, setEditRating] = useState(5);
  const [editDestName, setEditDestName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const loadData = async () => {
    try {
      const diariesRes = await tripService.getMyDiaries();
      setDiaries(diariesRes.diaries);
      
      const tripsRes = await tripService.getMyTrips();
      const completedTrips = (tripsRes.trips || []).filter(
        (t) => t.is_finished || String(t.status).toLowerCase() === 'finished' || String(t.status).toLowerCase() === 'completed'
      );
      setTrips(completedTrips);
      
      if (paramDestId) {
        setSelectedDestId(paramDestId);
      } else if (completedTrips.length > 0) {
        setSelectedDestId(completedTrips[0].destination_id);
      }
    } catch (err) {
      console.error("Failed to load diaries setup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paramDestId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDestId || !diaryText.trim()) {
      setErrorMsg('Please select a destination and write your diary memory.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    setErrorMsg('');
    try {
      const payload = {
        destination_id: parseInt(selectedDestId),
        diary: diaryText,
        rating: rating
      };
      if (photoFiles.length > 0) {
        payload.photoFiles = photoFiles;
      } else if (photoPath) {
        payload.photo_path = photoPath;
      } else {
        payload.photo_path = 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=80';
      }
      await tripService.postDiary(payload);
      setMsg('Memory saved to your diary timeline!');
      setDiaryText('');
      setPhotoPath('');
      setPhotoFiles([]);
      setRating(5);
      
      // Reload list
      const diariesRes = await tripService.getMyDiaries();
      setDiaries(diariesRes.diaries);
    } catch (err) {
      setErrorMsg('Failed to post diary. Please verify.');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger editing modal
  const startEdit = (diary) => {
    setEditId(diary.id);
    setEditDiaryText(diary.diary);
    setEditPhotoPath(diary.photo_path || '');
    setEditPhotoFiles([]);
    setEditRating(diary.rating);
    setEditDestName(diary.destination_name);
    setEditError('');
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDiaryText.trim()) {
      setEditError('Diary memory text cannot be empty.');
      return;
    }

    setUpdating(true);
    setEditError('');
    try {
      const payload = { diary: editDiaryText, rating: editRating };
      if (editPhotoFiles.length > 0) {
        payload.photoFiles = editPhotoFiles;
      } else if (editPhotoPath) {
        payload.photo_path = editPhotoPath;
      }
      await tripService.updateDiary(editId, payload);
      
      // Reload and close modal
      const diariesRes = await tripService.getMyDiaries();
      setDiaries(diariesRes.diaries);
      setIsEditing(false);
    } catch (err) {
      setEditError('Failed to update diary. Try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this travel diary entry?")) {
      return;
    }

    try {
      await tripService.deleteDiary(id);
      // Reload
      const diariesRes = await tripService.getMyDiaries();
      setDiaries(diariesRes.diaries);
    } catch (err) {
      alert("Failed to delete diary entry. Please check credentials.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans animate-fade-in relative">
      
      {/* Diaries Timeline Listing */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-850 pb-5">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center">
            <BookOpen className="h-8 w-8 text-primary mr-2.5" />
            Travel Memories Diary
          </h1>
          <p className="text-slate-400 text-xs font-outfit font-semibold">
            Flip through your logs, ratings, and travel thoughts.
          </p>
        </div>

        <div className="space-y-6">
          {diaries.map((diary) => (
            <div 
              key={diary.id} 
              className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow relative group"
            >
              {(() => {
                const photos = diary.photo_path ? diary.photo_path.split(',').map(s => s.trim()).filter(Boolean) : [];
                if (photos.length === 0) return null;
                return (
                  <div className="w-full sm:w-56 bg-slate-200 dark:bg-slate-900 flex-shrink-0 relative overflow-hidden">
                    {photos.length === 1 ? (
                      <img
                        src={photos[0].startsWith('http') ? photos[0] : `http://localhost:5000${photos[0]}`}
                        alt={diary.destination_name || 'Diary memory'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1 p-1 w-full h-full min-h-[160px] bg-slate-100 dark:bg-slate-900">
                        {photos.slice(0, 4).map((p, idx) => (
                          <div key={idx} className="relative h-24 sm:h-full overflow-hidden rounded-lg">
                            <img
                              src={p.startsWith('http') ? p : `http://localhost:5000${p}`}
                              alt={`Memory photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 3 && photos.length > 4 && (
                              <div className="absolute inset-0 bg-slate-955/75 flex items-center justify-center text-white text-xs font-black">
                                +{photos.length - 4}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="p-6 sm:p-7 flex flex-col justify-between flex-grow space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="font-outfit">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Trip to {diary.destination_name}</h3>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{diary.created_at.split(' ')[0]}</span>
                    </div>

                    <div className="flex items-center text-amber-500 space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < diary.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-250 dark:text-slate-800'}`} />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-outfit font-medium">
                    {diary.diary}
                  </p>
                </div>

                {/* Edit & Delete Action Row */}
                <div className="flex items-center space-x-4 border-t border-slate-50 dark:border-slate-850 pt-4 font-outfit font-bold">
                  <button
                    onClick={() => startEdit(diary)}
                    className="text-xs text-primary hover:text-primary-dark flex items-center space-x-1 hover:underline"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Entry</span>
                  </button>
                  <button
                    onClick={() => handleDelete(diary.id)}
                    className="text-xs text-rose-500 hover:text-rose-650 flex items-center space-x-1 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {diaries.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-[36px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-4">
              <Compass className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto animate-spin-slow" />
              <h3 className="text-lg font-bold text-slate-750 dark:text-slate-300 font-grotesk">Your Diary is Empty</h3>
              <p className="text-slate-400 text-xs font-outfit leading-relaxed max-w-xs mx-auto">
                Once you save itineraries, write down your memories, upload photo URLs, and rate your travels here!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Posting Form Box */}
      <div>
        {trips.length > 0 ? (
          <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-850 space-y-5">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center text-sm font-grotesk">
              <Sparkles className="h-4.5 w-4.5 text-primary mr-1.5 animate-pulse" /> Add Diary Entry
            </h3>

            {msg && (
              <p className="text-xs text-secondary font-bold font-outfit animate-pulse">{msg}</p>
            )}
            {errorMsg && (
              <p className="text-xs text-rose-500 font-bold font-outfit flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-outfit">
              
              {/* Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Visited Place</label>
                <select
                  value={selectedDestId}
                  onChange={(e) => setSelectedDestId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold text-slate-750"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.destination_id}>
                      {t.destination_name} (Saved trip {t.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating stars selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Experience Rating</label>
                <div className="flex items-center space-x-1.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setRating(stars)}
                      className="p-1 focus:outline-none text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star className={`h-6 w-6 ${stars <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-800'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload (multiple allowed) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Image className="h-3.5 w-3.5 mr-1 text-primary" /> Memory Photos (Upload Multiple)
                  </label>
                  {photoFiles.length > 0 && (
                    <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {photoFiles.length} Selected
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                />
              </div>

              {/* Memory text */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Write Travelogue Memories</label>
                <textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder="How was the local food? Did you enjoy the sightseeing flow?"
                  rows="5"
                  required
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-semibold"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1.5 hover:scale-102"
              >
                <Save className="h-4 w-4" />
                <span>{submitting ? 'Saving Memory...' : 'Save Diary Entry'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[32px] border border-slate-100 dark:border-slate-850 text-center space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm font-grotesk">Add Diary Entry</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-outfit font-medium">You don't have any completed trips yet. Once you complete a trip or mark it finished in Saved Trips, you can add diary entries!</p>
            <div className="space-y-2">
              <Link
                to="/my-trips"
                className="w-full block py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-xl shadow transition-all font-outfit text-center"
              >
                Go to Saved Trips
              </Link>
              <Link
                to="/plan-trip"
                className="w-full block py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/50 dark:border-slate-800/80 transition-all font-outfit text-center"
              >
                Plan a New Trip
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal (Popup window) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border border-slate-250 dark:border-slate-800 rounded-[32px] shadow-2xl p-6 sm:p-8 space-y-5 animate-scale-up relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base font-grotesk flex items-center">
                <Edit3 className="h-4.5 w-4.5 text-primary mr-1.5" />
                Edit Diary Entry
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-outfit">Trip to {editDestName}</p>
            </div>

            {editError && (
              <p className="text-xs text-rose-500 font-bold font-outfit flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {editError}</p>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 font-outfit">
              {/* Rating stars selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Experience Rating</label>
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setEditRating(stars)}
                      className="p-1 focus:outline-none text-amber-500"
                    >
                      <Star className={`h-6 w-6 ${stars <= editRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-800'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload (multiple allowed) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Image className="h-3.5 w-3.5 mr-1 text-primary" /> Memory Photos (Upload Multiple)
                  </label>
                  {editPhotoFiles.length > 0 && (
                    <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {editPhotoFiles.length} Selected
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setEditPhotoFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none dark:text-white font-semibold"
                />
                <p className="text-[10px] text-slate-400">Leave empty to keep existing photos.</p>
              </div>

              {/* Memory text */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Write Travelogue Memories</label>
                <textarea
                  value={editDiaryText}
                  onChange={(e) => setEditDiaryText(e.target.value)}
                  placeholder="How was the local food? Did you enjoy the sightseeing flow?"
                  rows="4"
                  required
                  className="w-full text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-semibold"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  <Save className="h-4 w-4" />
                  <span>{updating ? 'Updating Entry...' : 'Save Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
