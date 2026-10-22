import { motion } from 'motion/react';

interface IntensitySliderProps {
  value: string;
  onChange: (value: string) => void;
}

export const intensities = [
  { id: 'friendly', label: '😄 Friendly', color: '#4ade80' },
  { id: 'roasted', label: '🔥 Roasted', color: '#fb923c' },
  { id: 'savage', label: '💀 Savage', color: '#f87171' },
  { id: 'scorched', label: '☢️ Scorched', color: '#dc2626' }
];

export const intensityTheme: any = {
  friendly: {
    color: '#4ade80',
    label: '😄 Friendly Fire',
    buttonLabel: 'Roast Me Gently',
    glow: 'rgba(74, 222, 128, 0.15)'
  },
  roasted: {
    color: '#fb923c',
    label: '🔥 Roasted',
    buttonLabel: 'Roast Me',
    glow: 'rgba(251, 146, 60, 0.15)'
  },
  savage: {
    color: '#f87171',
    label: '💀 Savage Mode',
    buttonLabel: 'Destroy Me',
    glow: 'rgba(248, 113, 113, 0.2)'
  },
  scorched: {
    color: '#dc2626',
    label: '☢️ SCORCHED EARTH',
    buttonLabel: 'END ME',
    glow: 'rgba(220, 38, 38, 0.25)',
    animate: true
  }
};

export default function IntensitySlider({ value, onChange }: IntensitySliderProps) {
  const currentIndex = intensities.findIndex(i => i.id === value);

  return (
    <div className="space-y-3">
      <div className="flex justify-between px-1">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intensity Meter</span>
        <span 
          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${intensities[currentIndex].color}20`, color: intensities[currentIndex].color }}
        >
          {intensities[currentIndex].label}
        </span>
      </div>
      <div className="relative h-12 bg-white/5 rounded-2xl p-1 flex gap-1 border border-white/5">
        {intensities.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex-1 rounded-xl transition-all relative overflow-hidden group"
          >
            <div 
              className={`absolute inset-0 transition-opacity ${idx <= currentIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{ backgroundColor: item.color }}
            />
            <div className={`absolute inset-0 bg-black/40 ${idx <= currentIndex ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`relative z-10 text-[10px] font-black uppercase tracking-tighter ${idx <= currentIndex ? 'text-white' : 'text-gray-500'}`}>
              {item.id === 'scorched' ? '!!!' : item.id === 'friendly' ? 'SOFT' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
