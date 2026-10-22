import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import MarqueeHeader from '../../components/MarqueeHeader';
import ShareInvite from '../../components/games/ShareInvite';

const wordPhrases = [
  "ROAST ME IF YOU CAN",
  "TRUTH OR DARE CHALLENGE",
  "ANONYMOUS MESSAGE RECEIVED",
  "FRIENDSHIP SCORE IS LOW",
  "PRANK LINK GENERATED",
  "BATTLE ARENA IS LAVA",
  "QUICK FIRE TRIVIA BLITZ",
  "MEMORY MATCH NEURAL LINK",
  "WORD PUZZLE LEXICON",
  "TYPING SPEED OVERDRIVE",
  "GEMINI POWERED ROASTS",
  "SAVAGE BOT IS ACTIVE",
  "NEON GREEN VIBES ONLY",
  "BRUTAL BLACK AESTHETIC",
  "EARN COINS EVERY DAY"
];

export default function TypingRace() {
  const navigate = useNavigate();
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [message, setMessage] = useState('');
  const [combo, setCombo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const startNewPhrase = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * wordPhrases.length);
    setCurrentPhrase(wordPhrases[randomIndex]);
    setUserInput('');
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setTimeLeft(30);
    setCombo(0);
    setGameActive(true);
    setGameComplete(false);
    setMessage('');
    startNewPhrase();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    startGame();
  }, [startNewPhrase]);

  useEffect(() => {
    if (!gameActive) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameActive]);

  const handleSubmit = (val: string) => {
    if (val.trim().toUpperCase() === currentPhrase) {
      const timeBonus = Math.floor(timeLeft / 2);
      const pointsEarned = 10 + timeBonus + (combo * 2);
      setScore(prev => prev + pointsEarned);
      setCombo(prev => prev + 1);
      setMessage(`✅ SUCCESS! +${pointsEarned} PTS`);
      soundManager.playAttassa('soft');
      
      if (level < 10) {
        setLevel(prev => prev + 1);
        startNewPhrase();
      } else {
        endGame();
      }
      
      setTimeout(() => setMessage(''), 1000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setUserInput(val);
    
    // Auto-check if matches immediately for "race" feel
    if (val.trim() === currentPhrase) {
      handleSubmit(val);
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameComplete(true);
    const coinsEarned = Math.floor(score / 10);
    
    if (score > 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    try {
      await fetchWithAuth('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          game: 'typing', 
          score, 
          coinsEarned,
          level 
        })
      });
    } catch (err) {
      console.error('Failed to award typing coins:', err);
    }
  };

  if (gameComplete) {
    const coinsEarned = Math.floor(score / 10);
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center bg-white/5 border border-pink-500/30 rounded-3xl p-12 backdrop-blur-xl"
        >
          <div className="text-8xl mb-6">⌨️</div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">RACE <span className="text-neon-green">OVER</span></h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">Speed limit exceeded.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Final Level</span>
              <span className="text-2xl font-display text-white">{level}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Total Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
              <span className="text-yellow-400 font-mono text-[10px] uppercase">Earnings</span>
              <span className="text-2xl font-display text-yellow-400">🪙 +{coinsEarned}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/typing-race`} 
            text={`I scored ${score} pts (Level ${level}) in Typing Race! Can you type faster? 🏎️`}
            className="mb-8 rounded-xl border-pink-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={startGame} className="w-full bg-neon-green text-brutal-black font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Full Throttle 🏎️
            </button>
            <button onClick={() => navigate('/games')} className="w-full bg-white/10 text-white font-display uppercase py-4 rounded-xl tracking-widest border border-white/10 hover:bg-white/20 transition-all">
              Different Game
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <MarqueeHeader />
      
      <main className="max-w-3xl w-full mx-auto px-6 py-12 flex-grow flex flex-col">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <button onClick={() => navigate('/games')} className="text-gallery-white/40 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              ← Exit Race
            </button>
            <h1 className="text-4xl font-display uppercase text-white leading-none">TYPING <span className="text-neon-green">RACE</span></h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-2xl font-display text-yellow-400 leading-none">{score} <span className="text-[10px] font-mono uppercase tracking-widest ml-1">PTS</span></div>
            <div className="flex gap-2">
              <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-gallery-white/60 uppercase tracking-widest">
                LVL {level}/10
              </div>
              <div className="bg-pink-500/20 px-3 py-1 rounded-full text-[10px] font-mono text-pink-400 uppercase tracking-widest border border-pink-500/20">
                🔥 {combo}X
              </div>
            </div>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-white/5 rounded-full h-2 mb-12 relative overflow-hidden">
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 30) * 100}%` }}
            className={cn(
              "absolute top-0 left-0 h-full transition-colors duration-500",
              timeLeft <= 5 ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-neon-green"
            )}
          />
        </div>

        {/* Phrase Display */}
        <div className="flex-grow flex flex-col items-center justify-center space-y-12">
           <AnimatePresence mode="wait">
             <motion.div 
              key={currentPhrase}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-center space-y-4"
             >
                <p className="text-5xl md:text-6xl font-display uppercase tracking-tighter text-white break-words">
                  {currentPhrase.split('').map((char, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        userInput[i] === char ? "text-neon-green" : userInput[i] ? "text-red-500" : "text-white/20"
                      )}
                    >
                      {char}
                    </span>
                  ))}
                </p>
                <div className="text-[10px] font-mono text-gallery-white/20 uppercase tracking-[0.5em]">
                  Match the characters above
                </div>
             </motion.div>
           </AnimatePresence>

           <div className="w-full max-w-xl relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onPaste={(e) => e.preventDefault()}
                autoComplete="off"
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-8 py-6 text-white text-center text-3xl font-display tracking-[0.2em] focus:border-neon-green focus:outline-none transition-all uppercase placeholder:opacity-10 shadow-[0_10px_0_0_rgba(0,0,0,1)]"
                placeholder="READY... GO!"
              />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-full text-center">
                <AnimatePresence>
                  {message && (
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-neon-green font-mono text-[10px] uppercase tracking-widest font-bold"
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>

        <div className="mt-20 text-center opacity-10 font-mono text-[8px] uppercase tracking-[1em]">
          Speed is the only metric that matters
        </div>
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
