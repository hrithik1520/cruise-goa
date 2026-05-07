import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Cruise } from "../types";
import { AuthContext } from "../App";
import { IndianRupee, Clock, Users, Calendar, ArrowLeft, ShieldCheck, Ticket, Info, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CruiseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signIn } = React.useContext(AuthContext);
  const [cruise, setCruise] = React.useState<Cruise | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeImage, setActiveImage] = React.useState<string | null>(null);
  const [bookingData, setBookingData] = React.useState({
    date: new Date().toISOString().split('T')[0],
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [isBooking, setIsBooking] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    const fetchCruise = async () => {
      const docSnap = await getDoc(doc(db, "cruises", id));
      if (docSnap.exists()) {
        const data = docSnap.data() as Cruise;
        setCruise({ id: docSnap.id, ...data });
        setActiveImage(data.imageUrl);
      }
      setLoading(false);
    };
    fetchCruise();
  }, [id]);

  const guestCount = bookingData.adults + bookingData.children + bookingData.infants;
  const platformFee = guestCount * 1;
  const totalAmount = cruise ? (cruise.price * bookingData.adults) + (cruise.childPrice * bookingData.children) + platformFee : 0;

  const handleStartBooking = async () => {
    if (!user) {
      signIn();
      return;
    }
    
    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

    setIsBooking(true);
    
    try {
      // 1. Create a pending booking in Firestore
      const bookingRef = await addDoc(collection(db, "bookings"), {
        cruiseId: id,
        userId: user.id,
        date: bookingData.date,
        adults: bookingData.adults,
        children: bookingData.children,
        infants: bookingData.infants,
        totalAmount,
        status: "pending",
        createdAt: serverTimestamp()
      });

      // 2. Get Razorpay order from backend
      const response = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount, bookingId: bookingRef.id }),
      });
      
      const order = await response.json();
      
      const options = {
        key: (process.env as any).VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Goa Cruise Haven",
        description: `Booking for ${cruise.title}`,
        order_id: order.id,
        handler: async (response: any) => {
          // 3. Verify payment on server
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            // 4. Update booking status
            await updateDoc(doc(db, "bookings", bookingRef.id), {
              status: "confirmed",
              paymentIntentId: response.razorpay_payment_id
            });
            navigate("/my-bookings");
          } else {
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("Failed to start booking: " + err.message);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) return <div className="min-h-screen animate-pulse bg-slate-50" />;
  if (!cruise) return <div className="p-8 text-center text-slate-500">Cruise not found.</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-slate-500 hover:text-blue-600 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Listings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-slate-100"
            >
              <div className="flex flex-col">
                <div className="aspect-[21/9] relative">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      src={activeImage || ""}
                      alt={cruise.title}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <div className="absolute bottom-6 left-8 right-8 text-white">
                    <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2">{cruise.title}</h1>
                    <div className="flex items-center text-slate-200">
                      <Clock className="w-4 h-4 mr-2" />
                      {cruise.duration} Journey
                    </div>
                  </div>
                </div>

                {/* Gallery Thumbnails */}
                {cruise.images && cruise.images.length > 0 && (
                  <div className="flex space-x-2 p-4 bg-slate-50 border-b border-slate-100 overflow-x-auto custom-scrollbar">
                    <button
                      onClick={() => setActiveImage(cruise.imageUrl)}
                      className={`relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${activeImage === cruise.imageUrl ? 'border-blue-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={cruise.imageUrl} alt="Main" className="w-full h-full object-cover" />
                    </button>
                    {cruise.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(img)}
                        className={`relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${activeImage === img ? 'border-blue-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 md:p-12">
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl flex items-center font-bold text-sm border border-blue-100 italic">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Verified Operator
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center font-bold text-sm border border-emerald-100 italic">
                    <Check className="w-4 h-4 mr-2" />
                    Instant Confirmation
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-4 border-l-4 border-blue-600 pl-4 uppercase tracking-wide">About this Experience</h2>
                <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                  {cruise.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-12 border-t border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                      <Info className="w-5 h-5 mr-2 text-blue-600" />
                      Inclusions
                    </h3>
                    <ul className="space-y-3 text-slate-600">
                      <li className="flex items-center"><Check className="w-4 h-4 mr-3 text-emerald-500" /> Welcome Drinks on Arrival</li>
                      <li className="flex items-center"><Check className="w-4 h-4 mr-3 text-emerald-500" /> Multi-cuisine Buffet Dinner</li>
                      <li className="flex items-center"><Check className="w-4 h-4 mr-3 text-emerald-500" /> Live Band & Cultural Acts</li>
                      <li className="flex items-center"><Check className="w-4 h-4 mr-3 text-emerald-500" /> Sightseeing around Panjim</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-sm">Departure Point</h3>
                    <p className="text-slate-600 text-sm mb-4 italic">Captain of Ports Jetty, Panjim, Goa, 403001</p>
                    <div className="h-48 bg-slate-200 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src="https://maps.google.com/maps?q=Captain%20of%20Ports%20Jetty,%20Panjim,%20Goa&t=&z=15&ie=UTF8&iwloc=&output=embed"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sticky top-28"
            >
              <div className="mb-6 pb-6 border-b border-slate-100">
                <span className="text-slate-500 text-sm uppercase tracking-widest font-bold block mb-1">Starting from</span>
                <div className="flex items-baseline text-slate-900">
                  <IndianRupee className="w-6 h-6 mr-1 text-blue-600" />
                  <span className="text-4xl font-extrabold">{cruise.price}</span>
                  <span className="text-slate-500 ml-2 text-lg">/ adult</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <Calendar className="w-3 h-3 mr-2" /> Select Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                      Adults (10y+) - ₹{cruise.price}
                    </label>
                    <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => setBookingData({ ...bookingData, adults: Math.max(1, bookingData.adults - 1) })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >-</button>
                      <span className="flex-grow text-center font-bold text-slate-900">{bookingData.adults}</span>
                      <button
                        onClick={() => setBookingData({ ...bookingData, adults: bookingData.adults + 1 })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                      Kids (5-10y) - ₹{cruise.childPrice}
                    </label>
                    <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => setBookingData({ ...bookingData, children: Math.max(0, bookingData.children - 1) })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >-</button>
                      <span className="flex-grow text-center font-bold text-slate-900">{bookingData.children}</span>
                      <button
                        onClick={() => setBookingData({ ...bookingData, children: bookingData.children + 1 })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                      Infants (Below 5y) - FREE
                    </label>
                    <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => setBookingData({ ...bookingData, infants: Math.max(0, bookingData.infants - 1) })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >-</button>
                      <span className="flex-grow text-center font-bold text-slate-900">{bookingData.infants}</span>
                      <button
                        onClick={() => setBookingData({ ...bookingData, infants: bookingData.infants + 1 })}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 hover:shadow-sm transition-all font-bold text-xl"
                      >+</button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tickets Subtotal</span>
                    <span className="text-slate-900 font-medium flex items-center">
                      <IndianRupee className="w-3 h-3 mr-0.5" />
                      {totalAmount - platformFee}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Platform Fee</span>
                    <span className="text-slate-900 font-medium flex items-center">
                      <IndianRupee className="w-3 h-3 mr-0.5" />
                      {platformFee}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-50">
                    <span className="text-slate-900 font-bold uppercase tracking-wide">Total Price</span>
                    <div className="flex items-center text-blue-600 font-extrabold text-2xl tracking-tight">
                      <IndianRupee className="w-5 h-5 mr-0.5" />
                      {totalAmount}
                    </div>
                  </div>

                  <button
                    onClick={handleStartBooking}
                    disabled={isBooking}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                  >
                    {isBooking ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Ticket className="w-5 h-5 mr-3" />
                        Reserve Now
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-[0.2em] font-medium">
                    Fully Refundable up to 24h before
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

