/**
 * @file AITravelAdvice.jsx
 * @description AI Travel Advice & Personalization Advice component powered by Gemini/Flask API.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Compass, Lightbulb, ShieldCheck } from 'lucide-react';
import { tripService } from '../services/api';

export default function AITravelAdvice({
  destinationName = 'Destination',
  sourceName = 'Kochi',
  transportType = 'Private AC Cab',
  travelersCount = 2,
  groupType = 'family',
  interests = []
}) {
  const [adviceText, setAdviceText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAdvice() {
      if (!destinationName) return;
      setLoading(true);
      try {
        const res = await tripService.getAITravelAdvice({
          destination_name: destinationName,
          source: sourceName,
          transport_type: transportType,
          travelers: travelersCount,
          group_type: groupType,
          interests
        });
        setAdviceText(res.advice || '');
      } catch (err) {
        console.warn('AI advice fetch notice:', err);
        setAdviceText(`${transportType} provides a seamless, comfortable direct journey from ${sourceName} to ${destinationName} for ${travelersCount} traveler${travelersCount > 1 ? 's' : ''}.`);
      } finally {
        setLoading(false);
      }
    }
    loadAdvice();
  }, [destinationName, sourceName, transportType, travelersCount, groupType]);

  return (
    <div className="bg-gradient-to-r from-primary/10 via-indigo-950/5 to-secondary/10 dark:from-primary/20 dark:via-slate-900 dark:to-secondary/20 rounded-2xl p-5 border border-primary/20 space-y-2 font-sans">
      <div className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-primary dark:text-secondary font-grotesk">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <span>🤖 AI Personalized Trip Recommendation</span>
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-300 font-outfit leading-relaxed font-semibold">
        {loading ? (
          <span className="animate-pulse text-slate-400">Analyzing route, transit choice, group size, and itinerary parameters...</span>
        ) : (
          adviceText || `${transportType} is ideal for traveling from ${sourceName} to ${destinationName} with ${travelersCount} traveler${travelersCount > 1 ? 's' : ''}.`
        )}
      </p>
    </div>
  );
}
