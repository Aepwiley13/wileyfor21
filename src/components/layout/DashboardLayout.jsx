export default function DashboardLayout({ left, right, showRight, onToggleRight }) {
  return (
    <div className="md:flex md:gap-4">
      {/* Left panel — contacts */}
      <div className="md:w-3/5">
        {left}
      </div>

      {/* Mobile toggle */}
      <div className="md:hidden mt-4">
        <button
          onClick={onToggleRight}
          className="w-full py-2.5 rounded-xl bg-navy/10 text-navy font-condensed font-bold text-sm hover:bg-navy/20 transition-colors"
        >
          {showRight ? "Hide campaign activity" : "See campaign activity"}
        </button>
      </div>

      {/* Right panel — feed + leaderboard */}
      <div className={`md:w-2/5 mt-4 md:mt-0 ${showRight ? "block" : "hidden md:block"}`}>
        {right}
      </div>
    </div>
  );
}
