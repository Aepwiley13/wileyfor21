export default function MilestoneBanner({ message }) {
  if (!message) return null;

  return (
    <div className="bg-gradient-to-r from-coral to-coral/80 text-white rounded-xl p-4 mb-4 animate-pulse">
      <p className="font-condensed font-bold text-center text-lg">
        &#127881; {message}
      </p>
    </div>
  );
}
