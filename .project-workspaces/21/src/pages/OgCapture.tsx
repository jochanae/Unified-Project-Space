import { useRef } from 'react';
import html2canvas from 'html2canvas';
import CompaniLogo from '@/components/CompaniLogo';

export default function OgCapture() {
  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!captureRef.current) return;
    const canvas = await html2canvas(captureRef.current, {
      width: 1200,
      height: 630,
      scale: 2,
      backgroundColor: '#0f1221',
    });
    const link = document.createElement('a');
    link.download = 'og-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: '#0f1221' }}>
      {/* Capture area */}
      <div
        ref={captureRef}
        style={{
          width: 1200,
          height: 630,
          background: '#0f1221',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div style={{ transform: 'scale(3.5)', transformOrigin: 'center' }}>
          <CompaniLogo size="lg" animate={false} showTagline />
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="px-6 py-3 rounded-lg text-sm font-semibold"
        style={{ background: '#E8547C', color: '#fff' }}
      >
        Download OG Image (1200×630)
      </button>
    </div>
  );
}
