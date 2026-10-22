import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Send, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import MarqueeHeader from '../components/MarqueeHeader';
import Footer from '../components/Footer';

export default function AnonymousSendPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [recipient, setRecipient] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const categories = [
    { id: 'Confession 💋', label: 'Confession 💋' },
    { id: 'Roast 🔥', label: 'Roast 🔥' },
    { id: 'Compliment 💛', label: 'Compliment 💛' },
    { id: 'Advice 👁️', label: 'Advice 👁️' },
    { id: 'Secret 🤫', label: 'Secret 🤫' }
  ];

  useEffect(() => {
    const resolveLink = async () => {
      try {
        const res = await fetch(`/api/anonymous/recipient/${code}`);
        const data = await res.json();
        if (data.username) {
          setRecipient(data.username);
        } else {
          showToast('This link is invalid or expired', 'error');
          navigate('/anonymous');
        }
      } catch (err) {
        showToast('Failed to resolve link', 'error');
        navigate('/anonymous');
      } finally {
        setLoading(false);
      }
    };
    if (code) resolveLink();
  }, [code, navigate, showToast]);

  const handleSend = async () => {
    if (!category) {
      showToast('Please select a category', 'error');
      return;
    }
    if (!message.trim()) {
      showToast('Please write a message before sending', 'error');
      return;
    }
    if (message.length > 500) {
      showToast('Message too long (max 500 characters)', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/v2/anonymous/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUsername: recipient,
          linkCode: code,
          message: message.trim(),
          category
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Message sent anonymously! 👻');
        setMessage('');
        setRecipient('SENT');
      } else {
        showToast(data.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-brutal-black">
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin text-purple-500" size={48} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => navigate('/anonymous')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Ghost Message</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {recipient === 'SENT' ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 space-y-8"
            >
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto brutal-border border-green-500">
                <Ghost className="text-green-500" size={48} />
              </div>
              <h2 className="text-4xl font-display uppercase text-white">Message Sent!</h2>
              <p className="text-gallery-white/60 font-mono text-sm max-w-md mx-auto">
                Your message has been delivered anonymously. They'll never know it was you.
              </p>
              
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-purple-600 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  📝 Send Another Message
                </button>
                <button 
                  onClick={() => navigate('/prank')}
                  className="w-full bg-gallery-white/10 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  🎭 Create a Prank
                </button>
                <button 
                  onClick={() => navigate('/truthordare')}
                  className="w-full bg-gallery-white/10 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  🎲 Try Truth or Dare
                </button>
                <button 
                  onClick={() => navigate('/friendship')}
                  className="w-full bg-gallery-white/10 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  🤝 Friendship Challenge
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors pt-4"
                >
                  Back to RoastMe →
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl md:text-6xl font-display uppercase text-white">
                  Send to <span className="text-purple-500">@{recipient}</span>
                </h1>
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">
                  Your identity is 100% anonymous.
                </p>
              </div>

              <div className="brutal-border bg-gallery-white/5 p-8">
                <div className="mb-6">
                  <p className="text-gallery-white/60 font-mono text-[10px] uppercase tracking-widest mb-3">Select Category (Required)</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={cn(
                          "px-4 py-2 border font-mono text-xs uppercase transition-colors whitespace-nowrap",
                          category === c.id 
                            ? "bg-purple-500 text-gallery-white border-purple-500" 
                            : "bg-transparent text-gallery-white/60 border-gallery-white/20 hover:border-purple-500/50"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind? Be honest, be brutal, be kind."
                  className="w-full bg-brutal-black border border-gallery-white/20 p-6 text-gallery-white font-mono text-sm focus:outline-none focus:border-purple-500 min-h-[250px] resize-none"
                />
                
                <div className="mt-8">
                  <button 
                    onClick={handleSend} 
                    disabled={sending}
                    className="w-full bg-purple-600 text-white py-5 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all flex items-center justify-center gap-3 text-lg"
                  >
                    {sending ? <RefreshCw className="animate-spin" /> : <>Send Anonymously <Send size={20} /></>}
                  </button>
                </div>
              </div>

              <div className="bg-gallery-white/5 p-6 brutal-border border-gallery-white/10 text-center">
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mb-4">🔒 Safe & Secure</p>
                <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest">
                  We do not store your IP or any identifying information. This message is encrypted and delivered privately.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
