import { useState, useEffect } from 'react';
import { fetchWithAuth, retryWithBackoff } from '../utils/apiUtils';
import { motion } from 'motion/react';

interface QuickBattleProps {
  onBattleEnd: (result: any) => void;
}

export default function QuickBattle({ onBattleEnd }: QuickBattleProps) {
  const [battle, setBattle] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    startBattle();
  }, []);

  useEffect(() => {
    if (!waiting && !answered && !battleEnded) {
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
    }
  }, [waiting, answered, currentIndex]);

  const startBattle = async () => {
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/trivia/quick-battle/start', {
        method: 'POST',
      }));
      const data = await res.json();
      setBattle(data.battle);
      setQuestions(data.questions);
      setWaiting(data.isNew);
      
      if (!data.isNew) {
        startPolling(data.battle.id);
      } else {
        startPolling(data.battle.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startPolling = (battleId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await retryWithBackoff(() => fetchWithAuth(`/api/trivia/quick-battle/${battleId}/status`));
        const data = await res.json();
        
        if (data.status === 'active' && waiting) {
          setWaiting(false);
        }
        
        // update scores
        if (userId === data.player1Id) {
          setMyScore(data.player1Score);
          setOpponentScore(data.player2Score);
        } else {
          setMyScore(data.player2Score);
          setOpponentScore(data.player1Score);
        }
        
        if (data.status === 'completed') {
          setBattleEnded(true);
          setWinner(data);
          onBattleEnd(data);
          clearInterval(interval);
        }
      } catch (e) {}
    }, 2000); // Polling every 2s
  };

  const handleAnswer = async (answer: string) => {
    if (answered || battleEnded) return;
    
    setAnswered(true);
    const startTime = performance.now();
    
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/trivia/quick-battle/answer', {
        method: 'POST',
        body: JSON.stringify({
          battleId: battle.id,
          questionIndex: currentIndex,
          answer,
          responseTime: performance.now() - startTime
        })
      }));
      
      const data = await res.json();
      
      if (data.isCorrect) {
        setMyScore(prev => prev + 10);
      }
      
      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(15);
          setAnswered(false);
        } else {
          endBattle();
        }
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const endBattle = async () => {
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/trivia/quick-battle/end', {
        method: 'POST',
        body: JSON.stringify({ battleId: battle.id })
      }));
      const data = await res.json();
      setBattleEnded(true);
      setWinner(data);
      onBattleEnd(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTimeout = () => {
    handleAnswer('');
  };

  if (waiting) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">Finding opponent...</p>
        <p className="text-gallery-white/60 text-sm">Waiting for someone to join Quick Battle</p>
      </div>
    );
  }

  if (battleEnded) {
    const isWinner = winner?.winnerId === userId;
    const isTie = winner?.winnerId === 'tie';
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 bg-brutal-black border-2 border-neon-green rounded-xl"
      >
        <div className={`text-6xl mb-4 ${isWinner ? 'animate-bounce' : ''}`}>
          {isWinner ? '🏆' : isTie ? '🤝' : '💀'}
        </div>
        <h2 className={`text-3xl font-black mb-2 ${isWinner ? 'text-neon-green' : isTie ? 'text-blue-400' : 'text-red-500'}`}>
          {isWinner ? 'VICTORY' : isTie ? 'DRAW' : 'DEFEAT'}
        </h2>
        <p className="text-gallery-white mb-4 text-xl">Final Score: {myScore} - {opponentScore}</p>
        {isWinner && <p className="text-yellow-400 font-bold animate-pulse">+50 RMP earned!</p>}
        {(!isWinner && !isTie) && <p className="text-gallery-white/60 font-mono">+10 RMP participation.</p>}
        <button onClick={() => window.location.reload()} className="mt-8 bg-neon-green px-8 py-3 font-bold text-black uppercase hover:bg-white transition-colors">
          Return to Arcade
        </button>
      </motion.div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="bg-brutal-black border-2 border-neon-green rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-[8px_8px_0px_#39FF14]">
      {/* Score Display */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-neon-green/30 pb-4">
        <div className="text-center">
          <div className="text-white font-bold opacity-70 mb-1">YOU</div>
          <div className="text-4xl font-black text-neon-green">{myScore}</div>
        </div>
        <div className="text-3xl font-black italic text-red-500 opacity-80 px-4">VS</div>
        <div className="text-center">
          <div className="text-white font-bold opacity-70 mb-1">OPPONENT</div>
          <div className="text-4xl font-black text-red-400">{opponentScore}</div>
        </div>
      </div>
      
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gallery-white/70 font-mono mb-2">
          <span>{currentIndex + 1} / {questions.length}</span>
          <span className={`${timeLeft <= 5 ? 'text-red-500 font-bold' : ''}`}>00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
        <div className="w-full bg-white/10 h-3">
          <div className="bg-neon-green h-3 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
        </div>
      </div>
      
      {/* Question */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h3 className="text-white text-xl md:text-2xl font-bold text-center mb-8">{currentQ?.question}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQ?.options.map((option: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              disabled={answered}
              className={`font-medium p-4 text-left transition disabled:opacity-50 border-2 ${answered && option === currentQ.correctAnswer ? 'bg-neon-green border-neon-green text-black' : 'bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/50'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
