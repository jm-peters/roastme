import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/apiUtils';
import { motion, AnimatePresence } from 'motion/react';

export default function Gauntlet() {
  const [run, setRun] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startGauntlet();
  }, []);

  const startGauntlet = async () => {
    try {
      const res = await fetchWithAuth('/api/trivia/gauntlet/start', { method: 'POST' });
      const data = await res.json();
      setRun(data);
      setLives(3 - (data.livesUsed || 0));
      setScore(data.score || 0);
      setQuestionNumber((data.highestQuestion || 0) + 1);
      loadNextQuestion();
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNextQuestion = async () => {
    try {
      const res = await fetchWithAuth('/api/trivia/gauntlet/question');
      const data = await res.json();
      setCurrentQuestion(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!gameActive) return;
    
    const isCorrect = answer === currentQuestion?.correctAnswer;
    
    try {
      const res = await fetchWithAuth('/api/trivia/gauntlet/answer', {
        method: 'POST',
        body: JSON.stringify({
          runId: run.id,
          isCorrect,
          questionNumber
        })
      });
      
      const data = await res.json();
      
      if (isCorrect) {
        setScore(data.newScore);
        if (data.reward) {
          setReward(data.reward);
          setTimeout(() => setReward(null), 3000);
        }
        setQuestionNumber(prev => prev + 1);
        loadNextQuestion();
      } else {
        setLives(data.livesLeft);
        if (data.gameOver) {
          setGameActive(false);
          setGameOver(true);
        } else {
          setQuestionNumber(prev => prev + 1);
          loadNextQuestion();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-white font-mono animate-pulse">Loading The Gauntlet...</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 bg-brutal-black border-2 border-red-500 max-w-2xl mx-auto p-12 shadow-[8px_8px_0px_#ef4444]"
      >
        <div className="text-8xl mb-6">💀</div>
        <h2 className="text-4xl font-black text-white mb-2 uppercase italic">Game Over</h2>
        <p className="text-gallery-white/70 mb-4 font-mono">You survived {questionNumber - 1} questions.</p>
        <p className="text-neon-green text-3xl font-black mb-8 border-y border-neon-green/30 py-4">Final Score: {score}</p>
        <button onClick={() => window.location.reload()} className="bg-white text-black font-bold uppercase tracking-widest px-8 py-4 hover:bg-neon-green transition-colors w-full sm:w-auto">
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-brutal-black border-2 border-neon-green rounded-xl p-6 md:p-8 max-w-3xl mx-auto shadow-[8px_8px_0px_#39FF14]">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-10 border-b border-white/10 pb-6">
        <div className="text-center border-r border-white/10">
          <div className="text-gallery-white/60 text-xs font-mono uppercase tracking-widest mb-1">Score</div>
          <div className="text-3xl font-black text-neon-green">{score}</div>
        </div>
        <div className="text-center border-r border-white/10">
          <div className="text-gallery-white/60 text-xs font-mono uppercase tracking-widest mb-1">Question</div>
          <div className="text-3xl font-black text-white">#{questionNumber}</div>
        </div>
        <div className="text-center">
          <div className="text-gallery-white/60 text-xs font-mono uppercase tracking-widest mb-1">Lives</div>
          <div className="text-3xl space-x-1 tracking-tighter">
             {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
          </div>
        </div>
      </div>
      
      {/* Milestone Notification */}
      <AnimatePresence>
        {reward && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-neon-green/20 border-2 border-neon-green p-4 mb-8 text-center animate-pulse"
          >
            <p className="text-neon-green font-black uppercase text-xl">🎉 Milestone Reached! +{reward.rmp} RMP</p>
            {reward.badge && <p className="text-white font-mono mt-1">Earned badge: {reward.badge}</p>}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Question */}
      <div className="bg-white/5 border border-white/10 p-8 mb-8 relative overflow-hidden group hover:border-white/30 transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl group-hover:bg-neon-green/10 transition-colors"></div>
        <h3 className="text-white text-2xl md:text-3xl font-bold text-center mb-10 leading-tight relative z-10">{currentQuestion?.question}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {currentQuestion?.options.map((option: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className="bg-transparent border-2 border-white/20 text-white font-medium p-4 text-left hover:bg-white/10 hover:border-neon-green transition-all"
            >
              <span className="inline-block w-8 font-mono opacity-50">{['A','B','C','D'][idx]}.</span>
              {option}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center space-x-8 text-gallery-white/40 text-xs font-mono border-t border-white/10 pt-4 mt-8">
        <p>⚡ <span className="text-white/80">3 LIVES MAX</span></p>
        <p>🏆 <span className="text-white/80">+1 LIFE</span> / 10 CORRECT</p>
      </div>
    </div>
  );
}
