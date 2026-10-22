import { motion } from 'motion/react';
import RoastRating from './RoastRating';
import DefendYourself from './DefendYourself';
import { ROAST_PERSONAS } from '../../constants/roastConstants';
import { intensityTheme } from './IntensitySlider';

export default function RoastCard({ roast, onRate, onSave, onDefend, onShare, onGenerateAgain }: any) {
  if (!roast) return null;

  const color = intensityTheme[roast.intensity]?.color || 'white';
  const glow = intensityTheme[roast.intensity]?.glow || 'rgba(255,255,255,0.1)';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 relative"
      style={{ 
        backgroundColor: 'var(--color-brutal-black)',
        borderLeft: `4px solid ${color}`,
        boxShadow: `0 4px 30px ${glow}`,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs font-mono uppercase tracking-wider">
          {ROAST_PERSONAS[roast.persona]?.name || 'AI'}
        </span>
        
        {roast.rewards && (
          <div className="flex gap-2">
            {roast.rewards.rmp > 0 && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neon-green/20 text-neon-green border border-neon-green/30 px-2 py-1 rounded text-[10px] font-bold"
              >
                +{roast.rewards.rmp} RMP
              </motion.span>
            )}
            {roast.rewards.questCompleted && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded text-[10px] font-bold"
              >
                MISSION COMPLETE
              </motion.span>
            )}
          </div>
        )}
      </div>

      <p className="text-white text-xl md:text-2xl font-serif italic font-bold leading-relaxed mb-6">
        "{roast.roastText}"
      </p>

      {/* Action Row */}
      <div className="flex flex-wrap gap-3 mb-6 pt-4 border-t border-white/10">
        <button onClick={onGenerateAgain} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2">
          🔄 Again
        </button>
        <button onClick={onSave} disabled={roast.saved} className={`${roast.saved ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 hover:bg-white/20 text-white'} px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2`}>
          {roast.saved ? '💾 Saved' : '💾 Save'}
        </button>
        <button onClick={onShare} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 ml-auto">
          📤 Share
        </button>
      </div>

      <div className="bg-black/30 p-4 rounded-xl border border-white/5">
        <h4 className="text-center text-white/60 text-xs font-mono mb-2 uppercase tracking-widest">Rate this roast</h4>
        <RoastRating onRate={onRate} initialRating={roast.userRating} />
      </div>

      <DefendYourself 
        onSubmit={async (text) => { await onDefend(text); }} 
        aiJudgment={roast.aiComebackJudgment} 
      />
    </motion.div>
  );
}
