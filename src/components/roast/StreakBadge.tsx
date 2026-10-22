import { motion } from 'motion/react';

export default function StreakBadge({ streak }: { streak: number }) {
  if (!streak || streak < 1) return null;

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/50 px-3 py-1.5 rounded-full"
    >
      <span className="text-orange-500 text-sm">🔥</span>
      <span className="text-orange-400 font-bold font-mono text-sm">{streak} Day Streak</span>
    </motion.div>
  );
}
