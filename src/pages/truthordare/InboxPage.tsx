// src/pages/truthordare/InboxPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, MessageCircle, Send, ChevronRight, User, AlertCircle, Clock } from 'lucide-react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { fetchWithAuth } from '../../utils/apiUtils';
import { auth } from '../../firebase';

interface Message {
  id: string;
  fromName: string;
  toName: string;
  challengeType: string;
  challengeText: string;
  response: string | null;
  status: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  user1Name: string;
  user1Id: string;
  user2Name: string;
  user2Id: string;
  lastMessageAt: string;
  messages: Message[];
}

export default function TruthOrDareInbox() {
  const navigate = useNavigate();
  const { messages: realtimeMessages } = useRealtimeNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [newChallenge, setNewChallenge] = useState({ type: 'dare', text: '' });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => setCurrentUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchInbox();
    }
  }, [currentUser, realtimeMessages]);

  const fetchInbox = async () => {
    try {
      const res = await fetchWithAuth('/api/truthordare/inbox');
      const data = await res.json();
      setConversations(data.conversations || []);
      
      // Update selected conversation if it's open
      if (selectedConv) {
        const updated = (data.conversations || []).find((c: any) => c.id === selectedConv.id);
        if (updated) setSelectedConv(updated);
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    }
  };

  const sendResponse = async (messageId: string) => {
    if (!responseMsg.trim()) return;
    setLoading(true);
    try {
      await fetchWithAuth('/api/truthordare/respond', {
        method: 'POST',
        body: JSON.stringify({ messageId, response: responseMsg })
      });
      setResponseMsg('');
      fetchInbox();
    } catch (err) {
      console.error('Failed to send response:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendChallenge = async (toUsername: string) => {
    if (!newChallenge.text.trim()) return;
    setSending(true);
    try {
      await fetchWithAuth('/api/truthordare/send-challenge', {
        method: 'POST',
        body: JSON.stringify({
          toUsername,
          challengeType: newChallenge.type,
          challengeText: newChallenge.text
        })
      });
      setNewChallenge({ type: 'dare', text: '' });
      fetchInbox();
    } catch (err) {
      console.error('Failed to send challenge:', err);
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-gray-900 brutal-border p-12 rounded-3xl border-white/10"
        >
          <div className="text-8xl mb-6">📬</div>
          <h1 className="text-3xl text-white font-black mb-4 uppercase tracking-tighter">Login Required</h1>
          <p className="text-gray-400 mb-8 max-w-xs mx-auto">Please login to access your safe and keep track of your dares.</p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-white text-brutal-black font-black px-12 py-4 rounded-xl hover:bg-neon-green transition-colors uppercase tracking-widest"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  const currentUsername = localStorage.getItem('username') || 'me';

  return (
    <div className="min-h-screen bg-brutal-black py-8 px-4 font-sans text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-neon-green rounded-2xl flex items-center justify-center text-brutal-black">
              <Mail size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Inbox</h1>
              <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.2em]">Truth or Dare Central</p>
            </div>
          </div>

          {realtimeMessages.length > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neon-green text-brutal-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest animate-pulse"
            >
              ✨ {realtimeMessages.length} NEW MESSAGES
            </motion.div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
          {/* Conversations List */}
          <div className="lg:col-span-4 bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex flex-col">
            <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h2 className="font-black uppercase tracking-widest text-sm">Chats</h2>
              <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-1 rounded font-mono">{conversations.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-mono text-xs uppercase tracking-widest">No challenges yet.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const otherUser = conv.user1Name === currentUsername ? conv.user2Name : conv.user1Name;
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const hasUnread = conv.messages.some(m => m.toName === currentUsername && m.status === 'pending');
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className={`w-full p-6 text-left border-b border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 group ${
                        selectedConv?.id === conv.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                        hasUnread ? 'bg-neon-green text-brutal-black' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {otherUser?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-white group-hover:text-neon-green transition-colors">@{otherUser}</span>
                          <span className="text-[10px] text-gray-600 font-mono">
                            {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm truncate font-mono">
                          {lastMsg?.challengeText || 'No messages'}
                        </p>
                      </div>
                      <ChevronRight size={16} className={`transition-transform ${selectedConv?.id === conv.id ? 'rotate-90 text-neon-green' : 'text-gray-700'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex flex-col relative">
            {selectedConv ? (
              <>
                <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-neon-green/20 rounded-xl flex items-center justify-center text-neon-green">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-white uppercase tracking-widest text-sm">
                        @{selectedConv.user1Name === currentUsername ? selectedConv.user2Name : selectedConv.user1Name}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-mono uppercase">Direct Challenge Channel</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-brutal-black/40">
                  {selectedConv.messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.fromName === currentUsername ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-3xl p-6 relative group ${
                        msg.fromName === currentUsername 
                          ? 'bg-white text-brutal-black font-bold' 
                          : 'bg-gray-800 text-gray-200 border border-white/5'
                      }`}>
                        <div className={`text-[10px] uppercase font-black tracking-widest mb-2 opacity-50 flex items-center gap-2 ${
                           msg.fromName === currentUsername ? 'text-gray-600' : 'text-neon-green'
                        }`}>
                          {msg.challengeType === 'truth' ? <MessageCircle size={10} /> : <AlertCircle size={10} />}
                          {msg.challengeType === 'truth' ? 'TRUTH' : 'DARE'}
                        </div>
                        <p className="text-base leading-relaxed">{msg.challengeText}</p>
                        
                        {msg.response && (
                          <div className={`mt-4 pt-4 border-t ${msg.fromName === currentUsername ? 'border-black/10' : 'border-white/10'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Response</span>
                            <p className="text-sm italic italic opacity-90">"{msg.response}"</p>
                          </div>
                        )}
                        
                        {!msg.response && msg.toName === currentUsername && msg.status === 'pending' && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <textarea
                              value={responseMsg}
                              onChange={(e) => setResponseMsg(e.target.value)}
                              placeholder="Your honest answer or proof..."
                              className="w-full bg-brutal-black rounded-2xl p-4 text-sm text-white border border-white/20 focus:border-neon-green transition-colors resize-none mb-3"
                              rows={3}
                            />
                            <button
                              onClick={() => sendResponse(msg.id)}
                              disabled={loading}
                              className="w-full bg-neon-green text-brutal-black font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                              {loading ? 'SENDING...' : <><Send size={14} /> Send Response</>}
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-gray-600 uppercase font-mono mt-2 flex items-center gap-1">
                        <Clock size={8} /> {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="h-4" /> {/* Spacer */}
                </div>

                {/* Send New Challenge Input Bar */}
                <div className="p-6 border-t border-white/10 bg-white/5">
                  <div className="flex gap-4">
                    <select
                      value={newChallenge.type}
                      onChange={(e) => setNewChallenge({ ...newChallenge, type: e.target.value })}
                      className="bg-gray-800 text-white rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-widest border border-white/10 outline-none focus:border-neon-green"
                    >
                      <option value="truth">TRUTH</option>
                      <option value="dare">DARE</option>
                    </select>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newChallenge.text}
                        onChange={(e) => setNewChallenge({ ...newChallenge, text: e.target.value })}
                        placeholder="Type a brutal challenge..."
                        className="w-full bg-gray-800 rounded-2xl px-6 py-4 text-white border border-white/10 outline-none focus:border-neon-green"
                      />
                    </div>
                    <button
                      onClick={() => sendChallenge(selectedConv.user1Name === currentUsername ? selectedConv.user2Name : selectedConv.user1Name)}
                      disabled={sending}
                      className="bg-white text-brutal-black font-black px-8 rounded-2xl hover:bg-neon-green transition-all"
                    >
                      {sending ? '...' : <Send size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Mail size={40} className="opacity-20" />
                </div>
                <h3 className="text-white font-black text-xl uppercase tracking-widest mb-2">Select a Conversation</h3>
                <p className="max-w-xs font-mono text-xs uppercase tracking-widest">Pick a victim from the sidebar to start the chaos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
