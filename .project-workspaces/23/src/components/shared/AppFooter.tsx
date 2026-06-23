import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoCapsule } from './LogoCapsule';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { PwaInstallGuideDialog, type InstallGuideMode } from './PwaInstallGuideDialog';

const FOOTER_LINKS: Record<string, { label: string; path?: string; action?: string }[]> = {
  Product: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projects', path: '/projects' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Signal Lab', path: '/signal-lab' },
    { label: 'Pricing', path: '/pricing' },
  ],
  Resources: [
    { label: 'Help', path: '/help' },
    { label: 'Install App', action: 'install' },
  ],
  Legal: [
    { label: 'Privacy', path: '/privacy' },
    { label: 'Terms', path: '/terms' },
  ],
};

interface AppFooterProps {
  variant?: 'marketing' | 'app';
}

export function AppFooter({ variant = 'marketing' }: AppFooterProps) {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const { isInstalled, install, isIOS, isAndroid } = usePwaInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installGuideMode, setInstallGuideMode] = useState<InstallGuideMode>(isIOS ? 'ios' : isAndroid ? 'android' : 'manual');

  const openGuide = (mode: InstallGuideMode) => {
    setInstallGuideMode(mode);
    setShowInstallGuide(true);
  };

  const handleInstallClick = async () => {
    const result = await install();

    if (result === 'accepted') {
      toast.success('Install prompt opened', {
        description: 'Finish the browser prompt to add IntoIQ to your home screen.',
      });
      return;
    }

    if (result === 'dismissed') {
      toast('Install dismissed', {
        description: 'You can try again any time from this footer or Settings.',
      });
      return;
    }

    if (result === 'preview') return openGuide('preview');

    openGuide(isIOS ? 'ios' : isAndroid ? 'android' : 'manual');
  };

  return (
    <>
      <footer className="relative z-20 border-t border-border/20 px-6 sm:px-10 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Logo column */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <LogoCapsule
              size="sm"
              onClick={() => navigate('/')}
              className="self-start"
            />
            <span className="text-[11px] text-muted-foreground/50">© {year} IntoIQ</span>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-1">
                {heading}
              </span>
              {links.map((link) => {
                if (link.action === 'install') {
                  if (isInstalled) return null;
                  return (
                    <button
                      key={link.label}
                      onClick={handleInstallClick}
                      className="flex items-center gap-1.5 text-[13px] text-muted-foreground/70 hover:text-foreground transition-colors text-left"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {link.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path!)}
                    className="text-[13px] text-muted-foreground/70 hover:text-foreground transition-colors text-left"
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Sign In for marketing */}
          {variant === 'marketing' && (
            <div className="col-span-2 sm:col-span-4 flex justify-center sm:justify-end pt-4 border-t border-border/10">
              <button
                onClick={() => navigate('/login?mode=signin')}
                className="text-[13px] text-primary/80 hover:text-primary transition-colors font-medium"
              >
                Sign In →
              </button>
            </div>
          )}
        </div>
      </footer>

      <PwaInstallGuideDialog mode={installGuideMode} open={showInstallGuide} onOpenChange={setShowInstallGuide} />
    </>
  );
}
