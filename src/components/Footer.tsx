import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Instagram, Github, Terminal } from 'lucide-react';
import AdBanner from './AdBanner';
import GitHubGuideModal from './GitHubGuideModal';

export default function Footer() {
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  return (
    <>
      <footer className="w-full border-t-2 border-gallery-white/10 py-16 px-6 mt-auto bg-brutal-black">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 w-full">
             <AdBanner type="native" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-6">
              <Link to="/" className="font-display text-4xl uppercase group">
                ROAST<span className="text-neon-green group-hover:text-white transition-colors">ME</span>
              </Link>
              <p className="text-gallery-white/40 font-mono text-xs leading-relaxed uppercase tracking-widest">
                The internet's most savage roasting platform. 
                Zero filters. Pure fire. 🔥
              </p>
              <div className="flex gap-4 items-center flex-wrap">
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 brutal-border bg-gallery-white/5 hover:bg-neon-green hover:text-brutal-black transition-all">
                  <Twitter size={18} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2 brutal-border bg-gallery-white/5 hover:bg-neon-green hover:text-brutal-black transition-all">
                  <Instagram size={18} />
                </a>
                <button 
                  onClick={() => setIsGitHubModalOpen(true)}
                  className="px-3 py-2 brutal-border bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-brutal-black font-mono text-xs uppercase flex items-center gap-2 transition-all font-bold"
                  title="GitHub Push & Terminal Guide"
                >
                  <Github size={16} />
                  <span>GitHub Push Guide</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-display text-xl uppercase text-neon-green">Explore</h3>
              <ul className="space-y-3 font-mono text-xs uppercase tracking-widest text-gallery-white/60">
                <li><Link to="/" className="hover:text-neon-green transition-colors">🔥 Roast</Link></li>
                <li><Link to="/games" className="hover:text-neon-green transition-colors">🎮 Games</Link></li>
                <li><Link to="/anonymous" className="hover:text-neon-green transition-colors">👻 Ghost Box</Link></li>
                <li><Link to="/friendship" className="hover:text-neon-green transition-colors">🤝 Friends</Link></li>
                <li><Link to="/truthordare" className="hover:text-neon-green transition-colors">🎲 Truth or Dare</Link></li>
                <li><Link to="/prank/create" className="hover:text-neon-green transition-colors">🎭 Prank Lab</Link></li>
                <li><Link to="/feed" className="hover:text-neon-green transition-colors">📱 The Pit (Feed)</Link></li>
                <li><Link to="/battle" className="hover:text-neon-green transition-colors">⚔️ Roast Battles</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="font-display text-xl uppercase text-neon-green">Legal & Support</h3>
              <ul className="space-y-3 font-mono text-xs uppercase tracking-widest text-gallery-white/60">
                <li><Link to="/how-it-works" className="hover:text-neon-green transition-colors">How It Works</Link></li>
                <li><Link to="/about" className="hover:text-neon-green transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-neon-green transition-colors">Contact Support</Link></li>
                <li><Link to="/privacy" className="hover:text-neon-green transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-neon-green transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-neon-green transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-gallery-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gallery-white/20 whitespace-pre-wrap">
              ©roastme.site
              the number one entertainment and reward system
            </p>
          </div>
        </div>
      </footer>

      <GitHubGuideModal 
        isOpen={isGitHubModalOpen} 
        onClose={() => setIsGitHubModalOpen(false)} 
      />
    </>
  );
}
