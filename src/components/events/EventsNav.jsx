import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function EventsNav({ darkMode, onToggleDark }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#events", label: "Events" },
    { href: "#volunteer", label: "Volunteer" },
    { href: "#gallery", label: "Gallery" },
    { href: "#signup", label: "Stay Connected" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#002A52]/95 backdrop-blur shadow-lg shadow-black/30"
          : "bg-[#002A52]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-3">
        <a
          href="https://wileyfor21.com"
          className="flex items-center gap-2 group"
          aria-label="Aaron Wiley for District 21 — Home"
        >
          <span className="font-condensed font-black text-white text-xl sm:text-2xl tracking-wide leading-none uppercase">
            Wiley<span className="text-coral">for21</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-condensed font-bold text-white/85 hover:text-white text-sm tracking-[0.12em] uppercase transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full border border-white/25 text-white/80 hover:text-white hover:border-white transition-colors"
          >
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>

          <a
            href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-block font-condensed font-bold text-white border border-white/40 hover:border-white hover:bg-white/10 px-4 py-2 rounded text-sm tracking-[0.12em] uppercase transition-colors"
          >
            Donate
          </a>
          <Link
            to="/signup"
            className="inline-block font-condensed font-bold bg-coral hover:bg-[#F58A88] text-white px-4 py-2 rounded text-sm tracking-[0.12em] uppercase transition-colors"
          >
            Join Up
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="md:hidden flex flex-col gap-1.5 p-2"
          >
            <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#001f3f] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-condensed font-bold text-white/85 hover:text-white text-base tracking-[0.12em] uppercase py-1"
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01"
              target="_blank"
              rel="noopener noreferrer"
              className="font-condensed font-bold text-white border border-white/40 hover:bg-white/10 px-4 py-2 rounded text-sm tracking-[0.12em] uppercase text-center"
            >
              Donate
            </a>
            <button
              type="button"
              onClick={() => { onToggleDark(); }}
              className="font-condensed font-bold text-white/80 hover:text-white border border-white/20 px-4 py-2 rounded text-sm tracking-[0.12em] uppercase"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
