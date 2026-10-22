// components/EmbarrassmentScore.tsx
import { useState, useEffect } from 'react';
import { soundManager } from '../utils/soundManager';

export default function EmbarrassmentScore() {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    // Track mistakes from localStorage or global state
    const interval = setInterval(() => {
      const mistakes = parseInt(localStorage.getItem('roast_mistakes') || '0');
      const currentCombo = parseInt(localStorage.getItem('roast_combo') || '0');
      setScore(mistakes);
      setCombo(currentCombo);
      
      // Check milestones
      if (mistakes === 5) {
        soundManager.playFaaah('soft');
      } else if (mistakes === 10) {
        soundManager.playFaaah('loud');
      } else if (mistakes === 20) {
        soundManager.playChaosMode();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getScoreMessage = () => {
    if (score === 0) return "Perfect! 🔥";
    if (score < 5) return "You tried... 😅";
    if (score < 10) return "Be serious 😭";
    if (score < 20) return "Are you okay? 💀";
    return "CHAOS MODE ACTIVATED 🔥🔥🔥";
  };

  const getScoreClass = () => {
    if (score >= 20) return "high";
    return "";
  };

  return (
    <div className={`embarrassment-badge ${getScoreClass()} bg-gallery-white/5 brutal-border p-4 text-center`}>
      <div className="text-[10px] font-mono text-gallery-white/40 uppercase tracking-widest mb-1">Embarrassment Score</div>
      <div className="text-3xl font-display text-red-500 italic uppercase">{score}</div>
      <div className="text-[10px] font-mono text-gallery-white/60 uppercase mt-1">{getScoreMessage()}</div>
      {combo >= 3 && (
        <div className="text-[10px] font-mono text-neon-green mt-2 animate-pulse uppercase tracking-tighter">
          🔥 {combo} combo fail!
        </div>
      )}
    </div>
  );
}
