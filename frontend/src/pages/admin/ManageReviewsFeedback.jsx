/**
 * @file ManageReviewsFeedback.jsx
 * @description Administrative Destination Reviews & Platform Feedback Moderation page component.
 * Allows administrators to switch between user destination review moderation and platform feedback logs,
 * inspecting content and deleting inappropriate submissions.
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, MessageSquare, Trash2, Star, AlertCircle, Calendar, User } from 'lucide-react';
import { adminService } from '../../services/api';

/**
 * Admin Reviews & Feedback Moderation component.
 */
export default function ManageReviewsFeedback() {

  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'feedback'
  const [reviews, setReviews] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const revRes = await adminService.getReviews();
      setReviews(revRes.reviews || []);

      const feedRes = await adminService.getFeedback();
      setFeedbacks(feedRes.feedback || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load reviews and feedback logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await adminService.deleteReview(id);
      setSuccessMsg('Review deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      // Refresh reviews list
      const revRes = await adminService.getReviews();
      setReviews(revRes.reviews || []);
    } catch (err) {
      setErrorMsg('Failed to delete review.');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback log?')) return;
    try {
      await adminService.deleteFeedback(id);
      setSuccessMsg('Feedback log deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      // Refresh feedbacks list
      const feedRes = await adminService.getFeedback();
      setFeedbacks(feedRes.feedback || []);
    } catch (err) {
      setErrorMsg('Failed to delete feedback log.');
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
      
      {/* Header */}
      <div className="border-b border-slate-105 dark:border-slate-850 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
          <ClipboardList className="h-8 w-8 text-primary mr-2.5" />
          Review & Feedback Management
        </h1>
        <p className="text-xs text-slate-455 font-outfit font-semibold">
          Moderate destination reviews and view traveler comments/feedback left on the platform.
        </p>
      </div>

      {successMsg && <p className="text-xs text-secondary font-bold font-outfit animate-pulse">{successMsg}</p>}
      {errorMsg && (
        <p className="text-xs text-rose-500 font-bold font-outfit flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1" /> {errorMsg}
        </p>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 font-outfit">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeTab === 'reviews'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Star className="h-4 w-4" />
          <span>Traveler Reviews ({reviews.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeTab === 'feedback'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Platform Feedback ({feedbacks.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'reviews' ? (
        <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden font-outfit">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[9px] font-grotesk">
                  <th className="p-4 pl-6 w-16">S.No.</th>
                  <th className="p-4">Destination</th>
                  <th className="p-4">Traveler</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Review Content</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev, idx) => (
                  <tr key={rev.id} className="border-b border-slate-100 dark:border-slate-855 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors font-semibold">
                    <td className="p-4 pl-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white py-4">{rev.destination_name}</td>
                    <td className="p-4 text-slate-655 dark:text-slate-300 font-bold">{rev.user_name}</td>
                    <td className="p-4">
                      <div className="flex items-center text-amber-500 space-x-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200 dark:text-slate-800'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-slate-550 dark:text-slate-400 font-medium max-w-xs truncate" title={rev.review}>
                      {rev.review}
                    </td>
                    <td className="p-4 text-slate-400">{rev.created_at}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                        title="Delete inappropriate review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-455 font-semibold">
                      No reviews registered in the system database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-outfit">
          {feedbacks.map((f) => (
            <div 
              key={f.id} 
              className="bg-white dark:bg-[#111827] p-6 rounded-[28px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {f.user_name ? f.user_name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{f.user_name}</span>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteFeedback(f.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                    title="Delete feedback log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold italic">
                  "{f.feedback}"
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-455 border-t border-slate-50 dark:border-slate-850 pt-3.5 font-bold">
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  {f.created_at ? f.created_at.split(' ')[0] : 'N/A'}
                </span>
                <span>ID {f.id}</span>
              </div>
            </div>
          ))}

          {feedbacks.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white dark:bg-[#111827] rounded-[36px] border border-slate-100 dark:border-slate-850 text-slate-455 text-xs">
              No traveler feedbacks registered currently in the database.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
