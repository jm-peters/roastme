import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/soundManager';
import { fetchWithAuth } from '../../utils/apiUtils';
import MarqueeHeader from '../../components/MarqueeHeader';
import ShareInvite from '../../components/games/ShareInvite';

const wordBankByLevel: { [key: number]: { word: string; hint: string }[] } = {
  1: [
    { word: "ROAST", hint: "What you do to your friends here 🔥" },
    { word: "GAME", hint: "You're playing one right now 🎮" },
    { word: "FUN", hint: "The reason you're here 😄" },
    { word: "WIN", hint: "What you want to do 🏆" },
    { word: "PLAY", hint: "Action you're doing now 🎯" },
    { word: "HOT", hint: "Temperature of a fresh roast 🔥" },
    { word: "COIN", hint: "Virtual currency you earn 🪙" },
    { word: "BATTLE", hint: "Two roasts enter, one leaves ⚔️" },
    { word: "TRUTH", hint: "Honest answer in a challenge 💬" },
    { word: "DARE", hint: "A challenge to do something risky ⚡" }
  ],
  2: [
    { word: "FRIEND", hint: "Someone you challenge to know you better 🤝" },
    { word: "PRANK", hint: "Fake surprise that makes people laugh 🎭" },
    { word: "MEME", hint: "Funny image that goes viral 😂" },
    { word: "VIRAL", hint: "Spreads quickly across the internet 📱" },
    { word: "SHARE", hint: "What you do with a good roast 📤" },
    { word: "SCORE", hint: "Points you earn in games 🎯" },
    { word: "LEVEL", hint: "Each stage of a game 📊" },
    { word: "COMBO", hint: "Consecutive successful moves 🔥" },
    { word: "TIMER", hint: "Counts down your time ⏱️" },
    { word: "HINT", hint: "Clue to help you solve 💡" }
  ],
  3: [
    { word: "ANONYMOUS", hint: "Hidden identity 👻" },
    { word: "FEED", hint: "Scroll of roasts 📱" },
    { word: "COINS", hint: "Virtual currency you earn 🪙" },
    { word: "LEADERBOARD", hint: "Where top players are ranked 👑" },
    { word: "ACHIEVEMENT", hint: "Badge you earn for milestones 🏅" },
    { word: "CHALLENGE", hint: "Test of your skills ⚔️" },
    { word: "NOTIFICATION", hint: "Alert you get for activities 🔔" },
    { word: "PROFILE", hint: "Your personal page on the app 👤" },
    { word: "SETTINGS", hint: "Where you customize your experience ⚙️" },
    { word: "STREAK", hint: "Consecutive days of playing 🔥" }
  ],
  4: [
    { word: "DEVELOPER", hint: "Person who built this app 💻" },
    { word: "ALGORITHM", hint: "AI that generates roasts 🤖" },
    { word: "SUBSCRIPTION", hint: "Premium membership 📦" },
    { word: "VOCABULARY", hint: "Set of words you know 📚" },
    { word: "INTELLIGENCE", hint: "Ability to acquire knowledge 🧠" },
    { word: "KNOWLEDGE", hint: "Facts and information learned 📖" },
    { word: "EDUCATION", hint: "Learning through study 🎓" },
    { word: "PRACTICE", hint: "Repeated exercise to improve 📝" },
    { word: "MASTERY", hint: "Comprehensive knowledge of a subject 👑" },
    { word: "PROGRESS", hint: "Forward movement toward a goal 📈" }
  ],
  5: [
    { word: "FRUSTRATION", hint: "Feeling when you get a word wrong 😤" },
    { word: "SATISFACTION", hint: "Feeling when you get it right 😌" },
    { word: "COMPETITION", hint: "What drives you to win 🏁" },
    { word: "DETERMINATION", hint: "Keep trying until you succeed 💪" },
    { word: "CELEBRATION", hint: "What happens when you win 🎉" },
    { word: "PERSISTENCE", hint: "Continuing firmly despite difficulty 🔄" },
    { word: "MOTIVATION", hint: "Reason for acting in a certain way 🎯" },
    { word: "INSPIRATION", hint: "Process of being mentally stimulated 💡" },
    { word: "DEDICATION", hint: "Commitment to a task 📌" },
    { word: "AMBITION", hint: "Strong desire to achieve success 🚀" }
  ],
  6: [
    { word: "EXTRAORDINARY", hint: "Beyond ordinary ⭐" },
    { word: "UNBELIEVABLE", hint: "Hard to accept as true 😲" },
    { word: "UNPREDICTABLE", hint: "Cannot be foreseen 🔮" },
    { word: "UNFORGETTABLE", hint: "Leaves a lasting memory 💭" },
    { word: "UNSTOPPABLE", hint: "Cannot be stopped 🚀" },
    { word: "MAGNIFICENT", hint: "Extremely beautiful or impressive ✨" },
    { word: "PHENOMENAL", hint: "Very remarkable 🌟" },
    { word: "SPECTACULAR", hint: "Beautiful in a dramatic way 🎆" },
    { word: "REMARKABLE", hint: "Worthy of attention 👏" },
    { word: "ASTOUNDING", hint: "Surprisingly impressive 🤯" }
  ],
  7: [
    { word: "IDIOSYNCRASY", hint: "A peculiar habit or trait 🎭" },
    { word: "QUINTESSENTIAL", hint: "Representing the perfect example ✨" },
    { word: "SERENDIPITY", hint: "Happy accident 🍀" },
    { word: "MELANCHOLY", hint: "Deep sadness 😔" },
    { word: "EBULLIENT", hint: "Full of energy and enthusiasm 🤩" },
    { word: "ELOQUENT", hint: "Fluent and persuasive in speech 🗣️" },
    { word: "RESILIENT", hint: "Able to recover quickly 💪" },
    { word: "TENACIOUS", hint: "Tending to keep a firm hold 🦾" },
    { word: "VERSATILE", hint: "Able to adapt to many functions 🔧" },
    { word: "METICULOUS", hint: "Showing great attention to detail 🔍" }
  ],
  8: [
    { word: "ANTIDISESTABLISHMENT", hint: "Historical political term 📜" },
    { word: "FLOCCINAUCINIHILIPILIFICATION", hint: "Estimating as worthless 🤷" },
    { word: "PNEUMONOULTRAMICROSCOPICSILICOVOLCANOCONIOSIS", hint: "Lung disease 🌋" },
    { word: "HIPPOPOTOMONSTROSESQUIPPEDALIOPHOBIA", hint: "Fear of long words 😱" },
    { word: "SUPERCALIFRAGILISTICEXPIALIDOCIOUS", hint: "From Mary Poppins 🎵" }
  ],
  9: [
    { word: "ONOMATOPOEIA", hint: "Words that sound like their meaning 🔊" },
    { word: "HYPOTHETICAL", hint: "Based on assumed situations 🤔" },
    { word: "METAMORPHOSIS", hint: "Complete transformation 🦋" },
    { word: "PHILANTHROPIST", hint: "Someone who gives to charity ❤️" },
    { word: "SOPHISTICATED", hint: "Complex and refined 🎩" },
    { word: "UNPRECEDENTED", hint: "Never done or known before 🆕" },
    { word: "COUNTERINTUITIVE", hint: "Opposite of what seems logical 🔄" },
    { word: "INTERDISCIPLINARY", hint: "Involving multiple fields 🔬" },
    { word: "MULTIDIMENSIONAL", hint: "Having many features 📐" },
    { word: "AUTHENTICITY", hint: "Being genuine and real ✅" }
  ],
  10: [
    { word: "TRANSCENDENTALISM", hint: "Philosophical movement 📚" },
    { word: "UNCOMPROMISING", hint: "Not willing to make concessions 🗿" },
    { word: "COUNTERPRODUCTIVE", hint: "Having opposite effect ⚠️" },
    { word: "INCONSEQUENTIAL", hint: "Not important or significant 😐" },
    { word: "MISUNDERSTANDING", hint: "Failure to interpret correctly 🤷" },
    { word: "ACKNOWLEDGMENT", hint: "Acceptance of truth or fact 📝" },
    { word: "ACCOMPLISHMENT", hint: "Something achieved successfully 🏆" },
    { word: "RECOMMENDATION", hint: "Advice given to someone 💡" },
    { word: "DISAPPOINTMENT", hint: "Sadness from unmet expectations 😔" },
    { word: "ENTERTAINMENT", hint: "Activity providing enjoyment 🎬" }
  ]
};

export default function WordGame() {
  const navigate = useNavigate();
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [scrambled, setScrambled] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [attempts, setAttempts] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  useEffect(() => {
    startRound();
  }, [level]);

  const scrambleWord = (word: string): string => {
    const letters = word.split('');
    let scrambled = word;
    while (scrambled === word && word.length > 1) {
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      scrambled = letters.join('');
    }
    return scrambled;
  };

  const startRound = () => {
    const levelWords = wordBankByLevel[level as keyof typeof wordBankByLevel] || wordBankByLevel[1];
    const randomIndex = Math.floor(Math.random() * levelWords.length);
    const newWord = levelWords[randomIndex];
    setCurrentWord(newWord);
    setScrambled(scrambleWord(newWord.word));
    setUserInput('');
    setMessage('');
    setShake(false);
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      setMessage('Type your answer!');
      soundManager.playFaaah('soft');
      return;
    }

    if (userInput.toUpperCase() === currentWord.word) {
      // Correct answer
      const pointsEarned = 10 * level;
      setScore(prev => prev + pointsEarned);
      setMessage(`✅ Correct! +${pointsEarned} points!`);
      soundManager.playAttassa('soft');
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00FF00', '#FFFFFF']
      });

      // Level up or next word
      if (level < 10) {
        setTimeout(() => {
          setLevel(prev => prev + 1);
          // startRound is called by useEffect dependency on level
        }, 1000);
      } else {
        setGameComplete(true);
        setIsAwarding(true);
        try {
          await fetchWithAuth('/api/games/complete', {
            method: 'POST',
            body: JSON.stringify({ 
              game: 'word', 
              score: score + pointsEarned,
              coinsEarned: Math.floor((score + pointsEarned) / 10)
            })
          });
        } catch (err) {
          console.error('Failed to award game coins:', err);
        } finally {
          setIsAwarding(false);
        }
      }
    } else {
      // Wrong answer
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);
      setShake(true);
      soundManager.playFaaah('normal');
      setMessage(`❌ Wrong! The correct word was ${currentWord.word}`);
      
      setTimeout(() => setShake(false), 500);
      
      if (newAttempts === 0) {
        setGameOver(true);
        soundManager.onUserMistake('repeated_fail');
      } else {
        setTimeout(() => startRound(), 1500);
      }
    }
  };

  const playAgain = () => {
    setScore(0);
    setLevel(1);
    setAttempts(3);
    setGameOver(false);
    setGameComplete(false);
    startRound();
  };

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center bg-white/5 border border-green-500/30 rounded-3xl p-12 backdrop-blur-xl"
        >
          <div className="text-8xl mb-6">🏆</div>
          <h1 className="text-4xl font-display uppercase text-white mb-2">VICTORY!</h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">You mastered the lexicon.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase">Final Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center bg-green-500/10 p-4 rounded-xl border border-green-500/20">
              <span className="text-green-400 font-mono text-[10px] uppercase">Coins Earned</span>
              <span className="text-2xl font-display text-green-400">🪙 +{Math.floor(score / 10)}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/word-game`} 
            text={`I scored ${score} pts in Word Puzzle! Are you a real wordsmith? 🧠`}
            className="mb-8 rounded-xl border-green-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={playAgain} className="w-full bg-neon-green text-brutal-black font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Challenge Again
            </button>
            <button onClick={() => navigate('/games')} className="w-full bg-white/10 text-white font-display uppercase py-4 rounded-xl tracking-widest border border-white/10 hover:bg-white/20 transition-all">
              Different Game
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
          <h1 className="text-4xl font-display uppercase text-white mb-2">DEFEATED</h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">Your vocabulary failed you.</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Score</span>
              <span className="text-2xl font-display text-white">{score}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Max Level</span>
              <span className="text-2xl font-display text-white">{level}</span>
            </div>
          </div>

          <ShareInvite 
            title="Challenge Your Friends" 
            url={`/games/word-game`} 
            text={`I scored ${score} pts (Level ${level}) in Word Puzzle! Can you beat my score? 🧠`}
            className="mb-8 rounded-xl border-red-500/30"
          />

          <div className="flex flex-col gap-3">
            <button onClick={playAgain} className="w-full bg-red-600 text-white font-display uppercase py-4 rounded-xl tracking-widest hover:scale-105 transition-transform">
              Redemption Round
            </button>
            <button onClick={() => navigate('/games')} className="w-full bg-white/10 text-white font-display uppercase py-4 rounded-xl tracking-widest border border-white/10 hover:bg-white/20 transition-all">
              Go Back
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
        {/* Navigation & Header */}
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-2">
            <button onClick={() => navigate('/games')} className="text-gallery-white/40 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              ← Back to Hub
            </button>
            <h1 className="text-4xl font-display uppercase text-white">WORD <span className="text-neon-green">PUZZLE</span></h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-2xl font-display text-yellow-400 leading-none">{score} <span className="text-[10px] font-mono uppercase tracking-widest ml-1">PTS</span></div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-gallery-white/60 uppercase tracking-widest">
              Level {level}/10
            </div>
          </div>
        </div>

        {/* Life Bar */}
        <div className="flex gap-2 mb-8 justify-center">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className={`w-12 h-2 rounded-full transition-all duration-500 ${
                i < attempts ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Scrambled Word Display */}
        <motion.div 
          key={scrambled}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`bg-white/5 border-2 border-white/10 rounded-3xl p-12 text-center mb-8 relative group ${shake ? 'animate-shake border-red-500' : ''}`}
        >
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {scrambled.split('').map((letter, i) => (
              <motion.span 
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-12 h-16 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-3xl font-display text-white shadow-xl"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          <div className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <p className="text-purple-400 text-[10px] font-mono uppercase tracking-widest">
              💡 Hint: {currentWord?.hint}
            </p>
          </div>
        </motion.div>

        {/* User Input */}
        <div className="space-y-4">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="TYPE THE WORD..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white text-center text-2xl font-display tracking-widest focus:border-neon-green focus:outline-none transition-all uppercase placeholder:opacity-20"
            autoFocus
          />
          <button 
            onClick={handleSubmit} 
            className="w-full bg-neon-green text-brutal-black font-display font-black text-xl py-5 rounded-2xl tracking-widest hover:scale-[1.02] transform transition-all active:scale-100 shadow-[0_6px_0_0_rgba(0,0,0,1)] border-2 border-brutal-black"
          >
            SUBMIT GUESS →
          </button>
        </div>

        {/* Feedback Message */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`mt-6 p-4 rounded-xl text-center font-mono text-xs uppercase tracking-widest ${
                message.includes('✅') 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <div className="text-center py-8 opacity-20 pointer-events-none font-mono text-[8px] uppercase tracking-[0.5em]">
        Vocabulary is the ultimate weapon ⚡
      </div>
    </div>
  );
}
