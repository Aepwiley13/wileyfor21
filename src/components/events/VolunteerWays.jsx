import { motion } from "framer-motion";

const WAYS = [
  {
    title: "Canvassing",
    description: "Knock on Westside doors with neighbors who get it. We'll train you Saturday mornings.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
        <path d="M9 9h6v6H9z" />
      </svg>
    ),
    color: "#F36F6B",
  },
  {
    title: "Phone Banking",
    description: "Make voter contacts from anywhere — couch, kitchen table, lunch break. Scripts provided.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.13 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    color: "#034A76",
  },
  {
    title: "Community Outreach",
    description: "Be a Westside connector — bring Aaron to your block, your church, your barbershop.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: "#F36F6B",
  },
  {
    title: "Event Hosting",
    description: "Open your home, backyard, or community space. We'll bring food, signs, and the candidate.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    color: "#034A76",
  },
  {
    title: "Social Media Team",
    description: "Share stories, shoot reels, hype the cookouts. We need creators, not just clickers.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
    color: "#F36F6B",
  },
  {
    title: "Youth Engagement",
    description: "Young people are the heart of this district. Lead student outreach, mock canvasses, and youth nights.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    color: "#034A76",
  },
];

export default function VolunteerWays({ onVolunteer }) {
  return (
    <section
      id="volunteer"
      className="relative bg-cream dark:bg-[#08111c] py-20 sm:py-28 overflow-hidden"
    >
      {/* Decorative comic dots */}
      <div
        className="absolute -top-12 -left-12 w-72 h-72 opacity-20 dark:opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(rgba(3,74,118,0.7) 2px, transparent 2.5px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-12 -right-12 w-72 h-72 opacity-20 dark:opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(rgba(243,111,107,0.7) 2px, transparent 2.5px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block bg-navy text-white font-condensed font-black tracking-[0.18em] uppercase text-xs sm:text-sm px-3 py-1.5 rounded-sm shadow-md mb-4">
            Ways to Get Involved
          </span>
          <h2 className="font-condensed font-black text-navy-darker dark:text-white uppercase text-4xl sm:text-5xl md:text-6xl leading-[0.92] tracking-tight">
            Everybody Has <br className="hidden sm:block" />
            A <span className="text-coral">Role to Play.</span>
          </h2>
          <p className="mt-4 text-lg text-navy-darker/75 dark:text-white/75">
            Two hours a week. A single Saturday. Or a full-on neighborhood takeover. There's a way in for every Westsider.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {WAYS.map((way, i) => (
            <motion.div
              key={way.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -6 }}
              className="group relative bg-white dark:bg-[#0c1727] rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/5 dark:shadow-black/30 border border-black/5 dark:border-white/5 overflow-hidden"
            >
              <span
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full transition-transform duration-500 group-hover:scale-125"
                style={{ background: way.color, opacity: 0.12 }}
                aria-hidden="true"
              />
              <div
                className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md"
                style={{ background: way.color }}
              >
                <div className="w-6 h-6 text-white">{way.icon}</div>
              </div>
              <h3 className="font-condensed font-black text-2xl text-navy-darker dark:text-white uppercase leading-tight tracking-tight">
                {way.title}
              </h3>
              <p className="mt-2 text-navy-darker/75 dark:text-white/75 leading-relaxed">
                {way.description}
              </p>
              <button
                type="button"
                onClick={() => onVolunteer({ title: way.title })}
                className="mt-5 inline-flex items-center gap-1.5 font-condensed font-black tracking-[0.14em] uppercase text-sm text-coral hover:text-[#E0413D] transition-colors"
              >
                Sign Me Up
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 sm:mt-16 text-center">
          <button
            type="button"
            onClick={() => onVolunteer({ title: "Volunteer Leader" })}
            className="inline-flex items-center gap-2 bg-navy-darker hover:bg-navy text-white font-condensed font-black tracking-[0.16em] uppercase text-base sm:text-lg px-7 py-4 rounded-md shadow-xl shadow-navy/30 hover:-translate-y-0.5 transition-all"
          >
            Become a Volunteer Leader
            <span aria-hidden="true">★</span>
          </button>
          <p className="mt-3 text-sm text-navy-darker/60 dark:text-white/55">
            Leaders organize teams, host trainings, and run their own turf. Apply once — captain forever.
          </p>
        </div>
      </div>
    </section>
  );
}
