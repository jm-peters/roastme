import { useState } from 'react';

const ratings = [
  { id: 'accurate', label: '🔥 Accurate' },
  { id: 'too_real', label: '💀 Too Real' },
  { id: 'funny', label: '😂 Funny' },
  { id: 'weak', label: '😤 Weak' }
];

export default function RoastRating({ onRate, initialRating }: { onRate: (rating: string) => void, initialRating?: string }) {
  const [selected, setSelected] = useState(initialRating);

  const handleSelect = (id: string) => {
    setSelected(id);
    onRate(id);
  };

  return (
    <div className="flex gap-2 justify-center flex-wrap mt-4">
      {ratings.map(r => (
        <button
          key={r.id}
          onClick={() => handleSelect(r.id)}
          className={`px-4 py-2 rounded-full font-mono text-sm transition-all ${selected === r.id ? 'bg-white text-black font-bold scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
