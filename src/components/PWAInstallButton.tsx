import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export default function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 bg-neon-green text-brutal-black px-3 py-1.5 text-xs font-mono font-black uppercase tracking-widest hover:bg-white transition-all shadow-[2px_2px_0px_#fff]"
      >
        <Download size={14} /> Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 bg-neon-green/20 text-neon-green border border-neon-green/40 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest hover:bg-neon-green/30 transition-all"
        >
          <Download size={14} /> Install
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm bg-brutal-black border-2 border-neon-green p-6 shadow-[8px_8px_0px_rgba(0,255,0,0.3)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-neon-green font-display text-lg uppercase">Install on iOS</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-neon-green/50 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <p className="text-gallery-white font-mono text-xs leading-relaxed uppercase mb-6">
                1. Tap the <strong className="text-neon-green">Share</strong> button in Safari toolbar.<br /><br />
                2. Scroll down and tap <strong className="text-neon-green">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-neon-green text-brutal-black py-3 font-mono text-xs font-black uppercase tracking-widest hover:bg-white transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
