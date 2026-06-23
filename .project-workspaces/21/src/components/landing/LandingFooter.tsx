import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';
import CompaniLogo from '../CompaniLogo';
import AnimatedGradientHeart from '../AnimatedGradientHeart';

function useInstallState() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    if (ios) { setCanInstall(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { canInstall, isIOS, isInstalled, install };
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-6"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-foreground text-sm">Add Compani to your Home Screen</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">1</span>
            <span>Tap the <Share className="inline h-4 w-4 text-blue-400 mx-0.5" /> <strong className="text-foreground">Share</strong> button at the bottom of your browser</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">2</span>
            <span>Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong></span>
          </li>
          <li className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">3</span>
            <span>Tap <strong className="text-foreground">Add</strong> in the top right — done 💛</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function LandingFooter() {
  const { canInstall, isIOS, isInstalled, install } = useInstallState();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    await install();
  };

  return (
    <>
      <footer className="border-t border-border/40 bg-card/50 backdrop-blur-sm py-8 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <CompaniLogo size="sm" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <Link to="/help" className="text-xs text-muted-foreground hover:text-primary transition-colors">FAQ & Help</Link>
            <span className="text-border">·</span>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
            <span className="text-border">·</span>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <span className="text-border">·</span>
            <a href="https://donate.stripe.com/dRm14mbr8dbJ0pLcEjasg01" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <AnimatedGradientHeart size={12} id="footer-support-heart" />
              Support Us
            </a>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Compani adapts to age and permissions. Some features vary based on age and parental settings. 💛
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Compani. All rights reserved.
          </p>

          {!isInstalled && isIOS && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Add to Home Screen (iOS)
              </button>
            </div>
          )}
        </div>
      </footer>

      {showIOSGuide && <IOSInstructions onClose={() => setShowIOSGuide(false)} />}
    </>
  );
}
