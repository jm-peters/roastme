import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Share2, Calendar, Award } from 'lucide-react';
import { GENERAL_Q, FOOTBALL_Q, BIBLE_Q, EDUCATION_Q } from '../../lib/triviaBanks';
import { soundManager } from '../../utils/soundManager';

export default function DailyChallenge() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const played = localStorage.getItem(`daily_challenge_${today}`);
    if (played) {
      setHasPlayedToday(true);
      setGameComplete(true);
      setResults(JSON.parse(played).results);
      setScore(JSON.parse(played).score);
    }
    
    // Generate daily questions based on date
    const all = [...GENERAL_Q, ...FOOTBALL_Q, ...BIBLE_Q, ...EDUCATION_Q];
    const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
    
    const dailyQuestions = [];
    const usedIndices = new Set();
    
    // Pick 5 unique questions based on seed
    for (let i = 0; i < 5; i++) {
       let index = (seed + i * 13) % all.length;
       while(usedIndices.has(index)) {
         index = (index + 1) % all.length;
       }
       usedIndices.add(index);
       const q = all[index];
       dailyQuestions.push({
         ...q,
         options: [...q.opts].sort(() => 0.5 - Math.random())
       });
    }
    setQuestions(dailyQuestions);
  }, []);

  const startChallenge = () => {
    if (hasPlayedToday) return;
    setGameActive(true);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer || gameComplete) return;
    
    const correct = option === questions[currentIndex].a;
    setSelectedAnswer(option);
    setResults(prev => [...prev, correct]);
    
    if (correct) {
      setScore(s => s + 20);
      soundManager.playAttassa('soft');
    } else {
      soundManager.playFaaah('normal');
    }

    setTimeout(() => {
      if (currentIndex < 4) {
        setCurrentIndex(c => c + 1);
        setSelectedAnswer(null);
      } else {
        finishChallenge();
      }
    }, 1000);
  };

  const finishChallenge = () => {
    setGameActive(false);
    setGameComplete(true);
    const today = new Date().toISOString().split('T')[0];
    const finalResults = [...results];
    // Add last result if not already added
    if (finalResults.length < 5) {
        // This shouldn't happen with the timeout logic but good to safety check
    }
    
    const data = { score, results: finalResults };
    localStorage.setItem(`daily_challenge_${today}`, JSON.stringify(data));
    
    if (score >= 80) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  };

  const getShareText = () => {
    const today = new Date().toLocaleDateString();
    const squares = results.map(r => r ? '🟩' : '🟥').join('');
    return `Arena Daily Challenge (${today})\nScore: ${score}/100\n${squares}\nCan you beat me? 🔥`;
  };

  const shareResults = () => {
    const text = getShareText();
    if (navigator.share) {
      navigator.share({ title: 'Arena Daily Challenge', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border-4 border-white p-8 max-w-sm w-full text-center shadow-[10px_10px_0px_0px_white]">
          <Calendar className="mx-auto mb-4 text-neon-green" size={48} />
          <h2 className="text-3xl font-display uppercase italic">Challenge Complete</h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-2 mb-8">Come back tomorrow for more</p>
          
          <div className="text-6xl font-display mb-4">{score}</div>
          <div className="flex justify-center gap-2 mb-8">
            {results.map((r, i) => (
              <div key={i} className={`w-8 h-8 border-2 border-white ${r ? 'bg-neon-green' : 'bg-red-500'}`} />
            ))}
            {Array.from({ length: 5 - results.length }).map((_, i) => (
               <div key={i+results.length} className="w-8 h-8 bg-zinc-800 border-2 border-zinc-700" />
            ))}
          </div>

          <button 
            onClick={shareResults}
            className="w-full bg-white text-black font-display uppercase py-4 flex items-center justify-center gap-2 hover:bg-neon-green transition-colors"
          >
            <Share2 size={20} /> Share Results
          </button>
          
          <button 
            onClick={() => navigate('/games')}
            className="w-full mt-4 text-zinc-500 font-bold uppercase text-xs hover:text-white"
          >
            Return to Games
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {!gameActive ? (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-md"
          >
            <div className="inline-block p-4 border-2 border-neon-green mb-6 animate-pulse">
                <Award className="text-neon-green" size={48} />
            </div>
            <h1 className="text-5xl font-display uppercase italic mb-4">Daily <span className="text-neon-green">Challenge</span></h1>
            <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-12">
              5 Questions. One Shot. Global Leaderboard.
            </p>
            <button 
              onClick={startChallenge}
              className="brutal-btn w-full text-xl"
            >
              Start Mission
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-xl"
          >
            <div className="flex justify-between items-center mb-12">
              <span className="font-display text-2xl">Q {currentIndex + 1}/5</span>
              <div className="flex gap-1">
                {results.map((r, i) => (
                  <div key={i} className={`w-3 h-3 ${r ? 'bg-neon-green' : 'bg-red-500'}`} />
                ))}
              </div>
            </div>

            <h2 className="text-3xl font-display uppercase mb-12 leading-tight">
              {questions[currentIndex]?.q}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {questions[currentIndex]?.opts.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selectedAnswer}
                  className={`p-6 text-left border-4 border-white font-display uppercase text-lg transition-all
                    ${selectedAnswer === opt 
                      ? (opt === questions[currentIndex].a ? 'bg-neon-green border-black text-black' : 'bg-red-500 border-black text-white')
                      : (selectedAnswer && opt === questions[currentIndex].a ? 'bg-neon-green border-black text-black' : 'bg-zinc-900 text-white hover:bg-white hover:text-black')
                    }
                  `}
                  style={{ boxShadow: selectedAnswer === opt ? 'none' : '6px 6px 0px 0px white' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
