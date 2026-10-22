import { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { Copy, Check, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface RoomLobbyProps {
  roomCode: string;
  onGameStart: (gameData: any) => void;
  onLeave: () => void;
}

export default function RoomLobby({ roomCode, onGameStart, onLeave }: RoomLobbyProps) {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/room/${roomCode}/status`);
        if (!res.ok) throw new Error('Room not found');
        const data = await res.json();
        setRoom(data);
        setPlayers(data.players || []);
        
        if (auth.currentUser) {
          const self = data.players?.find((p: any) => p.userId === auth.currentUser?.uid);
          if (self?.ready) setIsReady(true);
        }

        if (data.status === 'active') {
          onGameStart(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [roomCode, onGameStart]);

  const toggleReady = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch('/api/room/ready', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ roomCode })
      });
      setIsReady(true);
    } catch (err) {
      console.error(err);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !room) return <div className="text-white text-center p-12">Loading lobby...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-center border border-gray-700 shadow-2xl max-w-md mx-auto"
    >
      <div className="flex justify-center mb-6">
        <div className="bg-purple-500/20 p-4 rounded-full">
          <Users className="w-10 h-10 text-purple-400" />
        </div>
      </div>

      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">
        Game Lobby
      </h2>
      <p className="text-gray-400 mb-6 font-medium">
        Invite your friends to join the challenge!
      </p>

      <div className="bg-black/30 rounded-2xl p-4 mb-8 border border-white/5 flex items-center justify-between">
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Room Code</p>
          <p className="text-2xl font-mono font-black text-purple-400 tracking-tight">{roomCode}</p>
        </div>
        <button 
          onClick={copyInviteLink}
          className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all active:scale-95 text-white shadow-lg shadow-purple-900/20"
        >
          {copied ? <Check className="w-5 h-5 text-green-300" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="space-y-3 mb-8">
        <div className="text-left text-xs text-gray-500 uppercase font-bold tracking-widest px-2 mb-2">
          Players ({players.length}/{room?.maxPlayers || 2})
        </div>
        {players.map((p, idx) => (
          <div key={idx} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${p.userId === auth.currentUser?.uid ? 'bg-purple-600' : 'bg-gray-700'}`}>
              {p.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold">@{p.username}</p>
              {p.userId === room?.hostId && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Host</span>}
            </div>
            {p.ready ? (
              <div className="flex items-center gap-1 text-green-400 font-bold text-sm">
                <Check className="w-4 h-4" /> Ready
              </div>
            ) : (
              <div className="text-gray-500 font-bold text-sm italic text-right">Waiting...</div>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, (room?.maxPlayers || 2) - players.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-4 bg-white/[0.02] p-3 rounded-2xl border border-dashed border-white/10 opacity-50">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-gray-700 font-bold">
              ?
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-700 font-bold italic">Open Spot</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col gap-3">
        {players.find(p => p.userId === auth.currentUser?.uid)?.ready ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 fill-current animate-pulse" /> Waiting for players...
          </div>
        ) : (
          <button 
            onClick={toggleReady} 
            disabled={players.length < 2 && room?.gameType !== 'friendship'}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
              players.length < 2 && room?.gameType !== 'friendship'
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-500 hover:-translate-y-1 active:translate-y-0 text-white shadow-purple-900/40 font-black'
            }`}
          >
            I'M READY TO PLAY!
          </button>
        )}
        
        <button 
          onClick={onLeave}
          className="text-gray-500 hover:text-white font-bold transition-colors text-sm py-2"
        >
          Leave Room
        </button>
      </div>
    </motion.div>
  );
}
