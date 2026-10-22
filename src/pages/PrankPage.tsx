import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Share2, ArrowLeft, CheckCircle2, XCircle, Trophy, Camera, AlertTriangle, Link as LinkIcon, Copy, RefreshCw, Ghost } from 'lucide-react';
import { useToast } from '../components/Toast';

const PRANK_TYPES = [
  { 
    id: 'win_prize', 
    name: '🏆 Win Prank', 
    description: "You've won a prize! ... Just kidding.", 
    intensity: 'Medium', 
    defaultMessage: "CONGRATULATIONS! You've been selected as the winner of $1000!", 
    defaultReveal: "Just kidding! You didn't win anything. 😂",
    titlePlaceholder: "e.g., 'You won $1000!'",
    messagePlaceholder: "e.g., 'Click to claim your prize now!'",
    suggestions: [
      "You've won a $500 Amazon Gift Card!",
      "CONGRATULATIONS! You are our 1,000,000th visitor!",
      "You've been selected for a free iPhone 15 Pro Max!"
    ]
  },
  { 
    id: 'i_like_you', 
    name: '💕 I Like You Prank', 
    description: "Someone has a crush on you... or do they?", 
    intensity: 'Medium', 
    defaultMessage: "Hey, I've had a crush on you for a while now...", 
    defaultReveal: "PSYCH! Just a prank! 😂",
    titlePlaceholder: "e.g., 'I have a secret...'",
    messagePlaceholder: "e.g., 'I've been wanting to tell you this...'",
    suggestions: [
      "I've been thinking about you a lot lately...",
      "Can I tell you something? I really like you.",
      "I think you're the most amazing person I've met."
    ]
  },
  { 
    id: 'i_love_you', 
    name: '❤️ I Love You Prank', 
    description: "A love confession that's too good to be true.", 
    intensity: 'High', 
    defaultMessage: "I've been wanting to say this for a long time... I love you.", 
    defaultReveal: "Gotcha! It's just a prank! 😂💀",
    titlePlaceholder: "e.g., 'Important confession'",
    messagePlaceholder: "e.g., 'Please read this carefully...'",
    suggestions: [
      "I can't hide it anymore... I love you.",
      "You mean everything to me. I love you so much.",
      "I want to spend the rest of my life with you."
    ]
  },
  { 
    id: 'you_owe_me', 
    name: '💰 You Owe Me Prank', 
    description: "Make them think they owe you money.", 
    intensity: 'Medium', 
    defaultMessage: "Hey, remember that $200 you borrowed last month? Need it back ASAP.", 
    defaultReveal: "Chill! You don't owe me anything. Just a prank! 😎",
    titlePlaceholder: "e.g., 'Urgent: Payment Due'",
    messagePlaceholder: "e.g., 'Where is my money??'",
    suggestions: [
      "Hey, you still owe me for that dinner last week.",
      "Where's the $50 you promised to send me?",
      "I need that money back by tonight. No excuses."
    ]
  },
  { 
    id: 'you_failed', 
    name: '❌ You Failed Prank', 
    description: "Fake failure notification.", 
    intensity: 'High', 
    defaultMessage: "URGENT: Your exam/certification has been marked as FAILED. Please contact support.", 
    defaultReveal: "Just kidding! You passed... the prank test. 😂",
    titlePlaceholder: "e.g., 'Exam Results: FAILED'",
    messagePlaceholder: "e.g., 'Your results are in...'",
    suggestions: [
      "Your application has been REJECTED.",
      "URGENT: Your account has been SUSPENDED.",
      "Warning: Unauthorized access detected on your device."
    ]
  },
  { 
    id: 'you_are_welcomed', 
    name: '🎉 You Are Welcomed Prank', 
    description: "Fake welcome to a club/group.", 
    intensity: 'Low', 
    defaultMessage: "Congratulations! You've been accepted into the exclusive club!", 
    defaultReveal: "Welcome to the prank club! Just kidding, there's no club. 😂",
    titlePlaceholder: "e.g., 'Welcome to the Team!'",
    messagePlaceholder: "e.g., 'You're in!'",
    suggestions: [
      "Welcome to the VIP membership program!",
      "You've been invited to join our secret society.",
      "Congratulations! You're the new leader of the group."
    ]
  },
  { 
    id: 'invitation', 
    name: '📩 Invitation Prank', 
    description: "Fake party/wedding invitation.", 
    intensity: 'Low', 
    defaultMessage: "You're invited to the biggest party of the year! This Saturday at 8PM.", 
    defaultReveal: "Party's cancelled... because it was a prank! 🎭",
    titlePlaceholder: "e.g., 'Wedding Invitation'",
    messagePlaceholder: "e.g., 'You're invited!'",
    suggestions: [
      "You're invited to my surprise birthday party!",
      "Save the date! We're getting married!",
      "Join us for an exclusive networking event."
    ]
  },
  { 
    id: 'my_crush', 
    name: '💘 My Crush Prank', 
    description: "Someone has a crush on you.", 
    intensity: 'Medium', 
    defaultMessage: "My friend has a huge crush on you. They wanted me to tell you.", 
    defaultReveal: "Jokes on you! There's no crush. Just a prank! 😂",
    titlePlaceholder: "e.g., 'Someone likes you...'",
    messagePlaceholder: "e.g., 'Guess who has a crush on you?'",
    suggestions: [
      "My best friend is literally obsessed with you.",
      "Someone in our group has a secret crush on you.",
      "I know who likes you... want me to tell you?"
    ]
  },
  { 
    id: 'jump_scare', 
    name: '👻 Jump Scare', 
    description: "They click, see a creepy face.", 
    intensity: 'High', 
    defaultMessage: "SOMETHING IS WATCHING YOU...", 
    defaultReveal: "Boo! Just a prank! 👻",
    titlePlaceholder: "e.g., 'WATCH OUT'",
    messagePlaceholder: "e.g., 'Look behind you...'",
    suggestions: [
      "Don't turn around.",
      "I'm outside your window.",
      "I can see you right now."
    ]
  },
  { 
    id: 'fake_error', 
    name: '💻 Fake Error', 
    description: "Blue screen of death style.", 
    intensity: 'Low', 
    defaultMessage: "YOUR DEVICE HAS ENCOUNTERED A CRITICAL ERROR", 
    defaultReveal: "Just kidding! Your device is fine. 😂",
    titlePlaceholder: "e.g., 'System Error'",
    messagePlaceholder: "e.g., 'Critical failure detected'",
    suggestions: [
      "Windows has detected a virus on your PC.",
      "System update failed. Data loss imminent.",
      "Your battery is critically low and may explode."
    ]
  },
  { 
    id: 'custom', 
    name: '🎭 Custom Prank', 
    description: "Build your own fake scenario.", 
    intensity: 'Custom', 
    defaultMessage: "Something unexpected is happening...", 
    defaultReveal: "Just a prank! 😂",
    titlePlaceholder: "e.g., 'Something happened...'",
    messagePlaceholder: "e.g., 'You won't believe this...'",
    suggestions: [
      "I have some big news to share!",
      "You won't believe what just happened.",
      "We need to talk... it's important."
    ]
  }
];

export default function PrankPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [step, setStep] = useState<'select' | 'customize' | 'share'>('select');
  const [selectedType, setSelectedType] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [revealMessage, setRevealMessage] = useState("😂 Just kidding! You've been pranked by RoastMe!");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prankback = params.get('prankback');
    if (prankback) {
      setTitle(`Revenge on @${prankback}`);
      setRevealMessage(`😂 @${prankback}, you've been pranked back! Revenge is sweet.`);
      showToast(`Preparing revenge on @${prankback} 😈`);
    }
  }, [location.search]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image too large. Max 2MB', 'error');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file type. Allowed: JPEG, PNG, WEBP', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo) return null;
    
    setUploading(true);
    try {
      const res = await fetch('/api/prank/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo })
      });
      
      const data = await res.json();
      if (res.ok) {
        return data.photoUrl;
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
        return null;
      }
    } catch (err) {
      showToast('Network error uploading photo', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!userId) return;
    setLoading(true);
    
    let photoUrl = null;
    if (photo) {
      photoUrl = await uploadPhoto();
      if (!photoUrl && photo) {
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/prank/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prankType: selectedType.id,
          title: title || selectedType.name,
          message: message || selectedType.defaultMessage,
          revealMessage: revealMessage || selectedType.defaultReveal,
          creatorId: userId,
          creatorName: username || 'someone',
          photoUrl
        })
      });
      const data = await res.json();
      // Generate the local link correctly
      const baseUrl = 'https://games.roastme.site';
      setGeneratedLink(`${baseUrl}/prank/${data.id}`);
      setStep('share');
      showToast('Prank ready for action! 😈');
    } catch (err) {
      console.error('Failed to create prank:', err);
      showToast('Failed to create prank', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Link copied to clipboard! 📋');
  };

  return (
    <div className="flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roast
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Prank Mode</span>
          </div>
        </div>

        <section className="text-center mb-8 space-y-2">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl md:text-7xl leading-none uppercase font-display"
          >
            PRANK <span className="text-yellow-500">LAB</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            Create a link. Send to a friend. Watch them panic.
          </p>
        </section>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {PRANK_TYPES.map((prank, idx) => (
                <motion.button
                  key={prank.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => { setSelectedType(prank); setStep('customize'); }}
                  className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left flex justify-between items-center group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{prank.name.split(' ')[0]}</div>
                    <div>
                      <h3 className="text-white font-display text-lg uppercase group-hover:text-yellow-500 transition-colors">{prank.name.split(' ').slice(1).join(' ')}</h3>
                      <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">{prank.description}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1 brutal-border ${
                    prank.intensity === 'Low' ? 'bg-green-600/20 text-green-500 border-green-500/30' : 
                    prank.intensity === 'Medium' ? 'bg-yellow-600/20 text-yellow-500 border-yellow-500/30' : 
                    'bg-red-600/20 text-red-500 border-red-500/30'
                  }`}>
                    {prank.intensity}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {step === 'customize' && selectedType && (
            <motion.div 
              key="customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="brutal-border bg-gallery-white/5 p-8 space-y-6"
            >
              <h2 className="text-white font-display text-xl uppercase">Customize Your Prank</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest block">Add Photo (Optional - 24h Exp.)</label>
                  {!photo ? (
                    <div 
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="border border-dashed border-gallery-white/20 p-6 text-center cursor-pointer hover:border-yellow-500 transition-all bg-brutal-black/50"
                    >
                      <Camera className="mx-auto mb-2 text-gallery-white/40" size={24} />
                      <p className="text-gallery-white/40 font-mono text-[8px] uppercase tracking-widest">Tap to upload • Max 2MB</p>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <img src={photo} alt="Preview" className="w-24 h-24 object-cover brutal-border border-yellow-500" />
                      <button
                        onClick={() => setPhoto(null)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-none brutal-border w-6 h-6 flex items-center justify-center text-xs hover:bg-white hover:text-brutal-black transition-all"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest block">Prank Title (Preview)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={selectedType.titlePlaceholder}
                    className="w-full bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest block">Fake Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={selectedType.messagePlaceholder}
                    className="w-full bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-yellow-500 resize-none"
                    rows={3}
                  />
                  {selectedType.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedType.suggestions.map((suggestion: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setMessage(suggestion)}
                          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 bg-gallery-white/5 border border-gallery-white/10 hover:border-yellow-500 hover:text-yellow-500 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest block">Reveal Message</label>
                  <input
                    type="text"
                    value={revealMessage}
                    onChange={(e) => setRevealMessage(e.target.value)}
                    className="w-full bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={handleCreate} 
                  disabled={loading || uploading}
                  className="flex-1 bg-yellow-500 text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  {uploading ? <RefreshCw className="animate-spin" /> : loading ? <RefreshCw className="animate-spin" /> : <>Generate Prank Link →</>}
                </button>
                <button onClick={() => setStep('select')} className="px-6 bg-gallery-white/5 text-white font-mono text-[10px] uppercase tracking-widest brutal-border hover:bg-gallery-white/10 transition-all">
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 'share' && generatedLink && (
            <motion.div 
              key="share"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="brutal-border bg-green-500/10 border-green-500 p-12">
                <div className="text-6xl mb-6">😈</div>
                <h2 className="text-white text-3xl font-display uppercase mb-2">PRANK READY!</h2>
                <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest mb-8">Share this link with your victim:</p>
                
                <div className="flex gap-2 mb-8">
                  <input 
                    type="text" 
                    value={generatedLink} 
                    readOnly 
                    className="flex-1 bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none" 
                  />
                  <button onClick={copyLink} className="bg-yellow-500 text-brutal-black px-4 brutal-border hover:bg-white transition-colors">
                    <Copy size={20} />
                  </button>
                </div>
                
                <p className="text-red-500/60 font-mono text-[8px] uppercase tracking-[0.2em] mb-4">
                  ⚠️ WARNING: Photos are stored temporarily and deleted after 24 hours.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check this out! ${generatedLink}`)}`)} 
                    className="bg-green-600 text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                  >
                    WhatsApp Status
                  </button>
                  <button 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check this out! ${generatedLink}`)}`)} 
                    className="bg-brutal-black text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                  >
                    Share to X
                  </button>
                </div>
              </div>
              
              <button onClick={() => setStep('select')} className="text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors">
                Create Another Prank
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
