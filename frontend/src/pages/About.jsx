/**
 * @file About.jsx
 * @description Public About Us information page component.
 * Describes the AuraTravel AI project, core features, architecture mission statement, and evaluation context.
 */

import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotWidget from '../components/ChatbotWidget';
import { Award, Compass, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

/**
 * About page component view.
 */
export default function About() {

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-grotesk tracking-tight">
            About AuraTravel AI
          </h1>
          <p className="text-sm sm:text-base text-slate-450 max-w-2xl mx-auto font-outfit font-light leading-relaxed">
            AI Travel Planner: A Personalized Budget-Based Tourism Recommendation Website Using AI.
          </p>
        </div>

        {/* Project Description */}
        <section className="bg-white dark:bg-[#111827] p-8 sm:p-10 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-primary font-bold">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Compass className="h-5 w-5 animate-spin-slow text-primary" />
            </div>
            <h2 className="text-lg font-grotesk font-extrabold text-slate-900 dark:text-white">Project Overview</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-outfit font-medium">
            This platform is built to solve the hassle of travel planning by consolidating destination research, hotel room checking, cost estimators, transit comparing, and hourly itineraries into one portal.
            By providing a budget-friendly custom travel matrix, users input their source, duration, companion sizes, categories, and interest tags, receiving scoring-based recommendations instantly.
          </p>
        </section>

       

        {/* Emergency Services */}
        <section className="bg-rose-500/10 border border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/50 p-8 sm:p-10 rounded-[32px] space-y-4">
          <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-450 font-bold">
            <ShieldAlert className="h-6 w-6 text-rose-550 animate-pulse" />
            <h2 className="text-lg font-grotesk font-extrabold">Safety & Emergency Guidelines</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-400 leading-relaxed font-outfit font-light">
            Travel safety is our priority. In case of safety hazards, weather collapses (such as sudden downpours, slippery terrains, landslides in hill stations), or medical urgency, immediately call these national helplines:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-bold font-grotesk">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-center">
              <span className="text-[10px] text-slate-400 block font-outfit font-medium">National Emergency</span>
              <span className="text-lg text-rose-500 font-extrabold mt-1 block">112</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-center">
              <span className="text-[10px] text-slate-400 block font-outfit font-medium">Police Dept</span>
              <span className="text-lg text-slate-800 dark:text-white mt-1 block">100</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-center">
              <span className="text-[10px] text-slate-400 block font-outfit font-medium">Ambulance Services</span>
              <span className="text-lg text-slate-800 dark:text-white mt-1 block">102</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ChatbotWidget />
    </div>
  );
}
