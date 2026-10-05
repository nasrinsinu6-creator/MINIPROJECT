import React, { useState, useEffect } from 'react';
import { Star, Send, ShieldCheck, AlertCircle, Compass, MessageSquare, Calendar } from 'lucide-react';
import { tripService } from '../services/api';

export default function FeedbackReviews() {
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'feedback'
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Destination Review Fields
  const [destId, setDestId] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Platform Feedback Fields
  const [feedback, setFeedback] = useState('');
  const [feedbacksList, setFeedbacksList] = useState([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg('');

    // Load Public Destinations List
    try {
      const destRes = await tripService.getDestinations();
      setDestinations(destRes.destinations || []);
      if (destRes.destinations && destRes.destinations.length > 0) {
        setDestId(destRes.destinations[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load destinations:", err);
      setErrorMsg('Unable to connect to server or fetch destinations list.');
    }

    // Load Authenticated User Feedback Logs
    try {
      const feedRes = await tripService.getMyFeedback();
      setFeedbacksList(feedRes.feedback || []);
    } catch (err) {
      console.warn("User feedback logs notice (unauthenticated or session expired):", err);
      setFeedbacksList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewsForSelected = async (id) => {
    if (!id) return;
    setLoadingReviews(true);
    try {
      const res = await tripService.getReviews(id);
      setRecentReviews(res.reviews || []);
    } catch (err) {
      console.error("Failed to load destination reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (destId && activeTab === 'reviews') {
      loadReviewsForSelected(destId);
    }
  }, [destId, activeTab]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!destId || !review.trim()) return;

    setSubmittingReview(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await tripService.postReview({
        destination_id: parseInt(destId),
        rating: parseInt(rating),
        review: review
      });
      setSuccessMsg('Thank you for posting your destination review!');
      setReview('');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadReviewsForSelected(destId);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to post review. Please ensure you are logged in.';
      setErrorMsg(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmittingFeedback(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await tripService.postFeedback(feedback);
      setSuccessMsg('Thank you for your valuable feedback!');
      setFeedback('');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      // Reload feedbacks
      const feedRes = await tripService.getMyFeedback();
      setFeedbacksList(feedRes.feedback || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit feedback. Please ensure you are logged in.';
      setErrorMsg(msg);
    } finally {
      setSubmittingFeedback(false);
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
      {/* Header Banner */}
      <div className="border-b border-slate-105 dark:border-slate-850 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center font-grotesk tracking-tight">
          <MessageSquare className="h-8 w-8 text-primary mr-2.5" />
          Feedback & Reviews
        </h1>
        <p className="text-xs text-slate-455 font-outfit font-semibold">
          Share your travel reviews or leave platform suggestions all in one unified portal.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-fit font-outfit font-bold text-xs border border-slate-200/50 dark:border-slate-850">
        <button
          onClick={() => { setActiveTab('reviews'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-5 py-2.5 rounded-xl transition-all ${
            activeTab === 'reviews' 
              ? 'bg-white dark:bg-[#111827] text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Destination Reviews
        </button>
        <button
          onClick={() => { setActiveTab('feedback'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`px-5 py-2.5 rounded-xl transition-all ${
            activeTab === 'feedback' 
              ? 'bg-white dark:bg-[#111827] text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Platform Feedback
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
          <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-center space-x-2 font-bold font-outfit">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === 'reviews' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submit Form */}
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-855 shadow-sm space-y-6 lg:col-span-1">
            <h2 className="font-extrabold text-slate-950 dark:text-white text-base font-grotesk flex items-center">
              Write Destination Review
            </h2>

            <form onSubmit={handleReviewSubmit} className="space-y-4 font-outfit">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Select Destination</label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none dark:text-white font-bold"
                >
                  {destinations.map(dest => (
                    <option key={dest.id} value={dest.id}>{dest.name} ({dest.state})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Star Rating</label>
                <div className="flex items-center space-x-1 py-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      className="p-1 focus:outline-none"
                    >
                      <Star 
                        className={`h-6 w-6 transition-colors ${
                          val <= rating 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-350 dark:text-slate-655'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Review Comments</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share details of your experience, recommendations, hotels, or sightseeing highlights..."
                  rows="5"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none dark:text-white font-semibold"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingReview || !review.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                <Send className="h-4 w-4" />
                <span>{submittingReview ? 'Posting...' : 'Submit Review'}</span>
              </button>
            </form>
          </div>

          {/* Existing Reviews of the selected destination */}
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-855 shadow-sm space-y-6 lg:col-span-2">
            <h2 className="font-extrabold text-slate-955 dark:text-white text-base font-grotesk flex items-center">
              <Compass className="h-5 w-5 text-secondary mr-2" />
              Recent Reviews for Selected Destination
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {loadingReviews ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : recentReviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2 font-outfit text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-900 dark:text-white">{rev.user_name}</span>
                      <span className="text-[9px] text-slate-400 block font-bold">{rev.created_at}</span>
                    </div>
                    <div className="flex items-center space-x-0.5 text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-450" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-555 dark:text-slate-350 leading-relaxed font-semibold">
                    "{rev.review}"
                  </p>
                </div>
              ))}
              {!loadingReviews && recentReviews.length === 0 && (
                <div className="text-center py-20 text-slate-400 italic">
                  No reviews yet for this destination. Be the first to submit one!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feedback Submission */}
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-855 shadow-sm space-y-6 lg:col-span-1">
            <h2 className="font-extrabold text-slate-955 dark:text-white text-base font-grotesk flex items-center">
              Submit Platform Comments
            </h2>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 font-outfit">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Your Comments</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your ideas, bug reports, design suggestions..."
                  rows="6"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none dark:text-white font-semibold"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingFeedback || !feedback.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                <Send className="h-4 w-4" />
                <span>{submittingFeedback ? 'Sending...' : 'Send Feedback'}</span>
              </button>
            </form>
          </div>

          {/* User's Feedback Logs */}
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[36px] border border-slate-100 dark:border-slate-855 shadow-sm space-y-6 lg:col-span-2">
            <h2 className="font-extrabold text-slate-955 dark:text-white text-base font-grotesk flex items-center">
              My Past Feedback Logs
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 font-outfit text-xs">
              {feedbacksList.map((f) => (
                <div key={f.id} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-200/40 pb-2">
                    <span className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {f.created_at}
                    </span>
                    <span>ID {f.id}</span>
                  </div>
                  <p className="text-slate-550 dark:text-slate-350 font-semibold leading-relaxed">
                    "{f.feedback}"
                  </p>
                </div>
              ))}
              {feedbacksList.length === 0 && (
                <div className="text-center py-20 text-slate-400 italic">
                  You haven't submitted any platform feedbacks yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
