// src/pages/games/EducationalTrivia.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Trophy, ChevronLeft, Timer, Brain, Zap, Globe, Cpu } from 'lucide-react';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import ShareInvite from '../../components/games/ShareInvite';

import { EDUCATION_Q, FOOTBALL_Q, getUnseen } from '../../lib/triviaBanks';

const getCategoryQuestions = (categoryId: string) => {
  let bank: any[] = [];
  if (categoryId === 'sports') bank = FOOTBALL_Q;
  else if (categoryId === 'technology') bank = EDUCATION_Q.filter(q => (q as any).topic === 'Technology');
  else if (categoryId === 'science') bank = EDUCATION_Q.filter(q => ['Science', 'Astronomy', 'Physics', 'Biology', 'Chemistry'].includes((q as any).topic));
  else if (categoryId === 'humanities') bank = EDUCATION_Q.filter(q => ['History', 'Geography', 'Art', 'Literature'].includes((q as any).topic));

  const selected = getUnseen(bank, `edu_${categoryId}`, 30);
  return selected.map(q => ({
    question: q.question || (q as any).q,
    options: [...(q.options || (q as any).opts)].sort(() => Math.random() - 0.5),
    correctAnswer: q.correctAnswer || (q as any).a
  }));
};

const CATEGORY_DEFS = {
  sports: { name: "🏆 Sports", icon: <Trophy className="text-yellow-400" /> },
  technology: { name: "💻 Technology", icon: <Cpu className="text-blue-400" /> },
  science: { name: "🔬 Science", icon: <Zap className="text-purple-400" /> },
  humanities: { name: "📚 Humanities", icon: <Globe className="text-green-400" /> }
};

export default function EducationalTrivia() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameActive, setGameActive] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameComplete, setGameComplete] = useState(false);

  const startGame = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const shuffled = getCategoryQuestions(categoryId);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameActive(true);
    setSelectedAnswer(null);
    setMessage('');
    setGameComplete(false);
    setTimeLeft(10);
  };

  useEffect(() => {
    if (!gameActive || gameComplete || !selectedCategory) return;
    
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
  }, [currentIndex, gameActive, gameComplete, selectedCategory]);

  const handleTimeout = () => {
    setGameActive(false);
    setMessage(`⏰ Time's up! The answer was: ${questions[currentIndex].correctAnswer}`);
    soundManager.playFaaah('loud');
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(10);
        setSelectedAnswer(null);
        setGameActive(true);
        setMessage('');
      } else {
        endGame();
      }
    }, 2000);
  };

  const handleAnswer = (selected: string) => {
    if (!gameActive || selectedAnswer) return;
    
    setSelectedAnswer(selected);
    const isCorrect = selected === questions[currentIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      soundManager.playAttassa('soft');
      setMessage('✅ Correct!');
      
      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(10);
          setSelectedAnswer(null);
          setMessage('');
        } else {
          endGame();
        }
      }, 1000);
    } else {
      soundManager.playFaaah('normal');
      setMessage(`❌ Wrong! The answer is: ${questions[currentIndex].correctAnswer}`);
      setGameActive(false);
      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(10);
          setSelectedAnswer(null);
          setGameActive(true);
          setMessage('');
        } else {
          endGame();
        }
      }, 2000);
    }
  };

  const endGame = () => {
    setGameComplete(true);
    setGameActive(false);
    
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch('/api/games/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: `trivia-${selectedCategory}`, score, coinsEarned: Math.floor(score / 10) })
      }).catch(console.error);
    }
  };

  if (gameComplete) {
    const percentage = (score / (questions.length * 10)) * 100;
    return (
      <div className="min-h-screen bg-brutal-black py-8 px-4 flex items-center justify-center selection:bg-neon-green selection:text-brutal-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className={`brutal-border p-12 mb-8 ${percentage >= 70 ? 'bg-neon-green/10 border-neon-green' : 'bg-red-500/10 border-red-500'}`}>
            <div className="text-8xl mb-6">{percentage >= 70 ? '🏆' : '📚'}</div>
            <h1 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter italic">Trivia Complete!</h1>
            <div className="flex justify-center gap-12 mb-8">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-mono tracking-widest mb-1">Final Score</p>
                <p className="text-4xl font-black text-yellow-400">{score}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-mono tracking-widest mb-1">Accuracy</p>
                <p className="text-4xl font-black text-white">{Math.round(percentage)}%</p>
              </div>
            </div>
            
            <ShareInvite 
              title="Challenge Your Friends" 
              url={`/arcade/education`} 
              text={`I scored ${score} pts on Education Trivia! Can you beat me? 🎓`}
              className="mb-8"
            />
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => startGame(selectedCategory!)} 
                className="flex-1 bg-white text-brutal-black font-black py-4 rounded-none border-2 border-white hover:bg-neon-green hover:border-neon-green transition-all uppercase tracking-widest"
              >
                Play Again
              </button>
              <button 
                onClick={() => navigate('/games')} 
                className="flex-1 bg-brutal-black text-white font-black py-4 border-2 border-white/20 hover:border-white transition-all uppercase tracking-widest"
              >
                More Games →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-brutal-black py-8 px-4 selection:bg-neon-green selection:text-brutal-black">
        <div className="max-w-3xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <button 
              onClick={() => navigate('/games')} 
              className="px-4 py-2 bg-white/5 border border-white/10 text-white font-mono text-[10px] uppercase tracking-widest hover:border-white transition-all"
            >
              ← Back to Hub
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Educational <span className="text-neon-green">Trivia</span></h1>
              <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-[0.3em] mt-1">Master your mind, then roast others.</p>
              <div className="flex justify-center mt-4">
                <ShareInvite 
                  variant="minimal" 
                  url={`/arcade/education`} 
                  text="Can you beat my Education Trivia score? 🎓" 
                />
              </div>
            </div>
            <div className="w-[80px]" /> {/* Spacer */}
          </header>

          <div className="grid sm:grid-cols-2 gap-6">
            {Object.entries(CATEGORY_DEFS).map(([key, cat]) => (
              <motion.button 
                key={key} 
                whileHover={{ scale: 1.02, x: 5 }}
                onClick={() => startGame(key)} 
                className="group relative bg-white/5 border-2 border-white/10 p-8 text-left transition-all hover:bg-white/10 hover:border-neon-green overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-5xl mb-4 grayscale group-hover:grayscale-0 transition-all">{cat.icon}</div>
                <h2 className="text-white font-black text-2xl uppercase tracking-widest mb-2 italic">{cat.name.split(' ')[1]}</h2>
                <div className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={12} /> Master the {cat.name.split(' ')[1]}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;

  return (
    <div className="min-h-screen bg-brutal-black py-8 px-4 selection:bg-neon-green selection:text-brutal-black">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <button 
            onClick={() => setSelectedCategory(null)} 
            className="px-4 py-2 bg-white/5 border border-white/10 text-white font-mono text-[10px] uppercase tracking-widest hover:border-white transition-all"
          >
            ← Leave
          </button>
          <div className="text-center px-4">
            <h1 className="text-xl font-black text-white uppercase italic">{CATEGORY_DEFS[selectedCategory as keyof typeof CATEGORY_DEFS].name}</h1>
            <div className="flex items-center gap-2 justify-center mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] font-mono text-gallery-white/40 uppercase tracking-widest">Question {currentIndex + 1}/{questions.length}</span>
            </div>
          </div>
          <div className="bg-yellow-400 text-brutal-black px-4 py-2 font-black text-xs border-2 border-yellow-400">
            {score}
          </div>
        </header>

        {/* Custom Progress Bar */}
        <div className="w-full h-1 bg-white/10 mb-8">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-neon-green shadow-[0_0_10px_#00FF00]"
          />
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-8">
          <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-2xl transition-colors ${
            timeLeft <= 3 ? 'border-red-500 text-red-500 animate-pulse' : 'border-white text-white'
          }`}>
            {timeLeft}
          </div>
        </div>

        <motion.div 
          key={currentIndex}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-white/5 border-2 border-white/10 p-8 mb-8"
        >
          <h2 className="text-white text-2xl font-black mb-8 text-center italic leading-tight uppercase tracking-tighter">
            {currentQ?.question}
          </h2>
          <div className="grid gap-4">
            {currentQ?.options.map((option, idx) => (
              <button 
                key={`${option}-${idx}`} 
                onClick={() => handleAnswer(option)} 
                disabled={!!selectedAnswer} 
                className={`w-full p-5 text-left font-bold transition-all border-2 flex justify-between items-center ${
                  selectedAnswer === option ? (option === currentQ.correctAnswer ? 'bg-neon-green border-neon-green text-brutal-black' : 'bg-red-500 border-red-500 text-white') :
                  selectedAnswer ? (option === currentQ.correctAnswer ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-white/5 border-white/10 text-white/40') :
                  'bg-white/5 border-white/10 text-white hover:border-white hover:bg-white hover:text-brutal-black'
                }`}
              >
                <span>{option}</span>
                {selectedAnswer === option && (
                  option === currentQ.correctAnswer ? <Zap size={18} /> : <span>❌</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className={`p-4 text-center font-mono text-[10px] uppercase tracking-widest border-2 ${
                message.includes('✅') ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
