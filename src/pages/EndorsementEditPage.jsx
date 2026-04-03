import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { db, useMock } from "@/lib/firebase";
import { mockEndorsements } from "@/lib/mockStore";
import PublicNav from "@/components/layout/PublicNav";

export default function EndorsementEditPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", title: "", why: "" });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoURL, setExistingPhotoURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  // Load the endorsement and validate the token
  useEffect(() => {
    if (!id || !token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    if (useMock) {
      const found = mockEndorsements.find((e) => e.id === id);
      if (!found || found.editToken !== token) {
        setAuthError(true);
      } else {
        setForm({
          firstName: found.firstName || "",
          lastName: found.lastName || "",
          email: found.email || "",
          title: found.title || "",
          why: found.why || "",
        });
        setExistingPhotoURL(found.photoURL || null);
        setPhotoPreview(found.photoURL || null);
      }
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "endorsements", id));
        if (!snap.exists() || snap.data().editToken !== token) {
          setAuthError(true);
        } else {
          const data = snap.data();
          setForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            title: data.title || "",
            why: data.why || "",
          });
          setExistingPhotoURL(data.photoURL || null);
          setPhotoPreview(data.photoURL || null);
        }
      } catch (err) {
        console.error(err);
        setAuthError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 900;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", 0.8);
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
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
      let photoURL = existingPhotoURL;

      if (useMock) {
        if (photo) photoURL = photoPreview;
        const idx = mockEndorsements.findIndex((e) => e.id === id);
        if (idx !== -1) {
          mockEndorsements[idx] = { ...mockEndorsements[idx], ...form, photoURL };
        }
      } else {
        if (photo) {
          try {
            const compressed = await compressImage(photo);
            const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { getApp } = await import("firebase/app");
            const storage = getStorage(getApp());
            const storageRef = ref(storage, `endorsements/${Date.now()}.jpg`);
            await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
            photoURL = await getDownloadURL(storageRef);
          } catch (uploadErr) {
            console.error("Photo upload failed, saving without new photo:", uploadErr);
          }
        }

        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "endorsements", id), {
          ...form,
          photoURL,
        });
      }

      setExistingPhotoURL(photoURL);
      setPhoto(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      console.error(err);
      setError("Something went wrong saving your changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <header className="bg-navy text-white py-8 px-4 text-center">
        <h2 className="font-condensed font-black text-3xl tracking-wide">Update Your Endorsement</h2>
        <p className="text-white/60 text-sm mt-1">Utah House District 21 · April 11, 2026</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center text-gray-400 py-20 text-sm">Loading…</div>
        ) : authError ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="font-condensed font-bold text-xl text-navy mb-2">Link not valid</h3>
            <p className="text-gray-500 text-sm mb-5">
              This edit link is invalid or has expired. Please use the exact link from your submission confirmation.
            </p>
            <Link to="/endorse" className="text-coral underline text-sm hover:text-coral/80">
              Submit a new endorsement →
            </Link>
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

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Title / Role <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Delegate, City Council Member, CEO"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Why are you endorsing Aaron? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.why}
                onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))}
                placeholder="Share your reason in a few words..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
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
                <span className="text-xs text-gray-500">
                  {photo ? photo.name : existingPhotoURL ? "Click to replace photo" : "Click to upload a photo"}
                </span>
                {photo && <span className="text-xs text-gray-400">Image will be automatically resized</span>}
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

            {saved && (
              <p className="text-green-600 text-sm font-medium">Changes saved successfully.</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors text-lg"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>

            <p className="text-center text-xs text-gray-400">
              <Link to="/endorsements" className="hover:underline">View all endorsements →</Link>
            </p>
          </form>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-200 mt-10">
        Paid for by Wiley for House District 21
      </footer>
    </div>
  );
}
