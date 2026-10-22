import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../../firebase';
import { useToast } from '../../components/Toast';
import { Trophy, User, Zap, Star, RefreshCw, Send, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const MULTIPLAYER_TRUTHS = [
  "What is your absolute biggest insecurity that you try to hide from friends?",
  "Have you ever posted a roast and then felt incredibly guilty about it?",
  "What is the most embarrassing thing currently sitting on your phone's camera roll?",
  "If you had to delete all your social media accounts except one, which one do you keep?",
  "What's a secret lie you've told to one of the players in this room?",
  "What is the cringiest handle, email, or username you've ever used online?",
  "If you could trade lives with anyone in this room for a week, who would it be and why?",
  "Who do you think is the best-looking or funniest person in this room?",
  "Have you ever sneaked a peak at someone else's phone messages?",
  "What is the most shameful or unusual thing you've bought online?"
];

const MULTIPLAYER_DARES = [
  "Send a screen recording of your recent chat list or search history to the other player.",
  "Imitate the other player's typical text style or catchphrase for the next 1 minute.",
  "Give a 30-second dramatic reading of the last DM you received.",
  "Make up a quick, sharp 2-line roast about the other player in the room right now.",
  "Post a highly embarrassing selfie or text to a random contact and prove you did it.",
  "Text your most recent contact some cryptic emojis and do not explain why.",
  "Whisper a dark secret about yourself into a voice note or type it out right here.",
  "Let the other player dictate a sentence that you must type as your next message to an ex or ex-crush."
];

export default function DareRoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myResponseText, setMyResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;

    const fetchStatus = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/room/${code}/status`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        if (!res.ok) throw new Error('Room not found or expired');
        
        const data = await res.json();
        setRoom(data);
        
        // Host automatically initializes game state if it doesn't exist
        if (data.status === 'active' && (!data.gameData || !data.gameData.gameState)) {
          if (auth.currentUser && data.hostId === auth.currentUser.uid) {
            await initializeGame(data);
          }
        }
      } catch (err: any) {
        console.error('Lobby status fetch error:', err);
        setError(err.message || 'Error loading room data');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [code]);

  const initializeGame = async (currentRoom: any) => {
    const initialScores: Record<string, number> = {};
    currentRoom.players.forEach((p: any) => {
      initialScores[p.userId] = 0;
    });

    const initialGameData = {
      currentTurnIndex: 0,
      gameState: 'choosing', // 'choosing' | 'responding' | 'verifying' | 'ended'
      selectedType: null,    // 'truth' | 'dare'
      currentPrompt: '',
      response: '',
      scores: initialScores,
      roundNumber: 1
    };

    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch(`/api/room/${code}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ gameData: initialGameData })
      });
    } catch (err) {
      console.error('Init game state error:', err);
    }
  };

  const submitAction = async (updatedGameData: any) => {
    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/room/${code}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ gameData: updatedGameData })
      });
      if (!res.ok) throw new Error('API action failed');
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChoose = async (type: 'truth' | 'dare') => {
    if (!room || !room.gameData) return;
    
    const bank = type === 'truth' ? MULTIPLAYER_TRUTHS : MULTIPLAYER_DARES;
    const randomPrompt = bank[Math.floor(Math.random() * bank.length)];

    const updated = {
      ...room.gameData,
      gameState: 'responding',
      selectedType: type,
      currentPrompt: randomPrompt,
      response: ''
    };

    await submitAction(updated);
  };

  const handleSubmitResponse = async () => {
    if (!myResponseText.trim()) {
      showToast('Type a valid confession/proof first!', 'error');
      return;
    }

    if (!room || !room.gameData) return;

    const updated = {
      ...room.gameData,
      gameState: 'verifying',
      response: myResponseText.trim()
    };

    await submitAction(updated);
    setMyResponseText('');
  };

  const handleGrade = async (pass: boolean) => {
    if (!room || !room.gameData) return;

    const activePlayerId = room.players[room.gameData.currentTurnIndex]?.userId;
    const currentScores = { ...room.gameData.scores };

    if (pass && activePlayerId) {
      currentScores[activePlayerId] = (currentScores[activePlayerId] || 0) + 10;
    }

    const nextTurnIndex = (room.gameData.currentTurnIndex + 1) % room.players.length;
    const nextRound = nextTurnIndex === 0 ? (room.gameData.roundNumber || 1) + 1 : (room.gameData.roundNumber || 1);

    let nextState = 'choosing';
    if (nextRound > 5) {
      nextState = 'ended';
    }

    const updated = {
      ...room.gameData,
      gameState: nextState,
      selectedType: null,
      currentPrompt: '',
      response: '',
      scores: currentScores,
      roundNumber: nextRound
    };

    await submitAction(updated);
    showToast(pass ? 'Point awarded! Turn swapped.' : 'Turn skipped! Zero points.', pass ? 'success' : 'info');
  };

  const endRoomSession = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch(`/api/room/${code}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      navigate('/truthordare');
    } catch(err) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
        <RefreshCw className="text-emerald-400 animate-spin w-10 h-10 mb-4" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Establishing secure channel...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-[#1f0a0a] border border-red-500/20 p-8 rounded-[32px] max-w-sm text-center">
          <AlertTriangle className="text-red-400 w-12 h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase text-white tracking-tight mb-2">CHANNEL LOST</h2>
          <p className="text-zinc-500 font-mono text-xs leading-relaxed mb-6">
            The multiplayer session code is invalid or the host shut down the server.
          </p>
          <button 
            onClick={() => navigate('/truthordare')}
            className="w-full bg-red-500 hover:bg-red-400 text-white py-3.5 rounded-full font-sans font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            ← Back To Hub
          </button>
        </div>
      </div>
    );
  }

  const gameData = room.gameData || {};
  const players = room.players || [];
  const activeIndex = gameData.currentTurnIndex || 0;
  const activePlayer = players[activeIndex];
  const isMyTurn = auth.currentUser && activePlayer?.userId === auth.currentUser.uid;
  const opponentPlayer = players.find((p: any) => p.userId !== activePlayer?.userId);
  const mySelfObj = players.find((p: any) => p.userId === auth.currentUser?.uid);

  return (
    <div className="min-h-screen bg-black text-white font-sans py-12 px-4 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-2xl mx-auto pt-6 space-y-8">
        
        {/* Upper HUD / Status Bar */}
        <div className="bg-[#031d15] border border-emerald-500/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-xs font-mono text-emerald-300 font-black tracking-widest uppercase">Arena Session: {code}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right sm:text-left">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wide">Gameplay Phase</span>
              <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
                {gameData.gameState ? `Phase: ${gameData.gameState}` : 'SYNCHRONIZING...'}
              </span>
            </div>
            <div className="h-8 w-px bg-white/5 hidden sm:block" />
            <div className="text-right">
              <span className="text-[10px] text-emerald-400 font-black block uppercase tracking-widest">Global Round</span>
              <span className="text-xs font-mono font-black text-white">{gameData.roundNumber || 1} / 5</span>
            </div>
          </div>
        </div>

        {/* Players Scoreboard Grid */}
        <div className="grid grid-cols-2 gap-4">
          {players.map((p: any, idx: number) => {
            const isActiveUser = idx === activeIndex;
            const userScore = gameData.scores?.[p.userId] || 0;
            const isSelf = p.userId === auth.currentUser?.uid;

            return (
              <motion.div 
                key={p.userId}
                animate={{ scale: isActiveUser ? 1.02 : 1 }}
                className={`p-6 rounded-3xl border transition-all ${
                  isActiveUser 
                    ? 'bg-gradient-to-br from-[#0c402f] to-[#032015] border-emerald-400/30 shadow-[0_4px_20px_rgba(0,230,118,0.1)]' 
                    : 'bg-zinc-950 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${isActiveUser ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black tracking-tight font-sans text-white">@{p.username}</span>
                      {isSelf && <span className="text-[8px] bg-white/10 text-white px-1.5 py-0.5 rounded font-mono uppercase font-black">You</span>}
                    </div>
                    {isActiveUser && (
                      <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-widest animate-pulse">ACTIVE TURN</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">RMP Score</span>
                  <span className="text-2xl font-mono font-black text-white">{userScore} xp</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Main Gameplay Container Card - Redesigned to exact beautiful spec */}
        <div className="bg-gradient-to-br from-[#06241b] via-[#010806] to-[#041611] rounded-[32px] p-8 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          
          {/* Subtle floating glow graphic */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />

          <AnimatePresence mode="wait">
            {/* 1. Choosing State */}
            {gameData.gameState === 'choosing' && (
              <motion.div
                key="choosing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center space-y-8 py-6"
              >
                <div className="w-16 h-16 bg-[#032219] text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg">
                  <Trophy className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-sans font-black uppercase text-white tracking-tight">
                    {isMyTurn ? 'YOUR EXCLUSIVE CHOCIE!' : `WAITING FOR @${activePlayer?.username}...`}
                  </h3>
                  <p className="text-zinc-400 text-xs font-medium max-w-md mx-auto leading-relaxed uppercase tracking-wider font-mono">
                    {isMyTurn 
                      ? 'Pick your poison. Opt for confessions (Truth) or act out outrageous scenarios (Dare).' 
                      : `They are deciding right now. Trash talk them in real life while they process their courage.`}
                  </p>
                </div>

                {isMyTurn ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
                    <button
                      onClick={() => handleChoose('truth')}
                      disabled={submitting}
                      className="bg-blue-600 hover:bg-blue-500 hover:scale-105 rounded-2xl p-6 transition-all text-white font-black text-base uppercase tracking-wider cursor-pointer shadow-lg border border-blue-400/20 active:scale-[0.98]"
                    >
                      🗣️ CHOOSE TRUTH
                    </button>
                    <button
                      onClick={() => handleChoose('dare')}
                      disabled={submitting}
                      className="bg-[#00e676] hover:bg-emerald-400 text-black hover:scale-105 rounded-2xl p-6 transition-all font-black text-base uppercase tracking-wider cursor-pointer shadow-lg active:scale-[0.98]"
                    >
                      🔥 CHOOSE DARE
                    </button>
                  </div>
                ) : (
                  <div className="inline-block px-6 py-3 bg-[#010806] rounded-full text-xs font-mono uppercase tracking-widest text-[#00e676] border border-emerald-500/10 animate-pulse">
                    ⚡ Selecting from Arena banks...
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. Responding State */}
            {gameData.gameState === 'responding' && (
              <motion.div
                key="responding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${gameData.selectedType === 'truth' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-black">
                    CHALLENGE TYPE: {gameData.selectedType?.toUpperCase()}
                  </span>
                </div>

                <div className="bg-black/60 rounded-3xl p-8 border border-white/5 text-center">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">Prompt</p>
                  <p className="text-xl md:text-2xl font-sans italic text-zinc-100 font-medium leading-relaxed">
                    "{gameData.currentPrompt}"
                  </p>
                </div>

                {isMyTurn ? (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block pl-1">CONFUSION / PROOF RESPONSE</label>
                    <textarea
                      value={myResponseText}
                      onChange={(e) => setMyResponseText(e.target.value)}
                      placeholder={gameData.selectedType === 'truth' ? "Write your dark, absolute truth..." : "Type proof of completion (e.g. 'Sent voice note to Tyler as requested')" }
                      className="w-full bg-[#010806] rounded-2xl border border-white/10 p-5 text-white font-mono text-sm h-36 focus:outline-none focus:border-emerald-500 transition-all resize-none outline-none"
                    />
                    <button
                      onClick={handleSubmitResponse}
                      disabled={submitting}
                      className="w-full bg-[#00e676] hover:bg-emerald-400 text-black py-4.5 rounded-full font-sans font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg"
                    >
                      SUBMIT STATEMENT →
                    </button>
                  </div>
                ) : (
                  <div className="bg-black/30 p-6 rounded-2xl border border-dashed border-white/5 text-center">
                    <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                      Waiting for @{activePlayer?.username} to complete objective...
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Verifying / Grading State */}
            {gameData.gameState === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-black">
                    REVIEW CONFESSION
                  </span>
                </div>

                <div className="bg-[#010806]/80 rounded-3xl p-6 border border-white/5 space-y-4">
                  <div>
                    <span className="text-[#00e676] font-mono text-[9px] font-black tracking-widest">Q: {gameData.currentPrompt}</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest block mb-2">@{activePlayer?.username}'s Answer:</span>
                    <p className="text-lg font-sans text-white italic pl-4 border-l-2 border-emerald-400 font-medium">
                      "{gameData.response}"
                    </p>
                  </div>
                </div>

                {!isMyTurn ? (
                  <div className="space-y-4 text-center">
                    <div className="space-y-1">
                      <h4 className="text-xl font-sans font-black uppercase text-white tracking-tight">GRADUATION BOARD</h4>
                      <p className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Are they telling the truth, or did they complete the action satisfactorily?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
                      <button
                        onClick={() => handleGrade(false)}
                        disabled={submitting}
                        className="bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white py-4 rounded-xl font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                      >
                        ❌ REJECT / COWARD
                      </button>
                      <button
                        onClick={() => handleGrade(true)}
                        disabled={submitting}
                        className="bg-[#00e676] hover:bg-emerald-400 text-black py-4 rounded-xl font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-emerald-900/10"
                      >
                        ✅ PASS (+10 RMP)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-black/40 rounded-2xl text-center border border-white/5">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider leading-relaxed">
                      Awaiting verification grading from @{opponentPlayer?.username}...
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. Ended / Completed State */}
            {gameData.gameState === 'ended' && (
              <motion.div
                key="ended"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-8"
              >
                <div className="text-7xl animate-bounce">👑</div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-sans font-black uppercase tracking-tight text-white leading-none">GAME OVER</h3>
                  <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase">Rankings have been registered in the database</p>
                </div>

                <div className="max-w-xs mx-auto space-y-3 bg-[#010806] rounded-2xl p-6 border border-emerald-500/10">
                  {players
                    .map((p: any) => ({ ...p, score: gameData.scores?.[p.userId] || 0 }))
                    .sort((a: any, b: any) => b.score - a.score)
                    .map((p: any, index: number) => (
                      <div key={p.userId} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">#{index + 1} @{p.username}</span>
                        <span className="font-mono text-xs font-black text-[#00e676]">{p.score} xp</span>
                      </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
                  <button
                    onClick={endRoomSession}
                    className="w-full bg-[#00e676] hover:bg-emerald-400 text-black py-4 rounded-full font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                  >
                    RETURN TO ARENA HUB →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quit Room Options footer */}
        {gameData.gameState !== 'ended' && (
          <div className="text-center">
            <button 
              onClick={endRoomSession}
              className="text-zinc-600 hover:text-red-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed transition-colors cursor-pointer"
            >
              ⚠️ EMERGENCY QUIT SESSION (FORFEIT SCORES)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
