import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Shield, Image as ImageIcon, Check, Coins, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const FRAMES = [
  { id: 'default', name: 'Standard', cost: 0, preview: 'border-gray-200' },
  { id: 'gold', name: 'Golden Edge', cost: 100, preview: 'border-yellow-400 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.5)]' },
  { id: 'flame', name: 'Hellfire', cost: 200, preview: 'border-red-500 ring-4 ring-orange-500/30' },
  { id: 'crown', name: 'Royal Crown', cost: 500, preview: 'border-purple-600 ring-2 ring-pink-400' },
];

const BACKGROUNDS = [
  { id: 'default', name: 'Paper White', cost: 0, css: 'bg-white' },
  { id: 'roast', name: 'Burnt Toast', cost: 150, css: 'bg-orange-50' },
  { id: 'battle', name: 'Dark Arena', cost: 300, css: 'bg-gray-900 border-gray-800' },
];

const TITLES = [
  { id: 'newbie', name: 'Newbie Roaster', cost: 0 },
  { id: 'menace', name: 'Certified Menace', cost: 1000 },
];

export const ProfileCustomizer: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'frame' | 'bg' | 'title'>('frame');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePurchase = async (type: string, itemId: string, cost: number) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/customize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ type, itemId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to purchase');

      setSuccess(`Updated ${type}!`);
      refreshUser();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const currentFrame = user?.avatarFrame || 'default';
  const currentBg = user?.profileBg || 'default';
  const currentTitle = user?.roastTitle || 'newbie';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100" id="profile-customizer">
      <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('frame')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'frame' ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield size={16} /> Frames
        </button>
        <button
          onClick={() => setActiveTab('bg')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bg' ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ImageIcon size={16} /> BGs
        </button>
        <button
          onClick={() => setActiveTab('title')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'title' ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Palette size={16} /> Titles
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {activeTab === 'frame' && FRAMES.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePurchase('frame', item.id, item.cost)}
            disabled={isLoading || currentFrame === item.id}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden ${
              currentFrame === item.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center bg-gray-200 ${item.preview}`}>
               <span className="text-xs text-gray-400 font-bold">AVA</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-900">{item.name}</p>
              {currentFrame === item.id ? (
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Active</span>
              ) : (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins size={10} className="text-yellow-500" />
                  <span className="text-[10px] font-bold text-gray-500">{item.cost || 'FREE'}</span>
                </div>
              )}
            </div>
            {currentFrame === item.id && (
               <div className="absolute top-2 right-2 bg-gray-900 text-white p-0.5 rounded-full">
                  <Check size={8} />
               </div>
            )}
          </button>
        ))}

        {activeTab === 'bg' && BACKGROUNDS.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePurchase('bg', item.id, item.cost)}
            disabled={isLoading || currentBg === item.id}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 relative ${
              currentBg === item.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
             <div className={`w-full h-12 rounded-lg border border-gray-200 ${item.css}`} />
             <div className="text-center">
              <p className="text-xs font-bold text-gray-900">{item.name}</p>
              {currentBg === item.id ? (
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Active</span>
              ) : (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins size={10} className="text-yellow-500" />
                  <span className="text-[10px] font-bold text-gray-500">{item.cost || 'FREE'}</span>
                </div>
              )}
            </div>
          </button>
        ))}

        {activeTab === 'title' && TITLES.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePurchase('title', item.id, item.cost)}
            disabled={isLoading || currentTitle === item.id}
            className={`col-span-2 p-4 rounded-2xl border-2 transition-all flex items-center justify-between relative ${
              currentTitle === item.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
             <div className="flex flex-col items-start leading-tight">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Title</span>
                <span className="text-sm font-black text-gray-900">{item.name}</span>
             </div>
             <div>
              {currentTitle === item.id ? (
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Unlocked</span>
              ) : (
                <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                  <Coins size={14} className="text-yellow-600" />
                  <span className="text-sm font-black text-yellow-700">{item.cost}</span>
                </div>
              )}
             </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{y: 10, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 10, opacity: 0}} className="mt-6 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold ring-1 ring-red-100">
             <AlertCircle size={14} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{y: 10, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 10, opacity: 0}} className="mt-6 flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold ring-1 ring-green-100">
             <Check size={14} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
         <div className="text-xs font-bold text-gray-400 tracking-widest uppercase">Current Balance</div>
         <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-2xl">
            <Coins size={18} className="text-yellow-400" />
            <span className="text-lg font-black">{Math.floor(user?.coinBalance || 0)}</span>
         </div>
      </div>
    </div>
  );
};
