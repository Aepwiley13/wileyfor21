import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const VOLUNTEER_OPTIONS = [
  "Door Knocking",
  "Phone Banking",
  "Event Setup",
  "Cookout Volunteer",
  "Community Outreach",
];

const DEFAULT_SHIFTS = [
  "Morning (10 AM – 1 PM)",
  "Afternoon (1 PM – 4 PM)",
  "Evening (4 PM – 8 PM)",
  "Wherever I'm needed most",
];

export default function RSVPModal({ open, onClose, event, defaultIntent = "rsvp" }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    roles: [],
    shift: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const closeBtnRef = useRef(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setSubmitting(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        roles: defaultIntent === "volunteer" ? ["Door Knocking"] : [],
        shift: "",
        notes: "",
      });
      // Focus close button shortly after open
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [open, defaultIntent]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function toggleRole(role) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    // Hook this up to Firebase / Netlify Forms / Action Network when ready.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  const shifts = event?.shifts?.length ? event.shifts : DEFAULT_SHIFTS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="rsvp-title"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 250, damping: 26 }}
            className="relative w-full sm:max-w-lg bg-white dark:bg-[#0c1727] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#001f3f] via-navy to-[#034A76] text-white px-5 sm:px-7 py-5">
              <button
                type="button"
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
              <p className="font-condensed font-black tracking-[0.18em] uppercase text-coral text-xs sm:text-sm">
                {defaultIntent === "volunteer" ? "Volunteer Sign-Up" : "RSVP"}
              </p>
              <h3 id="rsvp-title" className="font-condensed font-black text-2xl sm:text-3xl uppercase leading-tight mt-1">
                {event?.title || "Step Up for the Westside"}
              </h3>
              {event?.dateLabel && (
                <p className="text-white/80 text-sm mt-1.5">
                  {event.dateLabel} · {event.timeLabel}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 sm:px-7 py-5 flex-1">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-coral/15 text-coral flex items-center justify-center mb-4">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <h4 className="font-condensed font-black text-2xl sm:text-3xl text-navy-darker dark:text-white uppercase tracking-tight">
                    Thank you for stepping up for the Westside!
                  </h4>
                  <p className="mt-3 text-navy-darker/75 dark:text-white/75 leading-relaxed">
                    A campaign organizer will be in touch within 24 hours with shift details and your training resources. Together, we win.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 inline-flex items-center bg-navy hover:bg-navy-darker text-white font-condensed font-black tracking-[0.12em] uppercase text-sm px-5 py-3 rounded transition-colors"
                  >
                    Back to Events
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      label="Name *"
                      id="rsvp-name"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                    />
                    <Field
                      label="Phone Number"
                      id="rsvp-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    />
                  </div>
                  <Field
                    label="Email *"
                    id="rsvp-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />

                  <fieldset>
                    <legend className="font-condensed font-bold tracking-[0.12em] uppercase text-xs text-navy-darker dark:text-white/80 mb-2">
                      How do you want to help?
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {VOLUNTEER_OPTIONS.map((opt) => {
                        const active = form.roles.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-md border cursor-pointer text-sm transition-colors ${
                              active
                                ? "border-coral bg-coral/10 text-navy-darker dark:text-white"
                                : "border-black/15 dark:border-white/15 text-navy-darker/80 dark:text-white/75 hover:border-navy dark:hover:border-white/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleRole(opt)}
                              className="accent-coral w-4 h-4"
                            />
                            <span className="font-condensed font-bold tracking-wide">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <label
                      htmlFor="rsvp-shift"
                      className="font-condensed font-bold tracking-[0.12em] uppercase text-xs text-navy-darker dark:text-white/80"
                    >
                      Preferred Shift
                    </label>
                    <select
                      id="rsvp-shift"
                      value={form.shift}
                      onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
                      className="mt-1.5 w-full bg-white dark:bg-[#0c1727] border border-black/15 dark:border-white/15 text-navy-darker dark:text-white px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral"
                    >
                      <option value="">Pick a shift…</option>
                      {shifts.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rsvp-notes"
                      className="font-condensed font-bold tracking-[0.12em] uppercase text-xs text-navy-darker dark:text-white/80"
                    >
                      Anything else? (optional)
                    </label>
                    <textarea
                      id="rsvp-notes"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="mt-1.5 w-full bg-white dark:bg-[#0c1727] border border-black/15 dark:border-white/15 text-navy-darker dark:text-white px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                      placeholder="Bringing kids, dietary needs, accessibility..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center bg-coral hover:bg-[#F58A88] disabled:opacity-70 disabled:cursor-not-allowed text-white font-condensed font-black tracking-[0.14em] uppercase text-base px-4 py-3.5 rounded-md transition-colors shadow-lg shadow-black/20"
                  >
                    {submitting ? "Sending…" : "I'm In — Sign Me Up"}
                  </button>
                  <p className="text-xs text-center text-navy-darker/55 dark:text-white/55">
                    By submitting you agree to receive campaign updates. Reply STOP to opt out.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, id, type = "text", value, onChange, required, autoComplete }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-condensed font-bold tracking-[0.12em] uppercase text-xs text-navy-darker dark:text-white/80"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-white dark:bg-[#0c1727] border border-black/15 dark:border-white/15 text-navy-darker dark:text-white px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral"
      />
    </div>
  );
}
