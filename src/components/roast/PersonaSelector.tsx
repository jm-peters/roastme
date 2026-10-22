import { ROAST_PERSONAS } from '../../constants/roastConstants';
import { motion } from 'motion/react';

interface PersonaSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Choose Your Executioner</div>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
        {Object.entries(ROAST_PERSONAS).map(([id, persona]: [string, any]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-shrink-0 w-32 p-4 rounded-3xl transition-all border-2 ${
              value === id 
                ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-900/40 translate-y-[-4px]' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl mb-2">{getPersonaEmoji(id)}</div>
            <div className={`text-[10px] font-black uppercase leading-tight tracking-tighter ${value === id ? 'text-white' : 'text-gray-400'}`}>
              {persona.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getPersonaEmoji(id: string) {
  switch (id) {
    case 'comedian': return '🎤';
    case 'shakespeare': return '📜';
    case 'corporate': return '🏢';
    case 'genz': return '💀';
    case 'british': return '☕';
    case 'dad': return '👴';
    case 'philosopher': return '🏛️';
    default: return '🔥';
  }
}
