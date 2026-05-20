import { useEffect, useState } from "react";
import EventsNav from "@/components/events/EventsNav";
import EventsHero from "@/components/events/EventsHero";
import EventCard from "@/components/events/EventCard";
import RSVPModal from "@/components/events/RSVPModal";
import VolunteerWays from "@/components/events/VolunteerWays";
import CommunityGallery from "@/components/events/CommunityGallery";
import SignupSection from "@/components/events/SignupSection";
import EventsFooter from "@/components/events/EventsFooter";
import eventsData from "@/data/events.json";

export default function EventsPage() {
  const [modal, setModal] = useState({ open: false, event: null, intent: "rsvp" });
  const [darkMode, setDarkMode] = useState(false);

  // SEO meta — set without an external lib
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Westside Events & Community Action — Aaron Wiley for District 21";

    const tags = [
      { name: "description", content: "Westside Events & Community Action — Canvasses, cookouts, phonebanks, and house parties powering Aaron Wiley's run for Utah House District 21." },
      { property: "og:title", content: "Westside Events & Community Action — Wiley for 21" },
      { property: "og:description", content: "Join us. Volunteer. Build the future of District 21 together." },
      { property: "og:image", content: "https://wileyfor21.com/images/movement-rally.jpg" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    const created = [];
    tags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        if (name) el.setAttribute("name", name);
        if (property) el.setAttribute("property", property);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute("content", content);
    });

    // JSON-LD Event schema
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": eventsData.map((e) => ({
        "@type": "Event",
        name: `Wiley for 21 — ${e.title}`,
        startDate: `${e.date}T${e.startTime || "10:00"}:00-06:00`,
        endDate: `${e.date}T${e.endTime || "20:00"}:00-06:00`,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: e.location,
          address: e.address,
        },
        description: e.summary,
        image: `https://wileyfor21.com${e.image}`,
        organizer: { "@type": "Person", name: "Aaron Wiley" },
      })),
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      created.forEach((el) => el.remove());
      ld.remove();
    };
  }, []);

  // Dark mode persistence + system preference
  useEffect(() => {
    const stored = localStorage.getItem("wiley-events-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored ? stored === "dark" : prefersDark;
    setDarkMode(initial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const openModal = (event, intent = "rsvp") => setModal({ open: true, event, intent });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-cream dark:bg-black font-sans text-navy-darker dark:text-white">
        <EventsNav darkMode={darkMode} onToggleDark={() => setDarkMode((v) => !v)} />

        <EventsHero
          onUpcoming={() => scrollTo("events")}
          onVolunteer={() => openModal(null, "volunteer")}
          onJoin={() => scrollTo("signup")}
        />

        {/* Upcoming Events */}
        <section id="events" className="relative bg-cream dark:bg-black py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-14">
              <div className="max-w-2xl">
                <span className="inline-block bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs sm:text-sm px-3 py-1.5 rounded-sm shadow-md mb-4">
                  Upcoming Events
                </span>
                <h2 className="font-condensed font-black text-navy-darker dark:text-white uppercase text-4xl sm:text-5xl md:text-6xl leading-[0.92] tracking-tight">
                  Show Up. <br />
                  <span className="text-coral">Show Out.</span>
                </h2>
                <p className="mt-3 text-lg text-navy-darker/75 dark:text-white/75 leading-relaxed">
                  Every event is a chance to meet your district, meet Aaron, and move this campaign forward.
                </p>
              </div>
              <a
                href="https://buy.stripe.com/7sY9ASeNR0tr1Ng25b4ZG01"
                target="_blank"
                rel="noopener noreferrer"
                className="self-start md:self-end inline-flex items-center gap-2 border-2 border-navy-darker dark:border-white/40 text-navy-darker dark:text-white hover:bg-navy-darker hover:text-white dark:hover:bg-white dark:hover:text-navy-darker font-condensed font-black tracking-[0.14em] uppercase text-sm px-5 py-3 rounded-md transition-colors"
              >
                Fuel the Movement →
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 lg:gap-8">
              {eventsData.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  onRSVP={(e) => openModal(e, "rsvp")}
                  onVolunteer={(e) => openModal(e, "volunteer")}
                />
              ))}
            </div>
          </div>
        </section>

        <VolunteerWays onVolunteer={(e) => openModal(e, "volunteer")} />
        <CommunityGallery />
        <SignupSection />
        <EventsFooter />

        <RSVPModal
          open={modal.open}
          onClose={closeModal}
          event={modal.event}
          defaultIntent={modal.intent}
        />
      </div>
    </div>
  );
}
