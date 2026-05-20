import { Link } from "react-router-dom";

export default function EventsFooter() {
  return (
    <footer className="bg-[#001428] text-white pt-16 pb-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/images/footer-logo.png"
                alt="Wiley for 21"
                className="h-12 w-auto"
                loading="lazy"
              />
              <div className="font-condensed font-black text-xl uppercase tracking-wide leading-tight">
                Aaron Wiley
                <br />
                <span className="text-coral">for District 21</span>
              </div>
            </div>
            <p className="mt-5 text-white/70 leading-relaxed max-w-md">
              The Westside built me. Now we build a future where every block of District 21 gets the representation it deserves.
            </p>
            <div className="mt-6 flex gap-3">
              <SocialLink
                href="https://facebook.com/utahforwiley"
                label="Facebook"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </SocialLink>
              <SocialLink
                href="https://instagram.com/utahforwiley"
                label="Instagram"
                stroke
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </SocialLink>
              <SocialLink href="mailto:utahforwiley@gmail.com" label="Email" stroke>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </SocialLink>
            </div>
          </div>

          <FooterColumn title="Get Involved">
            <Link to="/signup" className="footer-link">Volunteer Hub</Link>
            <Link to="/endorse" className="footer-link">Endorse Aaron</Link>
            <a href="/caucus" className="footer-link">Caucus Night</a>
            <Link to="/events" className="footer-link">Events</Link>
          </FooterColumn>

          <FooterColumn title="Campaign">
            <a href="https://wileyfor21.com#movement" className="footer-link">Our Movement</a>
            <a href="https://wileyfor21.com#commitment" className="footer-link">Issues</a>
            <a href="https://wileyfor21.com#meet-aaron" className="footer-link">Meet Aaron</a>
            <Link to="/endorsements" className="footer-link">Endorsements Wall</Link>
          </FooterColumn>

          <div>
            <h4 className="font-condensed font-black tracking-[0.16em] uppercase text-sm text-white/60 mb-4">
              Donate
            </h4>
            <a
              href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 bg-coral hover:bg-[#F58A88] text-white font-condensed font-black tracking-[0.14em] uppercase text-base px-5 py-3 rounded-md shadow-lg shadow-black/40 hover:-translate-y-0.5 transition-all"
            >
              Chip In Now
            </a>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Salt Lake City, UT
              <br />
              <a href="mailto:utahforwiley@gmail.com" className="hover:text-white">utahforwiley@gmail.com</a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <p>© {new Date().getFullYear()} Aaron Wiley Committee to Elect</p>
          <p className="font-condensed font-bold tracking-[0.16em] uppercase">
            Paid for by the Aaron Wiley Committee to Elect
          </p>
        </div>
      </div>

      <style>{`
        .footer-link {
          display: block;
          color: rgba(255,255,255,0.7);
          font-family: "Barlow", sans-serif;
          padding: 4px 0;
          transition: color 0.2s, transform 0.2s;
        }
        .footer-link:hover { color: #ffffff; transform: translateX(3px); }
      `}</style>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h4 className="font-condensed font-black tracking-[0.16em] uppercase text-sm text-white/60 mb-4">
        {title}
      </h4>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SocialLink({ href, label, children, stroke = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-10 h-10 rounded-full border border-white/25 text-white/80 hover:text-white hover:border-coral hover:bg-coral/15 flex items-center justify-center transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={stroke ? "none" : "currentColor"}
        stroke={stroke ? "currentColor" : "none"}
        strokeWidth={stroke ? 2 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </a>
  );
}
