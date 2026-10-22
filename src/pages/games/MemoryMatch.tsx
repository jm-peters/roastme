import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import MarqueeHeader from '../../components/MarqueeHeader';
import ShareInvite from '../../components/games/ShareInvite';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const emojis = ['🔥', '💀', '😂', '🎭', '⚔️', '🎲', '👻', '🏆', '🤝', '💕', '⚡', '🎉'];

export default function MemoryMatch() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [message, setMessage] = useState('');
  const [lockBoard, setLockBoard] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const shuffledEmojis = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    const newCards = shuffledEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    }));
    setCards(newCards);
    setFlippedIndices([]);
    setMatchedCount(0);
    setMoves(0);
    setScore(0);
    setGameComplete(false);
    setMessage('');
    setLockBoard(false);
  };

  const handleCardClick = (index: number) => {
    if (lockBoard || gameComplete) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedIndices.includes(index)) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setLockBoard(true);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[index];

      if (firstCard.emoji === secondCard.emoji) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setMatchedCount(prev => prev + 1);
          setScore(prev => prev + 15);
          setMessage('✅ Match! +15 points');
          soundManager.playAttassa('soft');
          
          setFlippedIndices([]);
          setLockBoard(false);
          
          if (matchedCount + 1 === emojis.length) {
            endGame();
          }
        }, 500);
      } else {
        // No match
        setMessage('❌ No match!');
        soundManager.playFaaah('soft');
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          setLockBoard(false);
          setMessage('');
        }, 1000);
      }
    }
  };

  const endGame = async () => {
    setGameComplete(true);
    const coinsEarned = Math.floor((score + 50) / 10); // Completion bonus
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    try {
      await fetchWithAuth('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          game: 'memory', 
          score: score + 50, 
          coinsEarned 
        })
      });
    } catch (err) {
      console.error('Failed to award memory coins:', err);
    }
  };

  if (gameComplete) {
    const finalScore = score + 50;
    const coinsEarned = Math.floor(finalScore / 10);
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center bg-white/5 border border-purple-500/30 rounded-3xl p-12 backdrop-blur-xl"
        >
          <div className="text-8xl mb-6">🧠</div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">MEMORY <span className="text-neon-green">CLEAR</span></h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">Neural patterns aligned.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Moves</span>
              <span className="text-2xl font-display text-white">{moves}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Final Score</span>
              <span className="text-2xl font-display text-white">{finalScore}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
              <span className="text-yellow-400 font-mono text-[10px] uppercase">Earnings</span>
              <span className="text-2xl font-display text-yellow-400">🪙 +{coinsEarned}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/memory`} 
            text={`I scored ${finalScore} pts in Memory Match with ${moves} moves! Can you do better? 🧠`}
            className="mb-8 rounded-xl border-purple-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={initGame} className="w-full bg-neon-green text-brutal-black font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Synapse Reset
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
      
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-grow">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <button onClick={() => navigate('/games')} className="text-gallery-white/40 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              ← Exit Game
            </button>
            <h1 className="text-4xl font-display uppercase text-white">MEMORY <span className="text-neon-green">MATCH</span></h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-2xl font-display text-yellow-400 leading-none">{score} <span className="text-[10px] font-mono uppercase tracking-widest ml-1">PTS</span></div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-gallery-white/60 uppercase tracking-widest">
              Moves: {moves}
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3 md:gap-4 mb-8">
          {cards.map((card, index) => (
            <motion.button
              key={card.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(index)}
              className={cn(
                "aspect-square rounded-xl md:rounded-2xl text-4xl flex items-center justify-center transition-all duration-500 border-2",
                card.isFlipped || card.isMatched
                  ? "bg-neon-green/20 border-neon-green shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                  : "bg-white/5 border-white/10 hover:border-white/20 active:bg-white/10"
              )}
            >
              <AnimatePresence mode="wait">
                {(card.isFlipped || card.isMatched) ? (
                  <motion.span
                    key="emoji"
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    exit={{ scale: 0, rotateY: 180 }}
                  >
                    {card.emoji}
                  </motion.span>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/10"
                  >
                    ?
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Feedback Bar */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "p-4 rounded-2xl text-center font-mono text-[10px] uppercase tracking-[0.2em] border",
                message.includes('✅') 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
           <button 
            onClick={initGame}
            className="text-gallery-white/20 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest border border-white/5 px-6 py-2 rounded-full hover:bg-white/5"
           >
            Reset Matrix 🔄
           </button>
        </div>
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
