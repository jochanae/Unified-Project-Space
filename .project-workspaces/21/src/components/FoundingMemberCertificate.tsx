import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface FoundingMemberCertificateProps {
  serialNumber: number;
  userName: string;
  /** If true, renders at full 1080×1350 for download; otherwise scales to fit */
  onDownload?: () => void;
}

const PAD = 60;
const W = 1080;
const H = 1350;

function drawCertificate(
  ctx: CanvasRenderingContext2D,
  serial: number,
  name: string
) {
  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0A0B1E');
  bgGrad.addColorStop(0.5, '#0F1232');
  bgGrad.addColorStop(1, '#0A0B1E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle radial glow ──
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 500);
  glow.addColorStop(0, 'rgba(212, 175, 55, 0.06)');
  glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Gold border ──
  const bw = 3;
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = bw;
  ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  // Inner fine border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD + 12, PAD + 12, W - (PAD + 12) * 2, H - (PAD + 12) * 2);

  // ── Top ornamental line ──
  const lineY = PAD + 40;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + 30, lineY);
  ctx.lineTo(W - PAD - 30, lineY);
  ctx.stroke();

  // ── Header text ──
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.font = '500 11px Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('INTO INNOVATIONS, LLC  •  CERTIFICATE OF PRESENCE', W / 2, lineY + 28);
  ctx.letterSpacing = '0px';

  // ── Main title ──
  ctx.fillStyle = '#FAF9F6';
  ctx.font = '200 72px Arial, sans-serif';
  ctx.fillText('FOUNDING', W / 2, 260);
  ctx.fillText('MEMBER', W / 2, 340);

  ctx.fillStyle = '#D4AF37';
  ctx.font = '300 28px Arial, sans-serif';
  ctx.letterSpacing = '12px';
  ctx.fillText('INSCRIPTION', W / 2, 395);
  ctx.letterSpacing = '0px';

  // ── Divider ──
  const divY = 435;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, divY);
  ctx.lineTo(W / 2 + 120, divY);
  ctx.stroke();

  // ── Diamond ornament ──
  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.moveTo(W / 2, divY - 5);
  ctx.lineTo(W / 2 + 5, divY);
  ctx.lineTo(W / 2, divY + 5);
  ctx.lineTo(W / 2 - 5, divY);
  ctx.closePath();
  ctx.fill();

  // ── Serial number ──
  const serialStr = String(serial).padStart(3, '0');
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.font = '500 12px Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(`INSCRIPTION NO.`, W / 2, 490);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#D4AF37';
  ctx.font = '300 48px Arial, sans-serif';
  ctx.fillText(`${serialStr}/100`, W / 2, 545);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.font = '500 11px Arial, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('STATUS: CENTURION CERTIFIED', W / 2, 585);
  ctx.letterSpacing = '0px';

  // ── Divider ──
  const div2Y = 625;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.beginPath();
  ctx.moveTo(PAD + 80, div2Y);
  ctx.lineTo(W - PAD - 80, div2Y);
  ctx.stroke();

  // ── Given to ──
  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.font = '500 12px Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('GIVEN TO', W / 2, 670);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#FAF9F6';
  ctx.font = '200 42px Arial, sans-serif';
  ctx.fillText(name, W / 2, 730);

  // ── Achievement text ──
  const body = `This document verifies that ${name} played a seminal role in the genesis of Project Compani. Through insightful feedback and emotional intelligence, you have helped define the future of digital presence.`;
  ctx.fillStyle = 'rgba(230, 228, 222, 0.55)';
  ctx.font = '300 15px Arial, sans-serif';
  ctx.textAlign = 'center';

  // Word-wrap
  const maxW = W - PAD * 2 - 120;
  const words = body.split(' ');
  let line = '';
  let y = 800;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), W / 2, y);
      line = word + ' ';
      y += 24;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), W / 2, y);

  // ── Lower divider ──
  const div3Y = 960;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.beginPath();
  ctx.moveTo(PAD + 80, div3Y);
  ctx.lineTo(W - PAD - 80, div3Y);
  ctx.stroke();

  // ── Date ──
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.font = '400 12px Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(dateStr.toUpperCase(), W / 2, 1000);
  ctx.letterSpacing = '0px';

  // ── Founder signature (left) ──
  ctx.textAlign = 'left';
  const sigX = PAD + 80;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.font = '400 10px Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('AUTHORIZED BY', sigX, 1070);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#FAF9F6';
  ctx.font = 'italic 300 22px Georgia, serif';
  ctx.fillText('Jochanae Yawn', sigX, 1105);

  ctx.fillStyle = 'rgba(230, 228, 222, 0.4)';
  ctx.font = '400 11px Arial, sans-serif';
  ctx.fillText('Founder, Into Innovations LLC', sigX, 1130);

  // ── Compani logo area (right) ──
  ctx.textAlign = 'right';
  const logoX = W - PAD - 80;
  ctx.fillStyle = '#FAF9F6';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('Companı', logoX, 1100);

  // Heart dot (small colored circle above the i)
  ctx.fillStyle = '#E8547C';
  ctx.beginPath();
  ctx.arc(logoX - 4, 1083, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.font = '500 9px Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('YOUR SPACE  •  YOUR PACE', logoX, 1125);
  ctx.letterSpacing = '0px';

  // ── Bottom ornamental line ──
  const botLineY = H - PAD - 40;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + 30, botLineY);
  ctx.lineTo(W - PAD - 30, botLineY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.font = '400 9px Arial, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('PROJECT COMPANI  •  BETA PHASE I  •  CENTURION PROTOCOL', W / 2, botLineY + 20);
  ctx.letterSpacing = '0px';
}

export default function FoundingMemberCertificate({
  serialNumber,
  userName,
}: FoundingMemberCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCertificate(ctx, serialNumber, userName);
  }, [serialNumber, userName]);

  // Render on mount and when data changes
  const canvasCallback = useCallback(
    (node: HTMLCanvasElement | null) => {
      (canvasRef as any).current = node;
      if (node) {
        requestAnimationFrame(renderCanvas);
      }
    },
    [renderCanvas]
  );

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Compani_Founding_Member_${String(serialNumber).padStart(3, '0')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl">
        <canvas
          ref={canvasCallback}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
      <Button
        onClick={handleDownload}
        variant="outline"
        className="gap-2 border-primary/20 text-primary hover:bg-primary/10"
      >
        <Download className="h-4 w-4" />
        Download Inscription (.png)
      </Button>
    </div>
  );
}
