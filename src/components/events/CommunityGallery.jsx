import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const GALLERY = [
  {
    src: "/images/movement-rally.jpg",
    title: "Rose Park Rally",
    caption: "300+ neighbors turned out to launch the campaign.",
    tag: "Rally",
  },
  {
    src: "/images/movement-foodbank.jpg",
    title: "Westside Food Drive",
    caption: "Volunteers packed 1,200 meals in one Saturday morning.",
    tag: "Service",
  },
  {
    src: "/images/movement-baseball.jpg",
    title: "Coach Aaron",
    caption: "Coaching the next generation on the Riverside diamond.",
    tag: "Coach",
  },
  {
    src: "/images/aaron-coaching.jpg",
    title: "Mentoring Night",
    caption: "Late nights in the gym. Day-one Westside.",
    tag: "Youth",
  },
  {
    src: "/images/why-running-speaking.jpg",
    title: "Why I'm Running",
    caption: "Aaron sharing the story at a Glendale house party.",
    tag: "Town Hall",
  },
  {
    src: "/images/aaron-daughter.jpg",
    title: "Dad First",
    caption: "Family is why. Period.",
    tag: "Family",
  },
  {
    src: "/images/aaron-silicon-slopes.jpg",
    title: "Workforce of Tomorrow",
    caption: "Bringing Westside voices to the tech economy table.",
    tag: "Economy",
  },
  {
    src: "/images/1.jpg",
    title: "Westside Strong",
    caption: "Block by block. Door by door.",
    tag: "Canvass",
  },
];

export default function CommunityGallery() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-card]")?.clientWidth || 320;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.querySelector("[data-card]")?.clientWidth || 320;
      setActive(Math.round(el.scrollLeft / (cardWidth + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="gallery"
      className="relative bg-navy-darker dark:bg-black text-white py-20 sm:py-28 overflow-hidden"
    >
      {/* Comic halftone */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.4px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 sm:mb-14">
          <div className="max-w-2xl">
            <span className="inline-block bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs sm:text-sm px-3 py-1.5 rounded-sm shadow-md mb-4">
              Community Feed
            </span>
            <h2 className="font-condensed font-black text-white uppercase text-4xl sm:text-5xl md:text-6xl leading-[0.92] tracking-tight">
              <span className="text-coral">Westside</span>, Caught in Action.
            </h2>
            <p className="mt-3 text-white/75 leading-relaxed text-lg">
              Snapshots from the doors, the grills, the gyms, and the streets. This is what the movement looks like.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(-1)}
              className="w-11 h-11 rounded-full border border-white/30 hover:bg-white hover:text-navy-darker text-white flex items-center justify-center transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(1)}
              className="w-11 h-11 rounded-full border border-white/30 hover:bg-white hover:text-navy-darker text-white flex items-center justify-center transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "thin" }}
        >
          {GALLERY.map((item, i) => (
            <motion.figure
              key={item.src}
              data-card
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3) }}
              whileHover={{ scale: 1.02 }}
              className="group relative flex-shrink-0 w-[80vw] sm:w-[360px] aspect-[4/5] rounded-2xl overflow-hidden snap-start shadow-2xl shadow-black/40"
            >
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,31,63,0.05) 0%, rgba(0,31,63,0.4) 55%, rgba(0,31,63,0.95) 100%)",
                }}
              />
              <span className="absolute top-4 left-4 inline-flex items-center bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs px-2.5 py-1 rounded shadow-md">
                {item.tag}
              </span>
              <figcaption className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <h3 className="font-condensed font-black text-white uppercase text-2xl sm:text-3xl leading-tight tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-white/80 text-sm leading-snug">{item.caption}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {GALLERY.map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all ${
                i === active ? "w-8 bg-coral" : "w-2 bg-white/30"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
