/**
 * @file Footer.jsx
 * @description Global application footer component.
 * Displays brand overview, quick platform links, support contact details, and emergency helplines.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Mail, Phone, ShieldAlert, Award, ArrowUpRight } from 'lucide-react';

/**
 * Footer layout component rendered at the bottom of public and landing pages.
 */
export default function Footer() {

  return (
    <footer className="bg-[#0B0F19] text-slate-400 border-t border-slate-900 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* Brand Info */}
          <div className="space-y-5">
            <div className="flex items-center space-x-2 text-white font-bold text-xl">
              <div className="bg-primary/20 p-2 rounded-xl">
                <Compass className="h-5 w-5 text-secondary animate-spin-slow" />
              </div>
              <span className="font-extrabold font-grotesk text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AuraTravel AI
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-450 font-outfit">
              Experience the future of holiday planning. AuraTravel AI designs fully personalized itineraries, estimates local dining/hotel/transit expenses, and optimizes room search inside a singular luxury portal.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:pl-8">
            <h3 className="text-white font-bold font-grotesk text-xs uppercase tracking-widest mb-5">Platform</h3>
            <ul className="space-y-3 text-xs font-semibold font-outfit">
              <li>
                <Link to="/" className="hover:text-primary transition-all flex items-center group">
                  <span>Home</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-all flex items-center group">
                  <span>About Us</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-primary transition-all flex items-center group">
                  <span>Destinations</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/feedback-reviews" className="hover:text-primary transition-all flex items-center group">
                  <span>Feedback & Reviews</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-500 hover:text-primary transition-all flex items-center group">
                  <span>Admin Command</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div>
            <h3 className="text-white font-bold font-grotesk text-xs uppercase tracking-widest mb-5">Connect</h3>
            <ul className="space-y-3.5 text-xs font-outfit">
              <li className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-slate-900 rounded-lg">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>support@auratravel.ai</span>
              </li>
              
              
            </ul>
          </div>

          {/* Emergency Helplines */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-900 space-y-4">
            <h3 className="text-white font-bold font-grotesk text-xs uppercase tracking-widest flex items-center">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 mr-2" />
              Emergency Help
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-outfit">
              Encountered weather hazards or health updates? Direct hotline links:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-slate-900 text-center">
                <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Police</span>
                <span className="text-white font-grotesk text-xs">100</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-slate-900 text-center">
                <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Ambulance</span>
                <span className="text-white font-grotesk text-xs">102</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-xl border border-slate-900 text-center col-span-2">
                <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">National Support</span>
                <span className="text-white font-grotesk text-xs">112 (Toll Free)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-900 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-outfit">
          <p>&copy; {new Date().getFullYear()} AuraTravel AI. All rights reserved. Created for Academic Evaluation.</p>
        </div>
      </div>
    </footer>
  );
}
