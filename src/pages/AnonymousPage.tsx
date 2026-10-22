import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Share2, Copy, ArrowLeft, RefreshCw, MessageSquare, Inbox, Send } from 'lucide-react';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import MarqueeHeader from '../components/MarqueeHeader';
import Footer from '../components/Footer';

export default function AnonymousPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'create' | 'inbox'>('create');
  const [username, setUsername] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inboxUsername, setInboxUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const generateLink = async () => {
    if (!username.trim()) {
      showToast('Please enter a username', 'error');
      return;
    }
    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/anonymous/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedLink(`https://roastme.site/anonymous/send/${data.linkCode}`);
        showToast('Anonymous link generated! 👻');
      } else {
        showToast(data.error || 'Failed to generate link', 'error');
      }
    } catch (err) {
      showToast('Failed to generate link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!inboxUsername.trim()) {
      showToast('Please enter your username', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/anonymous/messages/${inboxUsername.trim()}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        if (data.messages.length === 0) {
          showToast('No messages found for this username', 'info');
        }
      } else {
        showToast(data.error || 'Failed to fetch messages', 'error');
      }
    } catch (err) {
      showToast('Failed to fetch messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (msgId: string, reaction: string) => {
    try {
      const res = await fetch('/api/v2/anonymous/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: inboxUsername.trim(), msgId, reaction })
      });
      if (res.ok) {
        setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, reaction } : m));
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to react', 'error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Link copied to clipboard! 📋');
  };

  return (
    <div className="flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => navigate('/')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roast
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Ghost Mode</span>
          </div>
        </div>

        <section className="text-center mb-12 space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl md:text-7xl leading-none uppercase font-display"
          >
            GHOST <span className="text-purple-500">BOX</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            Receive honest feedback — no names attached.
          </p>
        </section>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-12 bg-gallery-white/5 p-1 brutal-border">
          <button 
            onClick={() => setMode('create')} 
            className={`flex-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-all ${mode === 'create' ? 'bg-purple-600 text-white' : 'text-gallery-white/40 hover:text-white'}`}
          >
            📤 Create My Link
          </button>
          <button 
            onClick={() => setMode('inbox')} 
            className={`flex-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-all ${mode === 'inbox' ? 'bg-purple-600 text-white' : 'text-gallery-white/40 hover:text-white'}`}
          >
            📥 Check My Inbox
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="brutal-border bg-gallery-white/5 p-8">
                <h2 className="text-white font-display text-xl uppercase mb-2">Get Your Anonymous Link</h2>
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mb-8">Choose a username for your inbox (no login required)</p>
                
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., john_doe"
                    className="flex-1 bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={generateLink} 
                    disabled={loading}
                    className="bg-purple-600 text-white px-8 py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="animate-spin" /> : 'Generate →'}
                  </button>
                </div>
                <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest">Only letters, numbers, underscores allowed. No spaces.</p>
              </div>

              {generatedLink && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="brutal-border bg-green-500/10 border-green-500 p-8"
                >
                  <h3 className="text-white font-display text-lg uppercase mb-4">Your Link is Ready!</h3>
                  <div className="flex gap-2 mb-8">
                    <input type="text" value={generatedLink} readOnly className="flex-1 bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-xs" />
                    <button onClick={copyLink} className="bg-neon-green text-brutal-black p-3 brutal-border hover:bg-white transition-colors">
                      <Copy size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-green-500/30">
                    <button 
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Send me an anonymous message: ${generatedLink}`)}`)} 
                      className="bg-green-600 text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      WhatsApp Status 📱
                    </button>
                    <button 
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Send me an anonymous message: ${generatedLink}`)}`)} 
                      className="bg-brutal-black text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      Share to X 📤
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="bg-gallery-white/5 p-6 brutal-border border-gallery-white/10">
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mb-4">📤 Share these templates:</p>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      const text = `I'm opening up to anonymous messages. Say what you really think: ${generatedLink || 'https://roastme.site/anonymous'}`;
                      navigator.clipboard.writeText(text);
                      showToast('Template copied!');
                    }}
                    className="w-full bg-brutal-black p-4 text-left text-gallery-white/60 font-mono text-[10px] uppercase tracking-widest hover:text-white hover:bg-gallery-white/5 transition-all brutal-border border-gallery-white/10"
                  >
                    "I'm opening up to anonymous messages. Say what you really think: [link]"
                  </button>
                  <button 
                    onClick={() => {
                      const text = `Send me an anonymous message — no names, no judgment. ${generatedLink || 'https://roastme.site/anonymous'}`;
                      navigator.clipboard.writeText(text);
                      showToast('Template copied!');
                    }}
                    className="w-full bg-brutal-black p-4 text-left text-gallery-white/60 font-mono text-[10px] uppercase tracking-widest hover:text-white hover:bg-gallery-white/5 transition-all brutal-border border-gallery-white/10"
                  >
                    "Send me an anonymous message — no names, no judgment. [link]"
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'inbox' && (
            <motion.div 
              key="inbox"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="brutal-border bg-gallery-white/5 p-8">
                <h2 className="text-white font-display text-xl uppercase mb-2">Check Your Inbox</h2>
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mb-8">Enter the username you used to create your link</p>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    value={inboxUsername}
                    onChange={(e) => setInboxUsername(e.target.value)}
                    placeholder="Your username"
                    className="flex-1 bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={fetchMessages} 
                    disabled={loading}
                    className="bg-purple-600 text-white px-8 py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="animate-spin" /> : 'View Messages →'}
                  </button>
                </div>
              </div>

              {messages.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-white font-display text-lg uppercase flex items-center gap-2">
                    <Inbox className="text-purple-500" /> Received Messages ({messages.length})
                  </h3>
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gallery-white/5 brutal-border p-6 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-purple-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <Ghost size={12} /> Anonymous • {msg.category || "Message"}
                        </span>
                        <span className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white font-mono text-sm leading-relaxed">{msg.message || msg.content}</p>
                      
                      {/* React UI */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gallery-white/10">
                        <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">React:</span>
                        {['👍', '🔥', '😂', '😲'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className={cn(
                              "text-xl hover:scale-125 transition-transform",
                              msg.reaction === emoji ? "opacity-100 ring-2 ring-purple-500 rounded-full" : "opacity-50"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : inboxUsername && !loading && (
                <div className="text-center py-20 bg-gallery-white/5 brutal-border border-gallery-white/10">
                  <div className="text-6xl mb-4 opacity-20">📭</div>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">No messages yet. Share your link to get started!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
