import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50"
        >
          <div className="bg-brutal-black brutal-border p-6 shadow-[8px_8px_0px_0px_rgba(0,255,0,0.3)]">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-neon-green/20 brutal-border border-neon-green">
                <Shield className="w-6 h-6 text-neon-green" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display uppercase leading-tight">Cookie Consent</h3>
                <p className="text-xs font-mono text-gallery-white/60 mt-1">
                  We use cookies to improve your experience and analyze traffic. By continuing, you agree to our use of cookies.
                </p>
              </div>
              <button onClick={() => setIsVisible(false)} className="text-gallery-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleAccept}
                className="flex-1 bg-neon-green text-brutal-black font-bold py-2 text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform"
              >
                Accept All
              </button>
              <button 
                onClick={handleDecline}
                className="flex-1 bg-gallery-white/10 text-gallery-white font-bold py-2 text-xs uppercase tracking-widest hover:bg-gallery-white/20 transition-colors"
              >
                Decline
              </button>
            </div>
            <div className="mt-3 text-center">
              <a href="/privacy" className="text-[10px] font-mono text-gallery-white/40 hover:text-neon-green underline uppercase tracking-widest">
                Read Privacy Policy
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
