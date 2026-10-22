import { useState, useRef } from "react";
import { TwitterIcon, WhatsAppIcon } from "../../components/ShareIcons";

// ─── SHARE CARD GENERATOR ─────────────────────────────────────

const INTENSITY_COLORS: Record<string, string> = {
  friendly: '#4ade80',
  roasted: '#fb923c',
  savage: '#f87171',
  scorched: '#ef4444',
};

const INTENSITY_LABELS: Record<string, string> = {
  friendly: '😄 Friendly Fire',
  roasted: '🔥 Roasted',
  savage: '💀 Savage Mode',
  scorched: '☢️ Scorched Earth',
};

const PERSONA_LABELS: Record<string, string> = {
  comedian: '🎤 The Comedian',
  shakespeare: '🎭 The Bard',
  corporate: '💼 Corporate Karen',
  genz: '✨ Gen Z Oracle',
  british: '🎩 British Aristocrat',
  dad: '😔 Disappointed Dad',
  philosopher: '🏛️ Ancient Philosopher',
};

export function ShareCard({ roastId, roastText, persona, intensity, signoff, onClose }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState('square');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const iColor = INTENSITY_COLORS[intensity] || '#fb923c';
  const iLabel = INTENSITY_LABELS[intensity] || '';
  const pLabel = PERSONA_LABELS[persona] || '';

  const shareLink = roastId ? `${window.location.origin}/roast/${roastId}` : window.location.origin;

  async function exportCard() {
    setExporting(true);
    try {
      // @ts-ignore
      const { default: html2canvas } = await import('html2canvas');
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#0a0a0b',
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const link = document.createElement('a');
        link.download = `roast-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('[ShareCard] Export error:', err);
      handleCopy();
    } finally {
      setExporting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roastText + '\n' + (signoff || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }

  async function handleWebShare() {
    if (!navigator.share) { handleCopy(); return; }
    try {
      await navigator.share({
        title: 'Roast Engine destroyed me',
        text: roastText + '\n' + (signoff || '') + '\n\nGet roasted: ' + shareLink,
      });
    } catch (_) {}
  }

  const handleSocialShare = (platform: 'twitter' | 'whatsapp') => {
    const text = `${roastText}\n${signoff || ''}\n\nRead the full destruction here: ${shareLink}`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank');
  };

  const cardStyle: any = {
    square: { width: 400, minHeight: 400 },
    story: { width: 360, minHeight: 640 },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 20, flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['square', 'story'].map(f => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: `1px solid ${format === f ? iColor : 'rgba(255,255,255,0.1)'}`,
              background: format === f ? `${iColor}22` : 'transparent',
              color: format === f ? iColor : '#888',
              fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
            }}
          >{f === 'square' ? '◻ Square' : '◱ Story'}</button>
        ))}
      </div>

      <div
        ref={cardRef}
        style={{
          ...cardStyle[format],
          background: '#0a0a0b',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid rgba(255,255,255,0.08)`,
          fontFamily: "'Space Grotesk', sans-serif",
          position: 'relative',
        }}
      >
        <div style={{ height: 4, background: `linear-gradient(90deg, ${iColor}, transparent)` }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 28, gap: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 11, letterSpacing: 4, color: 'rgba(255,255,255,0.25)', marginBottom: 'auto' }}>ROAST ENGINE</div>
          <div style={{ fontSize: format === 'story' ? 22 : 18, lineHeight: 1.7, color: '#f0f0f0', fontWeight: 500, margin: '32px 0 16px', flex: format === 'story' ? 1 : 'unset' }}>{roastText}</div>
          {signoff && <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 24 }}>{signoff}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <div style={{ fontSize: 11, color: iColor }}>{iLabel}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{pLabel}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>Get roasted<br />ais-roast.app</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => handleSocialShare('twitter')}>
          <TwitterIcon /> Twitter
        </button>
        <button style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => handleSocialShare('whatsapp')}>
          <WhatsAppIcon /> WhatsApp
        </button>
        <button style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer' }} onClick={exportCard}>{exporting ? '...' : '⬇ Save Image'}</button>
        <button style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer' }} onClick={handleCopy}>{copied ? '✅ Copied' : '📋 Copy Link'}</button>
        <button style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer' }} onClick={handleWebShare}>📤 Share</button>
        <button style={{ padding: '10px 18px', background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer' }} onClick={onClose}>✕ Close</button>
      </div>
    </div>
  );
}

export function MilestoneCelebration({ badgeId, onDismiss }: any) {
  const BADGE_META: any = {
    three_day_roast: { emoji: '🥉', label: '3-Day Roast', sub: 'Three days of voluntary destruction. It begins.' },
    weekly_roasted: { emoji: '🔥', label: 'Weekly Roasted', sub: 'A full week. You have made it a habit.' },
    fortnight_of_shame: { emoji: '💀', label: 'Fortnight of Shame', sub: 'Two weeks. The therapist is taking notes.' },
    chronically_roasted: { emoji: '☠️', label: 'Chronically Roasted', sub: '30 days. This is your personality now.' },
    masochist_legend: { emoji: '👑', label: 'Masochist Legend', sub: '100 days. You are the roast app. The roast app is you.' },
  };

  const badge = BADGE_META[badgeId];
  if (!badge) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 32, cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 72 }}>{badge.emoji}</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 12, color: '#f59e0b', marginBottom: 8 }}>BADGE UNLOCKED</div>
        <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 36, color: '#f0f0f0', marginBottom: 10 }}>{badge.label}</div>
        <div style={{ fontSize: 14, color: '#888', maxWidth: 280, margin: '0 auto' }}>{badge.sub}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#444' }}>tap to continue</div>
    </div>
  );
}

export function WeeklyReportCard({ report, onDismiss }: any) {
  if (!report) return null;

  const stats = [
    { label: 'Roasts', val: report.totalRoasts || 0, ic: '🔥' },
    { label: 'Comebacks', val: report.totalComebacks || 0, ic: '🛡️' },
    { label: 'Rating', val: report.avgRating ? report.avgRating.toFixed(1) : '0.0', ic: '⭐' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.95)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{
        width: '100%', maxWidth: 360, background: '#111114', borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)', padding: 28, overflow: 'hidden',
        position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
        
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 13, letterSpacing: 3.5, color: '#f59e0b', marginBottom: 6 }}>WEEKLY ANALYSIS</div>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: 1.5, color: '#f0f0f0' }}>YOUR SHAME REPORT</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.ic}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 8, letterSpacing: 1, color: '#555', marginTop: 4, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#555', textTransform: 'uppercase', marginBottom: 12 }}>Intensity Breakdown</div>
          {['scorched', 'savage', 'roasted', 'friendly'].map((i: string) => {
            const count = report.intensities?.[i] || 0;
            const pct = report.totalRoasts ? (count / report.totalRoasts) * 100 : 0;
            const colors: any = { scorched: '#ef4444', savage: '#f87171', roasted: '#fb923c', friendly: '#4ade80' };
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#888', textTransform: 'capitalize' }}>{i}</span>
                  <span style={{ color: '#ccc' }}>{count}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: colors[i], width: `${pct}%`, borderRadius: 3, transition: 'width 1s ease-out' }} />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, background: '#f59e0b',
            color: '#000', fontFamily: "'Bebas Neue', monospace", fontSize: 20,
            letterSpacing: 2, border: 'none', cursor: 'pointer', transition: 'transform 0.2s'
          }}
          onMouseDown={(e: any) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
        >
          I ACCEPT MY FATE
        </button>
      </div>
    </div>
  );
}
