/**
 * @file Home.jsx
 * @description Landing home page for AuraTravel AI.
 * Displays hero banner with call-to-actions, features highlight, featured popular destinations,
 * AI Assistant query playground preview, testimonials, and global footer.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Receipt, Calendar, Hotel, MessageSquare, Search, MapPin, ArrowRight, Star, Users, Award, ShieldCheck, Bot, CloudSun } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotWidget from '../components/ChatbotWidget';
import { tripService } from '../services/api';

/**
 * Public landing home page view.
 */
export default function Home() {

  const [destinations, setDestinations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Simulated state for AI Assistant Preview
  const [previewMsg, setPreviewMsg] = useState('Suggest a 3-day budget itinerary for Munnar');
  const [previewReply, setPreviewReply] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await tripService.getDestinations();
        setDestinations(res.destinations.slice(0, 3)); // show first 3 popular
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDestinations();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/destinations?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/destinations');
    }
  };

  const triggerPreviewReply = (question) => {
    setPreviewMsg(question);
    setPreviewLoading(true);
    setPreviewReply('');
    setTimeout(() => {
      setPreviewLoading(false);
      if (question.includes('Munnar')) {
        setPreviewReply("🌿 **Munnar 3-Day Plan (₹12,000 budget)**:\n**Day 1**: Visit Mattupetty Dam & Echo Point. Overnight in Standard Hill Resort.\n**Day 2**: Explore Eravikulam National Park (see Nilgiri Tahr) and Tea Museum.\n**Day 3**: Sightseeing at Lakkam Waterfalls. Dinner at local spice market.");
      } else if (question.includes('Goa')) {
        setPreviewReply("🏖️ **Goa 4-Day Plan (₹18,000 budget)**:\n**Day 1**: Relax at Calangute Beach & check-in to coastal beach inn.\n**Day 2**: Water sports at Baga Beach. Seafood dinner at Britto's.\n**Day 3**: Tour Old Goa heritage churches (Basilica of Bom Jesus).\n**Day 4**: Sunset cruise on Mandovi River.");
      } else {
        setPreviewReply("🎒 **Wayanad 2-Day Adventure**:\n**Day 1**: Trek up Chembra Peak. See the heart-shaped lake.\n**Day 2**: Explore Edakkal Caves & enjoy Bamboo Rafting in Kuruvadweep.");
      }
    }, 1000);
  };

  useEffect(() => {
    triggerPreviewReply('Suggest a 3-day budget itinerary for Munnar');
  }, []);

  const features = [
    {
      title: 'AI Recommendation Engine',
      desc: 'Get highly personalized destination recommendations based on your budget, travelers, duration, and interests.',
      icon: Sparkles,
      color: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      title: 'Real-Time Cost Estimator',
      desc: 'Detailed breakdown of hotel nights, restaurant meals, sightseeing entrance fees, transit expenses, and miscellaneous backup funds.',
      icon: Receipt,
      color: 'bg-secondary/10 text-secondary border-secondary/20'
    },
    {
      title: 'Day-Wise Itinerary Generator',
      desc: 'Enjoy fully customized hourly daily activities (Morning, Lunch, Afternoon, Evening, Dinner) aligned with your travel profile.',
      icon: Calendar,
      color: 'bg-accent/10 text-accent border-accent/20'
    },
    {
      title: 'Hotel Availability Checking',
      desc: 'Filter hotels dynamically and only choose rooms that are ready and available for your travel dates.',
      icon: Hotel,
      color: 'bg-teal-500/10 text-teal-600 border-teal-500/20'
    },
    {
      title: 'Interactive Travel AI Bot',
      desc: 'Get answers regarding packing lists, local weather forecasts, dining recommendations, and emergency hotlines instantly.',
      icon: MessageSquare,
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <header className="relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0B0F19] to-slate-900 text-white">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary-light text-xs font-bold tracking-wider uppercase font-grotesk backdrop-blur-md">
            <Sparkles className="h-4.5 w-4.5 text-secondary animate-pulse" />
            <span>Next-Generation AI Travel Planner</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-grotesk tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Design Your Next Escape With{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Artificial Intelligence
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-3xl mx-auto font-outfit font-light leading-relaxed">
            A premium budget-based travel engine that curates personalized recommendations, sets up day-wise hourly agendas, verifies active hotel allocations, and predicts weather changes instantly.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-4">
            <div className="flex flex-col sm:flex-row items-center bg-white dark:bg-slate-900/80 p-2.5 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 gap-2.5 backdrop-blur-md">
              <div className="flex items-center flex-grow w-full px-4 py-1.5">
                <Search className="h-5 w-5 text-slate-450 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where would you like to escape? (e.g. Munnar, Goa, Kovalam)"
                  className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder-slate-450 focus:outline-none text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>Find Places</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* CTAs */}
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              to="/plan-trip"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center space-x-2"
            >
              <Compass className="h-5 w-5" />
              <span>Launch AI Planner</span>
            </Link>
            <Link
              to="/destinations"
              className="px-8 py-4 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-white font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
            >
              <MapPin className="h-5 w-5 text-secondary" />
              <span>Explore Destinations</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Travel Statistics Counter Section */}
      <section className="relative -mt-10 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 z-25">
        <div className="bg-white dark:bg-[#111827] rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-2xl p-6 sm:p-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center backdrop-blur-md">
          {[
            { value: '50K+', label: 'Happy Travelers', desc: 'Active platform explorers', icon: Users, color: 'text-primary' },
            { value: '120+', label: 'Destinations Mapped', desc: 'Cities, beaches & hillstations', icon: MapPin, color: 'text-secondary' },
            { value: '₹1.5Cr+', label: 'Budget Scored', desc: 'Saved expenses tracking', icon: Receipt, color: 'text-accent' },
            { value: '98.9%', label: 'Satisfaction', desc: 'AI recommendations accuracy', icon: Star, color: 'text-amber-500' }
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 mb-2">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-grotesk">{stat.value}</h3>
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 font-outfit">{stat.label}</span>
                <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{stat.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Premium Features for Smooth Journeys
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-xs font-outfit">
            Everything you need for booking, tracking budget constraints, and exploring local environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#111827] p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-4"
              >
                <div className={`p-3 rounded-2xl inline-block border ${feat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-grotesk">{feat.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-outfit font-medium">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

     

           
        

      {/* Popular Selections Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Trending Destinations
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-outfit font-medium">
                Handpicked beautiful spots with green backwaters, pristine hills, and refreshing shores.
              </p>
            </div>
            <Link
              to="/destinations"
              className="text-primary font-bold hover:text-primary-dark flex items-center space-x-1 text-sm"
            >
              <span>View All Destinations</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white dark:bg-[#111827] rounded-3xl h-96 animate-pulse border border-slate-100 dark:border-slate-800"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {destinations.map((dest) => (
                <div
                  key={dest.id}
                  className="bg-white dark:bg-[#111827] rounded-3xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 dark:border-slate-800/80 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative h-56 bg-slate-200">
                    <img
                      src={dest.image_url}
                      alt={dest.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase">
                      {dest.category}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow space-y-4">
                    <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <MapPin className="h-4 w-4 text-primary mr-1 flex-shrink-0" />
                      <span>{dest.city}, {dest.state}</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-grotesk">{dest.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed font-outfit">
                      {dest.description}
                    </p>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-auto">
                      <span className="text-slate-400 font-outfit">Best Season: <strong className="text-slate-700 dark:text-slate-350">{dest.best_time}</strong></span>
                      <Link
                        to={`/destinations/${dest.id}`}
                        className="text-primary font-bold hover:underline flex items-center font-grotesk text-xs"
                      >
                        Details &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      
         

      {/* Footer */}
      <Footer />
      
      {/* Floating Chatbot */}
      <ChatbotWidget />
    </div>
  );
}
