import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import MarqueeHeader from '../../components/MarqueeHeader';
import ShareInvite from '../../components/games/ShareInvite';

const riddles = [
  { question: "What has to be broken before you can use it?", answer: "EGG", hint: "Breakfast item 🥚" },
  { question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "ECHO", hint: "Repeats what you say 🔊" },
  { question: "What has keys but can't open locks?", answer: "PIANO", hint: "Musical instrument 🎹" },
  { question: "What gets wetter as it dries?", answer: "TOWEL", hint: "Used after shower 🧺" },
  { question: "What can you catch but not throw?", answer: "COLD", hint: "Sickness 🤧" },
  { question: "What has a head, a tail, but no body?", answer: "COIN", hint: "Money 💰" },
  { question: "What has words but never speaks?", answer: "BOOK", hint: "Read it 📖" },
  { question: "What has a thumb and four fingers but is not a hand?", answer: "GLOVE", hint: "Wear it on your hand 🧤" },
  { question: "What building has the most stories?", answer: "LIBRARY", hint: "Where books live 📚" },
  { question: "What month of the year has 28 days?", answer: "ALL", hint: "Every month has at least 28 days 📅" },
  { question: "What is full of holes but still holds water?", answer: "SPONGE", hint: "Used for cleaning 🧽" },
  { question: "What question can you never answer yes to?", answer: "ARE YOU ASLEEP", hint: "Think about your state 💤" },
  { question: "What is always in front of you but can't be seen?", answer: "FUTURE", hint: "Time ahead 🔮" },
  { question: "What has one eye but cannot see?", answer: "NEEDLE", hint: "Used for sewing 🪡" },
  { question: "What has many needles but doesn't sew?", answer: "CHRISTMAS TREE", hint: "Holiday decoration 🎄" },
  { question: "What has a face and two hands but no arms or legs?", answer: "CLOCK", hint: "Tells time ⏰" },
  { question: "What has a ring but no finger?", answer: "TELEPHONE", hint: "Rings when someone calls 📞" },
  { question: "What has a heart that doesn't beat?", answer: "ARTICHOKE", hint: "Vegetable 🥬" },
  { question: "What has a bottom at the top?", answer: "LEGS", hint: "Body parts 🦵" },
  { question: "What can travel around the world while staying in a corner?", answer: "STAMP", hint: "Postage 📮" },
  { question: "What gets sharper the more you use it?", answer: "BRAIN", hint: "Think about it 🧠" },
  { question: "What has cities but no houses, forests but no trees, and water but no fish?", answer: "MAP", hint: "Shows locations 🗺️" },
  { question: "What has a neck but no head?", answer: "BOTTLE", hint: "Holds liquid 🍼" },
  { question: "What has a spine but no bones?", answer: "BOOK", hint: "Read it 📖" },
  { question: "What has a bark but no bite?", answer: "TREE", hint: "Grows outside 🌳" },
  { question: "What has a sole but no foot?", answer: "SHOE", hint: "Wear it 👟" },
  { question: "What has a face that doesn't frown or smile?", answer: "CLOCK", hint: "Tells time ⏰" },
  { question: "What has a mouth but never eats?", answer: "RIVER", hint: "Flows water 🌊" },
  { question: "What has a bed but never sleeps?", answer: "RIVER", hint: "Flows water 🌊" },
  { question: "What has a wave but no ocean?", answer: "HAIR", hint: "On your head 💇" },
  { question: "I am tall when I am young, and I am short when I am old. What am I?", answer: "CANDLE", hint: "It melts away 🕯️" },
  { question: "What belongs to you, but others use it more than you do?", answer: "NAME", hint: "How people address you 🆔" },
  { question: "David's parents have three sons: Snap, Crackle, and what's the name of the third son?", answer: "DAVID", hint: "Read the first sentence again 👦" }
];

export default function RiddleGame() {
  const navigate = useNavigate();
  const [currentRiddle, setCurrentRiddle] = useState<any>(null);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [attempts, setAttempts] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);

  const loadRiddle = () => {
    const availableRiddles = riddles.filter(r => r.answer !== currentRiddle?.answer);
    const randomIndex = Math.floor(Math.random() * availableRiddles.length);
    setCurrentRiddle(availableRiddles[randomIndex]);
    setUserInput('');
    setShowHint(false);
    setMessage('');
    setShake(false);
  };

  useEffect(() => {
    loadRiddle();
  }, []);

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      setMessage('Type your answer!');
      soundManager.playFaaah('soft');
      return;
    }

    if (userInput.trim().toUpperCase() === currentRiddle.answer) {
      const pointsEarned = 25 * level;
      setScore(prev => prev + pointsEarned);
      setMessage(`✅ ENLIGHTENED! +${pointsEarned} PTS`);
      soundManager.playAttassa('soft');
      
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#A855F7', '#FFFFFF']
      });

      if (level < 10) {
        setTimeout(() => {
          setLevel(prev => prev + 1);
          loadRiddle();
        }, 1500);
      } else {
        setGameComplete(true);
        try {
          await fetchWithAuth('/api/games/complete', {
            method: 'POST',
            body: JSON.stringify({ 
              game: 'riddle', 
              score: score + pointsEarned, 
              coinsEarned: Math.floor((score + pointsEarned) / 10)
            })
          });
        } catch (err) {
          console.error('Failed to award riddle coins:', err);
        }
      }
    } else {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);
      setShake(true);
      soundManager.playFaaah('normal');
      setMessage(`❌ WRONG! NOT QUITE...`);
      
      setTimeout(() => setShake(false), 500);
      
      if (newAttempts === 0) {
        setGameOver(true);
        soundManager.onUserMistake('repeated_fail');
      } else {
        setTimeout(() => loadRiddle(), 1500);
      }
    }
  };

  const playAgain = () => {
    setLevel(1);
    setScore(0);
    setAttempts(3);
    setGameOver(false);
    setGameComplete(false);
    loadRiddle();
  };

  if (gameComplete) {
    const coinsEarned = Math.floor(score / 10);
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center bg-white/5 border border-purple-500/30 rounded-3xl p-12 backdrop-blur-xl"
        >
          <div className="text-8xl mb-6">👁️</div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">RIDDLE <span className="text-neon-green">MASTER</span></h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">The mysteries are resolved.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Wisdom Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              <span className="text-purple-400 font-mono text-[10px] uppercase">Earnings</span>
              <span className="text-2xl font-display text-purple-400">🪙 +{coinsEarned}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/riddle`} 
            text={`I scored ${score} pts in Riddle Master! Are you a real genius? 🧠`}
            className="mb-8 rounded-xl border-purple-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={playAgain} className="w-full bg-neon-green text-brutal-black font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Transcend Again
            </button>
            <button onClick={() => navigate('/games')} className="w-full bg-white/10 text-white font-display uppercase py-4 rounded-xl tracking-widest border border-white/10 hover:bg-white/20 transition-all">
              Hub Menu
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full text-center bg-white/5 border border-red-500/30 rounded-3xl p-12 backdrop-blur-xl"
        >
          <div className="text-8xl mb-6">💀</div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">CONFUSED</h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">Your logic has failed you.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/riddle`} 
            text={`I scored ${score} pts in Riddle Master! Are you a real genius? 🧠`}
            className="mb-8 rounded-xl border-purple-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={playAgain} className="w-full bg-red-600 text-white font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Try Logic Again
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
      
      <main className="max-w-2xl w-full mx-auto px-6 py-12 flex-grow">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <button onClick={() => navigate('/games')} className="text-gallery-white/40 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              ← Back to Hub
            </button>
            <h1 className="text-4xl font-display uppercase text-white leading-none">RIDDLE <span className="text-neon-green">ME</span></h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-2xl font-display text-yellow-400 leading-none">{score} <span className="text-[10px] font-mono uppercase tracking-widest ml-1">PTS</span></div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-gallery-white/60 uppercase tracking-widest">
              LVL {level}/10
            </div>
          </div>
        </div>

        {/* Life Bar */}
        <div className="flex gap-2 mb-12 justify-center">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className={`w-16 h-2 rounded-full transition-all duration-500 ${
                i < attempts ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Riddle Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentRiddle?.question}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className={`bg-white/5 border-2 border-white/10 rounded-3xl p-12 text-center mb-8 relative group ${shake ? 'animate-shake border-red-500' : ''}`}
          >
            <div className="text-5xl mb-6">❓</div>
            <h2 className="text-2xl md:text-3xl font-display uppercase leading-tight text-white mb-8">
              {currentRiddle?.question}
            </h2>
            
            <div className="relative">
              {!showHint ? (
                <button 
                  onClick={() => setShowHint(true)}
                  className="text-[10px] font-mono text-gallery-white/20 uppercase tracking-[0.4em] hover:text-purple-400 transition-colors"
                >
                  Reveal Hint 🔍
                </button>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full"
                >
                  <p className="text-purple-400 text-[10px] font-mono uppercase tracking-widest">
                    💡 Hint: {currentRiddle?.hint}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* User Input */}
        <div className="space-y-4">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="YOUR ANSWER..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white text-center text-2xl font-display tracking-widest focus:border-neon-green focus:outline-none transition-all uppercase placeholder:opacity-20"
            autoFocus
          />
          <button 
            onClick={handleSubmit} 
            className="w-full bg-neon-green text-brutal-black font-display font-black text-xl py-5 rounded-2xl tracking-widest hover:scale-[1.02] transform transition-all active:scale-100 shadow-[0_6px_0_0_rgba(0,0,0,1)] border-2 border-brutal-black"
          >
            SOLVE RIDDLE →
          </button>
        </div>

        {message && (
          <div className={cn(
            "mt-8 p-4 rounded-xl text-center font-mono text-[10px] uppercase tracking-widest border",
            message.includes('✅') 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          )}>
            {message}
          </div>
        )}
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
