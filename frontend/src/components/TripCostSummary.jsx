/**
 * @file TripCostSummary.jsx
 * @description Itemized trip cost summary component.
 * Displays transportation, accommodation, food, and sightseeing expense breakdown,
 * total cost, cost per person, and user budget comparison alert.
 */

import React from 'react';
import { Receipt, Car, Building2, Utensils, Camera, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';

export default function TripCostSummary({
  transportCost = 0,
  accommodationCost = 0,
  foodCost = 0,
  sightseeingCost = 0,
  userBudget = 0,
  travelersCount = 2,
  durationDays = 3
}) {
  const travelers = Math.max(1, parseInt(travelersCount) || 1);
  const totalCost = Math.round(transportCost + accommodationCost + foodCost + sightseeingCost);
  const costPerPerson = Math.round(totalCost / travelers);
  const budget = parseFloat(userBudget) || 0;
  const isOverBudget = budget > 0 && totalCost > budget;
  const remainingBudget = Math.max(0, budget - totalCost);

  return (
    <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[28px] p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 space-y-6 shadow-sm font-sans w-full">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-grotesk flex items-center space-x-2">
          <Receipt className="h-5 w-5 text-primary" />
          <span>💰 Trip Budget & Cost Breakdown</span>
        </h3>

        <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary dark:text-secondary font-extrabold text-xs font-outfit">
          {durationDays} Days • {travelers} Traveler{travelers > 1 ? 's' : ''}
        </div>
      </div>

      {/* Itemized Expenses Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-outfit">
        
        {/* Transportation */}
        <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-sky-500 font-bold text-xs">
            <Car className="h-4 w-4" />
            <span>Transportation</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-grotesk">
            ₹{Math.round(transportCost).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Selected route fare</div>
        </div>

        {/* Accommodation */}
        <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-500 font-bold text-xs">
            <Building2 className="h-4 w-4" />
            <span>Accommodation</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-grotesk">
            ₹{Math.round(accommodationCost).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Hotel stays ({durationDays - 1 || 1} nights)</div>
        </div>

        {/* Food & Dining */}
        <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-500 font-bold text-xs">
            <Utensils className="h-4 w-4" />
            <span>Food & Meals</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-grotesk">
            ₹{Math.round(foodCost).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Daily meal expenses</div>
        </div>

        {/* Sightseeing & Activities */}
        <div className="bg-slate-50/90 dark:bg-slate-950/80 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-purple-500 font-bold text-xs">
            <Camera className="h-4 w-4" />
            <span>Sightseeing</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-grotesk">
            ₹{Math.round(sightseeingCost).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Attraction entry fees</div>
        </div>
      </div>

      {/* Totals & Budget Comparison Box */}
      <div className="bg-gradient-to-r from-primary/10 via-white to-secondary/10 dark:from-primary/20 dark:via-slate-950 dark:to-secondary/20 rounded-2xl p-4 sm:p-5 border border-primary/20 space-y-3 font-outfit">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-grotesk">Estimated Total Cost</span>
            <div className="text-2xl sm:text-3xl font-black text-primary dark:text-secondary font-grotesk">
              ₹{totalCost.toLocaleString()}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-grotesk">Cost Per Person</span>
            <div className="text-xl font-bold text-slate-800 dark:text-white font-grotesk">
              ₹{costPerPerson.toLocaleString()} <span className="text-xs font-medium text-slate-400">/ person</span>
            </div>
          </div>
        </div>

        {/* User Budget Alert */}
        {budget > 0 && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            isOverBudget
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          }`}>
            <div className="flex items-center space-x-2">
              {isOverBudget ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              )}
              <span>
                {isOverBudget
                  ? 'Estimated trip cost exceeds your selected budget.'
                  : `Well within budget! Remaining: ₹${remainingBudget.toLocaleString()}`}
              </span>
            </div>

            <div className="text-[11px] font-extrabold shrink-0">
              Allocated Budget: ₹{Math.round(budget).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
