import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useToast } from '../components/Toast';

export default function ChallengeWallPage() {
  const [challenges, setChallenges] = useState([]);
  
  useEffect(() => {
    fetch('/api/v2/challenge-wall')
      .then(r => r.json())
      .then(d => setChallenges(d.challenges))
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col bg-brutal-black min-h-screen p-8 text-white">
      <h1 className="text-4xl font-bold text-neon-green uppercase border-b border-gallery-white/20 pb-4">Social Challenge Wall</h1>
      <div className="mt-8 space-y-4">
        {challenges.length === 0 ? <p className="text-gallery-white/50">No challenges yet. Be the first!</p> : null}
      </div>
    </div>
  );
}
