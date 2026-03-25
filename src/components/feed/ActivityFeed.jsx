import FeedItem from "./FeedItem";

export default function ActivityFeed({ items }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-condensed font-bold text-navy text-lg mb-3">Live Activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No activity yet today.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <FeedItem key={item.id} log={item} />
          ))}
        </div>
      )}
    </div>
  );
}
