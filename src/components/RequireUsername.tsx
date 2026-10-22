import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface RequireUsernameProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RequireUsername({ children, fallback }: RequireUsernameProps) {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  if (!username) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 brutal-border p-8 text-center space-y-6">
        <div className="text-5xl">⚠️</div>
        <div className="space-y-2">
          <h3 className="text-white font-display text-xl uppercase">Username Required</h3>
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
            You need a username to earn points, challenge friends, and appear on leaderboards.
          </p>
        </div>
        <button
          onClick={() => navigate('/?setup=true')}
          className="bg-yellow-500 text-brutal-black px-8 py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-all"
        >
          Create Username →
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
