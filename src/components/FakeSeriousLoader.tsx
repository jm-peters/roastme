// components/FakeSeriousLoader.tsx
import { useState, useEffect } from 'react';
import { soundManager } from '../utils/soundManager';
import { motion } from 'motion/react';

interface FakeSeriousLoaderProps {
  onComplete: () => void;
  duration?: number;
}

export default function FakeSeriousLoader({ onComplete, duration = 3000 }: FakeSeriousLoaderProps) {
  const [step, setStep] = useState<'loading' | 'analyzing' | 'calculating' | 'reveal'>('loading');
  
  useEffect(() => {
    const steps = ['loading', 'analyzing', 'calculating'];
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < steps.length - 1) {
        index++;
        setStep(steps[index] as any);
      } else {
        clearInterval(interval);
        setStep('reveal');
        // Play the "faaaaah" sound as the surprise
        setTimeout(() => {
          soundManager.playFaaah('loud');
          onComplete();
        }, 800);
      }
    }, duration / 3);
    
    return () => clearInterval(interval);
  }, [duration, onComplete]);
  
  const getMessage = () => {
    switch(step) {
      case 'loading': return "SECURE CONNECTION ESTABLISHED...";
      case 'analyzing': return "ANALYZING TARGET VULNERABILITIES...";
      case 'calculating': return "CALCULATING MAXIMUM EMOTIONAL DAMAGE...";
      case 'reveal': return "⚠️ CRITICAL SYSTEM FAILURE ⚠️";
      default: return "...";
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-brutal-black border-4 border-neon-green p-12 text-center shadow-[12px_12px_0px_0px_#00FF00]"
    >
      <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <p className="text-white font-mono text-xs uppercase tracking-[0.2em] leading-relaxed">{getMessage()}</p>
      {step === 'reveal' && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1.5 }}
          className="mt-8 text-4xl font-display italic uppercase text-red-500 animate-bounce"
        >
          FAAAAAAH! 😮💨
        </motion.div>
      )}
    </motion.div>
  );
}
