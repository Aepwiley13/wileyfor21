import { useState } from "react";
import { motion } from "framer-motion";

export default function SignupSection() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState(null); // null | 'email' | 'sms'
  const [submitting, setSubmitting] = useState(false);

  async function submit(channel) {
    if (!form.name.trim() || (channel === "email" && !form.email.trim()) || (channel === "sms" && !form.phone.trim())) {
      setStatus("error");
      return;
    }
    setSubmitting(true);
    // Hook up to your provider (Mailchimp / Action Network / Twilio).
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setStatus(channel);
  }

  return (
    <section id="signup" className="relative py-20 sm:py-28 bg-cream dark:bg-[#08111c] overflow-hidden">
      <div
        className="absolute top-0 right-0 w-72 h-72 -translate-y-1/3 translate-x-1/3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(243,111,107,0.3), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 translate-y-1/3 -translate-x-1/3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(3,74,118,0.3), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-gradient-to-br from-[#001f3f] via-navy to-[#034A76] text-white p-7 sm:p-12 shadow-2xl shadow-navy/40 overflow-hidden"
        >
          {/* Comic burst */}
          <div
            className="absolute -top-20 -right-24 w-72 h-72 rotate-12 opacity-30"
            style={{
              background:
                "conic-gradient(from 0deg, #F36F6B, transparent 40%, #F36F6B 60%, transparent)",
              maskImage:
                "radial-gradient(circle at center, white 30%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative max-w-2xl">
            <span className="inline-block bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs sm:text-sm px-3 py-1.5 rounded-sm shadow-md mb-4">
              Stay Connected
            </span>
            <h2 className="font-condensed font-black uppercase text-4xl sm:text-5xl md:text-6xl leading-[0.92] tracking-tight">
              Stay Connected <br />
              <span className="text-coral">to the Movement</span>
            </h2>
            <p className="mt-4 text-white/80 text-lg leading-relaxed">
              Event alerts, canvass invites, the occasional Aaron-on-the-grill photo. No spam. Reply STOP anytime.
            </p>
          </div>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              aria-label="Name"
              className="bg-white/10 border border-white/20 placeholder-white/55 text-white px-4 py-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            />
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email address"
              aria-label="Email"
              className="bg-white/10 border border-white/20 placeholder-white/55 text-white px-4 py-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            />
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number"
              aria-label="Phone"
              className="bg-white/10 border border-white/20 placeholder-white/55 text-white px-4 py-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            />
          </div>

          <div className="relative mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => submit("email")}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-coral hover:bg-[#F58A88] disabled:opacity-70 text-white font-condensed font-black tracking-[0.14em] uppercase text-base px-6 py-3.5 rounded-md shadow-lg shadow-black/30 hover:-translate-y-0.5 transition-all"
            >
              Get Updates
            </button>
            <button
              type="button"
              onClick={() => submit("sms")}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-white hover:bg-cream text-navy-darker disabled:opacity-70 font-condensed font-black tracking-[0.14em] uppercase text-base px-6 py-3.5 rounded-md shadow-lg shadow-black/30 hover:-translate-y-0.5 transition-all"
            >
              Text Me Event Alerts
            </button>
          </div>

          {status === "email" && (
            <p className="relative mt-4 text-coral font-condensed font-bold tracking-wide">
              ★ You're in. Welcome to the Westside list.
            </p>
          )}
          {status === "sms" && (
            <p className="relative mt-4 text-coral font-condensed font-bold tracking-wide">
              ★ You'll get a confirmation text within the hour.
            </p>
          )}
          {status === "error" && (
            <p className="relative mt-4 text-coral font-condensed font-bold tracking-wide">
              Add your name + email or phone to get rolling.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
