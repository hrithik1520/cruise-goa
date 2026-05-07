import React from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Cruise } from "../types";
import { motion } from "motion/react";
import { Anchor, Users, Clock, IndianRupee, Star, MapPin, ChevronRight, Waves, Ship } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const [cruises, setCruises] = React.useState<Cruise[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, "cruises"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (shot) => {
      setCruises(shot.docs.map(d => ({ id: d.id, ...d.data() } as Cruise)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000"
            alt="Goa Dinner Cruise"
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
        </div>

        <div className="relative z-10 text-center max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600/20 backdrop-blur-md border border-white/20 mb-6 font-mono text-xs tracking-widest uppercase">
              <Waves className="w-3 h-3 mr-2 text-blue-400" />
              Sailing Across The Mandovi
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              Magical <span className="text-blue-400">Dinner Cruises</span> in Goa
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              Dine under the stars with live music, authentic Goan cuisine, and breathtaking views of the coastline.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#packages" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-900/40 transition-all flex items-center active:scale-95 group">
                Book Your Experience
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-md border border-white/20 transition-all">
                Learn More
              </button>
            </div>
          </motion.div>
        </div>

        {/* Feature badges */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden lg:flex items-center space-x-12 px-12 py-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <div className="flex items-center space-x-3">
            <Star className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold tracking-wide">Top Rated Experience</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold tracking-wide">Panjim Jetty, Goa</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold tracking-wide">Perfect for Groups</span>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section id="packages" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Our Curated Experiences</h2>
          <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-slate-500 max-w-2xl mx-auto italic">
            Select from our range of premium packages, each designed to offer a unique perspective of Goa's beauty.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-2 animate-pulse">
                <div className="aspect-[4/3] bg-slate-200 rounded-2xl mb-4" />
                <div className="p-4 space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-10 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cruises.length === 0 ? (
          <div className="text-center py-20 bg-slate-100 rounded-3xl border border-dashed border-slate-300">
            <Anchor className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-600">No packages sailing currently</h3>
            <p className="text-slate-500 mt-2">Check back soon for new experiences!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cruises.map((cruise, idx) => (
              <motion.div
                key={cruise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-slate-100"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={cruise.imageUrl}
                    alt={cruise.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  
                  {/* Price Tag Overlay */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50">
                    <div className="flex items-center text-blue-600 font-bold">
                      <IndianRupee className="w-4 h-4 mr-0.5" />
                      <span className="text-lg">{cruise.price}</span>
                      <span className="text-[10px] text-slate-500 ml-1 font-normal uppercase">/ Person</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <h3 className="text-2xl font-bold mb-3 tracking-tight group-hover:text-blue-400 transition-colors uppercase">{cruise.title}</h3>
                    <div className="flex items-center space-x-6 text-sm text-slate-300 mb-6">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-400" />
                        {cruise.duration}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-400" />
                        Max {cruise.capacity}
                      </div>
                    </div>
                    <Link
                      to={`/cruise/${cruise.id}`}
                      className="w-full block text-center py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="bg-slate-950 py-24 px-4 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">The Ultimate Coastal <span className="text-blue-400">Dining Experience</span></h2>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-600/30">
                    <Star className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Gourmet Catering</h4>
                    <p className="text-slate-400">Multi-cuisine buffet featuring authentic Goan flavors and international favorites prepared by top chefs.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-600/30">
                    <Ship className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Luxury Fleet</h4>
                    <p className="text-slate-400">Well-maintained vessels with expansive decks, air-conditioned interiors, and panoramic viewpoints.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-600/20 rounded-2xl border border-purple-600/30">
                    <Stars className="w-6 h-6 text-purple-400" xmlns="http://www.w3.org/2000/svg" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Live Entertainment</h4>
                    <p className="text-slate-400">Live bands, cultural dance performances (Dekhni & Fugdi), and professional DJs to set the mood.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1548248823-7fa3e30f167e?auto=format&fit=crop&q=80&w=1200"
                  alt="Cruise Deck"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-20 -z-0" />
              <div className="absolute -top-8 -left-8 w-48 h-48 bg-indigo-600 rounded-full blur-[100px] opacity-20 -z-0" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stars(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.912 5.813a2 2 0 0 0 1.272 1.272L21 12l-5.815 1.912a2 2 0 0 0-1.272 1.272L12 21l-1.912-5.815a2 2 0 0 0-1.272-1.272L3 12l5.813-1.912a2 2 0 0 0 1.272-1.272L12 3Z"/>
    </svg>
  );
}
