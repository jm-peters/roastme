// src/components/UsernameSetup.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { validateUsername } from '../utils/usernameValidation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  increment
} from 'firebase/firestore';
import { 
  linkWithCredential, 
  EmailAuthProvider, 
  updateProfile, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Lock, Eye, EyeOff, User, Sparkles, RefreshCw } from 'lucide-react';

import { fetchWithAuth } from '../utils/apiUtils';

interface UsernameSetupProps {
  onComplete?: (username: string) => void;
  isOpen: boolean;
  userId: string;
}

export default function UsernameSetup({ onComplete, isOpen, userId }: UsernameSetupProps) {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const referralCode = searchParams.get('ref') || localStorage.getItem('referrerId') || '';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3 && !isLogin) {
        checkUsername();
      } else {
        setIsAvailable(null);
        setError('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, isLogin]);

  const checkUsername = async () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      setIsAvailable(false);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const q = query(collection(db, 'users'), where('usernameLower', '==', username.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setIsAvailable(true);
        setError('');
      } else {
        setIsAvailable(false);
        setError('Username taken');
      }
    } catch (err) {
      console.error('Check username error:', err);
      // Fallback if network issue, but don't block user
      setIsAvailable(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    
    setIsChecking(true);
    setError('');

    const trimmedUsername = username.trim();
    const usernameLower = trimmedUsername.toLowerCase();
    const email = `${usernameLower}@roastme.app`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess(true);
        localStorage.setItem('username', trimmedUsername);
        setTimeout(() => onComplete?.(trimmedUsername), 1000);
      } else {
        // Double check availability one last time
        const q = query(collection(db, 'users'), where('usernameLower', '==', usernameLower));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Username taken. Please choose another.');
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsChecking(false);
          return;
        }

        const credential = EmailAuthProvider.credential(email, password);

        // Ensure we are signed out if we are not anonymous and not the intended user
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          await auth.signOut();
        }

        // Link if anonymous, else create new
        if (auth.currentUser?.isAnonymous) {
          try {
            await linkWithCredential(auth.currentUser, credential);
          } catch (linkErr: any) {
            console.warn("Linking notice:", linkErr?.code || linkErr?.message);
            // If the username/email is already in use, try logging in with the entered credentials
            if (linkErr.code === 'auth/email-already-in-use' || linkErr.code === 'auth/credential-already-in-use') {
              try {
                await signInWithEmailAndPassword(auth, email, password);
                setSuccess(true);
                localStorage.setItem('username', trimmedUsername);
                setTimeout(() => onComplete?.(trimmedUsername), 1000);
                return;
              } catch {
                setIsLogin(true);
                setError('Username already registered. Please enter your password to log in.');
                setIsChecking(false);
                return;
              }
            }
            // Other failures: sign out and try fresh creation
            await auth.signOut();
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                try {
                  await signInWithEmailAndPassword(auth, email, password);
                  setSuccess(true);
                  localStorage.setItem('username', trimmedUsername);
                  setTimeout(() => onComplete?.(trimmedUsername), 1000);
                  return;
                } catch {
                  setIsLogin(true);
                  setError('Username already registered. Please enter your password to log in.');
                  setIsChecking(false);
                  return;
                }
              }
              throw createErr;
            }
          }
        } else {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              try {
                await signInWithEmailAndPassword(auth, email, password);
                setSuccess(true);
                localStorage.setItem('username', trimmedUsername);
                setTimeout(() => onComplete?.(trimmedUsername), 1000);
                return;
              } catch {
                setIsLogin(true);
                setError('Username already registered. Please enter your password to log in.');
                setIsChecking(false);
                return;
              }
            }
            throw createErr;
          }
        }

        const currentUid = auth.currentUser?.uid;
        if (!currentUid) throw new Error("Authentication failed");

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: trimmedUsername
          });
        }

        // Update Firestore
        const userRef = doc(db, 'users', currentUid);
        const userData: any = {
          id: currentUid,
          username: trimmedUsername,
          usernameLower: usernameLower,
          isPermanent: true,
          updatedAt: new Date().toISOString()
        };
        if (referralCode) {
          userData.referralCode_used = referralCode;
        }
        await setDoc(userRef, userData, { merge: true });

        // Sync with backend
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const syncBody: any = {
              uid: currentUid,
              username: trimmedUsername
            };
            if (referralCode) {
              syncBody.referralCode = referralCode;
            }
            await fetch('/api/auth/sync', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(syncBody)
            });
          }
        } catch (syncErr) {
          console.warn("Backend sync notice:", syncErr);
        }

        setSuccess(true);
        localStorage.setItem('username', trimmedUsername);
        setTimeout(() => onComplete?.(trimmedUsername), 1000);
      }
    } catch (err: any) {
      console.warn('Auth notice:', err?.code || err?.message);
      let message = 'Operation failed';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Invalid username or password';
      } else if (err.code === 'auth/email-already-in-use') {
        setIsLogin(true);
        message = 'Username already registered. Please enter your password to log in.';
      } else if (err.code === 'auth/credential-already-in-use') {
        message = 'This account is already linked to another user.';
      } else if (err.message && err.message.includes('taken')) {
        setIsLogin(true);
        message = 'Username already registered. Please enter your password to log in.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gradient-to-br from-[#032219] via-[#010806] to-[#041611] text-white rounded-[32px] max-w-md w-full p-8 border border-emerald-500/20 shadow-[0_20px_50px_rgba(4,22,17,0.5)] relative overflow-visible"
      >
        {/* Floating Top Banner Icon, mimicking the overlapping ball/trophy look */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-full flex items-center justify-center border-4 border-[#010806] shadow-2xl relative group">
          <User className="text-black w-8 h-8 font-black" />
          <div className="absolute -inset-0.5 bg-emerald-400/30 rounded-full blur animate-pulse -z-10" />
        </div>

        <button 
          onClick={() => onComplete?.('')}
          className="absolute top-4 right-4 w-10 h-10 bg-white/5 hover:bg-white/20 hover:text-white text-zinc-400 rounded-full flex items-center justify-center transition-all border border-white/5 font-mono text-xs"
        >
          ✕
        </button>

        <div className="text-center mt-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-sans font-black uppercase tracking-tight text-white mb-2 leading-none">
            {isLogin ? 'BACK IN THE ARENA' : 'CLAIM YOUR NAME!'}
          </h2>
          <p className="text-emerald-400 font-mono text-[9px] font-black uppercase tracking-[0.2em]">
            {isLogin ? 'IDENTITY VERIFICATION REQUIRED' : 'SECURE YOUR EXCLUSIVE HANDLE NOW'}
          </p>
        </div>

        {!success ? (
          <div className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-zinc-400 font-black uppercase text-[9px] tracking-[0.15em]">
                  Handle @
                </label>
                {!isLogin && isAvailable === true && (
                  <span className="text-emerald-400 font-mono text-[9px] font-black tracking-widest animate-pulse">✓ AVAILABLE</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-mono text-sm font-black">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      setIsAvailable(null);
                      setError('');
                    }}
                    placeholder="username"
                    className="w-full bg-[#010806]/80 border border-white/10 rounded-2xl px-5 py-4 pl-10 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 transition-all outline-none"
                    maxLength={30}
                    disabled={isChecking}
                  />
                </div>
                {!isLogin && (
                  <button
                    onClick={checkUsername}
                    disabled={!username || isChecking}
                    className="bg-[#032219] text-emerald-300 px-5 rounded-2xl font-sans font-bold uppercase text-[10px] hover:bg-emerald-400 hover:text-black transition-all disabled:opacity-50 border border-emerald-500/20 active:scale-95"
                  >
                    Check
                  </button>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-zinc-400 font-black uppercase text-[9px] tracking-[0.15em] px-1">
                Secure Code
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#010806]/80 border border-white/10 rounded-2xl px-5 py-4 pl-12 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 transition-all outline-none"
                  disabled={isChecking}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-mono uppercase flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                  <span>ALERT: {error}</span>
                </div>
                {error.includes('taken') && !isLogin && (
                  <button 
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                    }}
                    className="text-left text-zinc-300 underline decoration-zinc-500 hover:decoration-white transition-all underline-offset-4 mt-1 pl-3.5"
                  >
                    Hold on, switch to login mode →
                  </button>
                )}
              </motion.div>
            )}

            {/* Perks / Helper Banner */}
            {!isLogin && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-white text-[10px] font-black uppercase tracking-wider mb-0.5">Elite Roaster Access Granted</p>
                  <p className="text-emerald-300/60 text-[9px] font-medium leading-normal uppercase font-mono">
                    Unlocks multiplayer systems, battle arenas, and daily coin cashouts.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-2">
              <button
                onClick={handleSubmit}
                disabled={isChecking || (!isLogin && isAvailable === false) || password.length < 6}
                className="w-full bg-[#00e676] hover:bg-emerald-400 text-black py-4.5 rounded-full font-sans font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 cursor-pointer shadow-[0_0_20px_rgba(0,230,118,0.2)]"
              >
                {isChecking ? 'SECURED TUNNELS...' : isLogin ? 'Proceed To Arena →' : 'Claim Roastboard Now →'}
              </button>
              
              <div className="flex items-center justify-between border-t border-white/5 pt-5 px-1">
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setIsAvailable(null);
                  }}
                  className="text-zinc-500 hover:text-emerald-400 font-mono text-[9px] uppercase tracking-widest transition-colors font-black flex items-center gap-1.5"
                >
                  <RefreshCw size={11} className={isChecking ? "animate-spin" : ""} />
                  {isLogin ? "NEW PLAYER? REGISTER" : "RECOGNIZED HANDLE? LOG IN"}
                </button>
                <button
                  onClick={() => onComplete?.('')}
                  className="text-zinc-600 hover:text-red-400 font-mono text-[9px] uppercase tracking-widest transition-colors font-black"
                >
                  SKIP FOR NOW
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="text-6xl animate-bounce">👑</div>
            <h3 className="text-2xl font-sans font-black uppercase text-white tracking-tight">VAULT SECURED</h3>
            <p className="text-zinc-400 font-mono uppercase text-[10px] leading-relaxed max-w-xs mx-auto">
              Welcome to the elite roster.<br />
              Setting up your <span className="text-emerald-400 font-bold">@{username}</span> profile...
            </p>
            <div className="inline-block px-6 py-3 bg-[#032219] text-emerald-300 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/20 animate-pulse mt-4">
              Syncing Portal...
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

