import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Users, UsersRound, Trophy, ArrowRight, UserPlus, Trash2 } from 'lucide-react';
import { GENERAL_Q, BIBLE_Q, EDUCATION_Q, FOOTBALL_Q } from '../../lib/triviaBanks';
import { soundManager } from '../../utils/soundManager';

interface Player {
  name: string;
  age: 'junior' | 'standard' | 'classic';
  score: number;
}

export default function FamilyMode() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const totalRounds = 3;

  const addPlayer = () => {
    if (players.length >= 6) return;
    setPlayers([...players, { name: `Player ${players.length + 1}`, age: 'standard', score: 0 }]);
  };

  const removePlayer = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx: number, updates: Partial<Player>) => {
    const next = [...players];
    next[idx] = { ...next[idx], ...updates };
    setPlayers(next);
  };

  const startGame = () => {
    if (players.length < 2) {
      alert("Add at least 2 players!");
      return;
    }
    setGameState('playing');
    loadNextQuestion(0);
  };

  const loadNextQuestion = (playerIdx: number) => {
    const player = players[playerIdx];
    let pool: any[] = [];
    
    // Select pool based on age
    if (player.age === 'junior') {
      pool = [...GENERAL_Q.filter(q => q.diff === 'easy'), ...EDUCATION_Q.filter(q => q.diff === 'easy')];
    } else if (player.age === 'classic') {
      pool = [...BIBLE_Q, ...EDUCATION_Q.filter(q => q.diff === 'hard')];
    } else {
      pool = [...GENERAL_Q, ...FOOTBALL_Q];
    }

    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion({
      ...q,
      options: [...q.opts].sort(() => 0.5 - Math.random())
    });
    setSelectedAnswer(null);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    const correct = option === currentQuestion.a;

    if (correct) {
      const nextPlayers = [...players];
      nextPlayers[currentIndex].score += 10;
      setPlayers(nextPlayers);
      soundManager.playAttassa('soft');
    } else {
      soundManager.playFaaah('normal');
    }

    setTimeout(() => {
      if (currentIndex + 1 < players.length) {
        setCurrentIndex(c => c + 1);
        loadNextQuestion(currentIndex + 1);
      } else if (currentRound < totalRounds) {
        setCurrentRound(r => r + 1);
        setCurrentIndex(0);
        loadNextQuestion(0);
      } else {
        setGameState('results');
      }
    }, 1500);
  };

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full bg-zinc-900 border-4 border-white p-8 shadow-[12px_12px_0px_0px_white]">
           <UsersRound className="mb-4 text-neon-green" size={48} />
           <h1 className="text-5xl font-display uppercase italic mb-2">Family <span className="text-neon-green">Mode</span></h1>
           <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-12">Pass the phone. Shared glory. Mixed difficulty.</p>

           <div className="space-y-4 mb-12">
             {players.map((p, i) => (
               <div key={i} className="flex gap-4 items-center bg-black/50 p-4 border-2 border-white/20">
                 <input 
                   value={p.name}
                   onChange={(e) => updatePlayer(i, { name: e.target.value })}
                   className="bg-transparent border-b border-white/20 focus:border-neon-green outline-none font-display uppercase text-xl flex-1"
                 />
                 <select 
                    value={p.age} 
                    onChange={(e) => updatePlayer(i, { age: e.target.value as any })}
                    className="bg-zinc-800 border-2 border-white/20 p-2 font-mono text-[10px] uppercase"
                  >
                    <option value="junior">Junior (Kids)</option>
                    <option value="standard">Standard (13-40)</option>
                    <option value="classic">Classic (40+)</option>
                 </select>
                 <button onClick={() => removePlayer(i)} className="text-red-500 hover:text-white">
                   <Trash2 size={20} />
                 </button>
               </div>
             ))}
             
             {players.length < 6 && (
               <button onClick={addPlayer} className="w-full border-2 border-dashed border-white/20 p-4 flex items-center justify-center gap-2 hover:border-white transition-colors group">
                 <UserPlus className="group-hover:text-neon-green" />
                 <span className="font-display uppercase">Add Player</span>
               </button>
             )}
           </div>

           <button 
             onClick={startGame}
             className="w-full brutal-btn text-2xl h-20"
           >
             Enter the Arena
           </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'playing') {
    const currentPlayer = players[currentIndex];
    return (
      <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
        <div className="fixed top-6 left-6 right-6 flex justify-between items-center">
           <div className="bg-white text-black font-display uppercase px-6 py-2 shadow-[4px_4px_0px_0px_#00FF00]">
             Round {currentRound}/{totalRounds}
           </div>
           <div className="text-right">
             <div className="font-display text-2xl uppercase">{currentPlayer.name}</div>
             <div className="text-[10px] font-mono text-neon-green uppercase tracking-widest">{currentPlayer.age} Question</div>
           </div>
        </div>

        <motion.div 
          key={`${currentRound}-${currentIndex}`}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="max-w-xl w-full text-center"
        >
          <h2 className="text-3xl md:text-5xl font-display uppercase italic mb-12 leading-tight">
            {currentQuestion?.q}
          </h2>

          <div className="grid gap-4">
             {currentQuestion?.opts.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!selectedAnswer}
                  className={`p-6 border-4 border-white font-display uppercase text-lg transition-all
                    ${selectedAnswer === opt 
                      ? (opt === currentQuestion.a ? 'bg-neon-green border-black text-black' : 'bg-red-500 border-black text-white')
                      : (selectedAnswer && opt === currentQuestion.a ? 'bg-neon-green border-black text-black' : 'bg-zinc-900 hover:bg-white hover:text-black')
                    }
                  `}
                  style={{ boxShadow: selectedAnswer === opt ? 'none' : '6px 6px 0px_0px_white' }}
                >
                  {opt}
                </button>
             ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'results') {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const totalTeamScore = players.reduce((sum, p) => sum + p.score, 0);

    return (
      <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
         <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="max-w-md w-full bg-zinc-900 border-4 border-white p-8 text-center shadow-[12px_12px_0px_0px_#fbbf24]">
            <Trophy className="mx-auto mb-4 text-yellow-400" size={64} />
            <h1 className="text-5xl font-display uppercase italic mb-8">Arena <span className="text-yellow-400">Legends</span></h1>
            
            <div className="bg-white/5 p-6 mb-8 border-2 border-white/10">
               <div className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Total Team Synergy</div>
               <div className="text-4xl font-display text-neon-green">{totalTeamScore}</div>
            </div>

            <div className="space-y-3 mb-12">
               {sorted.map((p, i) => (
                 <div key={i} className="flex justify-between items-center bg-black p-4 border-2 border-white/20">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-zinc-600">{i + 1}</span>
                      <span className="font-display uppercase text-lg">{p.name}</span>
                    </div>
                    <span className="font-display text-xl">{p.score}</span>
                 </div>
               ))}
            </div>

            <button 
              onClick={() => navigate('/games')}
              className="brutal-btn w-full text-xl flex items-center justify-center gap-2"
            >
               Finish Hub <ArrowRight />
            </button>
         </motion.div>
      </div>
    );
  }

  return null;
}
