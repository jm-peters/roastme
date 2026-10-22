import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function DefendYourself({ onSubmit, aiJudgment }: { onSubmit: (text: string) => Promise<void>, aiJudgment: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(text);
    setSubmitting(false);
  };

  return (
    <div className="mt-4">
      {!isOpen && !aiJudgment && (
        <button onClick={() => setIsOpen(true)} className="w-full py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/50 rounded-xl font-mono text-sm transition-all">
          🛡️ ATTEMPT A COMEBACK (Optional)
        </button>
      )}

      <AnimatePresence>
        {isOpen && !aiJudgment && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 mt-2">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your pathetic excuse for a comeback..."
                className="w-full bg-transparent text-white border-0 focus:ring-0 resize-none h-20 placeholder-white/30 p-0 mb-3"
                disabled={submitting}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-white/50 hover:text-white text-sm" disabled={submitting}>Cancel</button>
                <button onClick={handleSubmit} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200" disabled={submitting || !text.trim()}>
                  {submitting ? '...' : 'Send Comeback'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {aiJudgment && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl mt-4">
            <h4 className="text-red-400 font-bold uppercase text-xs tracking-widest mb-2">The AI's Judgment of your Comeback</h4>
            <p className="text-white italic">"{aiJudgment}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
