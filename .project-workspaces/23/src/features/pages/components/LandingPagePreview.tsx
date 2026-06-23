import { useState, useRef, useEffect } from 'react';
import { Pencil, Mail, MousePointerClick, Star, ArrowDown, Loader2, Copy, Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FieldLockIndicator, type FieldLockInfo } from '@/features/collab';

interface LandingPageData {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_subtext?: string;
  optin_heading?: string;
  service_area_zips?: string[];
  service_area_label?: string;
  service_area_required?: boolean;
  features: { title: string; description: string }[];
  social_proof: string;
  hero_image?: string;
}

export interface FieldLockApi {
  acquire: (key: string) => Promise<boolean>;
  release: (key: string) => Promise<void>;
  lockedBySomeoneElse: (key: string) => FieldLockInfo | null;
  enabled: boolean;
}

interface LandingPagePreviewProps {
  landingPage: LandingPageData;
  onUpdateField: (field: string, value: string) => void;
  onUpdateFeature: (index: number, field: 'title' | 'description', value: string) => void;
  generatingImage?: boolean;
  fieldLockApi?: FieldLockApi;
  /** Optional project slug used to show the prospective public URL placeholder */
  slug?: string;
}

/** Small copy button — appears on hover, copies given text */
function CopyButton({ text, label = 'section', className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Copied ${label}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 z-20 h-7 w-7 rounded-md flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm border border-border/40',
        'opacity-0 group-hover/section:opacity-100 transition-opacity',
        'hover:bg-primary/10 hover:border-primary/40',
        className,
      )}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

/** Inline editable text — click to edit, Enter/blur to save. Honors collaborative field locks when api supplied. */
function EditableText({ value, onChange, className, tag: Tag = 'p', style, lockKey, fieldLockApi }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  style?: React.CSSProperties;
  lockKey?: string;
  fieldLockApi?: FieldLockApi;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setText(value); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const remoteLock = lockKey && fieldLockApi ? fieldLockApi.lockedBySomeoneElse(lockKey) : null;
  const isLockedByOther = !!remoteLock;

  const tryEnterEdit = async () => {
    if (isLockedByOther) {
      toast.info(`${remoteLock!.locked_by_name || 'A teammate'} is editing this`);
      return;
    }
    if (lockKey && fieldLockApi?.enabled) {
      const ok = await fieldLockApi.acquire(lockKey);
      if (!ok) {
        toast.info('A teammate just claimed this field');
        return;
      }
    }
    setEditing(true);
  };

  const exitEdit = (commit: boolean) => {
    setEditing(false);
    if (commit) onChange(text);
    if (lockKey && fieldLockApi?.enabled) fieldLockApi.release(lockKey);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => exitEdit(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') exitEdit(true);
          if (e.key === 'Escape') { setText(value); exitEdit(false); }
        }}
        className={cn('bg-transparent border-b-2 border-primary/60 outline-none w-full', className)}
      />
    );
  }

  return (
    <Tag
      className={cn(
        'cursor-pointer group relative',
        isLockedByOther && 'opacity-70 cursor-not-allowed',
        className,
      )}
      onClick={tryEnterEdit}
      style={style}
    >
      {value}
      {isLockedByOther ? (
        <FieldLockIndicator lock={remoteLock} className="ml-2 align-middle" />
      ) : (
        <Pencil className="h-3 w-3 text-primary/40 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Tag>
  );
}

export function LandingPagePreview({ landingPage, onUpdateField, onUpdateFeature, generatingImage, fieldLockApi, slug }: LandingPagePreviewProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const serviceAreaZips = Array.isArray(landingPage.service_area_zips) ? landingPage.service_area_zips : [];
  const serviceAreaText = serviceAreaZips.join(', ');

  const buildFullText = () => {
    const parts: string[] = [
      landingPage.headline,
      '',
      landingPage.subheadline,
      '',
      `→ ${landingPage.cta_text}`,
    ];
    if (landingPage.cta_subtext) parts.push(landingPage.cta_subtext);
    parts.push('', '— Features —');
    landingPage.features.forEach((f, i) => {
      parts.push('', `${i + 1}. ${f.title}`, f.description);
    });
    parts.push(
      '',
      `— ${landingPage.optin_heading || 'Ready to get started?'} —`,
      `[Email]${landingPage.service_area_required ? ' + [ZIP code]' : ''} → ${landingPage.cta_text}`,
      '',
      landingPage.social_proof,
    );
    return parts.join('\n');
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildFullText());
      setCopiedAll(true);
      toast.success('All page text copied');
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="relative rounded-2xl border border-border/30 overflow-hidden shadow-[0_0_80px_hsl(var(--primary)/0.06)]">
      {/* Browser chrome mockup */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-card/60 backdrop-blur-md border-b border-border/30 min-w-0">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 min-w-0 ml-2 sm:mx-4">
          <div
            className="bg-muted/30 rounded-md px-3 py-1 text-[10px] text-muted-foreground font-mono truncate text-left max-w-[220px] sm:max-w-none sm:text-center cursor-help"
            title="Your custom public link locks in automatically upon hitting Publish."
          >
            intoiq.app/p/{slug || 'your-slug'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[10px] font-medium',
            'border transition-colors',
            copiedAll
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-background/60 border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40',
          )}
          title="Copy all page text"
          aria-label="Copy all page text"
        >
          {copiedAll ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="hidden sm:inline">{copiedAll ? 'Copied' : 'Copy all'}</span>
        </button>
      </div>

      {/* Page content — scrollable preview using theme tokens */}
      <div className="max-h-[70vh] overflow-y-auto bg-background text-foreground">
        {/* === HERO SECTION === */}
        <section className="relative px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16 text-center overflow-hidden group/section">
          <CopyButton
            text={[landingPage.headline, landingPage.subheadline, `→ ${landingPage.cta_text}`, landingPage.cta_subtext || ''].filter(Boolean).join('\n\n')}
            label="hero"
          />
          {landingPage.hero_image ? (
            <div className="absolute inset-0 z-0">
              <img src={landingPage.hero_image} alt="Hero" className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] bg-primary/5" />
            </div>
          )}

          {/* Loading indicator for image generation */}
          {generatingImage && !landingPage.hero_image && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-primary/10 border border-primary/20">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-primary">Generating hero image…</span>
            </div>
          )}

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <EditableText
              value={landingPage.headline}
              onChange={v => onUpdateField('headline', v)}
              tag="h1"
              className="text-2xl sm:text-4xl lg:text-5xl font-serif leading-tight tracking-tight text-foreground"
              lockKey="landing.headline"
              fieldLockApi={fieldLockApi}
            />
            <EditableText
              value={landingPage.subheadline}
              onChange={v => onUpdateField('subheadline', v)}
              className="text-base sm:text-lg max-w-lg mx-auto leading-relaxed text-muted-foreground"
              lockKey="landing.subheadline"
              fieldLockApi={fieldLockApi}
            />
            <div className="pt-4">
              <EditableText
                value={landingPage.cta_text}
                onChange={v => onUpdateField('cta_text', v)}
                tag="span"
                className={cn(
                  'inline-block px-8 py-3.5 rounded-xl font-semibold text-sm',
                  'shadow-lg hover:shadow-xl transition-shadow',
                  'bg-primary text-primary-foreground'
                )}
                lockKey="landing.cta_text"
                fieldLockApi={fieldLockApi}
              />
            </div>
            <EditableText
              value={landingPage.cta_subtext || 'Add a reassuring tagline…'}
              onChange={v => onUpdateField('cta_subtext', v)}
              className="text-xs sm:text-sm text-muted-foreground/70 italic max-w-md mx-auto"
              lockKey="landing.cta_subtext"
              fieldLockApi={fieldLockApi}
            />
            <div className="flex items-center justify-center gap-1.5 pt-4 text-foreground/30">
              <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
              <span className="text-xs">Scroll to explore</span>
            </div>
          </div>
        </section>

        {/* === FEATURES SECTION === */}
        <section className="relative px-6 py-16 group/section">
          <CopyButton
            text={landingPage.features.map((f, i) => `${i + 1}. ${f.title}\n${f.description}`).join('\n\n')}
            label="features"
          />
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {landingPage.features.map((f, i) => (
                <div
                  key={i}
                  className="group/feature relative rounded-xl p-6 transition-all duration-300 bg-card/30 border border-border/20 backdrop-blur-md"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-primary/10">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <EditableText
                    value={f.title}
                    onChange={v => onUpdateFeature(i, 'title', v)}
                    tag="h3"
                    className="font-semibold text-sm mb-2 text-foreground"
                  />
                  <EditableText
                    value={f.description}
                    onChange={v => onUpdateFeature(i, 'description', v)}
                    className="text-xs leading-relaxed text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === OPT-IN / CTA SECTION === */}
        <section className="relative px-6 py-16 group/section">
          <CopyButton
            text={`${landingPage.optin_heading || 'Ready to get started?'}\n[Email]${landingPage.service_area_required ? ' + [ZIP code]' : ''} → ${landingPage.cta_text}`}
            label="opt-in"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
          <div className="relative max-w-md mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <EditableText
              value={landingPage.optin_heading || 'Ready to get started?'}
              onChange={v => onUpdateField('optin_heading', v)}
              tag="h2"
              className="text-xl font-serif text-foreground"
            />
            <div className="rounded-xl border border-border/25 bg-card/25 p-3 text-left space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Service-area targeting</span>
              </div>
              <EditableText
                value={landingPage.service_area_label || 'We qualify leads by ZIP code.'}
                onChange={v => onUpdateField('service_area_label', v)}
                className="text-xs text-muted-foreground"
              />
              <input
                value={serviceAreaText}
                onChange={e => onUpdateField('service_area_zips', e.target.value)}
                placeholder="ZIPs you serve, separated by commas"
                className="h-9 w-full rounded-lg border border-border/25 bg-background/40 px-3 text-xs text-foreground outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 h-11 rounded-lg flex items-center px-4 border border-border/20 bg-card/30 min-w-0">
                <span className="text-sm text-muted-foreground/40">Enter your email…</span>
              </div>
              {landingPage.service_area_required && (
                <div className="w-full sm:w-28 h-11 rounded-lg flex items-center px-4 border border-border/20 bg-card/30 min-w-0">
                  <span className="text-sm text-muted-foreground/40">ZIP…</span>
                </div>
              )}
              <div className={cn(
                'px-5 h-11 rounded-lg flex items-center justify-center gap-2 shrink-0',
                'font-medium text-sm bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
              )}>
                <MousePointerClick className="h-4 w-4" />
                <EditableText
                  value={landingPage.cta_text}
                  onChange={v => onUpdateField('cta_text', v)}
                  tag="span"
                  className="text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </section>

        {/* === SOCIAL PROOF === */}
        <section className="relative px-6 py-10 border-t border-border/20 group/section">
          <CopyButton text={landingPage.social_proof} label="social proof" />
          <div className="max-w-2xl mx-auto text-center">
            <EditableText
              value={landingPage.social_proof}
              onChange={v => onUpdateField('social_proof', v)}
              className="text-sm italic text-muted-foreground/50"
            />
          </div>
        </section>

        {/* === FOOTER === */}
        <footer className="px-6 py-6 text-center border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/30">Built with IntoIQ — From idea to live funnel in minutes</p>
        </footer>
      </div>
    </div>
  );
}
