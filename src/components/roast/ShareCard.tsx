import { forwardRef } from 'react';
import { intensityTheme } from './IntensitySlider';
import { ROAST_PERSONAS } from '../../constants/roastConstants';

const ShareCard = forwardRef<HTMLDivElement, { roast: any }>(({ roast }, ref) => {
  if (!roast) return null;
  const color = intensityTheme[roast.intensity]?.color || 'white';

  return (
    <div className="fixed top-[200%] left-[200%]">
      <div 
        ref={ref}
        className="w-[1080px] h-[1080px] bg-[#0a0a0a] flex flex-col items-center justify-center p-24"
        style={{ borderTop: `20px solid ${color}` }}
      >
        <div className="absolute top-16 left-16">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">ROAST<span className="text-neon-green">ME</span></h1>
        </div>
        
        <div className="absolute top-16 right-16 text-right">
          <div className="bg-white/10 px-6 py-2 rounded-full inline-block mb-4">
            <span className="text-2xl font-bold uppercase tracking-widest text-white" style={{ color: color }}>
              {intensityTheme[roast.intensity]?.label}
            </span>
          </div>
          <p className="text-zinc-500 font-mono text-2xl uppercase">{ROAST_PERSONAS[roast.persona]?.name}</p>
        </div>

        <h2 className="text-white text-6xl font-serif italic text-center font-bold leading-tight max-w-[900px]">
          "{roast.roastText}"
        </h2>
        
        <div className="absolute bottom-16 text-center w-full left-0">
          <p className="text-zinc-500 font-mono text-2xl">Get roasted → games.roastme.site</p>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
