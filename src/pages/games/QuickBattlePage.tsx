import { useState } from 'react';
import QuickBattle from '../../components/QuickBattle';
import { motion } from 'motion/react';

export default function QuickBattlePage() {
  const [battleResult, setBattleResult] = useState<any>(null);

  return (
    <div className="pt-24 px-4 pb-12 max-w-4xl mx-auto min-h-screen">
      <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}}>
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4">Quick <span className="text-red-500">Battle</span> ⚔️</h1>
        <p className="text-gallery-white/60 font-mono mb-12">Match up against another player in real-time. 5 questions. Fast responses win ties. No mercy.</p>
      </motion.div>
      
      <QuickBattle onBattleEnd={(res) => setBattleResult(res)} />
    </div>
  );
}
