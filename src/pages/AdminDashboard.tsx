import React from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Cruise, Booking } from "../types";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Clock, IndianRupee, Users, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AuthContext } from "../App";
import { format } from "date-fns";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

export default function AdminDashboard() {
  const { user } = React.useContext(AuthContext);
  const [cruises, setCruises] = React.useState<Cruise[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [activeTab, setActiveTab] = React.useState<"cruises" | "bookings">("cruises");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCruise, setEditingCruise] = React.useState<Partial<Cruise> | null>(null);

  React.useEffect(() => {
    const isAdmin = user?.role === "admin" || user?.email === "hrithikmenezes@gmail.com";
    if (!isAdmin) return;

    const cruisesUnsub = onSnapshot(collection(db, "cruises"), (shot) => {
      setCruises(shot.docs.map(d => ({ id: d.id, ...d.data() } as Cruise)));
    }, (error) => handleFirestoreError(error, OperationType.GET, "cruises"));

    const bookingsUnsub = onSnapshot(collection(db, "bookings"), (shot) => {
      setBookings(shot.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    }, (error) => handleFirestoreError(error, OperationType.GET, "bookings"));

    return () => {
      cruisesUnsub();
      bookingsUnsub();
    };
  }, [user]);

  const isAdmin = user?.role === "admin" || user?.email === "hrithikmenezes@gmail.com";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="text-slate-600 mt-2">You must be an administrator to view this page.</p>
      </div>
    );
  }

  const [uploading, setUploading] = React.useState(false);
  const [multiUploading, setMultiUploading] = React.useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.imageUrl) {
        setEditingCruise(prev => ({ ...prev!, imageUrl: data.imageUrl }));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setMultiUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await fetch("/api/upload-multiple", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.imageUrls) {
        setEditingCruise(prev => ({
          ...prev!,
          images: [...(prev?.images || []), ...data.imageUrls]
        }));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Multi-upload error:", err);
      alert("Upload failed");
    } finally {
      setMultiUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setEditingCruise(prev => ({
      ...prev!,
      images: prev?.images?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSaveCruise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCruise) return;
    if (!editingCruise.imageUrl) {
      alert("Please upload an image first");
      return;
    }

    try {
      if (editingCruise.id) {
        const { id, ...data } = editingCruise;
        await updateDoc(doc(db, "cruises", id), data);
      } else {
        // Ensure we don't send an empty ID or stray fields
        const { id, ...cruiseParams } = editingCruise;
        await addDoc(collection(db, "cruises"), {
          ...cruiseParams,
          isActive: true,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingCruise(null);
    } catch (err) {
      const error = handleFirestoreError(err, editingCruise.id ? OperationType.UPDATE : OperationType.CREATE, "cruises");
      alert("Failed to save package: " + (err as Error).message);
    }
  };

  const handleDeleteCruise = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "cruises", id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { status });
    } catch (err) {
      console.error("Update booking error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("cruises")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "cruises" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-blue-600"}`}
          >
            Manage Cruises
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "bookings" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-blue-600"}`}
          >
            Manage Bookings
          </button>
        </div>
      </div>

      {activeTab === "cruises" ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800">Packages</h2>
            <button
              onClick={() => { setEditingCruise({ title: "", price: 0, childPrice: 0, description: "", imageUrl: "", images: [], duration: "", capacity: 50 }); setIsModalOpen(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cruises.map(cruise => (
              <div key={cruise.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                <div className="aspect-video relative overflow-hidden bg-slate-100">
                  {cruise.imageUrl ? (
                    <img src={cruise.imageUrl} alt={cruise.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      onClick={() => { setEditingCruise(cruise); setIsModalOpen(true); }}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-blue-600 shadow-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCruise(cruise.id)}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-500 shadow-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-wide text-sm">{cruise.title}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center text-blue-600 font-bold">
                      <IndianRupee className="w-4 h-4 mr-1" />
                      <span>{cruise.price}</span>
                    </div>
                    <div className="flex items-center text-slate-500 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{cruise.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Package ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guests</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 italic">
                      {booking.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 truncate max-w-[100px]">
                      {booking.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 truncate max-w-[100px]">
                      {booking.cruiseId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1 text-slate-400" />
                        {booking.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      ₹{booking.totalAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex space-x-2">
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-all"
                            title="Confirm"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Cancel"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
              <Clock className="w-12 h-12 mb-2 opacity-20" />
              <p>No bookings found.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSaveCruise} className="p-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">
                  {editingCruise?.id ? "Edit Cruise Package" : "New Cruise Package"}
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2 custom-scrollbar">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Package Title</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={editingCruise?.title || ""}
                      onChange={e => setEditingCruise(prev => ({ ...prev!, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Adult Price (₹)</label>
                      <input
                        required
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={editingCruise?.price || 0}
                        onChange={e => setEditingCruise(prev => ({ ...prev!, price: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Child Price (5-10y) (₹)</label>
                      <input
                        required
                        type="number"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={editingCruise?.childPrice || 0}
                        onChange={e => setEditingCruise(prev => ({ ...prev!, childPrice: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Duration (e.g. 3 Hours)</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={editingCruise?.duration || ""}
                      onChange={e => setEditingCruise(prev => ({ ...prev!, duration: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Capacity</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={editingCruise?.capacity || 0}
                      onChange={e => setEditingCruise(prev => ({ ...prev!, capacity: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Package Image</label>
                    <div className="flex flex-col space-y-3">
                      {editingCruise?.imageUrl && (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={editingCruise.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="image-upload"
                          className={`flex items-center justify-center space-x-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {uploading ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-sm font-medium text-slate-600">
                            {uploading ? "Uploading..." : editingCruise?.imageUrl ? "Change Image" : "Upload Image"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Gallery Images</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {(editingCruise?.images || []).map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMultipleImagesUpload}
                        className="hidden"
                        id="multi-image-upload"
                        disabled={multiUploading}
                      />
                      <label
                        htmlFor="multi-image-upload"
                        className={`flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all ${multiUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {multiUploading ? (
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-slate-600">
                          {multiUploading ? "Uploading..." : "Add Gallery Images"}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                      value={editingCruise?.description || ""}
                      onChange={e => setEditingCruise(prev => ({ ...prev!, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 active:scale-95"
                  >
                    {editingCruise?.id ? "Update Package" : "Create Package"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
