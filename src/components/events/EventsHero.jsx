import { motion } from "framer-motion";

export default function EventsHero({ onUpcoming, onVolunteer, onJoin }) {
  return (
    <section className="relative overflow-hidden bg-[#002A52] dark:bg-black">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero-background.jpg')" }}
        aria-hidden="true"
      />
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(0,31,63,0.94) 0%, rgba(3,74,118,0.85) 45%, rgba(243,111,107,0.55) 100%)",
        }}
        aria-hidden="true"
      />
      {/* Comic-style halftone dots */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1.4px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden="true"
      />
      {/* Diagonal red stripe */}
      <div
        className="hidden md:block absolute -right-20 top-12 w-[420px] h-16 rotate-[8deg] origin-center shadow-2xl shadow-black/50"
        style={{ background: "linear-gradient(90deg,#F36F6B,#E0413D)" }}
        aria-hidden="true"
      >
        <p className="font-condensed font-black text-white text-2xl tracking-[0.25em] text-center leading-[4rem] uppercase drop-shadow">
          District 21 · Westside Strong
        </p>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <span className="inline-block bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs sm:text-sm px-3 py-1.5 rounded-sm shadow-md mb-5">
            Westside · Events · 2026
          </span>
          <h1 className="font-condensed font-black text-white uppercase leading-[0.88] tracking-tight text-[3.25rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[7.5rem]">
            Westside <span className="text-coral">Events</span>
            <br />
            & Community <span className="text-coral">Action</span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 max-w-2xl text-lg sm:text-xl md:text-2xl text-white/90 leading-snug"
          >
            Join us. Volunteer. Build the future of District 21 together.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-4 font-condensed font-bold tracking-[0.18em] uppercase text-white/70 text-sm"
          >
            Community · Cookouts · Canvass · Conviction
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-10 flex flex-wrap gap-3 sm:gap-4"
          >
            <button
              type="button"
              onClick={onUpcoming}
              className="group inline-flex items-center gap-2 bg-coral hover:bg-[#F58A88] text-white font-condensed font-black tracking-[0.14em] uppercase text-base sm:text-lg px-6 py-4 rounded-md shadow-lg shadow-black/30 hover:-translate-y-0.5 transition-all"
            >
              Upcoming Events
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              type="button"
              onClick={onVolunteer}
              className="group inline-flex items-center gap-2 bg-white hover:bg-cream text-navy-darker font-condensed font-black tracking-[0.14em] uppercase text-base sm:text-lg px-6 py-4 rounded-md shadow-lg shadow-black/30 hover:-translate-y-0.5 transition-all"
            >
              Volunteer Now
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="group inline-flex items-center gap-2 border-2 border-white hover:bg-white hover:text-navy-darker text-white font-condensed font-black tracking-[0.14em] uppercase text-base sm:text-lg px-6 py-4 rounded-md transition-all hover:-translate-y-0.5"
            >
              Join the Movement
            </button>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.85 }}
            className="mt-14 grid grid-cols-3 gap-4 max-w-xl text-white"
          >
            {[
              { stat: "12K+", label: "Doors Knocked" },
              { stat: "300+", label: "Volunteers" },
              { stat: "1", label: "Westside, One Fight" },
            ].map((s) => (
              <div key={s.label} className="border-l-4 border-coral pl-3">
                <p className="font-condensed font-black text-3xl sm:text-4xl leading-none">
                  {s.stat}
                </p>
                <p className="font-condensed font-bold tracking-[0.1em] uppercase text-xs sm:text-sm text-white/80 mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom diagonal slash */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full text-cream dark:text-black"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points="0,60 1440,60 1440,0" fill="currentColor" />
      </svg>
    </section>
  );
}
