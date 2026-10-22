import { useState, useEffect } from 'react';
import { getRoastProfile, updateRoastProfile } from '../../services/roastFirestore';

export default function RoastProfile({ userId, onComplete }: { userId: string, onComplete: () => void }) {
  const [profile, setProfile] = useState({
    jobTitle: '',
    hobbies: '', // string for simplicity, comma separated
    biggestHabit: '',
    relationshipStatus: 'single',
    lastEmbarrassingThing: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const data = await getRoastProfile(userId);
    if (data) {
      setProfile({
        jobTitle: data.jobTitle || '',
        hobbies: (data.hobbies || []).join(', '),
        biggestHabit: data.biggestHabit || '',
        relationshipStatus: data.relationshipStatus || 'single',
        lastEmbarrassingThing: data.lastEmbarrassingThing || ''
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const dataToSave = {
      ...profile,
      hobbies: profile.hobbies.split(',').map(h => h.trim()).filter(Boolean)
    };
    await updateRoastProfile(userId, dataToSave);
    setSaving(false);
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Build Your Target Profile</h2>
      <p className="text-white/60 mb-8 font-mono text-sm border-b border-white/10 pb-6">The more we know, the harder we hit. Give us your weak points.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-white font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Job Title / Role</label>
          <input type="text" value={profile.jobTitle} onChange={e => setProfile({...profile, jobTitle: e.target.value})} className="w-full bg-brutal-black border-2 border-white/10 text-white p-3 rounded-xl focus:border-neon-green outline-none transition" placeholder="e.g. Unemployed Visionary" />
        </div>
        
        <div>
          <label className="block text-white font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Hobbies (comma separated)</label>
          <input type="text" value={profile.hobbies} onChange={e => setProfile({...profile, hobbies: e.target.value})} className="w-full bg-brutal-black border-2 border-white/10 text-white p-3 rounded-xl focus:border-neon-green outline-none transition" placeholder="e.g. Doomscrolling, Procrastinating" />
        </div>

        <div>
          <label className="block text-white font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Relationship Status</label>
          <select value={profile.relationshipStatus} onChange={e => setProfile({...profile, relationshipStatus: e.target.value})} className="w-full bg-brutal-black border-2 border-white/10 text-white p-3 rounded-xl focus:border-neon-green outline-none transition appearance-none">
            <option value="single">Single & Ready to Suffer</option>
            <option value="taken">Taken (For Now)</option>
            <option value="complicated">It's Complicated</option>
            <option value="married">Married</option>
          </select>
        </div>

        <div>
          <label className="block text-white font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Worst Habit</label>
          <input type="text" value={profile.biggestHabit} onChange={e => setProfile({...profile, biggestHabit: e.target.value})} className="w-full bg-brutal-black border-2 border-white/10 text-white p-3 rounded-xl focus:border-neon-green outline-none transition" />
        </div>

        <div>
          <label className="block text-white font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Last Embarrassing Thing You Did (Optional but recommended)</label>
          <textarea value={profile.lastEmbarrassingThing} onChange={e => setProfile({...profile, lastEmbarrassingThing: e.target.value})} className="w-full bg-brutal-black border-2 border-white/10 text-white p-3 rounded-xl focus:border-neon-green outline-none transition h-24 resize-none" />
        </div>

        <div className="flex gap-4 pt-6">
          <button onClick={onComplete} className="px-6 py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition flex-1">Skip For Now</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-4 rounded-xl font-bold bg-neon-green hover:bg-white text-black transition flex-1">{saving ? 'Loading the chamber...' : 'Lock It In'}</button>
        </div>
      </div>
    </div>
  );
}
