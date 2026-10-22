import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import MarqueeHeader from '../../components/MarqueeHeader';
import ShareInvite from '../../components/games/ShareInvite';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  funFact?: string;
}

import { FOOTBALL_Q, getUnseen } from '../../lib/triviaBanks';

const loadFootballQuestions = () => {
  const selected = getUnseen(FOOTBALL_Q, "football_trivia", 30);
  return selected.map((q, i) => ({
    id: i,
    question: q.question || (q as any).q,
    options: [...(q.options || (q as any).opts)].sort(() => Math.random() - 0.5),
    correctAnswer: q.correctAnswer || (q as any).a,
    difficulty: q.difficulty || (q as any).diff || 'medium',
    funFact: q.funFact
  }));
};


export default function FootballTrivia() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameActive, setGameActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [funFact, setFunFact] = useState('');
  const [timerActive, setTimerActive] = useState(false);

  const startGame = () => {
    const selected = loadFootballQuestions();
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameActive(true);
    setGameComplete(false);
    setSelectedAnswer(null);
    setMessage('');
    setFunFact('');
    setTimerActive(true);
    setTimeLeft(10);
  };

  useEffect(() => {
    startGame();
  }, []);

  useEffect(() => {
    if (!gameActive || !timerActive) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentIndex, gameActive, timerActive]);

  const handleTimeout = () => {
    setTimerActive(false);
    soundManager.playFaaah('loud');
    const correctAnswer = questions[currentIndex]?.correctAnswer;
    const fact = questions[currentIndex]?.funFact;
    setFunFact(fact || '');
    setMessage(`⏰ Time's up! The answer was: ${correctAnswer}`);
    
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        nextQuestion();
      } else {
        endGame();
      }
    }, 3000);
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setTimeLeft(10);
    setTimerActive(true);
    setSelectedAnswer(null);
    setMessage('');
    setFunFact('');
  };

  const handleAnswer = (selected: string) => {
    if (!gameActive || selectedAnswer) return;
    
    setSelectedAnswer(selected);
    setTimerActive(false);
    
    const currentQ = questions[currentIndex];
    const isCorrect = selected === currentQ.correctAnswer;
    const fact = currentQ.funFact;
    setFunFact(fact || '');
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      setMessage(`✅ Correct! +10 points!`);
      soundManager.playAttassa('soft');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00FF00', '#FFD700']
      });
    } else {
      soundManager.playFaaah('normal');
      setMessage(`❌ Wrong! The answer was: ${currentQ.correctAnswer}`);
    }
    
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        nextQuestion();
      } else {
        endGame();
      }
    }, 2500);
  };

  const endGame = async () => {
    setGameActive(false);
    setGameComplete(true);
    const coinsEarned = Math.floor(score / 10);
    
    try {
      await fetchWithAuth('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          game: 'football-trivia', 
          score, 
          coinsEarned 
        })
      });
    } catch (err) {
      console.error('Failed to award football trivia coins:', err);
    }
  };



  const playAgain = () => {
    startGame();
  };

  if (gameComplete) {
    const coinsEarned = Math.floor(score / 10);
    const percentage = Math.round((score / (questions.length * 15)) * 100);
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "max-w-md w-full text-center bg-white/5 border rounded-3xl p-12 backdrop-blur-xl",
            percentage >= 70 ? 'border-green-500/30' : percentage >= 40 ? 'border-yellow-500/30' : 'border-red-500/30'
          )}
        >
          <div className="text-8xl mb-6">
            {percentage >= 70 ? '🏆' : percentage >= 40 ? '👍' : '💀'}
          </div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">PITCH MASTER <span className="text-neon-green">OVER</span></h1>
          <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest mb-8">Football knowledge tested.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Final Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
              <span className="text-yellow-400 font-mono text-[10px] uppercase">Earnings</span>
              <span className="text-2xl font-display text-yellow-400">🪙 +{coinsEarned}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/arcade/football`} 
            text={`I scored ${score} in Football Trivia… can you beat me? 😈`}
            className="mb-8 rounded-xl border-yellow-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={playAgain} className="w-full bg-neon-green text-brutal-black font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Back on Pitch
            </button>
            <button onClick={() => navigate('/games')} className="w-full bg-white/10 text-white font-display uppercase py-4 rounded-xl tracking-widest border border-white/10 hover:bg-white/20 transition-all">
              Games Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Entering the tunnel...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <MarqueeHeader />
      
      <main className="max-w-2xl w-full mx-auto px-6 py-12 flex-grow">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <button onClick={() => navigate('/games')} className="text-gallery-white/40 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              ← Abandon Match
            </button>
            <h1 className="text-4xl font-display uppercase text-white leading-none">FOOTBALL <span className="text-neon-green">TRIVIA</span></h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-2xl font-display text-yellow-400 leading-none">{score} <span className="text-[10px] font-mono uppercase tracking-widest ml-1">PTS</span></div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-gallery-white/60 uppercase tracking-widest">
              {currentIndex + 1}/{questions.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-8 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-full bg-neon-green shadow-[0_0_10px_rgba(0,255,0,0.5)]"
          />
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center mb-12">
          <div className={cn(
            "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 relative",
            timeLeft <= 3 ? "border-red-500 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "border-white/10"
          )}>
            <div className={cn(
              "text-3xl font-display",
              timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white"
            )}>
              {timeLeft}
            </div>
          </div>
          <span className="text-[10px] font-mono text-gallery-white/40 uppercase tracking-[0.3em] mt-3">Seconds Left</span>
        </div>

        {/* Question Area */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <span className={cn(
                "px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] rounded-full border",
                currentQ.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                currentQ.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {currentQ.difficulty}
              </span>
              <h2 className="text-2xl md:text-3xl font-display uppercase leading-tight text-white mt-6 underline decoration-neon-green/30 decoration-4 underline-offset-8">
                {currentQ.question}
              </h2>
            </div>
            
            <div className="grid gap-3">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={cn(
                    "w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-left transition-all font-display uppercase tracking-widest text-sm relative group",
                    selectedAnswer === option 
                      ? option === currentQ.correctAnswer 
                        ? 'bg-green-600 border-green-400 text-white' 
                        : 'bg-red-600 border-red-400 text-white'
                      : selectedAnswer 
                        ? option === currentQ.correctAnswer 
                          ? 'bg-green-600 border-green-400 text-white' 
                          : 'opacity-20 grayscale'
                        : 'hover:bg-white/10 hover:border-white/20 hover:translate-x-1'
                  )}
                >
                  <span className="relative z-10">{option}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Message & Fun Fact */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-4"
            >
              <div className={cn(
                "p-4 rounded-2xl text-center font-mono text-[10px] uppercase tracking-[0.2em] border",
                message.includes('✅') 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {message}
              </div>
              
              {funFact && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-neon-green/5 border border-neon-green/10 p-6 rounded-2xl"
                >
                  <p className="text-neon-green font-mono text-[10px] uppercase tracking-widest mb-2 font-bold italic">💡 FACT BOMB:</p>
                  <p className="text-white/80 font-mono text-sm leading-relaxed">{funFact}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
