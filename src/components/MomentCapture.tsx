import { useRef } from 'react';
import { toPng } from 'html-to-image';

interface MomentCaptureProps {
  roast: {
    text: string;
    photoUrl: string;
    savagenessScore?: number;
    creativityScore?: number;
    overallScore?: number;
    username: string;
  };
  children: React.ReactNode;
}

export default function MomentCapture({ roast, children }: MomentCaptureProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const captureMoment = async () => {
    if (!captureRef.current) return;
    
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#000000',
      });
      
      const link = document.createElement('a');
      link.download = `roast-moment-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch(e) {
      console.error(e);
      alert('Failed to capture moment');
    }
  };

  return (
    <>
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <div ref={captureRef} className="w-[600px] bg-black p-10 rounded-3xl border-4 border-gray-800">
          <div className="text-center">
            <div className="text-6xl mb-6">🔥</div>
            <div className="w-48 h-48 rounded-full mx-auto overflow-hidden border-4 border-purple-500 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              <img src={roast.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${roast.username}`} alt="Roast" className="w-full h-full object-cover" />
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 relative mb-8">
              <div className="absolute -top-4 -left-2 text-5xl text-purple-500 font-serif opacity-50">"</div>
              <p className="text-white text-2xl font-medium leading-relaxed italic z-10 relative">"{roast.text}"</p>
            </div>
            {(roast.savagenessScore !== undefined) && (
              <div className="flex justify-center gap-8 mb-8 bg-gray-900/50 py-4 rounded-xl border border-gray-800">
                <div className="text-center">
                  <div className="text-4xl text-red-500 font-bold font-display">{roast.savagenessScore}/10</div>
                  <div className="text-gray-500 text-xs font-bold tracking-widest mt-1">SAVAGENESS</div>
                </div>
                <div className="w-px h-12 bg-gray-700"></div>
                <div className="text-center">
                  <div className="text-4xl text-purple-500 font-bold font-display">{roast.creativityScore}/10</div>
                  <div className="text-gray-500 text-xs font-bold tracking-widest mt-1">CREATIVITY</div>
                </div>
                <div className="w-px h-12 bg-gray-700"></div>
                <div className="text-center">
                  <div className="text-4xl text-yellow-500 font-bold font-display">{roast.overallScore}/10</div>
                  <div className="text-gray-500 text-xs font-bold tracking-widest mt-1">OVERALL</div>
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="text-white font-bold text-lg mb-1">Roasted by @{roast.username || 'anonymous'}</p>
              <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">ROASTME.SITE</p>
            </div>
          </div>
        </div>
      </div>
      
      <div onClick={captureMoment}>
        {children}
      </div>
    </>
  );
}
