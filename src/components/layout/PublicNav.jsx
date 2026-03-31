import { Link } from "react-router-dom";

export default function PublicNav() {
  return (
    <nav className="bg-navy-darker px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      {/* Logo */}
      <a
        href="https://wileyfor21.com"
        className="font-condensed font-black text-white text-xl tracking-wide hover:text-coral transition-colors"
      >
        WILEY FOR 21
      </a>

      {/* Links */}
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href="https://wileyfor21.com"
          className="text-white/70 text-sm hover:text-white transition-colors px-2 py-1 hidden sm:inline"
        >
          Main Site
        </a>
        <Link
          to="/endorsements"
          className="text-white/70 text-sm hover:text-white transition-colors px-2 py-1 hidden sm:inline"
        >
          Endorsements
        </Link>
        <Link
          to="/delegate/login"
          className="text-white/70 text-sm hover:text-white transition-colors px-2 py-1 hidden sm:inline"
        >
          Delegate Hub
        </Link>
        <Link
          to="/login"
          className="text-white/70 text-sm hover:text-white transition-colors px-2 py-1 hidden sm:inline"
        >
          Volunteer Hub
        </Link>
        <a
          href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold px-3 py-1.5 rounded-lg border border-coral text-coral hover:bg-coral hover:text-white transition-colors"
        >
          Donate
        </a>
        <Link
          to="/endorse"
          className="text-sm font-bold px-3 py-1.5 rounded-lg bg-coral text-white hover:bg-coral/90 transition-colors"
        >
          Endorse Aaron
        </Link>
      </div>
    </nav>
  );
}
