import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import ShareMenu from '../../components/ShareMenu';

export default function RoastBattle({ userId }: { userId: string }) {
  const [battles, setBattles] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'roastBattles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBattles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleVote = async (battleId: string, forChallenger: boolean) => {
    if (!userId) return;
    try {
      const voteRef = doc(db, 'roastBattles', battleId, 'voters', userId);
      const snap = await getDoc(voteRef);
      if (snap.exists()) return; // Already voted

      await setDoc(voteRef, { votedAt: new Date() });
      const bRef = doc(db, 'roastBattles', battleId);
      
      if (forChallenger) {
        await updateDoc(bRef, { votesForChallenger: increment(1) });
      } else {
        await updateDoc(bRef, { votesForChallenged: increment(1) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Roast <span className="text-[var(--battle-gold)]">Battles</span></h2>
        <p className="text-gallery-white/60 font-mono">Watch the carnage. Cast your votes. Decide the champion.</p>
      </div>

      <div className="space-y-8">
        {battles.map(battle => {
          const totalVotes = (battle.votesForChallenger || 0) + (battle.votesForChallenged || 0);
          const challengerPct = totalVotes ? Math.round(((battle.votesForChallenger || 0) / totalVotes) * 100) : 50;
          const challengedPct = totalVotes ? Math.round(((battle.votesForChallenged || 0) / totalVotes) * 100) : 50;
          const isComplete = battle.status === 'complete';

          return (
            <div key={battle.id} className="bg-brutal-black border-2 border-white/10 p-6 rounded-2xl relative overflow-hidden">
              <div className="text-center mb-6 relative">
                <span className="bg-white/10 px-3 py-1 rounded text-white/80 font-mono text-xs uppercase tracking-widest">{battle.topic}</span>
                <div className="absolute right-0 top-0">
                  <ShareMenu 
                    roastId={battle.id}
                    roastText={`BATTLE: ${battle.topic}\n\nChallenger: "${battle.challengerRoast}"\n\nTarget: "${battle.challengedRoast}"`}
                    userId={userId}
                    className="scale-75 origin-right"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Challenger */}
                <div className="flex-1 bg-white/5 border border-white/10 p-5 rounded-xl text-center flex flex-col relative group hover:border-[var(--battle-gold)] transition-colors">
                  <div className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Challenger</div>
                  <p className="text-white font-serif italic mb-6 flex-1">"{battle.challengerRoast}"</p>
                  
                  {!isComplete && (
                    <button onClick={() => handleVote(battle.id, true)} className="mt-auto w-full py-3 bg-white/10 hover:bg-[var(--battle-gold)] hover:text-black text-white font-bold transition-all rounded-lg">
                      Vote For This Burn
                    </button>
                  )}
                  {isComplete && battle.winner === battle.challenger && (
                    <div className="absolute -top-3 -left-3 text-3xl">🏆</div>
                  )}
                </div>

                <div className="hidden md:flex items-center justify-center flex-col w-16 shrink-0">
                  <div className="h-full w-px bg-white/10 absolute"></div>
                  <span className="relative z-10 bg-brutal-black px-2 text-red-500 font-bold italic text-2xl">VS</span>
                </div>

                {/* Challenged */}
                <div className="flex-1 bg-white/5 border border-white/10 p-5 rounded-xl text-center flex flex-col relative group hover:border-[var(--battle-gold)] transition-colors">
                  <div className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Target</div>
                  <p className="text-white font-serif italic mb-6 flex-1">"{battle.challengedRoast}"</p>

                  {!isComplete && (
                    <button onClick={() => handleVote(battle.id, false)} className="mt-auto w-full py-3 bg-white/10 hover:bg-[var(--battle-gold)] hover:text-black text-white font-bold transition-all rounded-lg">
                      Vote For This Burn
                    </button>
                  )}
                  {isComplete && battle.winner === battle.challenged && (
                    <div className="absolute -top-3 -right-3 text-3xl">🏆</div>
                  )}
                </div>
              </div>

              {/* Vote Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs font-mono text-white/60 mb-2">
                  <span>{challengerPct}%</span>
                  <span>{totalVotes} total votes</span>
                  <span>{challengedPct}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full flex overflow-hidden">
                  <div className="bg-[var(--battle-gold)] h-full transition-all duration-500" style={{ width: `${challengerPct}%` }}></div>
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${challengedPct}%` }}></div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
