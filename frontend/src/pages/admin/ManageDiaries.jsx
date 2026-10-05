/**
 * @file ManageDiaries.jsx
 * @description Administrative Trip Diary Moderation page component.
 * Allows administrators to review user-submitted trip memory entries, photos, ratings, and delete inappropriate content.
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Trash2, Star, AlertCircle, Calendar, User } from 'lucide-react';
import { adminService } from '../../services/api';

/**
 * Admin Trip Diary Moderation component.
 */
export default function ManageDiaries() {

  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadDiaries = async () => {
    try {
      const res = await adminService.getDiaries();
      setDiaries(res.diaries);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load diaries list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiaries();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this diary entry?')) return;
    try {
      await adminService.deleteDiary(id);
      setSuccessMsg('Diary entry deleted successfully.');
      loadDiaries();
    } catch (err) {
      setErrorMsg('Failed to delete diary entry.');
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
    <div className="space-y-8 font-sans animate-fade-in">
      <div className="border-b border-slate-105 dark:border-slate-850 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
          <BookOpen className="h-8 w-8 text-primary mr-2.5" />
          Manage Traveler Diaries
        </h1>
        <p className="text-xs text-slate-455 font-outfit font-semibold">Moderate public travel diaries, photo attachments, and ratings left by system travelers.</p>
      </div>

      {successMsg && <p className="text-xs text-secondary font-bold font-outfit animate-pulse">{successMsg}</p>}
      {errorMsg && <p className="text-xs text-rose-500 font-bold font-outfit flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}</p>}

      <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden font-outfit">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                <th className="p-4 pl-6 w-16">S.No.</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Traveler</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Photo Preview</th>
                <th className="p-4">Diary Memory Snippet</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {diaries.map((diary, idx) => (
                <tr key={diary.id} className="border-b border-slate-100 dark:border-slate-855 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                  <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white py-4">
                    {diary.destination_name}
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-200">
                    <span className="flex items-center space-x-1.5 font-bold">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{diary.user_name}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-amber-500 space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < diary.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200 dark:text-slate-800'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const photos = diary.photo_path ? diary.photo_path.split(',').map(s => s.trim()).filter(Boolean) : [];
                      if (photos.length === 0) return <span className="text-slate-400 italic">None</span>;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                          {photos.map((p, pIdx) => {
                            const fullUrl = p.startsWith('http') ? p : `http://localhost:5000${p}`;
                            return (
                              <a key={pIdx} href={fullUrl} target="_blank" rel="noreferrer" title={`View Photo ${pIdx + 1}`}>
                                <img
                                  src={fullUrl}
                                  alt={`photo-${pIdx + 1}`}
                                  className="h-9 w-12 object-cover rounded-lg border border-slate-200/50 dark:border-slate-800 hover:scale-110 transition-transform shadow-sm"
                                />
                              </a>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-slate-550 dark:text-slate-455 font-medium max-w-xs truncate" title={diary.diary}>
                    {diary.diary}
                  </td>
                  <td className="p-4 text-slate-400">
                    <span className="inline-flex items-center space-x-1.5 font-bold">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      <span>{diary.created_at ? diary.created_at.split(' ')[0] : 'N/A'}</span>
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => handleDelete(diary.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 transition-colors"
                      title="Delete inappropriate diary log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {diaries.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-455 font-semibold">
                    No diary entries registered in system database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
