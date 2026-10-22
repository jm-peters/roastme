import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../utils/soundManager';
import { fetchWithAuth } from '../utils/apiUtils';
import { X, Bell, Volume2, LogOut, Trash2, AlertTriangle, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function SettingsModal({ isOpen, onClose, username, onLogout, onDeleteAccount }: SettingsModalProps) {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && username) {
      // Fetch current settings from backend
      fetch(`/api/users/${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.notificationsEnabled !== undefined) {
            setNotificationsEnabled(data.notificationsEnabled);
            localStorage.setItem('notifications_enabled', String(data.notificationsEnabled));
          }
        })
        .catch(console.error);
    }
    
    const savedSound = localStorage.getItem('sound_enabled');
    setSoundEnabled(savedSound !== 'false');
  }, [isOpen, username]);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setLoading(true);
    try {
      await fetchWithAuth('/api/user/update-profile', {
        method: 'POST',
        body: JSON.stringify({ notificationsEnabled: newValue })
      });
      setNotificationsEnabled(newValue);
      localStorage.setItem('notifications_enabled', String(newValue));
    } catch (error) {
      console.error('Failed to update notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
    localStorage.setItem('sound_enabled', String(newState));
  };

  const handleLogout = () => {
    onLogout();
    onClose();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== `@${username}`) {
      setDeleteError('Username does not match. Remember to include the @');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        onDeleteAccount();
        onClose();
        navigate('/');
      } else {
        setDeleteError('Failed to delete account');
      }
    } catch (err) {
      setDeleteError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 h-[100dvh] bg-black/95 z-[200] flex items-center justify-center p-6 sm:p-12 backdrop-blur-md">
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] w-full max-w-md max-h-[65vh] sm:max-h-[75vh] overflow-hidden border-2 border-purple-500/30 shadow-[0_0_80px_-20px_rgba(168,85,247,0.5)] flex flex-col animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Sticky Header with Exit Button */}
        <div className="sticky top-0 bg-gray-900/98 backdrop-blur-xl flex justify-between items-center p-6 border-b border-gray-800/40 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-1 ring-white/10">
              <span className="text-xl">⚙️</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/40 hover:bg-gray-700/60 text-gray-400 hover:text-white transition-all active:scale-90 border border-gray-700/30"
            aria-label="Close settings"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar pb-16">
          {/* Notifications Section */}
          <div className="bg-gray-800/10 rounded-2xl p-5 border border-gray-700/20 hover:border-purple-500/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  notificationsEnabled ? "bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "bg-gray-700/20 text-gray-500"
                )}>
                  <Bell size={22} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Notifications</p>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-0.5">Alerts & Roasts</p>
                </div>
              </div>
              <button
                onClick={toggleNotifications}
                disabled={loading}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95",
                  notificationsEnabled 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-gray-700 text-gray-400'
                )}
              >
                {notificationsEnabled ? 'ON ✓' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Sound Effects Section */}
          <div className="bg-gray-800/10 rounded-2xl p-5 border border-gray-700/20 hover:border-purple-500/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  soundEnabled ? "bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.1)]" : "bg-gray-700/20 text-gray-500"
                )}>
                  <Volume2 size={22} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Sound Effects</p>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-0.5">Audio Feedback</p>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95",
                  soundEnabled 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'bg-gray-700 text-gray-400'
                )}
              >
                {soundEnabled ? 'ON ✓' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl p-5 border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer group"
               onClick={() => { navigate(`/profile/${username}`); onClose(); }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Wallet & Rewards</p>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mt-0.5">Manage Coins & Withdraw</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-all">
                →
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-gray-800/10 rounded-2xl p-5 border border-gray-700/20">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.25em] mb-4">User Profile</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Logged in as</p>
                <p className="text-purple-400 font-black text-lg truncate tracking-tight">@{username || 'guest'}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5">
            <p className="text-red-500 text-[10px] font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Danger Zone
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black hover:bg-red-500/20 transition-all uppercase tracking-widest active:scale-[0.98]"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  This action is permanent. All roasts and coins will be lost. Type <span className="text-red-500 font-bold">@{username}</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder={`@${username}`}
                  className="w-full bg-gray-900/30 border border-gray-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                />
                {deleteError && <p className="text-red-500 text-[10px] font-bold animate-pulse">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3.5 bg-gray-800/50 rounded-xl text-white text-xs font-bold hover:bg-gray-700 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || deleteConfirmText !== `@${username}`}
                    className="flex-1 py-3.5 bg-red-600 rounded-xl text-white text-xs font-black disabled:opacity-50 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest active:scale-95"
                  >
                    {loading ? 'Deleting...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="text-center pt-6 opacity-20">
            <p className="text-gray-400 text-[9px] font-mono uppercase tracking-[0.4em]">RoastMe v1.0.5 • Crucial Engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
