import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { fetchWithAuth } from '../utils/apiUtils';
import RoomLobby from '../components/games/RoomLobby';
import { Swords, Users, Shield, Zap, Search, DoorOpen, Globe, Flame, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";

export default function TruthOrDarePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [mode, setMode] = useState<'solo' | 'friend' | 'matchmaking' | null>(null);
  const [currentDare, setCurrentDare] = useState<any>(null);
  const [activeDares, setActiveDares] = useState<any[]>([]);
  const [combo, setCombo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showLobby, setShowLobby] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) {
        try {
          const cred = await signInAnonymously(auth);
          setCurrentUser(cred.user);
          loadActiveDares();
          loadCombo();
        } catch (e) {
          console.warn("TOD guest auth notice:", e);
        }
      } else {
        setCurrentUser(user);
        loadActiveDares();
        loadCombo();
      }
    });
    return () => unsub();
  }, []);

  const loadActiveDares = async () => {
    try {
      const res = await fetchWithAuth('/api/truthordare/dare/active');
      if (res.ok) {
        const data = await res.json();
        setActiveDares(data.dares || []);
      }
    } catch(e) {}
  };

  const loadCombo = async () => {
    try {
      const res = await fetchWithAuth('/api/truthordare/combo');
      if (res.ok) {
        const data = await res.json();
        setCombo(data);
      }
    } catch(e) {}
  };

  const playSolo = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const res = await fetchWithAuth('/api/truthordare/dare/generate', { method: 'POST' });
      const dare = await res.json();
      setCurrentDare(dare);
      setMode('solo');
    } catch(e) {
      console.warn("Play solo error:", e);
    } finally {
      setLoading(false);
    }
  };

  const acceptDare = () => {
    if (currentDare) {
      navigate(currentDare.redirectUrl);
    }
  };

  const createRoomForTOD = async () => {
    setLoading(true);
    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
        setCurrentUser(user);
      }
      const idToken = await user.getIdToken();
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ gameType: 'truth_dare', maxPlayers: 2 })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCode(data.roomCode);
        setShowLobby(true);
      } else {
        setMessage(data.error || 'Failed to create room');
      }
    } catch (err) {
      setMessage('Error creating room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoomByCode = async () => {
    if (joinCode.length < 6) return setMessage('Enter a valid 6-char code');
    setLoading(true);
    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
        setCurrentUser(user);
      }
      const idToken = await user.getIdToken();
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ roomCode: joinCode })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCode(joinCode);
        setShowLobby(true);
      } else {
        setMessage(data.error || 'Failed to join');
      }
    } catch (err) {
      setMessage('Error joining room');
    } finally {
      setLoading(false);
    }
  };

  const startMatchmaking = async () => {
    setMode('matchmaking');
    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
        setCurrentUser(user);
      }
      const idToken = await user.getIdToken();
      const res = await fetch('/api/room/matchmake', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ gameType: 'truth_dare' })
      });
      const data = await res.json();
      if (data.status === 'matched') {
        setRoomCode(data.roomCode);
        setShowLobby(true);
      }
    } catch (err) {}
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎲</div>
          <h1 className="text-xl text-white font-mono uppercase tracking-widest font-black mb-2">Connecting to Arena...</h1>
          <p className="text-neon-green text-xs font-mono animate-pulse">Establishing game session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto pt-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🎲 Truth or Dare</h1>
          <p className="text-gray-400">Traceable dares. Real rewards. Prove it.</p>
          {combo && combo.currentCombo > 0 && (
            <div className="inline-block mt-2 bg-gradient-to-r from-orange-600 to-red-600 px-4 py-1 rounded-full border border-red-500">
              <span className="text-white text-sm font-bold">🔥 {combo.currentCombo} COMBO! {combo.comboBonus}x multiplier</span>
            </div>
          )}
        </div>

        {/* Active Dares Section */}
        {showLobby && roomCode ? (
          <RoomLobby 
            roomCode={roomCode} 
            onGameStart={(data) => {
              // Redirect or Start game logic
              navigate(`/truthordare/room/${roomCode}`);
            }} 
            onLeave={() => {
              setShowLobby(false);
              setRoomCode(null);
              setMode(null);
            }} 
          />
        ) : mode === 'matchmaking' ? (
          <div className="bg-gray-800/50 rounded-2xl p-12 text-center border border-purple-500/30">
            <div className="flex justify-center mb-6">
              <RefreshCw className="w-12 h-12 text-purple-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Searching for Opponents</h2>
            <p className="text-gray-400 mb-8 font-medium italic">Finding a worthy challenger in the global queue...</p>
            <button 
              onClick={() => setMode(null)}
              className="bg-gray-900 border border-white/10 text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all uppercase tracking-widest text-xs"
            >
              Cancel Search
            </button>
          </div>
        ) : (
          <>
            {activeDares.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-bold mb-3">📋 Active Dares</h2>
            <div className="space-y-2">
              {activeDares.map((dare: any) => (
                <div key={dare.id} className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30 flex justify-between items-start items-center">
                  <div>
                    <p className="text-white">{dare.description}</p>
                    <p className="text-gray-500 text-xs mt-1">Expires: {new Date(dare.timeLimit).toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => navigate(dare.redirectUrl)} className="bg-purple-600 px-3 py-1.5 rounded-lg text-sm text-white font-medium hover:bg-purple-700 transition">Go →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode Selection */}
        {!mode && (
          <div className="grid gap-4">
            <button onClick={playSolo} disabled={loading} className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-2xl text-left hover:scale-[1.02] transition">
              <div className="text-3xl mb-2">🎮</div>
              <div className="text-white font-bold text-lg">Play Solo</div>
              <div className="text-gray-200 text-sm">Complete traceable dares. Earn RMP. Build combos.</div>
            </button>
            
            <button onClick={() => setMode('friend')} className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl text-left hover:scale-[1.02] transition shadow-lg shadow-purple-900/20 group">
              <div className="text-3xl mb-2 flex justify-between items-center">
                <span>👥</span>
                <Users className="w-5 h-5 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-white font-black text-lg uppercase tracking-tight">Challenge a Friend</div>
              <div className="text-gray-200 text-sm font-medium opacity-80 italic">Create a room and invite someone directly.</div>
            </button>

            <button onClick={startMatchmaking} className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-left hover:scale-[1.02] transition shadow-lg shadow-indigo-900/20 group">
              <div className="text-3xl mb-2 flex justify-between items-center">
                <span>🌍</span>
                <Globe className="w-5 h-5 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-white font-black text-lg uppercase tracking-tight">Matchmaking</div>
              <div className="text-gray-200 text-sm font-medium opacity-80 italic">Find random opponents in the global queue.</div>
            </button>
            
            <button onClick={() => navigate('/truthordare/inbox')} className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl text-left hover:scale-[1.02] transition border border-white/10 group">
              <div className="text-3xl mb-2 flex justify-between items-center">
                <span>📥</span>
                <DoorOpen className="w-5 h-5 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-white font-black text-lg uppercase tracking-tight">Inbox</div>
              <div className="text-gray-400 text-sm font-medium opacity-80 italic">Manage your active challenges and room invites.</div>
            </button>
          </div>
        )}

        {/* Info or Message */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest ${
              message.includes('Error') || message.includes('Failed') ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-green-500/20 text-green-400 border border-green-500/20'
            }`}
          >
            {message}
          </motion.div>
        )}

        {/* Solo Mode - Dare Display */}
        {mode === 'solo' && currentDare && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-center border border-white/10 shadow-3xl">
            <div className="text-6xl mb-6">⚡</div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Your Dare</h2>
            <p className="text-white text-xl italic font-serif mb-8 leading-relaxed">"{currentDare.description}"</p>
            <div className="flex justify-center gap-6 mb-8">
              <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                <Flame className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-black text-sm tracking-widest">+{currentDare.rewardRMP} RMP</span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
                <RefreshCw className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-black text-sm tracking-widest uppercase">{Math.ceil((new Date(currentDare.timeLimit).getTime() - Date.now()) / 60000)}m left</span>
              </div>
            </div>
            <div className="grid gap-3">
              <button 
                onClick={acceptDare} 
                className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-900/40 uppercase tracking-widest"
              >
                Accept Challenge →
              </button>
              <button 
                onClick={() => { setMode(null); setCurrentDare(null); loadActiveDares(); }} 
                className="w-full bg-white/5 text-gray-400 font-bold py-4 rounded-2xl transition-all hover:bg-white/10 uppercase tracking-widest text-xs"
              >
                Skip This Dare
              </button>
            </div>
          </div>
        )}

        {/* Friend Mode */}
        {mode === 'friend' && !showLobby && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-3xl p-8 border border-white/10 backdrop-blur-md">
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Challenge a Friend</h2>
              <p className="text-gray-400 mb-8 font-medium italic">Create a private room or enter a code to join one.</p>
              
              <div className="grid gap-6">
                <div>
                  <button 
                    onClick={createRoomForTOD} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-purple-900/40 flex items-center justify-center gap-3 group uppercase tracking-widest"
                  >
                    <Zap className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                    {loading ? 'Creating...' : 'Create Private Room'}
                  </button>
                </div>
                
                <div className="relative flex items-center">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="px-4 text-xs font-black text-gray-600 uppercase tracking-widest italic">Or Join Existing</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ENTER ROOM CODE"
                      className="w-full bg-black/40 rounded-2xl pl-12 pr-4 py-5 text-white font-black font-mono placeholder:text-gray-700 outline-none border border-white/10 focus:border-purple-500 transition-all uppercase tracking-widest"
                    />
                  </div>
                  <button 
                    onClick={joinRoomByCode} 
                    disabled={loading || joinCode.length < 6}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 rounded-2xl font-black transition-all disabled:opacity-30 uppercase tracking-widest text-sm"
                  >
                    {loading ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setMode(null)} 
                className="w-full mt-10 text-gray-500 hover:text-white font-bold transition-all text-xs uppercase tracking-widest"
              >
                Back to Selection
              </button>
            </div>
          </div>
        )}
      </>
      )}
      </div>
    </div>
  );
}
