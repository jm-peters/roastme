import { useState, useEffect } from "react";
import { onSnapshot, doc, updateDoc, setDoc, query, collection, where, limit, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { getDayName, getTimeOfDay } from "../../roast/roastEngine";
import { ShareCard, MilestoneCelebration, WeeklyReportCard } from "./RoastExtras";
import ShareMenu from "../../components/ShareMenu";
import { generateAIRoast, generateAIDefenseJudgment } from "../../services/geminiService";

// ─── CONFIG & CONSTANTS ──────────────────────────────────────────
const PERSONAS = [
  { id: 'comedian', name: 'The Comedian', emoji: '🎤', desc: 'Sharp. Perfect timing.' },
  { id: 'shakespeare', name: 'The Bard', emoji: '🎭', desc: 'Elizabethan destruction.' },
  { id: 'corporate', name: 'Corporate Karen', emoji: '💼', desc: 'Performance review mode.' },
  { id: 'genz', name: 'Gen Z Oracle', emoji: '✨', desc: 'Chronically online.' },
  { id: 'british', name: 'British Aristocrat', emoji: '🎩', desc: 'Devastatingly polite.' },
  { id: 'dad', name: 'Disappointed Dad', emoji: '😔', desc: 'Not angry. Just tired.' },
  { id: 'philosopher', name: 'Ancient Philosopher', emoji: '🏛️', desc: 'Done with humanity.' },
];

const INTENSITIES = [
  { id: 'friendly', label: 'Friendly', emoji: '😄', btnLabel: 'Roast Gently' },
  { id: 'roasted', label: 'Roasted', emoji: '🔥', btnLabel: 'Roast Me' },
  { id: 'savage', label: 'Savage', emoji: '💀', btnLabel: 'Destroy Me' },
  { id: 'scorched', label: 'SCORCHED', emoji: '☢️', btnLabel: 'END ME' },
];

const INPUT_TYPES = [
  { id: 'text', icon: '📝', label: 'Tell Me About You', ph: 'Describe yourself, your job, your week...' },
  { id: 'jobtitle', icon: '💼', label: 'Job Title', ph: 'Your job title...' },
  { id: 'mood', icon: '😤', label: 'Your Mood', ph: 'How are you feeling right now?' },
  { id: 'social', icon: '📱', label: 'Social Bio', ph: 'Paste your LinkedIn bio or tweet...' },
  { id: 'random', icon: '🎲', label: 'Random', ph: 'No input needed.' },
];

const RATINGS = [
  { id: 'accurate', e: '🔥', l: 'Accurate' }, { id: 'too_real', e: '💀', l: 'Too Real' },
  { id: 'funny', e: '😂', l: 'Funny' }, { id: 'weak', e: '😤', l: 'Weak' },
];

const BADGES: Record<string, any> = {
  three_day_roast: { e: '🥉', l: '3-Day Roast', sub: 'Three days in. It begins.' },
  weekly_roasted: { e: '🔥', l: 'Weekly Roasted', sub: 'A full week. You\'ve made it a habit.' },
  fortnight_of_shame: { e: '💀', l: 'Fortnight of Shame', sub: 'Two weeks. The therapist is noting.' },
  chronically_roasted: { e: '☠️', l: 'Chronically Roasted', sub: '30 days. This is your personality now.' },
  masochist_legend: { e: '👑', l: 'Masochist Legend', sub: '100 days. You ARE the roast app.' },
};

const ICOL: Record<string, string> = { friendly: '#4ade80', roasted: '#fb923c', savage: '#f87171', scorched: '#ef4444' };
const IGLOW: Record<string, string> = { 
  friendly: 'rgba(74,222,128,.16)', 
  roasted: 'rgba(251,146,60,.16)', 
  savage: 'rgba(248,113,113,.2)', 
  scorched: 'rgba(239,68,68,.26)' 
};

const MQ_ITEMS = ['🔥 DAILY ROAST LOADED', '💀 ZERO MERCY MODE', '⚔️ BATTLE ARENA LIVE', '☢️ SCORCHED EARTH ACTIVE', '🎤 THE COMEDIAN AWAITS', '👑 TROPHY CASE UNLOCKED', '🏛️ NO SURVIVORS', '🔥 ROAST ENGINE V2', '✨ GEN Z ORACLE ONLINE', '😔 DAD MODE ENGAGED'];

// ─── COMPONENT ─────────────────────────────────────────────
export default function RoastSessionV2() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(() => localStorage.getItem('roast_active_screen') || 'roast');
  const [persona, setPersona] = useState(() => localStorage.getItem('roast_persona') || 'comedian');
  const [intensity, setIntensity] = useState(() => localStorage.getItem('roast_intensity') || 'roasted');
  const [iType, setIType] = useState(() => localStorage.getItem('roast_itype') || 'text');
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [roast, setRoast] = useState<any>(null);
  const [showDefend, setShowDefend] = useState(false);
  const [comeback, setComeback] = useState('');
  const [defense, setDefense] = useState<any>(null);
  const [defending, setDefending] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<any>({ jobTitle: '', hobbies: [], biggestHabit: '', streakCount: 1 });
  const [history, setHistory] = useState<any[]>([]);
  const [trophyCase, setTrophyCase] = useState<any[]>([]);
  const [seen, setSeen] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('roast_seen') || '[]'); } catch { return []; }
  });
  const [dailyRoast, setDailyRoast] = useState<any>(null);
  const [dailyRating, setDailyRating] = useState<string | null>(null);
  const [battle, setBattle] = useState<any>({ topic: '', opp: '', result: null, voted: null });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [htab, setHtab] = useState('all');
  const [expHist, setExpHist] = useState<number | null>(null);

  const userId = auth.currentUser?.uid;
  const ic = ICOL[intensity];
  const ig = IGLOW[intensity];
  const iCfg = INTENSITIES.find(i => i.id === intensity);
  const pCfg = PERSONAS.find(p => p.id === persona);

  useEffect(() => { localStorage.setItem('roast_active_screen', screen); }, [screen]);
  useEffect(() => { localStorage.setItem('roast_persona', persona); }, [persona]);
  useEffect(() => { localStorage.setItem('roast_intensity', intensity); }, [intensity]);
  useEffect(() => { localStorage.setItem('roast_itype', iType); }, [iType]);
  useEffect(() => { localStorage.setItem('roast_seen', JSON.stringify(seen)); }, [seen]);

  // ─── FIREBASE SYNC ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Check for weekly report
    const unsubWeekly = onSnapshot(doc(db, 'weeklyReports', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.viewed) setWeeklyReport(data);
      }
    });

    const unsubProfile = onSnapshot(doc(db, 'roastProfiles', userId), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    const unsubHistory = onSnapshot(
      query(collection(db, 'roastSessions'), where('userId', '==', userId), limit(50)),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(docs.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
      }
    );

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dailyDocId = `${userId}_${today}`;
    const unsubDaily = onSnapshot(doc(db, 'dailyRoasts', dailyDocId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDailyRoast(data);
        setDailyRating(data.rating);
      }
    });

    return () => {
      unsubProfile();
      unsubHistory();
      unsubDaily();
    };
  }, [userId]);

  const showT = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function generate() {
    if (generating || !userId) return;
    setGenerating(true); setRoast(null); setShowDefend(false); setDefense(null); setRating(null); setShowShare(false);

    try {
      const aiResponse = await generateAIRoast({
        persona,
        intensity,
        inputType: iType,
        userInput: input,
        profile: {
          jobTitle: profile.jobTitle,
          hobby: profile.hobbies?.[0],
          habit: profile.biggestHabit,
          streak: profile.streakCount
        }
      });

      const res = {
        templateId: 'ai-gen-' + Date.now(),
        roastText: aiResponse,
        signoff: '', // Will be handled if needed or keep blank
        persona,
        intensity,
      };

      const sessionRef = doc(collection(db, 'roastSessions'));
      const sessionData = {
        userId,
        ...res,
        userInput: input,
        createdAt: new Date(),
        saved: false,
        userRating: null
      };
      
      await setDoc(sessionRef, sessionData);
      
      setRoast({ id: sessionRef.id, ...sessionData });
      setSeen(prev => [...prev.slice(-49), res.templateId]);

      // Optimization: increment total roasts
      await setDoc(doc(db, 'roastProfiles', userId), {
        totalRoasts: increment(1)
      }, { merge: true });

    } catch (err) {
      console.error(err);
      showT('Failed to generate roast');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRate(rId: string) {
    if (!roast || !roast.id || !userId) return;
    setRating(rId);
    await updateDoc(doc(db, 'roastSessions', roast.id), { userRating: rId });
  }

  async function toggleSave() {
    if (!roast || !roast.id || !userId) return;
    const newSaveState = !roast.saved;
    await updateDoc(doc(db, 'roastSessions', roast.id), { saved: newSaveState });
    setRoast((prev: any) => ({ ...prev, saved: newSaveState }));
    showT(newSaveState ? '🏆 Added to Trophy Case' : 'Removed from Trophy Case');
  }

  async function runDefend() {
    if (!comeback.trim() || !userId) return;
    setDefending(true);
    try {
      const res = await generateAIDefenseJudgment(comeback, persona);
      setDefense({
        ...res,
        won: res.quality === 'strong'
      });
    } catch (err) {
      console.error(err);
      setDefense({ quality: 'weak', judgmentText: 'Failed to judge defense.' });
    } finally {
      setDefending(false);
    }
  }

  async function startBattle() {
    if (!battle.topic || !userId) return;
    setGenerating(true);
    try {
      const mine = await generateAIRoast({ persona, intensity: 'savage', inputType: 'battle', userInput: battle.topic, profile });
      const theirs = await generateAIRoast({ persona: 'comedian', intensity: 'savage', inputType: 'battle', userInput: battle.topic, profile: { jobTitle: battle.opp || 'Challenger' } });
      setBattle((p: any) => ({ ...p, result: { mine, theirs, mv: 0, tv: 0 } }));
    } catch (err) {
      console.error(err);
      showT('Failed to start battle');
    } finally {
      setGenerating(false);
    }
  }

  async function dismissWeekly() {
    if (!userId) return;
    await updateDoc(doc(db, 'weeklyReports', userId), { viewed: true });
    setWeeklyReport(null);
  }

  const idot = (id: string) => <span style={{ width: 6, height: 6, borderRadius: '50%', background: ICOL[id] || '#555', display: 'inline-block', flexShrink: 0 }} />;

  return (
    <div className="app" style={{ '--ic': ic, '--ig': ig } as any}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,400;1,300&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0a0a0b;--s1:#111114;--s2:#18181c;--b:rgba(255,255,255,.07);--bh:rgba(255,255,255,.14);--t:#f0f0f0;--t2:#888;--t3:#444;--gold:#f59e0b;--accent:#ff4444}
        body{background:var(--bg);color:var(--t);font-family:'Space Grotesk',sans-serif;min-height:100vh;overflow-x:hidden}
        .app{max-width:680px;margin:0 auto;padding:0 16px 110px}
        .hdr{padding:20px 0 10px;text-align:center}
        .htitle{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,6vw,36px);letter-spacing:2px;line-height:1;background:linear-gradient(140deg,#fff 0%,#666 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-transform:uppercase}
        .hsub{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:1px;color:var(--t3);margin-top:2px;text-transform:uppercase}
        .sbar{display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 14px;background:var(--s1);border:1px solid var(--b);border-radius:10px;margin-bottom:20px;flex-wrap:wrap}
        .si{display:flex;flex-direction:column;align-items:center;gap:0px}
        .sn{font-family:'Bebas Neue',sans-serif;font-size:24px;line-height:1;color:var(--gold)}
        .sl{font-size:9px;letter-spacing:1.5px;color:var(--t3);text-transform:uppercase}
        .sdiv{width:1px;height:30px;background:var(--b)}
        .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px;scrollbar-width:none}
        .tab{flex-shrink:0;padding:7px 13px;border-radius:8px;border:1px solid var(--b);background:transparent;color:var(--t2);font-family:'Space Grotesk',sans-serif;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap}
        .tab.on{background:var(--s2);border-color:var(--ic,var(--accent));color:var(--t);box-shadow:0 0 14px var(--ig,transparent)}
        .plabel{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin-bottom:8px}
        .pcards{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px;scrollbar-width:none}
        .pc{flex-shrink:0;padding:9px 12px;border-radius:10px;border:1px solid var(--b);background:var(--s1);cursor:pointer;transition:all .2s;text-align:center;min-width:86px}
        .pc.on{border-color:var(--ic,var(--accent));background:var(--s2);box-shadow:0 0 18px var(--ig,transparent)}
        .pe{font-size:20px;display:block;margin-bottom:3px}
        .pn{font-size:10.5px;color:var(--t);font-weight:600;display:block;line-height:1.2}
        .pd{font-size:9px;color:var(--t3);display:block;margin-top:2px}
        .irow{display:flex;gap:6px;margin-bottom:18px}
        .ib{flex:1;padding:9px 5px;border-radius:10px;border:1px solid var(--b);background:var(--s1);cursor:pointer;transition:all .22s;text-align:center;font-family:'Space Grotesk',sans-serif}
        .ib.on{border-color:var(--ic);box-shadow:0 0 22px var(--ig);background:var(--s2)}
        .ie{font-size:17px;display:block;margin-bottom:3px}
        .il{font-size:9px;letter-spacing:.8px;text-transform:uppercase;display:block;font-weight:600}
        .ib.on .il{color:var(--ic)}
        .icard{background:var(--s1);border:1px solid var(--b);border-radius:13px;padding:14px;margin-bottom:18px;transition:border-color .2s}
        .rtxt{width:100%;background:transparent;border:none;outline:none;color:var(--t);font-family:'Space Grotesk',sans-serif;font-size:14px;resize:none;min-height:76px;line-height:1.65}
        .gbtn{width:100%;padding:15px;border-radius:13px;border:1px solid transparent;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:21px;letter-spacing:3px;transition:all .25s;margin-bottom:22px}
        .rcard{background:var(--s1);border:1px solid var(--b);border-radius:15px;overflow:hidden;margin-bottom:18px;animation:sup .35s cubic-bezier(.16,1,.3,1)}
        @keyframes sup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .raccent{height:3px}
        .rbody{padding:18px}
        .rtext{font-size:16px;line-height:1.72;color:var(--t);margin-bottom:7px}
        .rsign{font-family:'DM Mono',monospace;font-size:11.5px;color:var(--t3);font-style:italic}
        .racts{display:flex;gap:7px;margin-top:14px;padding-top:14px;border-top:1px solid var(--b);flex-wrap:wrap}
        .abtn{display:flex;align-items:center;gap:4px;padding:7px 11px;border-radius:8px;border:1px solid var(--b);background:transparent;color:var(--t2);font-family:'Space Grotesk',sans-serif;font-size:11.5px;cursor:pointer;transition:all .18s;white-space:nowrap}
        .rrow{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}
        .rbtn{flex:1;min-width:64px;padding:9px 5px;border-radius:10px;border:1px solid var(--b);background:var(--s2);cursor:pointer;text-align:center;transition:all .18s;font-family:'Space Grotesk',sans-serif}
        .rbtn.on{border-color:var(--ic,var(--accent));background:var(--s1)}
        .bnav{position:fixed;bottom:0;left:0;right:0;background:rgba(10,10,12,0.98);border-top:1px solid rgba(255,255,255,0.15);padding:10px 16px 24px;display:flex;justify-content:space-around;backdrop-filter:blur(20px);z-index:200;box-shadow:0 -10px 40px rgba(0,0,0,0.8)}
        .nbtn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;border-radius:14px;border:none;background:transparent;cursor:pointer;transition:all .3s ease;color:var(--t2);flex:1;max-width:80px}
        .nbtn:hover{background:rgba(255,255,255,0.08);color:var(--t)}
        .nbtn.on{color:#fff;background:rgba(255,68,68,0.2);position:relative}
        .nbtn.on::after{content:'';position:absolute;bottom:0;left:20%;right:20%;height:3px;background:var(--ic, #ff4444);border-radius:10px;box-shadow:0 0 10px var(--ic, #ff4444)}
        .nbtn.on .ni{transform:scale(1.2);filter:drop-shadow(0 0 8px var(--ic, #ff4444))}
        .ni{font-size:22px;transition:transform .2s}
        .nl{font-family:'DM Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase}
        .hi{background:var(--s1);border:1px solid var(--b);border-radius:11px;padding:13px;cursor:pointer;transition:border-color .18s;margin-bottom:9px}
      `}</style>

      <div className="app">
        <div className="hdr">
          <div className="htitle">Roast Engine</div>
          <div className="hsub">Precision destruction since 2024</div>
          <p style={{ opacity: 0, height: 0, overflow: 'hidden', margin: 0 }}>Impact-Site-Verification: 41a23fa4-8d29-448d-9800-e7ca92b47ab1</p>
        </div>
        <div className="sbar">
          <div className="si"><span className="sn">🔥{profile.streakCount || 1}</span><span className="sl">Streak</span></div>
          <div className="sdiv" />
          <div className="si"><span className="sn" style={{ color: '#f87171' }}>{profile.totalRoasts || 0}</span><span className="sl">Total</span></div>
          <div className="sdiv" />
          <div className="si"><span className="sn" style={{ fontSize: 22, color: 'var(--t2)' }}>{profile.longestStreak || 1}</span><span className="sl">Best</span></div>
        </div>

        {screen === 'roast' && <>
          <div className="plabel">Choose your weapon</div>
          <div className="tabs">
            {INPUT_TYPES.map(t => <button key={t.id} className={`tab ${iType === t.id ? 'on' : ''}`} onClick={() => setIType(t.id)}>{t.icon} {t.label}</button>)}
          </div>

          <div className="plabel">Select your destroyer</div>
          <div className="pcards">
            {PERSONAS.map(p => <div key={p.id} className={`pc ${persona === p.id ? 'on' : ''}`} onClick={() => setPersona(p.id)}>
              <span className="pe">{p.emoji}</span><span className="pn">{p.name}</span><span className="pd">{p.desc}</span>
            </div>)}
          </div>

          <div className="plabel">Set the heat</div>
          <div className="irow">
            {INTENSITIES.map(i => <button key={i.id} className={`ib ${intensity === i.id ? 'on' : ''}`} style={{ '--ic': ICOL[i.id], '--ig': IGLOW[i.id] } as any} onClick={() => setIntensity(i.id)}>
              <span className="ie">{i.emoji}</span><span className="il">{i.label}</span>
            </button>)}
          </div>

          {iType !== 'random' && <div className="icard">
            <textarea className="rtxt" placeholder={INPUT_TYPES.find(t => t.id === iType)?.ph} value={input} maxLength={280} onChange={e => setInput(e.target.value)} />
          </div>}

          <button className="gbtn" style={{ background: `linear-gradient(135deg,${ic},${ic}bb)`, color: '#000', boxShadow: `0 0 28px ${ig}` }} onClick={generate} disabled={generating}>
            {generating ? 'Crafting Destruction...' : iCfg?.btnLabel}
          </button>

          {roast && <div className="rcard">
            <div className="raccent" style={{ background: `linear-gradient(90deg,${ic},transparent)` }} />
            <div className="rbody">
              <div className="rtext">{roast.roastText}</div>
              <div className="rsign">{roast.signoff}</div>
              <div className="racts">
                <button className="abtn" onClick={generate}>🔄 Again</button>
                <button className="abtn" onClick={() => setShowDefend(!showDefend)}>🛡️ Defend</button>
                <button className={`abtn ${roast?.saved ? 'on' : ''}`} onClick={toggleSave}>💾 {roast?.saved ? 'Saved' : 'Save'}</button>
                <ShareMenu 
                  roastId={roast.id} 
                  roastText={roast.roastText} 
                  userId={userId} 
                  className="scale-90 origin-right"
                />
                <button className="abtn" onClick={() => setShowShare(true)}>🖼️ Card</button>
              </div>
              <div className="rrow">
                {RATINGS.map(r => <button key={r.id} className={`rbtn ${rating === r.id ? 'on' : ''}`} onClick={() => handleRate(r.id)}>
                  <span className="re">{r.e}</span><span className="rl">{r.l}</span>
                </button>)}
              </div>
            </div>
          </div>}

          {showDefend && roast && <div className="icard" style={{ animation: 'sup .3s ease' }}>
            <div className="plabel">🛡️ Defend Yourself</div>
            <textarea className="rtxt" style={{ minHeight: 48 }} placeholder="Type your best comeback..." value={comeback} onChange={e => setComeback(e.target.value)} />
            <button className="abtn" style={{ width: '100%', marginTop: 8, borderColor: ic }} onClick={runDefend}>{defending ? 'Judging...' : 'SUBMIT DEFENSE'}</button>
            {defense && <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${defense.won ? '#4ade80' : '#f87171'}` }}>
              <div style={{ fontSize: 13 }}>{defense.judgmentText}</div>
            </div>}
          </div>}
        </>}

        {screen === 'daily' && <>
          <div className="plabel">Daily Roast</div>
          {dailyRoast ? <div className="rcard">
            <div className="raccent" style={{ background: 'var(--gold)' }} />
            <div className="rbody">
              <div className="rtext">{dailyRoast.roastText}</div>
              <div className="rrow">
                {RATINGS.map(r => <button key={r.id} className={`rbtn ${dailyRating === r.id ? 'on' : ''}`} onClick={() => setDailyRating(r.id)}>
                  <span className="re">{r.e}</span><span className="rl">{r.l}</span>
                </button>)}
              </div>
            </div>
          </div> : <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Check back tomorrow.</div>}
        </>}

        {screen === 'battle' && <>
          <div className="plabel">Battle Royale</div>
          <div className="icard">
            <input style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--b)', color: '#fff', padding: 10, outline: 'none', marginBottom: 10 }} placeholder="Battle Topic..." value={battle.topic} onChange={e => setBattle({ ...battle, topic: e.target.value })} />
            <input style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--b)', color: '#fff', padding: 10, outline: 'none', marginBottom: 15 }} placeholder="Opponent Name..." value={battle.opp} onChange={e => setBattle({ ...battle, opp: e.target.value })} />
            <button className="gbtn" style={{ background: ic, color: '#000', marginBottom: 0 }} onClick={startBattle}>START BATTLE</button>
          </div>
          {battle.result && <div className="rcard" style={{ marginTop: 20 }}>
            <div className="rbody">
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><span className="plabel">You</span><div style={{ fontSize: 13 }}>{battle.result.mine}</div></div>
                <div style={{ width: 1, background: 'var(--b)' }} />
                <div style={{ flex: 1 }}><span className="plabel">{battle.opp || 'Opponent'}</span><div style={{ fontSize: 13 }}>{battle.result.theirs}</div></div>
              </div>
            </div>
          </div>}
        </>}

        {screen === 'history' && <>
          <div className="htabs" style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            <button className={`tab ${htab === 'all' ? 'on' : ''}`} onClick={() => setHtab('all')}>All Roasts</button>
            <button className={`tab ${htab === 'trophy' ? 'on' : ''}`} onClick={() => setHtab('trophy')}>🏆 Trophy Case</button>
          </div>
          <div className="hlist">
            {(htab === 'all' ? history : history.filter(h => h.saved)).map((item, i) => (
              <div key={`v2-hist-${item.id || i}`} className="hi" onClick={() => setExpHist(expHist === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {idot(item.intensity)}
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>{item.persona}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <ShareMenu 
                      roastId={item.id} 
                      roastText={item.roastText} 
                      userId={userId} 
                      className="scale-75 origin-right"
                    />
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--t2)', lineClamp: expHist === i ? 'unset' : 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.roastText}</div>
              </div>
            ))}
          </div>
        </>}

        {screen === 'profile' && <>
          <div className="plabel">Your Stats</div>
          <div className="icard">
            <div style={{ marginBottom: 15 }}>
              <span className="plabel">Primary Role</span>
              <div style={{ fontSize: 16, borderBottom: '1px solid var(--b)', paddingBottom: 5 }}>{profile.jobTitle || 'Unemployed Spiritually'}</div>
            </div>
            <div>
              <span className="plabel">Habit of choice</span>
              <div style={{ fontSize: 16 }}>{profile.biggestHabit || 'Questionable choices'}</div>
            </div>
          </div>
        </>}
      </div>

      <div className="bnav">
        <button key="bnav-home" className="nbtn" onClick={() => navigate('/')}>
          <span className="ni">🏠</span><span className="nl">Home</span>
        </button>
        {[
          { id: 'roast', e: '🔥', l: 'Roast' },
          { id: 'daily', e: '⚡', l: 'Daily' },
          { id: 'battle', e: '⚔️', l: 'Battle' },
          { id: 'history', e: '📜', l: 'Past' },
          { id: 'profile', e: '👤', l: 'Me' }
        ].map(n => (
          <button key={`bnav-${n.id}`} className={`nbtn ${screen === n.id ? 'on' : ''}`} onClick={() => setScreen(n.id)}>
            <span className="ni">{n.e}</span><span className="nl">{n.l}</span>
          </button>
        ))}
      </div>

      {toast && <div className="toast" style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--s2)', padding: '10px 16px', borderRadius: 10, fontSize: 12, border: '1px solid var(--b)', zIndex: 200 }}>{toast}</div>}
      {showShare && <ShareCard roastId={roast?.id} roastText={roast?.roastText} persona={roast?.persona} intensity={roast?.intensity} signoff={roast?.signoff} onClose={() => setShowShare(false)} />}
      {weeklyReport && <WeeklyReportCard report={weeklyReport} onDismiss={dismissWeekly} />}
      {milestone && <MilestoneCelebration badgeId={milestone} onDismiss={() => setMilestone(null)} />}
    </div>
  );
}
