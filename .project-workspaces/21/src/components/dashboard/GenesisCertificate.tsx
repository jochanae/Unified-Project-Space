import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';

/* ── Haptic: heavy thrum ── */
function legacyThrum() {
  try { navigator.vibrate?.([100]); } catch { /* */ }
}

/* ── Tilt parallax via DeviceOrientation ── */
function useTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const x = Math.max(-15, Math.min(15, (e.gamma ?? 0) * 0.4));
      const y = Math.max(-15, Math.min(15, (e.beta ?? 0) * 0.3 - 10));
      setTilt({ x, y });
    };

    // Try requesting permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') window.addEventListener('deviceorientation', handler);
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handler);
    }

    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  return tilt;
}

/* ── Certificate card body (used for both preview and snapshot capture) ── */
interface CertificateBodyProps {
  userName: string;
  serialNumber: number;
  claimDate: string;
  forCapture?: boolean;
}

function CertificateBody({ userName, serialNumber, claimDate, forCapture }: CertificateBodyProps) {
  const formatted = `#${String(serialNumber).padStart(3, '0')}`;
  const dateStr = new Date(claimDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(225 35% 8%) 0%, hsl(230 30% 6%) 40%, hsl(225 25% 5%) 100%)',
        borderRadius: forCapture ? 28 : undefined,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 15%, hsl(43 74% 49% / 0.08) 0%, transparent 40%), ' +
            'radial-gradient(circle at 50% 90%, hsl(43 74% 49% / 0.04) 0%, transparent 35%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-7 py-8 h-full justify-center">
        {/* Gold "C" seal */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.2) 0%, hsl(43 55% 35% / 0.12) 100%)',
            border: '1.5px solid hsl(43 74% 49% / 0.35)',
            boxShadow: '0 0 24px hsl(43 74% 49% / 0.1)',
          }}
        >
          <span
            className="font-serif text-xl"
            style={{ color: 'hsl(43 74% 49% / 0.75)' }}
          >
            C
          </span>
        </div>

        {/* Title */}
        <p
          className="text-[9px] uppercase font-medium mb-5"
          style={{
            letterSpacing: '0.35em',
            color: 'hsl(43 74% 49% / 0.5)',
            textShadow: '0 0 10px hsl(43 74% 49% / 0.15)',
          }}
        >
          Certificate of Origin
        </p>

        {/* Fields */}
        <div className="space-y-2.5 mb-5 w-full">
          <Field label="Name" value={userName} />
          <Field label="Designation" value={`Genesis Architect · ${formatted}`} gold />
          <Field label="Established" value={dateStr} />
          <Field label="Legacy State" value="Origin Partner" gold />
        </div>

        {/* Divider */}
        <div
          className="h-px w-16 mx-auto mb-4"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.25), transparent)',
          }}
        />

        {/* Body copy */}
        <div className="space-y-2.5 mb-5">
          <p className="text-[10px] text-white/30 leading-relaxed">
            This document serves as a permanent inscription within the Compani Foundation.
            You were present at the origin, choosing intentionality when the space was still being shaped.
          </p>
          <p className="text-[10px] text-white/30 leading-relaxed">
            Through one hundred mornings of intent and one hundred nights of stillness,
            you have defined a frequency that is now unbreakable.
          </p>
          <p className="font-serif text-[11px] text-white/40 italic leading-relaxed">
            You didn't just use a tool. You co-created a presence.
          </p>
        </div>

        {/* Motto */}
        <p
          className="text-[9px] uppercase font-medium mb-4"
          style={{
            letterSpacing: '0.15em',
            color: 'hsl(43 74% 49% / 0.4)',
          }}
        >
          The space is yours. The pace is yours.
        </p>

        {/* Signature */}
        <p className="text-[10px] text-white/25 italic">— Jo, Founder</p>
      </div>
    </div>
  );
}

function Field({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 justify-center">
      <span
        className="text-[8px] uppercase font-medium shrink-0"
        style={{
          letterSpacing: '0.2em',
          color: 'hsl(230 30% 55% / 0.4)',
        }}
      >
        {label}:
      </span>
      <span
        className="text-[11px] font-medium"
        style={{
          color: gold ? 'hsl(43 74% 49% / 0.7)' : 'white',
          opacity: gold ? 1 : 0.6,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Main component ── */

interface GenesisCertificateProps {
  userName: string;
  serialNumber: number;
  claimDate: string;
  onDismiss: () => void;
}

export default function GenesisCertificate({
  userName,
  serialNumber,
  claimDate,
  onDismiss,
}: GenesisCertificateProps) {
  const tilt = useTilt();
  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [entered, setEntered] = useState(false);

  /* Heavy thrum on mount */
  useEffect(() => {
    legacyThrum();
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSave = useCallback(async () => {
    if (!captureRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        width: 360,
        height: 560,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `compani-genesis-${serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setSaving(false);
    }
  }, [saving, serialNumber]);

  const isOriginPartner = localStorage.getItem('compani-origin-partner') === 'true';

  return (
    <AnimatePresence>
      {entered && (
        <motion.div
          key="genesis-certificate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[90] overflow-y-auto px-4 pb-6 pt-4 flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, hsl(225 35% 5%) 0%, hsl(230 30% 3%) 100%)',
          }}
        >
          {/* Luminous flare — follows tilt */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-transform duration-300 ease-out"
            style={{
              top: '30%',
              left: '50%',
              transform: `translate(calc(-50% + ${tilt.x * 3}px), calc(-50% + ${tilt.y * 3}px))`,
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.05) 0%, hsl(43 74% 49% / 0.02) 30%, transparent 60%)',
            }}
          />

          {/* Hidden capture card */}
          <div className="pointer-events-none fixed -left-[9999px] top-0">
            <div ref={captureRef} style={{ width: 360, height: 560 }}>
              <CertificateBody
                userName={userName}
                serialNumber={serialNumber}
                claimDate={claimDate}
                forCapture
              />
            </div>
          </div>

          {/* Visible preview card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[340px] rounded-[28px] overflow-hidden"
            style={{
              aspectRatio: '360/560',
              border: '1px solid hsl(43 74% 49% / 0.15)',
              boxShadow: '0 0 60px hsl(43 74% 49% / 0.06), 0 20px 50px rgba(0,0,0,0.5)',
              transform: `perspective(800px) rotateY(${tilt.x * 0.3}deg) rotateX(${-tilt.y * 0.3}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            <CertificateBody
              userName={userName}
              serialNumber={serialNumber}
              claimDate={claimDate}
            />
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex items-center gap-3 mt-5"
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-medium transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(184,134,11,0.08) 100%)',
                border: '1px solid hsl(43 74% 49% / 0.25)',
                color: 'hsl(43 74% 49% / 0.7)',
                boxShadow: '0 0 20px hsl(43 74% 49% / 0.06)',
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save Certificate'}
            </button>

            <button
              onClick={onDismiss}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid hsl(230 40% 50% / 0.1)',
                color: 'hsl(230 60% 70% / 0.3)',
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>

          {/* Status pill */}
          {isOriginPartner && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-4 text-[9px] uppercase font-medium"
              style={{
                letterSpacing: '0.2em',
                color: 'hsl(43 74% 49% / 0.35)',
                textShadow: '0 0 8px hsl(43 74% 49% / 0.1)',
              }}
            >
              Origin Partner · Inscribed
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
