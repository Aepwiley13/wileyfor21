export default function ConflictWarningCard({ delegate }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">&#9888;&#65039;</span>
        <div>
          <h3 className="font-condensed font-bold text-red-800 text-lg">{delegate.name}</h3>
          <p className="text-sm text-red-700">{delegate.precinct} &middot; {delegate.role}</p>
          <div className="mt-2 bg-red-100 rounded-lg px-3 py-2">
            <p className="text-sm font-semibold text-red-800">Opposing Candidate</p>
            <p className="text-xs text-red-700 mt-1">
              Do not contact. This delegate is a competing candidate for HD21.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
