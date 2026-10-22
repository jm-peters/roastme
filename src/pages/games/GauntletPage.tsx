import Gauntlet from '../../components/Gauntlet';
import { motion } from 'motion/react';

export default function GauntletPage() {
  return (
    <div className="pt-24 px-4 pb-12 max-w-4xl mx-auto min-h-screen">
      <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}}>
        <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-2 border-b-4 border-neon-green/30 inline-block">The <span className="text-neon-green">Gauntlet</span> 💀</h1>
        <p className="text-gallery-white/80 text-xl font-mono mb-12 mt-4 max-w-2xl">Endless trivia survival. 3 Lives. Every mistake bleeds you out. How far can you make it into the void?</p>
      </motion.div>
      
      <Gauntlet />
    </div>
  );
}
