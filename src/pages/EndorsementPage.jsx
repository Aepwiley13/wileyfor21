import { useState, useEffect, useRef } from "react";
import { db, useMock } from "@/lib/firebase";

// In-memory store for mock/dev mode
const mockEndorsements = [];

export default function EndorsementPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [endorsements, setEndorsements] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  // Load endorsements (real-time in Firebase, static in mock)
  useEffect(() => {
    if (useMock) {
      setEndorsements([...mockEndorsements]);
      return;
    }
    if (!db) return;
    let unsubscribe;
    (async () => {
      const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
      const q = query(collection(db, "endorsements"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(q, (snap) => {
        setEndorsements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    })();
    return () => unsubscribe?.();
  }, []);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      let photoURL = null;

      if (useMock) {
        photoURL = photoPreview;
        const newEndorsement = {
          id: Date.now().toString(),
          ...form,
          photoURL,
          createdAt: new Date().toISOString(),
        };
        mockEndorsements.unshift(newEndorsement);
        setEndorsements([...mockEndorsements]);
      } else {
        // Upload photo to Firebase Storage if provided
        if (photo) {
          const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
          const { getApp } = await import("firebase/app");
          const storage = getStorage(getApp());
          const storageRef = ref(storage, `endorsements/${Date.now()}_${photo.name}`);
          await uploadBytes(storageRef, photo);
          photoURL = await getDownloadURL(storageRef);
        }

        if (db) {
          const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
          await addDoc(collection(db, "endorsements"), {
            ...form,
            photoURL,
            createdAt: serverTimestamp(),
          });
        }
      }

      setSubmitted(true);
      setForm({ firstName: "", lastName: "", email: "" });
      setPhoto(null);
      setPhotoPreview(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-navy text-white py-8 px-4 text-center">
        <h1 className="font-condensed font-black text-4xl tracking-wide">WILEY FOR 21</h1>
        <p className="text-white/60 text-sm mt-1">Utah House District 21 · April 11, 2026</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Intro */}
        <div className="text-center">
          <h2 className="font-condensed font-bold text-3xl text-navy mb-2">Endorse Aaron Wiley</h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            Add your name to the growing list of neighbors who support Aaron's vision for a stronger District 21.
          </p>
        </div>

        {/* Form / Success */}
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-condensed font-bold text-xl text-navy mb-1">Thank you for your endorsement!</h3>
            <p className="text-gray-500 text-sm mb-5">Your name has been added to the list below.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-coral underline text-sm hover:text-coral/80"
            >
              Add another endorsement
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="font-condensed font-bold text-lg text-navy">Your Information</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="First"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Photo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-navy/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-light-gray flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                )}
                <span className="text-xs text-gray-500">{photo ? photo.name : "Click to upload a photo"}</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors text-lg"
            >
              {submitting ? "Submitting..." : "Add My Endorsement"}
            </button>
          </form>
        )}

        {/* Endorser List */}
        <div>
          <h3 className="font-condensed font-bold text-2xl text-navy mb-4">
            {endorsements.length > 0
              ? `${endorsements.length} Endorser${endorsements.length !== 1 ? "s" : ""}`
              : "Be the first to endorse!"}
          </h3>

          {endorsements.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {endorsements.map((endorser) => (
                <div
                  key={endorser.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center text-center gap-2"
                >
                  {endorser.photoURL ? (
                    <img
                      src={endorser.photoURL}
                      alt={`${endorser.firstName} ${endorser.lastName}`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white font-condensed font-bold text-xl">
                      {endorser.firstName?.[0]}{endorser.lastName?.[0]}
                    </div>
                  )}
                  <p className="font-medium text-gray-900 text-sm leading-tight">
                    {endorser.firstName} {endorser.lastName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-200 mt-10">
        Paid for by Wiley for House District 21
      </footer>
    </div>
  );
}
