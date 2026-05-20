import { motion } from "framer-motion";

function buildCalendarUrl(event) {
  // Build a Google Calendar add link from event data
  const pad = (n) => String(n).padStart(2, "0");
  const toGcal = (date, time) => {
    const [h, m] = time.split(":");
    const d = new Date(`${date}T${time}:00`);
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      "00Z"
    );
  };
  const start = toGcal(event.date, event.startTime || "10:00");
  const end = toGcal(event.date, event.endTime || "12:00");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Wiley for 21 — ${event.title}`,
    dates: `${start}/${end}`,
    details: `${event.summary}\n\nRSVP at https://wileyfor21.com/events`,
    location: `${event.location}, ${event.address}`,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export default function EventCard({ event, index = 0, onRSVP, onVolunteer }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.4) }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#0c1727] shadow-xl shadow-black/10 dark:shadow-black/40 border border-black/5 dark:border-white/5"
    >
      {/* Banner */}
      <div className="relative h-56 sm:h-60 overflow-hidden">
        <img
          src={event.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,31,63,0.25) 0%, rgba(0,31,63,0.55) 60%, rgba(0,31,63,0.85) 100%)",
          }}
        />
        {/* Tag chip */}
        <span className="absolute top-4 left-4 inline-flex items-center gap-1 bg-coral text-white font-condensed font-black tracking-[0.18em] uppercase text-xs px-2.5 py-1 rounded shadow-md">
          {event.tag}
        </span>
        {/* Date stamp */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-[#0c1727] rounded-md shadow-lg overflow-hidden text-center w-16">
          <p className="bg-navy text-white font-condensed font-black tracking-widest uppercase text-[10px] py-1">
            {new Date(event.date + "T12:00:00").toLocaleString("en-US", {
              month: "short",
            })}
          </p>
          <p className="font-condensed font-black text-navy-darker dark:text-white text-2xl leading-tight py-1">
            {new Date(event.date + "T12:00:00").getDate()}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-3">
        <h3 className="font-condensed font-black text-2xl sm:text-3xl text-navy-darker dark:text-white uppercase leading-tight tracking-tight">
          {event.title}
        </h3>

        <ul className="flex flex-col gap-1.5 text-sm text-navy-darker/80 dark:text-white/75">
          <li className="flex gap-2 items-start">
            <span aria-hidden="true" className="text-coral">📅</span>
            <span className="font-condensed font-bold tracking-wide">
              {event.dateLabel} · {event.timeLabel}
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span aria-hidden="true" className="text-coral">📍</span>
            <span>
              <span className="font-condensed font-bold tracking-wide block">{event.location}</span>
              <span className="text-xs text-navy-darker/60 dark:text-white/50">{event.address}</span>
            </span>
          </li>
        </ul>

        <p className="text-navy-darker/80 dark:text-white/80 leading-relaxed text-[0.95rem]">
          {event.summary}
        </p>

        {event.highlights?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {event.highlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center bg-cream dark:bg-white/5 text-navy-darker dark:text-white/80 font-condensed font-bold tracking-wider uppercase text-[11px] px-2 py-1 rounded"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onRSVP(event)}
            className="inline-flex items-center justify-center bg-coral hover:bg-[#F58A88] text-white font-condensed font-black tracking-[0.12em] uppercase text-sm px-3 py-2.5 rounded transition-colors"
          >
            RSVP
          </button>
          <button
            type="button"
            onClick={() => onVolunteer(event)}
            className="inline-flex items-center justify-center bg-navy hover:bg-navy-darker text-white font-condensed font-black tracking-[0.12em] uppercase text-sm px-3 py-2.5 rounded transition-colors"
          >
            Volunteer
          </button>
          <a
            href={buildCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center border-2 border-navy dark:border-white/30 text-navy dark:text-white hover:bg-navy hover:text-white dark:hover:bg-white dark:hover:text-navy-darker font-condensed font-black tracking-[0.12em] uppercase text-sm px-3 py-2.5 rounded transition-colors"
          >
            + Calendar
          </a>
        </div>
      </div>
    </motion.article>
  );
}
