import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, MapPin, CalendarPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  VIBES,
  DEFAULT_RSVP_FIELDS,
  buildIcsDataUrl,
  type AssetConfig,
  type TemplateId,
  type VibeId,
} from '@/features/marketing-studio/types';

interface PublicFunnel {
  id: string;
  template_id: TemplateId;
  title: string;
  config: AssetConfig;
  image_url: string | null;
  share_token: string;
}

export default function SocialFunnelPage() {
  const { token } = useParams<{ token: string }>();
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>(
    "You're on the list! We can't wait to see you.",
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    supabase.functions
      .invoke('get-social-funnel', { body: null, method: 'GET' as never })
      .then(async () => {
        // functions.invoke doesn't support GET query params cleanly — use direct fetch.
      });
    // Use direct fetch so we can pass query params reliably:
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-social-funnel?token=${encodeURIComponent(
      token,
    )}`;
    fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFunnel(data.funnel as PublicFunnel);
      })
      .catch((e) => {
        console.error(e);
        toast.error('This Living Flyer is no longer available.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const vibe = useMemo<VibeId>(() => funnel?.config.vibe ?? 'obsidian', [funnel]);
  const v = VIBES[vibe];
  const cfg = funnel?.config;
  const fields = cfg?.rsvp_fields ?? DEFAULT_RSVP_FIELDS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (fields.name && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (fields.phone && !phone.trim()) {
      toast.error('Please enter your phone');
      return;
    }
    if (fields.email && !email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-funnel-rsvp', {
        body: {
          share_token: token,
          name: fields.name ? name : undefined,
          phone: fields.phone ? phone : undefined,
          email: fields.email ? email : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success_message) setSuccessMessage(data.success_message);
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const icsHref = useMemo(
    () =>
      buildIcsDataUrl({
        title: cfg?.event_title || cfg?.headline || funnel?.title || 'Event',
        date: cfg?.event_date,
        time: cfg?.event_time,
        location: cfg?.event_location,
        description: cfg?.subhead,
      }),
    [cfg, funnel?.title],
  );
  const directionsHref = cfg?.event_location
    ? `https://maps.google.com/?q=${encodeURIComponent(cfg.event_location)}`
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/70" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/70">
        <p>Living Flyer not found.</p>
      </div>
    );
  }

  const headline = cfg?.headline || funnel.title;
  const subhead = cfg?.subhead;
  const cta = cfg?.cta || 'Count me in';

  return (
    <>
      <Helmet>
        <title>{headline} · IntoIQ</title>
        <meta name="description" content={subhead?.slice(0, 155) || headline.slice(0, 155)} />
        <meta property="og:title" content={headline} />
        <meta property="og:description" content={subhead?.slice(0, 200) || ''} />
        {funnel.image_url && <meta property="og:image" content={funnel.image_url} />}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        {funnel.image_url && <meta name="twitter:image" content={funnel.image_url} />}
        <link rel="canonical" href={`https://intoiq.app/s/${funnel.share_token}`} />
      </Helmet>

      <main
        className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4"
        style={{
          background: cfg?.media_url ? '#000' : v.background,
        }}
      >
        {/* Full-bleed media background */}
        {cfg?.media_url &&
          (cfg.media_type === 'video' ? (
            <video
              src={cfg.media_url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img
              src={cfg.media_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ))}
        {/* Subtle scrim for legibility */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Glass content card */}
        <div
          className="relative z-10 w-full max-w-md rounded-3xl p-7 sm:p-9 backdrop-blur-2xl shadow-2xl"
          style={{
            background: v.glass,
            border: `1px solid ${v.glassBorder}`,
            color: v.text,
          }}
        >
          {!submitted ? (
            <>
              <p
                className="text-[10px] uppercase tracking-[0.32em] mb-3"
                style={{ color: v.eyebrow }}
              >
                {cfg?.brand?.brand_name || 'You\u2019re Invited'}
              </p>
              <h1
                className="text-3xl sm:text-4xl font-serif leading-tight tracking-tight mb-3"
                style={{ color: v.text }}
              >
                {headline}
              </h1>
              {subhead && (
                <p className="text-sm sm:text-base mb-6" style={{ color: v.textMuted }}>
                  {subhead}
                </p>
              )}

              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full rounded-2xl py-3.5 font-semibold text-sm tracking-wide transition-transform active:scale-[0.98]"
                  style={{ background: v.accent, color: v.ctaText }}
                >
                  {cta}
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-3">
                  {fields.name && (
                    <div>
                      <Label className="text-xs" style={{ color: v.textMuted }}>
                        Your name
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="First & last"
                        className="bg-white/80 text-black border-0"
                        autoFocus
                      />
                    </div>
                  )}
                  {fields.phone && (
                    <div>
                      <Label className="text-xs" style={{ color: v.textMuted }}>
                        Phone
                      </Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 555-5555"
                        className="bg-white/80 text-black border-0"
                      />
                    </div>
                  )}
                  {fields.email && (
                    <div>
                      <Label className="text-xs" style={{ color: v.textMuted }}>
                        Email
                      </Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="bg-white/80 text-black border-0"
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full rounded-2xl py-3.5 font-semibold"
                    style={{ background: v.accent, color: v.ctaText }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : cta}
                  </Button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: v.accent }}
              >
                <Sparkles className="h-6 w-6" style={{ color: v.ctaText }} />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-serif leading-tight tracking-tight mb-2"
                style={{ color: v.text }}
              >
                {successMessage}
              </h2>
              {(cfg?.event_date || cfg?.event_location) && (
                <p className="text-sm mb-5" style={{ color: v.textMuted }}>
                  {cfg?.event_date}
                  {cfg?.event_time ? ` · ${cfg.event_time}` : ''}
                  {cfg?.event_location ? ` · ${cfg.event_location}` : ''}
                </p>
              )}
              <div className="grid gap-2">
                {icsHref && (
                  <a
                    href={icsHref}
                    download="event.ics"
                    className="flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-sm"
                    style={{ background: v.accent, color: v.ctaText }}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Add to Calendar
                  </a>
                )}
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-sm border"
                    style={{ borderColor: v.glassBorder, color: v.text }}
                  >
                    <MapPin className="h-4 w-4" />
                    Get Directions
                  </a>
                )}
              </div>
            </div>
          )}

          <p
            className="mt-6 text-center text-[10px] uppercase tracking-[0.28em]"
            style={{ color: v.textMuted }}
          >
            Powered by IntoIQ
          </p>
        </div>
      </main>
    </>
  );
}
