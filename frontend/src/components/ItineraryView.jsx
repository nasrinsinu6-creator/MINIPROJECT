/**
 * @file ItineraryView.jsx
 * @description Interactive day-by-day travel itinerary schedule display component.
 * Features tabbed navigation between travel days, timeline icons for morning/afternoon/evening activities,
 * dining choices, accommodation stay notes, and animated schedule cards.
 */

import React, { useState } from 'react';
import { Compass, Sun, MapPin, Coffee, Utensils, Moon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Itinerary view component.
 * 
 * @param {Object} props
 * @param {Array} props.itinerary - Array of day objects containing schedule activities, dining, and hotel info.
 * @param {string} [props.title] - Section title header text.
 * @param {boolean} [props.showAllOption] - Flag to enable/disable 'Show All Days' tab toggle.
 */
export default function ItineraryView({ 
  itinerary = [], 
  title = "Personalized Day–Wise Itinerary",
  showAllOption = true,
  travelDate = ''
}) {

  const safeItinerary = Array.isArray(itinerary) ? itinerary : [];
  
  // Tab state: can be 1, 2, 3... or 'all'
  const [activeTab, setActiveTab] = useState(1);

  const getFormattedDayDate = (dayNum) => {
    if (!travelDate) return '';
    try {
      const dateObj = new Date(travelDate);
      if (isNaN(dateObj.getTime())) return '';
      dateObj.setDate(dateObj.getDate() + (dayNum - 1));
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (safeItinerary.length === 0) {
    return null;
  }

  // Determine which days to render based on activeTab selection
  const daysToDisplay = activeTab === 'all'
    ? safeItinerary
    : safeItinerary.filter((day, idx) => (day.day || idx + 1) === activeTab);

  // If filtered result is empty (e.g. activeTab index out of bounds), default to all
  const finalDays = daysToDisplay.length > 0 ? daysToDisplay : safeItinerary;

  return (
    <div className="space-y-6 font-outfit">
      {/* Header Bar matching app's theme design system */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-[28px] backdrop-blur-xl shadow-sm">
        {/* Left Section: Cyan/Teal Compass Icon + Matching Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-sm shadow-teal-500/10">
            <Compass className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
            {title}
          </h2>
        </div>

        {/* Right Section: Segmented Control Day Tabs Pill Container */}
        <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-[#0b0f19] border border-slate-200/80 dark:border-slate-800 shadow-inner overflow-x-auto max-w-full">
          {safeItinerary.map((day, idx) => {
            const dayNum = day.day || idx + 1;
            const isSelected = activeTab === dayNum;
            const dateStr = getFormattedDayDate(dayNum);
            return (
              <button
                key={dayNum}
                onClick={() => setActiveTab(dayNum)}
                className={`relative px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-primary via-teal-600 to-secondary text-white shadow-md shadow-teal-500/25 font-bold'
                    : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                Day {dayNum} {dateStr ? `(${dateStr})` : ''}
              </button>
            );
          })}

          {showAllOption && safeItinerary.length > 1 && (
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-primary via-teal-600 to-secondary text-white shadow-md shadow-teal-500/25 font-bold'
                  : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              All Days
            </button>
          )}
        </div>
      </div>

      {/* Days Timeline View */}
      <div className="relative border-l-2 border-slate-200 dark:border-slate-800/80 ml-4 space-y-8">
        <AnimatePresence mode="wait">
          {finalDays.map((day, idx) => {
            const currentDayNum = day.day || (activeTab === 'all' ? idx + 1 : activeTab);
            const currentDateStr = getFormattedDayDate(currentDayNum);
            return (
              <motion.div
                key={currentDayNum}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="relative pl-8"
              >
                {/* Circle Bullet matching theme primary */}
                <div className="absolute -left-[9px] top-2 h-4.5 w-4.5 rounded-full bg-primary border-4 border-slate-50 dark:border-[#0B0F19] shadow-sm"></div>

                <div className="bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl p-6 sm:p-8 rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs text-primary dark:text-secondary bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-xl inline-block font-grotesk uppercase tracking-wider">
                      Day {currentDayNum} Itinerary {currentDateStr ? `• ${currentDateStr}` : ''}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold font-outfit uppercase tracking-wider flex items-center">
                      <Sparkles className="w-3 h-3 text-amber-400 mr-1" /> Custom AI Agenda
                    </span>
                  </div>

                  <div className="space-y-4 text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-outfit font-medium">
                    {day.morning && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-primary dark:text-teal-400 block tracking-wider flex items-center">
                          <Sun className="w-3 h-3 mr-1 text-amber-400" /> Morning Activity
                        </span>
                        <p className="pl-3.5 border-l-2 border-primary/20 font-semibold text-slate-800 dark:text-slate-200">
                          {day.morning}
                        </p>
                      </div>
                    )}

                    {day.lunch && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary dark:text-cyan-400 block tracking-wider flex items-center">
                          <Utensils className="w-3 h-3 mr-1 text-emerald-400" /> Lunch Spot
                        </span>
                        <p className="pl-3.5 border-l-2 border-secondary/20 font-bold text-slate-900 dark:text-white">
                          {day.lunch}
                        </p>
                      </div>
                    )}

                    {day.afternoon && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-primary dark:text-teal-400 block tracking-wider flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-teal-400" /> Afternoon Excursion
                        </span>
                        <p className="pl-3.5 border-l-2 border-primary/20 font-semibold text-slate-800 dark:text-slate-200">
                          {day.afternoon}
                        </p>
                      </div>
                    )}

                    {day.evening && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-accent dark:text-cyan-400 block tracking-wider flex items-center">
                          <Coffee className="w-3 h-3 mr-1 text-cyan-400" /> Evening Stroll
                        </span>
                        <p className="pl-3.5 border-l-2 border-accent/20 font-semibold text-slate-800 dark:text-slate-200">
                          {day.evening}
                        </p>
                      </div>
                    )}

                    {day.dinner && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary dark:text-cyan-400 block tracking-wider flex items-center">
                          <Moon className="w-3 h-3 mr-1 text-indigo-400" /> Dinner Choice
                        </span>
                        <p className="pl-3.5 border-l-2 border-secondary/20 font-bold text-slate-900 dark:text-white">
                          {day.dinner}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
