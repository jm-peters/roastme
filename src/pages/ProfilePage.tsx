import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import EarningsDashboard from '../components/EarningsDashboard';
import { 
  Wallet, 
  TrendingUp, 
  Share2, 
  Flame, 
  ChevronRight, 
  Gift, 
  CreditCard, 
  Coins, 
  ArrowUpRight,
  ShieldCheck,
  History,
  Copy,
  Check,
  Star,
  Zap,
  Settings
} from 'lucide-react';
import { ProfileCustomizer } from '../components/ProfileCustomizer';
import { ReferralLadder } from '../components/ReferralLadder';
import { StreakFreeze } from '../components/StreakFreeze';
import { ECONOMY } from '../utils/economyConstants';

const ProfilePage: React.FC = () => {
  const { username: profileUsername } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Withdrawal form
  const [amount, setAmount] = useState<number>(ECONOMY.MINIMUM_WITHDRAWAL);
  const [method, setMethod] = useState('paypal');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;
  const isOwnProfile = currentUser && profileUsername && (localStorage.getItem('username')?.toLowerCase() === profileUsername.toLowerCase());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/user/economy', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOwnProfile) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [profileUsername, isOwnProfile]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method, address })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Withdrawal failed');
      
      alert('Withdrawal request submitted successfully!');
      setShowWithdraw(false);
      // Refresh stats
      const statsRes = await fetch('/api/user/economy', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(await statsRes.json());
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferral = () => {
    const link = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  if (!isOwnProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-white italic uppercase mb-4">Under Construction</h1>
        <p className="text-zinc-500 max-w-md font-bold uppercase italic">
          Public profiles are coming soon. Currently, you can only view your own economy dashboard.
        </p>
        <button 
          onClick={() => navigate('/auth')}
          className="mt-8 bg-white text-black p-4 font-black uppercase italic"
        >
          Login to your Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
              Dashboard
            </h1>
            <p className="text-zinc-500 font-bold uppercase italic">
              Logged in as <span className="text-white">@{profileUsername}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-zinc-900 border-2 border-white p-4 flex items-center gap-3 shadow-[4px_4px_0px_white]">
              <div className="w-10 h-10 bg-white flex items-center justify-center">
                <Coins className="text-black w-6 h-6" />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-black uppercase leading-none mb-1">Total Earned</p>
                <p className="text-white text-xl font-black leading-none">${stats?.usdEarned?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </div>

        <EarningsDashboard />

        <div className="grid md:grid-cols-2 gap-8">
           <ProfileCustomizer />
           <div className="space-y-8">
              <StreakFreeze />
              <ReferralLadder />
           </div>
        </div>

        {/* Economy Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Main Balance */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-zinc-900 border-4 border-white p-8 shadow-[12px_12px_0px_white]"
          >
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-2xl font-black text-white italic uppercase">RMP & Coins</h2>
              <Wallet className="text-white w-6 h-6" />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b-2 border-white/10 pb-4">
                <span className="text-zinc-500 font-black uppercase italic">RMP Points</span>
                <span className="text-white text-2xl font-black">{stats?.rmpBalance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-white/10 pb-4">
                <span className="text-zinc-500 font-black uppercase italic">🪙 Coins</span>
                <span className="text-white text-2xl font-black">{stats?.coinBalance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-black uppercase italic">Current Value</span>
                <span className="text-green-500 text-2xl font-black italic">${stats?.usdValue?.toFixed(4)}</span>
              </div>

              {/* Progress to Withdrawal */}
              <div className="pt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-zinc-500 text-[10px] font-black uppercase">Progress to Withdrawal ($10)</span>
                  <span className="text-white text-sm font-black italic">{stats?.progressToWithdrawal?.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-black border-2 border-white overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats?.progressToWithdrawal}%` }}
                    className="h-full bg-green-500"
                  />
                </div>
                <p className="text-zinc-600 text-[10px] font-bold mt-2 uppercase italic">
                  * Need {stats?.nextMilestone?.toLocaleString()} more coins to cash out
                </p>
              </div>

              <button 
                onClick={() => setShowWithdraw(true)}
                disabled={stats?.coinBalance < ECONOMY.MINIMUM_WITHDRAWAL}
                className="w-full bg-white text-black p-4 font-black uppercase italic flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-20"
              >
                Withdraw Funds <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Stats Breakdown */}
          <div className="bg-zinc-900 border-4 border-white/20 p-8">
            <h2 className="text-2xl font-black text-white italic uppercase mb-8">Performance</h2>
            <div className="grid grid-cols-2 gap-y-10 gap-x-6">
              <StatItem label="Roasts Created" value={stats?.totalRoasts || 0} icon={<Flame className="w-4 h-4" />} />
              <StatItem label="Shares Made" value={stats?.totalShares || 0} icon={<Share2 className="w-4 h-4" />} />
              <StatItem label="Active Referrals" value={stats?.totalReferrals || 0} icon={<TrendingUp className="w-4 h-4" />} />
              <StatItem label="Total RMP" value={stats?.totalRMPEarned?.toLocaleString() || 0} icon={<History className="w-4 h-4" />} />
            </div>

            <div className="mt-12 bg-black border-2 border-white/10 p-4">
              <h3 className="text-white text-xs font-black uppercase mb-3 flex items-center gap-2">
                <Gift className="w-3 h-3 text-yellow-400" /> Referral program
              </h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase mb-4">
                Earn 50 RMP for signups and 100 RMP for active users.
              </p>
              <div className="flex bg-zinc-900 border-2 border-white/20">
                <input 
                  readOnly 
                  value={`${window.location.origin}/auth?ref=${stats?.referralCode}`} 
                  className="bg-transparent border-none p-2 text-xs font-bold text-white flex-1 outline-none truncate"
                />
                <button 
                  onClick={copyReferral}
                  className="bg-white text-black px-4 font-black text-xs hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3" />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent History or Tips */}
        <div className="border-4 border-white/10 p-8">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-white w-6 h-6" />
            <h2 className="text-2xl font-black text-white italic uppercase">Security Details</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <SecurityTip title="Verification" body="Verified accounts get faster payouts and exclusive reward double-ups." />
            <SecurityTip title="Fair Play" body="Our system ensures fair rewards for all real users and active participants." />
            <SecurityTip title="Transparency" body="100 RMP converts to 1 Coin automatically. 1000 Coins equals 1 USD." />
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border-4 border-white p-8 shadow-[16px_16px_0px_white]"
            >
              <h2 className="text-3xl font-black text-white italic uppercase mb-2">Request Funds</h2>
              <p className="text-zinc-500 font-bold uppercase italic text-xs mb-8">
                Processed within 7 business days. Minimum $10.
              </p>

              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-white text-xs font-black uppercase mb-2">Amount (Coins)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    min={ECONOMY.MINIMUM_WITHDRAWAL}
                    max={stats?.coinBalance}
                    className="w-full bg-black border-2 border-white/20 p-3 text-white font-bold focus:border-white outline-none transition-colors"
                    required
                  />
                  <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase italic">
                    Est. Value: <span className="text-green-500">${(amount * ECONOMY.DEFAULT_RATE).toFixed(2)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-white text-xs font-black uppercase mb-2">Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <MethodToggle active={method === 'paypal'} onClick={() => setMethod('paypal')} label="PayPal" icon={<CreditCard className="w-4 h-4"/>} />
                    <MethodToggle active={method === 'crypto'} onClick={() => setMethod('crypto')} label="USDT" icon={<ChevronRight className="w-4 h-4"/>} />
                    <MethodToggle active={method === 'giftcard'} onClick={() => setMethod('giftcard')} label="Gift" icon={<Gift className="w-4 h-4"/>} />
                  </div>
                </div>

                <div>
                  <label className="block text-white text-xs font-black uppercase mb-2">
                    {method === 'paypal' ? 'PayPal Email' : method === 'crypto' ? 'Wallet Address' : 'Email Address'}
                  </label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black border-2 border-white/20 p-3 text-white font-bold focus:border-white outline-none transition-colors"
                    placeholder={method === 'paypal' ? 'you@email.com' : 'Enter details...'}
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 bg-zinc-800 text-white p-4 font-black uppercase italic hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 bg-white text-black p-4 font-black uppercase italic hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatItem = ({ label, value, icon }: { label: string, value: any, icon: any }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center text-white">
      {icon}
    </div>
    <div>
      <p className="text-zinc-600 text-[10px] font-black uppercase leading-none mb-1">{label}</p>
      <p className="text-white text-xl font-black tracking-tight leading-none">{value}</p>
    </div>
  </div>
);

const SecurityTip = ({ title, body }: { title: string, body: string }) => (
  <div>
    <h3 className="text-white text-sm font-black uppercase italic mb-2 tracking-wide">{title}</h3>
    <p className="text-zinc-500 text-xs font-bold leading-relaxed italic">{body}</p>
  </div>
);

const MethodToggle = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: any }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`p-3 border-2 font-black text-[10px] uppercase italic flex flex-col items-center gap-1 transition-all ${
      active ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/10 hover:border-white/40'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default ProfilePage;
