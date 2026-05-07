import React from "react";
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Booking, Cruise } from "../types";
import { AuthContext } from "../App";
import { motion } from "motion/react";
import { Ticket, Calendar, Users, IndianRupee, Ship, Clock, Search, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyBookings() {
  const { user, signIn, loading: authLoading } = React.useContext(AuthContext);
  const [bookings, setBookings] = React.useState<(Booking & { cruise?: Cruise })[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (shot) => {
      const bookingData = await Promise.all(shot.docs.map(async (d) => {
        const booking = { id: d.id, ...d.data() } as Booking;
        const cruiseSnap = await getDoc(doc(db, "cruises", booking.cruiseId));
        return {
          ...booking,
          cruise: cruiseSnap.exists() ? ({ id: cruiseSnap.id, ...cruiseSnap.data() } as Cruise) : undefined
        };
      }));
      setBookings(bookingData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-8">
        {[1, 2].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse" />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 border border-slate-100">
          <Ticket className="w-16 h-16 mx-auto text-slate-300 mb-6" />
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight uppercase">Your Journeys Await</h1>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Sign in to view your tickets, manage reservations, and access exclusive Goan experiences.</p>
          <button
            onClick={signIn}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">My Bookings</h1>
          <p className="text-slate-500 mt-2 font-medium italic">Track your upcoming sailors and past memories.</p>
        </div>
        <div className="flex items-center text-sm font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl">
          <Search className="w-4 h-4 mr-2" />
          {bookings.length} RESERVATIONS
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
          <Ship className="w-16 h-16 mx-auto text-slate-200 mb-6" />
          <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">No Bookings Yet</h3>
          <p className="text-slate-500 mt-2 italic">Your first Goa adventure is just a click away.</p>
          <Link
            to="/"
            className="inline-block mt-8 px-8 py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-2xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest text-sm"
          >
            Explore Packages
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {bookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 aspect-video md:aspect-auto relative overflow-hidden bg-slate-100">
                  {booking.cruise?.imageUrl && (
                    <img
                      src={booking.cruise.imageUrl}
                      alt={booking.cruise.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg backdrop-blur-md ${
                      booking.status === 'confirmed' ? 'bg-emerald-500/90 text-white' :
                      booking.status === 'pending' ? 'bg-amber-500/90 text-white' :
                      'bg-red-500/90 text-white'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>

                <div className="md:w-2/3 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                        {booking.cruise?.title || "Unknown Package"}
                      </h3>
                      <Link to={`/cruise/${booking.cruiseId}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <ExternalLink className="w-5 h-5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        <div className="p-2 bg-slate-50 rounded-lg mr-3">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        {booking.date}
                      </div>
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        <div className="p-2 bg-slate-50 rounded-lg mr-3">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        {booking.adults}A | {booking.children || 0}C | {booking.infants || 0}I
                      </div>
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        <div className="p-2 bg-slate-50 rounded-lg mr-3">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        {booking.cruise?.duration || "N/A"}
                      </div>
                      <div className="flex items-center text-sm font-bold text-slate-900">
                        <div className="p-2 bg-blue-50 rounded-lg mr-3">
                          <IndianRupee className="w-4 h-4 text-blue-600" />
                        </div>
                        ₹{booking.totalAmount}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      Ref: {booking.id.slice(0, 8).toUpperCase()}
                    </div>
                    {booking.status === 'confirmed' && (
                      <button className="flex items-center text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest">
                        Download Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
