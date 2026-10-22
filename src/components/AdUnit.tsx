/*
import { useEffect, useRef } from 'react';

interface AdUnitProps {
  type: 'feed' | 'banner' | 'sidebar';
  slot?: string;
}

export default function AdUnit({ type, slot }: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    
    const container = document.getElementById(`ad-container-${slot || 'default'}`);
    if (!container) return;

    const pushAd = () => {
      if (pushed.current) return;
      try {
        // @ts-ignore
        const adsbygoogle = (window.adsbygoogle = window.adsbygoogle || []);
        adsbygoogle.push({});
        pushed.current = true;
      } catch (e) {
        if (e instanceof Error && !e.message.includes('already have ads')) {
          console.error('AdSense error:', e);
        }
      }
    };

    // Check if container has width
    if (container.offsetWidth > 0) {
      pushAd();
    } else {
      // Wait for width using ResizeObserver
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            pushAd();
            observer.disconnect();
          }
        }
      });
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, [slot]);

  const getStyles = () => {
    switch (type) {
      case 'feed':
        return 'w-full h-64 bg-gallery-white/5 border-2 border-dashed border-gallery-white/20 flex items-center justify-center my-8';
      case 'banner':
        return 'w-full h-24 bg-gallery-white/5 border-t border-gallery-white/10 flex items-center justify-center fixed bottom-0 left-0 z-40';
      case 'sidebar':
        return 'w-full h-96 bg-gallery-white/5 border-2 border-dashed border-gallery-white/20 flex items-center justify-center';
      default:
        return '';
    }
  };

  return (
    <div id={`ad-container-${slot || 'default'}`} className={getStyles()}>
      <div className="w-full text-center px-4">
        <p className="text-[10px] font-mono text-gallery-white/20 uppercase tracking-[0.3em] mb-2">Advertisement</p>
        
        <ins className="adsbygoogle"
             style={{ display: 'block', minHeight: '90px' }}
             data-ad-client="ca-pub-5658917917005383"
             data-ad-slot={slot || '8440239121'}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>

        <div className="mt-4 opacity-0 hover:opacity-100 transition-opacity">
          <a 
            href="https://amzn.to/48ldi2W" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="text-[10px] font-mono text-gallery-white/40 group-hover:text-gallery-white transition-colors">
              Support RoastMe: Check out today's top pick for creators →
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
*/

export default function AdUnit() {
  return null;
}
