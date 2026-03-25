import { formatFeedItem } from "@/lib/utils";

export default function FeedItem({ log }) {
  return (
    <div className="text-sm text-gray-700 py-2 border-b border-gray-100 last:border-b-0">
      {formatFeedItem(log)}
    </div>
  );
}
