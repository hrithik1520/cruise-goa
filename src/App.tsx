import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { UserProfile } from "./types";
import { Anchor, LogIn, LogOut, ShieldCheck, Menu, X, Calendar, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Pages
import Home from "./pages/Home";
import CruiseDetail from "./pages/CruiseDetail";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookings from "./pages/MyBookings";

export const AuthContext = React.createContext<{
  user: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export default function App() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const shouldBeAdmin = firebaseUser.email === "hrithikmenezes@gmail.com";
          
          if (shouldBeAdmin && userData.role !== "admin") {
            await updateDoc(userDocRef, { role: "admin" });
            setUser({ ...userData, role: "admin" });
          } else {
            setUser(userData);
          }
        } else {
          const newUser: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "User",
            role: firebaseUser.email === "hrithikmenezes@gmail.com" ? "admin" : "customer",
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Auth error:", error);
      alert(`Login failed: ${error.code || error.message}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/cruise/:id" element={<CruiseDetail />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/my-bookings" element={<MyBookings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

function Navbar() {
  const { user, loading, signIn, logout } = React.useContext(AuthContext);
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/src/assets/logo.png" alt="Cruise Goa" className="h-10 w-auto" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Home</Link>
            {user && (
              <Link to="/my-bookings" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">My Bookings</Link>
            )}
            {(user?.role === "admin" || user?.email === "hrithikmenezes@gmail.com") && (
              <Link to="/admin" className="flex items-center text-slate-600 hover:text-blue-600 font-medium transition-colors">
                <ShieldCheck className="w-4 h-4 mr-1" /> Admin
              </Link>
            )}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-slate-700">
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Home</Link>
              {user && (
                <Link to="/my-bookings" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">My Bookings</Link>
              )}
              {(user?.role === "admin" || user?.email === "hrithikmenezes@gmail.com") && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Admin</Link>
              )}
              {!user && (
                <button
                  onClick={() => { signIn(); setIsOpen(false); }}
                  className="w-full text-left px-3 py-2 text-blue-600 font-medium"
                >
                  Sign In with Google
                </button>
              )}
              {user && (
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="w-full text-left px-3 py-2 text-red-600 font-medium"
                >
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="mb-4">
            <img src="/src/assets/logo.png" alt="Cruise Goa" className="h-8 w-auto brightness-0 invert" />
          </div>
          <p className="text-sm leading-relaxed">
            Experience the magical sunset and luxurious dinner cruises in the heart of Goa. Premium service, authentic cuisine, and unforgettable memories.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Our Cruises</Link></li>
            <li><Link to="/my-bookings" className="hover:text-white transition-colors">Track Booking</Link></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contact Us</h4>
          <ul className="space-y-2 text-sm">
            <li>Panjim Jetty, Goa, India</li>
            <li>Email: booking@goacruises.com</li>
            <li>Phone: +91 98765 43210</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-8 text-center text-xs">
        &copy; {new Date().getFullYear()} Goa Cruise Haven. All rights reserved.
      </div>
    </footer>
  );
}
