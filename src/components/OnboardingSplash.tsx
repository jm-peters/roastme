import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppTheme, AppMode } from '../hooks/useAppTheme';
import { Baby, Zap, Glasses, ArrowRight, Brain, Target } from 'lucide-react';
import { GENERAL_Q, FOOTBALL_Q, BIBLE_Q, EDUCATION_Q, MYSTERY_Q } from '../lib/triviaBanks';

export const OnboardingSplash: React.FC = () => {
  const { completeOnboarding, isFirstLaunch } = useAppTheme();

  if (!isFirstLaunch) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-6 text-white font-sans overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900 border-4 border-white p-12 text-center shadow-[15px_15px_0px_0px_#00FF00]"
      >
        <div className="inline-block p-4 border-4 border-neon-green mb-8">
          <Zap size={48} className="text-neon-green" />
        </div>
        <h2 className="text-5xl font-display uppercase italic leading-none mb-4">Welcome To <span className="text-neon-green">The Arena</span></h2>
        <p className="text-xl font-display uppercase mb-8">
          The ultimate roast engine has arrived.
        </p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-12 leading-relaxed">
          Create roasts, earn rewards, and climb the global leaderboard. Your legacy starts now.
        </p>
        
        <button 
          onClick={completeOnboarding}
          className="w-full brutal-btn text-2xl h-20 shadow-[8px_8px_0px_0px_white]"
        >
          Enter The Arena
        </button>
      </motion.div>
    </div>
  );
};
