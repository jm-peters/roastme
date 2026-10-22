// src/pages/games/BibleTrivia.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, BookOpen, Trophy, Timer, CheckCircle, XCircle } from 'lucide-react';
import { fetchWithAuth } from '../../utils/apiUtils';
import { cn } from '../../lib/utils';
import confetti from "canvas-confetti";
import ShareInvite from '../../components/games/ShareInvite';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  scripture?: string;
}

import { BIBLE_Q, getUnseen } from '../../lib/triviaBanks';

const loadQuestionsFromBank = () => {
  const selected = getUnseen(BIBLE_Q, "bible_trivia", 30);
  return selected.map((q, i) => ({
    id: i,
    question: q.question || (q as any).q,
    options: [...(q.options || (q as any).opts)].sort(() => Math.random() - 0.5),
    correctAnswer: q.correctAnswer || (q as any).a
  }));
};

const failMessages = [
  "You gotta read the Bible! 📖",
  "You aint serious, you don't know the Bible! 🤦‍♂️",
  "What if Christ comes today? ☁️",
  "Are you sure you are a child of God? 🤨",
  "Repent and open your Bible! 🙏",
  "This is basic Sunday School stuff! 🏫",
  "The devil is laughing at your score! 😈",
  "Faith comes by hearing (and reading)! 👂"
];

const hypeMessages = [
  "AMEN! You are a true scholar of the Word! 👑",
  "HALLELUJAH! Your knowledge is inspiring! ✨",
  "WOW! The spirit of wisdom is upon you! 🙌",
  "Praise God! You know your scripture! 🌟",
  "CHAMPION OF FAITH! Keep shining! 🏆"
];

export default function BibleTrivia() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameActive, setGameActive] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    loadQuestions();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!gameActive || gameComplete) return;
    
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
  }, [currentQuestionIndex, gameActive, gameComplete, questions.length]);

  const loadQuestions = () => {
    const questions = loadQuestionsFromBank();
    setQuestions(questions);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetchWithAuth('/api/games/bible-leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const handleTimeout = () => {
    if (gameComplete) return;
    setGameActive(false);
    const randomFail = failMessages[Math.floor(Math.random() * failMessages.length)];
    setMessage(`⏰ Time's up! ${randomFail}`);
    setTimeout(() => endGame(), 2000);
  };

  const handleAnswer = (selected: string) => {
    if (!gameActive || selectedAnswer) return;
    
    setSelectedAnswer(selected);
    const isCorrect = selected === questions[currentQuestionIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      
      if (currentQuestionIndex + 1 < questions.length) {
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
          setTimeLeft(15);
          setSelectedAnswer(null);
        }, 800);
      } else {
        endGame();
      }
    } else {
      const randomFail = failMessages[Math.floor(Math.random() * failMessages.length)];
      setMessage(`❌ ${randomFail} (Answer: ${questions[currentQuestionIndex].correctAnswer})`);
      setGameActive(false);
      setTimeout(() => endGame(), 2500);
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameComplete(true);
    
    const percentage = (score / (questions.length * 10)) * 100;
    
    if (score > 0) {
      try {
        await fetchWithAuth('/api/games/complete', {
          method: 'POST',
          body: JSON.stringify({ 
            game: 'bible-trivia', 
            score, 
            coinsEarned: Math.floor(score / 5) 
          })
        });
        
        if (percentage >= 70) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFFFFF', '#00FF00']
          });
        }
      } catch (err) {
        console.error('Failed to submit score:', err);
      }
    }
  };

  const createInvite = async () => {
    try {
      const res = await fetchWithAuth('/api/games/bible-invite', {
        method: 'POST',
        body: JSON.stringify({ score })
      });
      const data = await res.json();
      setInviteLink(data.inviteLink);
    } catch (err) {
      console.error('Failed to create invite:', err);
    }
  };

  const playAgain = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeLeft(15);
    setGameActive(true);
    setSelectedAnswer(null);
    setMessage('');
    setGameComplete(false);
    loadQuestions();
  };

  if (gameComplete) {
    const totalPossiblePoints = questions.length * 10;
    const percentage = (score / totalPossiblePoints) * 100;
    const randomHype = hypeMessages[Math.floor(Math.random() * hypeMessages.length)];
    const randomFail = failMessages[Math.floor(Math.random() * failMessages.length)];
    
    return (
      <div className="min-h-screen bg-brutal-black py-8 px-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className={`rounded-3xl p-8 mb-8 brutal-border ${
            percentage >= 70 ? 'bg-neon-green/10 border-neon-green' : 'bg-red-500/10 border-red-500'
          }`}>
            <div className="text-8xl mb-6">{percentage >= 70 ? '📖✨' : '😢🙏'}</div>
            <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Trivia Complete!</h1>
            <div className="flex justify-center gap-8 mb-6">
              <div>
                <p className="text-gray-400 text-xs uppercase font-mono">Final Score</p>
                <p className="text-3xl font-black text-yellow-400">{score}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-mono">Accuracy</p>
                <p className="text-3xl font-black text-white">{Math.round(percentage)}%</p>
              </div>
            </div>

            {percentage < 70 ? (
              <p className="text-red-400 font-bold mb-8 text-xl italic italic">"{randomFail}"</p>
            ) : (
              <div className="mb-8">
                <p className="text-neon-green font-bold text-xl uppercase tracking-widest animate-bounce mb-2">
                  {percentage >= 90 ? "👑 SUPREME SCHOLAR 👑" : "Master of Scripture!"}
                </p>
                <p className="text-white font-mono text-sm opacity-80 italic">"{randomHype}"</p>
              </div>
            )}

            <ShareInvite 
              title="Challenge Your Congregation" 
              url={`/arcade/bible`} 
              text={`I scored ${score} pts on Bible Trivia! Can you beat me? 🕊️`}
              className="mb-8"
            />
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button 
                onClick={playAgain} 
                className="flex-1 bg-white text-brutal-black font-black py-4 rounded-xl hover:bg-neon-green transition-colors uppercase tracking-widest"
              >
                Play Again
              </button>
            </div>
            
            {inviteLink && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brutal-black rounded-2xl p-4 mb-4 border border-white/10"
              >
                <p className="text-neon-green text-sm font-mono break-all mb-2">{inviteLink}</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                  }}
                  className="text-xs text-gray-400 hover:text-white uppercase font-mono"
                >
                  Copy Link
                </button>
              </motion.div>
            )}
          </div>
          
          {/* Leaderboard */}
          <div className="bg-gray-800/20 brutal-border rounded-3xl p-6 border-white/5">
            <h3 className="text-white font-black mb-6 uppercase tracking-widest flex items-center justify-center gap-2">
              <Trophy className="text-yellow-400" /> Top 10 Scholars
            </h3>
            <div className="space-y-3">
              {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                      idx === 0 ? 'bg-yellow-400 text-brutal-black' : 
                      idx === 1 ? 'bg-gray-300 text-brutal-black' : 
                      idx === 2 ? 'bg-orange-400 text-brutal-black' : 'text-gray-400'
                    }`}>{idx + 1}</span>
                    <span className="text-white font-bold">@{user.username}</span>
                  </div>
                  <span className="text-yellow-400 font-mono font-bold">{user.score} PTS</span>
                </div>
              )) : (
                <p className="text-gray-500 italic">No legends yet. Be the first!</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-brutal-black text-white font-sans selection:bg-neon-green selection:text-brutal-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/games')} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <BookOpen className="text-neon-green" size={20} /> Bible Trivia
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Live Challenge</span>
              </div>
              <ShareInvite 
                variant="minimal" 
                url={`/arcade/bible`} 
                text="Can you beat my Bible Trivia score? 🕊️" 
              />
            </div>
          </div>
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-400 text-brutal-black font-black text-xs">
            {score}
          </div>
        </header>

        {/* Progress Bar */}
        <div className="relative w-full h-4 bg-gray-800 rounded-full mb-8 border-2 border-white/5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-neon-green to-teal-400"
          />
        </div>

        {/* Timer & Meta */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-colors ${
              timeLeft <= 5 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-300'
            }`}>
              <Timer size={16} /> {timeLeft}s
            </div>
            <div className="text-xs font-mono text-gray-500 uppercase">
              Question {currentQuestionIndex + 1} / {questions.length}
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestionIndex}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-white/5 brutal-border rounded-3xl p-8 mb-8 border-white/10"
          >
            <h2 className="text-2xl md:text-3xl font-black text-white mb-8 text-center leading-tight">
              {currentQuestion?.question}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.options.map((option, idx) => (
                <button
                  key={`${currentQuestion.id}-${option}-${idx}`}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={cn(
                    "relative overflow-hidden p-6 rounded-2xl text-left transition-all duration-300 font-bold group",
                    selectedAnswer === option 
                      ? option === currentQuestion.correctAnswer 
                        ? 'bg-neon-green text-brutal-black scale-105' 
                        : 'bg-red-500 text-white scale-95'
                      : selectedAnswer 
                        ? option === currentQuestion.correctAnswer 
                          ? 'bg-neon-green/80 text-brutal-black' 
                          : 'bg-gray-800 text-gray-500 opacity-50'
                        : 'bg-gray-800 hover:bg-white hover:text-brutal-black'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {selectedAnswer === option && (
                      option === currentQuestion.correctAnswer ? <CheckCircle size={20} /> : <XCircle size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feedback Message */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-6 rounded-2xl text-center brutal-border ${
                message.includes('✅') || message.includes('pts') ? 'bg-neon-green/10 text-neon-green border-neon-green' : 'bg-red-500/10 text-red-500 border-red-500'
              }`}
            >
              <p className="font-black text-lg">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
