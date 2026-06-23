import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Volume2, Check, X, ChevronDown } from 'lucide-react';

/* ─── Types ─── */
interface PreJoinDeviceCheckProps {
  onReady?: (devices: { cameraOk: boolean; micOk: boolean }) => void;
}

/* ─── Speaker test: short beep via WebAudio ─── */
function playTestTone() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
  setTimeout(() => ctx.close(), 1000);
}

/* ═════════════════════════════════════════════════════════
   PreJoinDeviceCheck — Camera, Mic, Speaker
   ═════════════════════════════════════════════════════════ */
export default function PreJoinDeviceCheck({ onReady }: PreJoinDeviceCheckProps) {
  /* ── Camera ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const toggleCamera = useCallback(async () => {
    if (cameraOn && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraOn(true);
      setCameraError(false);
    } catch {
      setCameraError(true);
    }
  }, [cameraOn, cameraStream]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  /* ── Microphone ── */
  const [micOn, setMicOn] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [micError, setMicError] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const toggleMic = useCallback(async () => {
    if (micOn) {
      cancelAnimationFrame(micRafRef.current);
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      setMicOn(false);
      setMicAmplitude(0);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setMicOn(true);
      setMicError(false);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128;
        setMicAmplitude(Math.min(1, avg));
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicError(true);
    }
  }, [micOn]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(micRafRef.current);
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  /* ── Speaker ── */
  const [speakerTested, setSpeakerTested] = useState(false);
  const testSpeaker = () => {
    playTestTone();
    setSpeakerTested(true);
  };

  /* ── Notify parent + persist camera state for room entry ── */
  useEffect(() => {
    onReady?.({ cameraOk: cameraOn, micOk: micOn });
    // Store camera state so the room can auto-enable camera on entry
    sessionStorage.setItem('prejoin-camera-on', cameraOn ? '1' : '0');
  }, [cameraOn, micOn, onReady]);

  /* ── Mic level bar segments ── */
  const micSegments = 12;
  const activeBars = Math.round(micAmplitude * micSegments);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground text-center mb-1">Check your devices</p>

      {/* Camera Preview */}
      <div
        className="relative w-full aspect-video rounded-xl overflow-hidden border"
        style={{ background: 'hsl(250 20% 10%)', borderColor: 'hsl(250 15% 18%)' }}
      >
        {cameraOn && cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <VideoOff className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground/60">
              {cameraError ? 'Camera access denied' : 'Camera is off'}
            </p>
          </div>
        )}
      </div>

      {/* Device buttons row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all active:scale-95 ${
            cameraOn
              ? 'border-primary/30 bg-primary/10'
              : cameraError
                ? 'border-destructive/30 bg-destructive/5'
                : 'hover:bg-white/5'
          }`}
          style={!cameraOn && !cameraError ? { borderColor: 'hsl(250 15% 18%)', background: 'hsl(250 20% 14% / 0.5)' } : {}}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
            cameraOn ? 'bg-primary/20 text-primary' : cameraError ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-muted-foreground'
          }`}>
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </div>
          <span className="text-[10px] font-medium text-foreground">Camera</span>
          {cameraOn && (
            <span className="text-[9px] text-primary flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5" /> On
            </span>
          )}
          {cameraError && (
            <span className="text-[9px] text-destructive flex items-center gap-0.5">
              <X className="h-2.5 w-2.5" /> Denied
            </span>
          )}
        </button>

        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all active:scale-95 ${
            micOn
              ? 'border-primary/30 bg-primary/10'
              : micError
                ? 'border-destructive/30 bg-destructive/5'
                : 'hover:bg-white/5'
          }`}
          style={!micOn && !micError ? { borderColor: 'hsl(250 15% 18%)', background: 'hsl(250 20% 14% / 0.5)' } : {}}
        >
          <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
            micOn ? 'bg-primary/20 text-primary' : micError ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-muted-foreground'
          }`}>
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </div>
          <span className="text-[10px] font-medium text-foreground">Microphone</span>
          {micOn && (
            <div className="flex gap-[2px] h-2 items-end">
              {Array.from({ length: micSegments }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full transition-all duration-75"
                  style={{
                    height: i < activeBars ? `${6 + (i / micSegments) * 6}px` : '3px',
                    background: i < activeBars
                      ? i < micSegments * 0.6 ? 'hsl(var(--primary))' : i < micSegments * 0.85 ? 'hsl(45 100% 55%)' : 'hsl(0 80% 55%)'
                      : 'hsl(250 15% 22%)',
                  }}
                />
              ))}
            </div>
          )}
          {micError && (
            <span className="text-[9px] text-destructive flex items-center gap-0.5">
              <X className="h-2.5 w-2.5" /> Denied
            </span>
          )}
        </button>

        {/* Speaker test */}
        <button
          onClick={testSpeaker}
          className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all active:scale-95 ${
            speakerTested ? 'border-primary/30 bg-primary/10' : 'hover:bg-white/5'
          }`}
          style={!speakerTested ? { borderColor: 'hsl(250 15% 18%)', background: 'hsl(250 20% 14% / 0.5)' } : {}}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
            speakerTested ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'
          }`}>
            <Volume2 className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Speaker</span>
          {speakerTested ? (
            <span className="text-[9px] text-primary flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5" /> Tested
            </span>
          ) : (
            <span className="text-[9px] text-muted-foreground">Tap to test</span>
          )}
        </button>
      </div>
    </div>
  );
}
