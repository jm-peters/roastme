// src/components/TruthOrDareInbox.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, AlertCircle, Clock, Send, Mail, Inbox } from 'lucide-react';
import { fetchWithAuth } from '../utils/apiUtils';
import { soundManager } from '../utils/soundManager';

interface TruthOrDareInboxProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

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

export default function TruthOrDareInbox({ isOpen, onClose, username }: TruthOrDareInboxProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && username) {
      fetchMessages();
    }
  }, [isOpen, username]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/truthordare/inbox');
      const data = await res.json();
      const allMessages = data.conversations?.flatMap((c: any) => c.messages) || [];
      // Filter for messages sent TO the user that are still pending
      const pendingMessages = allMessages.filter((m: Message) => 
        m.toName.toLowerCase() === username.toLowerCase() && m.status === 'pending'
      );
      setMessages(pendingMessages);
    } catch (err) {
      console.error('Failed to fetch pending messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!response.trim() || !selectedMessage) return;
    setSubmitting(true);
    try {
      await fetchWithAuth('/api/truthordare/respond', {
        method: 'POST',
        body: JSON.stringify({ messageId: selectedMessage.id, response })
      });
      setResponse('');
      setSelectedMessage(null);
      soundManager.playAttassa('soft');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brutal-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-zinc-900 border-2 border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-green/20 rounded-xl flex items-center justify-center text-neon-green">
                <Inbox size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Challenges</h2>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Truth or Dare Inbox</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-mono text-[10px] uppercase text-gray-500">Decrypting messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail size={40} className="text-gray-700" />
                </div>
                <h3 className="text-white font-bold mb-1">Inbox Empty</h3>
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">No pending challenges. You're safe... for now.</p>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/truthordare');
                  }}
                  className="mt-8 text-neon-green font-mono text-[10px] uppercase tracking-widest hover:underline"
                >
                  Send a challenge instead →
                </button>
              </div>
            ) : selectedMessage ? (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <button 
                  onClick={() => setSelectedMessage(null)} 
                  className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-6 hover:text-white transition-colors"
                >
                  ← Back to inbox
                </button>
                
                <div className={`p-6 rounded-2xl border-2 mb-6 ${
                  selectedMessage.challengeType === 'truth' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-red-600/10 border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    {selectedMessage.challengeType === 'truth' ? <MessageSquare size={16} /> : <AlertCircle size={16} />}
                    <span className="font-black uppercase tracking-widest text-xs">
                      {selectedMessage.challengeType === 'truth' ? 'TRUTH' : 'DARE'} FROM @{selectedMessage.fromName}
                    </span>
                  </div>
                  <p className="text-white text-xl font-display italic leading-snug">"{selectedMessage.challengeText}"</p>
                </div>
                
                <div className="space-y-4">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={selectedMessage.challengeType === 'truth' ? "Write your honest truth..." : "How did you complete this dare?"}
                    className="w-full bg-brutal-black border border-white/10 rounded-2xl p-4 text-white text-sm resize-none h-32 focus:border-neon-green outline-none transition-colors"
                  />
                  <button
                    onClick={sendResponse}
                    disabled={submitting || !response.trim()}
                    className="w-full bg-neon-green text-brutal-black font-black py-4 rounded-xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs"
                  >
                    {submitting ? 'SENDING...' : 'Submit Response'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.button
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-5 text-left transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${
                          msg.challengeType === 'truth' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-500'
                        }`}>
                          {msg.challengeType === 'truth' ? <MessageSquare size={14} /> : <AlertCircle size={14} />}
                        </span>
                        <span className="text-white font-bold text-sm">@{msg.fromName}</span>
                      </div>
                      <span className="text-[8px] font-mono text-gray-600 uppercase flex items-center gap-1">
                        <Clock size={8} /> {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs italic line-clamp-2 mb-3">"{msg.challengeText}"</p>
                    <div className="text-neon-green font-mono text-[8px] uppercase tracking-widest group-hover:underline">Respond Now →</div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-zinc-800/30 border-t border-white/5 text-center">
            <button 
              onClick={() => {
                onClose();
                navigate('/truthordare/inbox');
              }} 
              className="text-[10px] font-mono text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              View Conversation History
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
