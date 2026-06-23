import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logClientError } from '@/lib/error-logger';
import { useAttributionTracker } from '@/hooks/use-attribution-tracker';

interface PageData {
  id: string;
  title: string;
  slug: string;
  content_blocks: any[];
  org_id: string;
  project_id: string | null;
  theme?: string;
  og_image?: string;
  next_page_id?: string | null;
  next_slug?: string | null;
}

interface ContentBlock {
  id: string;
  type: string;
  content: Record<string, any>;
}

const normalizeZip = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

// Theme color palettes
const THEMES: Record<string, {
  bg: string; surface: string; text: string; muted: string;
  accent: string; accentGlow: string; accentSubtle: string; border: string;
  accentText: string;
}> = {
  cinematic: {
    bg: '#070b10',
    surface: 'rgba(14, 20, 30, 0.7)',
    text: '#e8f0f8',
    muted: 'rgba(232, 240, 248, 0.55)',
    accent: 'hsl(174, 72%, 50%)',
    accentGlow: 'hsla(174, 72%, 50%, 0.35)',
    accentSubtle: 'hsla(174, 72%, 50%, 0.08)',
    border: 'rgba(232, 240, 248, 0.08)',
    accentText: '#070b10',
  },
  editorial: {
    bg: '#f5f0e8',
    surface: 'rgba(245, 240, 232, 0.9)',
    text: '#1a1a1f',
    muted: 'rgba(26, 26, 31, 0.55)',
    accent: 'hsl(24, 80%, 50%)',
    accentGlow: 'hsla(24, 80%, 50%, 0.25)',
    accentSubtle: 'hsla(24, 80%, 50%, 0.08)',
    border: 'rgba(26, 26, 31, 0.1)',
    accentText: '#f5f0e8',
  },
  minimal: {
    bg: '#ffffff',
    surface: 'rgba(245, 245, 245, 0.8)',
    text: '#111111',
    muted: 'rgba(17, 17, 17, 0.5)',
    accent: '#111111',
    accentGlow: 'rgba(17, 17, 17, 0.15)',
    accentSubtle: 'rgba(17, 17, 17, 0.05)',
    border: 'rgba(17, 17, 17, 0.08)',
    accentText: '#ffffff',
  },
};

function getColors(theme?: string) {
  return THEMES[theme || 'cinematic'] || THEMES.cinematic;
}

function VideoBlockWithCTA({ parsed, isNative, videoTitle, revealSeconds, revealText, revealUrl, storageKey, colors }: {
  parsed: { type: string; embedUrl: string };
  isNative: boolean;
  videoTitle: string;
  revealSeconds: number;
  revealText: string;
  revealUrl: string;
  storageKey: string;
  colors: ReturnType<typeof getColors>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ctaVisible, setCtaVisible] = useState(() => {
    if (revealSeconds <= 0) return true;
    return sessionStorage.getItem(storageKey) === 'revealed';
  });
  const [justAppeared, setJustAppeared] = useState(false);

  useEffect(() => {
    if (revealSeconds <= 0 || !isNative) return;
    const vid = videoRef.current;
    if (!vid) return;
    const handler = () => {
      if (vid.currentTime >= revealSeconds && !ctaVisible) {
        setCtaVisible(true);
        setJustAppeared(true);
        sessionStorage.setItem(storageKey, 'revealed');
        setTimeout(() => setJustAppeared(false), 2000);
      }
    };
    vid.addEventListener('timeupdate', handler);
    return () => vid.removeEventListener('timeupdate', handler);
  }, [revealSeconds, isNative, ctaVisible, storageKey]);

  const showCta = revealSeconds <= 0 || !isNative || ctaVisible;

  const handleCtaClick = () => {
    if (revealUrl.startsWith('#')) {
      const el = document.getElementById(revealUrl.slice(1));
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.open(revealUrl, '_blank');
    }
  };

  return (
    <section className="px-4 py-12">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {videoTitle && (
          <h3
            className="text-lg font-semibold mb-4 text-center"
            style={{ fontFamily: "'Instrument Serif', serif", color: colors.text }}
          >
            {videoTitle}
          </h3>
        )}
        <div
          style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: 16,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
          }}
        >
          {isNative ? (
            <video
              ref={videoRef}
              controls
              playsInline
              controlsList="nodownload"
              src={parsed.embedUrl}
              title={videoTitle}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 16 }}
            />
          ) : (
            <iframe
              src={parsed.embedUrl}
              title={videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
            />
          )}
        </div>
        {revealText && (
          <div
            className="flex justify-center mt-6"
            style={{
              opacity: showCta ? 1 : 0,
              pointerEvents: showCta ? 'auto' : 'none',
              transition: 'opacity 0.8s ease-in-out',
            }}
          >
            <button
              onClick={handleCtaClick}
              className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: colors.accent,
                color: colors.accentText,
                boxShadow: justAppeared
                  ? `0 0 40px ${colors.accentGlow}, 0 0 80px ${colors.accentGlow}`
                  : `0 0 24px ${colors.accentGlow}`,
                animation: justAppeared ? 'vsl-glow 1.5s ease-in-out' : undefined,
              }}
            >
              {revealText}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CheckoutBlock({ block, pageId, colors }: {
  block: ContentBlock;
  pageId: string;
  colors: ReturnType<typeof getColors>;
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [coupon, setCoupon] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const c = block.content || {};
  const name = c.name || 'Product';
  const description = c.description || '';
  const imageUrl = c.image_url || '';
  const amount = parseFloat(c.amount || '0');
  const currency = (c.currency || 'usd').toLowerCase();
  const mode = c.mode === 'subscription' ? 'subscription' : 'payment';
  const recurringInterval = c.recurring_interval && (c.recurring_interval === 'month' || c.recurring_interval === 'year')
    ? c.recurring_interval as 'month' | 'year'
    : null;
  const buttonText = c.button_text || (mode === 'subscription' ? 'Subscribe' : 'Buy Now');
  const successUrl = c.success_url || '';

  const amountCents = Math.round(amount * 100);
  const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

  const handleCheckout = async () => {
    if (amountCents < 50) {
      toast.error('This product is not configured correctly.');
      return;
    }
    setLoading(true);
    try {
      const defaultSuccess = `${window.location.origin}/thanks/${pageId}`;
      const { data, error } = await supabase.functions.invoke('page-checkout', {
        body: {
          page_id: pageId,
          block_id: block.id,
          name,
          description: description || undefined,
          image_url: imageUrl || undefined,
          amount_cents: amountCents,
          currency,
          mode,
          recurring_interval: mode === 'subscription' ? recurringInterval : null,
          customer_email: email.trim() || undefined,
          success_url: successUrl || defaultSuccess,
          coupon_code: coupon.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.discount_applied) {
        toast.success('Discount applied!');
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      logClientError(err?.message || 'Checkout failed', {
        stack: err?.stack,
        component: 'PublishedPage.CheckoutBlock',
      });
      toast.error(err?.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <section data-block-id={block.id} className="px-4 py-12 sm:py-16">
      <div
        className="max-w-md mx-auto rounded-2xl overflow-hidden"
        style={{
          background: colors.surface,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 60px ${colors.accentGlow.replace(/[\d.]+\)$/, '0.08)')}`,
        }}
      >
        {imageUrl && (
          <img src={imageUrl} alt={name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6 sm:p-8">
          <h3
            className="text-xl sm:text-2xl font-semibold mb-2"
            style={{ fontFamily: "'Instrument Serif', serif", color: colors.text }}
          >
            {name}
          </h3>
          {description && (
            <p className="text-sm mb-4 leading-relaxed" style={{ color: colors.muted }}>
              {description}
            </p>
          )}
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-3xl font-bold" style={{ color: colors.text }}>{formattedPrice}</span>
            {mode === 'subscription' && recurringInterval && (
              <span className="text-sm" style={{ color: colors.muted }}>/{recurringInterval}</span>
            )}
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email (optional)"
            maxLength={255}
            className="w-full px-4 py-3 mb-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
            style={{
              background: colors.accentSubtle,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
            disabled={loading}
          />
          {showCoupon ? (
            <input
              type="text"
              value={coupon}
              onChange={e => setCoupon(e.target.value.toUpperCase())}
              placeholder="Discount code"
              maxLength={64}
              className="w-full px-4 py-3 mb-3 rounded-xl text-sm outline-none transition-all focus:ring-2 uppercase tracking-wider"
              style={{
                background: colors.accentSubtle,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
              disabled={loading}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCoupon(true)}
              className="text-xs underline mb-3 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: colors.muted }}
            >
              Have a discount code?
            </button>
          )}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            style={{
              background: colors.accent,
              color: colors.accentText,
              boxShadow: `0 0 24px ${colors.accentGlow}`,
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonText}
          </button>
          <p className="text-xs text-center mt-3" style={{ color: colors.muted }}>
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </section>
  );
}

export default function PublishedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);
  const trackerRef = useAttributionTracker();

  const [abTest, setAbTest] = useState<{ id: string; field_name: string; variant_a: string; variant_b: string } | null>(null);
  const [assignedVariant, setAssignedVariant] = useState<'a' | 'b' | null>(null);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    supabase
      .from('pages_public' as any)
      .select('id, title, slug, content_blocks, org_id, project_id, theme, og_image, next_page_id, next_slug')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setPage(data as unknown as PageData);
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      toast.success('Payment successful! Check your email for confirmation.');
    } else if (checkout === 'canceled') {
      toast.error('Checkout canceled. You can try again whenever you\'re ready.');
    }
    if (checkout) {
      params.delete('checkout');
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    if (!page) return;
    supabase
      .from('ab_tests_public' as any)
      .select('id, field_name, variant_a, variant_b')
      .eq('page_id', page.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const test = data as unknown as { id: string; field_name: string; variant_a: string; variant_b: string };
        setAbTest(test);
        const key = `ab_variant_${test.id}`;
        const stored = sessionStorage.getItem(key);
        if (stored === 'a' || stored === 'b') {
          setAssignedVariant(stored);
        } else {
          const v = Math.random() < 0.5 ? 'a' : 'b';
          sessionStorage.setItem(key, v);
          setAssignedVariant(v as 'a' | 'b');
        }
      });
  }, [page]);

  useEffect(() => {
    if (!page || viewTracked.current) return;
    viewTracked.current = true;
    const params = new URLSearchParams(window.location.search);
    supabase.from('page_views').insert({
      page_id: page.id,
      org_id: page.org_id,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    }).then(() => {});
  }, [page]);

  useEffect(() => {
    if (!page) return;
    const blocks: ContentBlock[] = Array.isArray(page.content_blocks) ? (page.content_blocks as ContentBlock[]) : [];
    const hero = blocks.find(b => b.type === 'hero');
    const title = hero?.content?.headline || page.title || 'Welcome';
    const description = hero?.content?.subheadline || '';
    const image = hero?.content?.imageUrl || '';
    const url = window.location.href;

    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    if (image) {
      setMeta('property', 'og:image', image);
      setMeta('name', 'twitter:image', image);
    }

    // Inject JSON-LD LocalBusiness schema for SEO / local authority
    const SCHEMA_ID = 'intoiq-jsonld-localbusiness';
    document.getElementById(SCHEMA_ID)?.remove();
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: title,
      description: description || title,
      url,
      ...(image ? { image } : {}),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = SCHEMA_ID;
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      ['og:title', 'og:description', 'og:type', 'og:url', 'og:image'].forEach(p =>
        document.querySelector(`meta[property="${p}"]`)?.remove()
      );
      ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(n =>
        document.querySelector(`meta[name="${n}"]`)?.remove()
      );
      document.getElementById(SCHEMA_ID)?.remove();
    };
  }, [page]);

  // Resolve theme colors
  const COLORS = getColors(page?.theme);

  const blocks: ContentBlock[] = Array.isArray(page?.content_blocks)
    ? (page!.content_blocks as ContentBlock[])
    : [];

  const hero = blocks.find(b => b.type === 'hero');
  const features = blocks.filter(b => b.type === 'feature').slice(0, 3);
  const socialProof = blocks.find(b => b.type === 'social_proof');
  const optin = blocks.find(b => b.type === 'optin');
  const videoBlocks = blocks.filter(b => b.type === 'video');
  const audioBlocks = blocks.filter(b => b.type === 'audio');
  const checkoutBlocks = blocks.filter(b => b.type === 'checkout');
  const bookingBlocks = blocks.filter(b => b.type === 'calendly' || b.type === 'scheduler');
  const allowedServiceZips = Array.isArray(optin?.content?.service_area_zips)
    ? optin.content.service_area_zips.map((zip: string) => normalizeZip(String(zip))).filter(Boolean)
    : [];
  const requiresZip = optin?.content?.require_zip === true || allowedServiceZips.length > 0;
  const collectPhone = optin?.content?.collect_phone === 'true' || optin?.content?.collect_phone === true;
  const phoneRequired = collectPhone && (optin?.content?.phone_required === 'true' || optin?.content?.phone_required === true);
  const requireSmsConsent = collectPhone && (optin?.content?.require_sms_consent === 'true' || optin?.content?.require_sms_consent === true);
  const smsConsentText = optin?.content?.sms_consent_text || 'I agree to receive text messages about this offer. Msg & data rates may apply. Reply STOP to opt out.';

  // Stable block ID for attribution tracking. Prefers the block's own id,
  // falls back to a deterministic `${type}_${index}` so legacy blocks still tag.
  const blockId = (b: ContentBlock | undefined, fallbackType: string, idx = 0): string =>
    b?.id || `${fallbackType}_${idx}`;

  const parseVideoEmbedUrl = (url: string): { type: 'youtube' | 'vimeo' | 'native'; embedUrl: string } => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    return { type: 'native', embedUrl: url };
  };

  let headline = hero?.content?.headline || page?.title || 'Welcome';
  let subheadline = hero?.content?.subheadline || '';
  let ctaText = hero?.content?.buttonText || optin?.content?.buttonText || 'Get Started';
  const heroImage = hero?.content?.imageUrl;

  if (abTest && assignedVariant) {
    const variantValue = assignedVariant === 'a' ? abTest.variant_a : abTest.variant_b;
    if (abTest.field_name === 'headline') headline = variantValue;
    else if (abTest.field_name === 'subheadline') subheadline = variantValue;
    else if (abTest.field_name === 'cta_text') ctaText = variantValue;
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !page) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    const normalizedPostalCode = normalizeZip(postalCode);
    if (requiresZip && !normalizedPostalCode) {
      toast.error('Please enter your ZIP code');
      return;
    }

    if (normalizedPostalCode && !/^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(normalizedPostalCode)) {
      toast.error('Please enter a valid ZIP code');
      return;
    }

    if (allowedServiceZips.length > 0 && !allowedServiceZips.includes(normalizedPostalCode)) {
      toast.error('Outside service area', {
        description: optin?.content?.service_area_label || 'This offer is currently limited to selected ZIP codes.',
      });
      return;
    }

    // Phone validation (only digits matter — we normalize to E.164-ish on server)
    const digits = phone.replace(/\D+/g, '');
    if (phoneRequired && digits.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (collectPhone && digits.length > 0 && digits.length < 10) {
      toast.error('Phone number looks too short');
      return;
    }
    if (requireSmsConsent && digits.length >= 10 && !smsConsent) {
      toast.error('Please agree to receive text messages');
      return;
    }

    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const attribution = trackerRef.current?.getAttribution() ?? null;
      const { data, error } = await supabase.functions.invoke('submit-public-lead', {
        body: {
          email: normalizedEmail,
          ...(normalizedPostalCode ? { postal_code: normalizedPostalCode } : {}),
          ...(digits.length >= 10 ? { phone: phone.trim(), sms_consent: !!smsConsent } : {}),
          page_id: page.id,
          ...(abTest && assignedVariant ? { variant: assignedVariant, field: abTest.field_name } : {}),
          ...(attribution ? { attribution } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      supabase.functions.invoke('send-welcome-email', {
        body: { email: normalizedEmail, org_id: page.org_id, project_id: page.project_id },
      }).catch(() => {});

      // 1) Configured next step in funnel flow takes priority
      if (page.next_slug) {
        window.location.href = `/p/${page.next_slug}`;
        return;
      }

      // 2) Fallback to legacy {slug}-thank-you convention
      const thankYouSlug = slug + '-thank-you';
      const { data: tyPage } = await supabase
        .from('pages_public' as any)
        .select('slug')
        .eq('slug', thankYouSlug)
        .maybeSingle();

      if (tyPage) {
        window.location.href = `/p/${thankYouSlug}`;
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      logClientError(err?.message || 'Published page lead submission failed', {
        stack: err?.stack,
        component: 'PublishedPage.handleSubmit',
      });
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.bg, color: COLORS.text }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: COLORS.accent }} />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ background: COLORS.bg, color: COLORS.text }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
          style={{ background: COLORS.accentSubtle, border: `1px solid ${COLORS.border}` }}
        >
          🔍
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Page not found
        </h1>
        <p className="text-sm" style={{ color: COLORS.muted }}>
          This page doesn't exist or hasn't been published yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Helmet>
        <title>{page?.title ? `${page.title} — IntoIQ` : 'IntoIQ'}</title>
        <meta name="description" content={
          page?.content_blocks?.[0]?.content?.subheadline ||
          page?.content_blocks?.[0]?.content?.body ||
          'Built with IntoIQ — AI-powered funnel builder'
        } />
        <meta property="og:title" content={page?.title || 'IntoIQ'} />
        <meta property="og:description" content={
          page?.content_blocks?.[0]?.content?.subheadline ||
          'Built with IntoIQ'
        } />
        <meta property="og:type" content="website" />
        {page?.og_image && (
          <meta property="og:image" content={page.og_image} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page?.title || 'IntoIQ'} />
      </Helmet>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes vsl-glow {
          0% { box-shadow: 0 0 10px ${COLORS.accentGlow.replace(/[\d.]+\)$/, '0.2)')}; transform: scale(0.95); }
          50% { box-shadow: 0 0 60px ${COLORS.accentGlow}, 0 0 120px ${COLORS.accentGlow.replace(/[\d.]+\)$/, '0.2)')}; transform: scale(1.05); }
          100% { box-shadow: 0 0 24px ${COLORS.accentGlow}; transform: scale(1); }
        }
      `}</style>

      {/* Hero Section */}
      <section
        data-block-id={blockId(hero, 'hero')}
        className="relative flex flex-col items-center justify-center text-center px-4 py-20 sm:py-32 min-h-[70vh]"
        style={{
          backgroundImage: heroImage ? `linear-gradient(to bottom, ${COLORS.bg}b3, ${COLORS.bg}f2), url(${heroImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {headline}
          </h1>
          {subheadline && (
            <p
              className="mt-5 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: COLORS.muted }}
            >
              {subheadline}
            </p>
          )}
          <button
            onClick={scrollToForm}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: COLORS.accent,
              color: COLORS.accentText,
              boxShadow: `0 0 30px ${COLORS.accentGlow}, 0 4px 16px rgba(0,0,0,0.3)`,
            }}
          >
            {ctaText}
          </button>
        </div>
      </section>

      {/* Features Grid */}
      {features.length > 0 && (
        <section className="px-4 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.id || i}
                data-block-id={blockId(f, 'feature', i)}
                className="rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:translate-y-[-2px]"
                style={{
                  background: COLORS.surface,
                  backdropFilter: 'blur(24px)',
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
                }}
              >
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {f.content?.title || `Feature ${i + 1}`}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
                  {f.content?.description || ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video Blocks */}
      {videoBlocks.length > 0 && videoBlocks.map((vb, i) => {
        const videoUrl = vb.content?.url || '';
        const videoTitle = vb.content?.title || 'Video';
        const revealSeconds = parseInt(vb.content?.reveal_cta_after_seconds || '0', 10);
        const revealText = vb.content?.reveal_cta_text || 'Get Started Now';
        const revealUrl = vb.content?.reveal_cta_url || '#optin';
        if (!videoUrl) return null;
        const parsed = parseVideoEmbedUrl(videoUrl);
        const isNative = parsed.type === 'native';
        const storageKey = `vsl_cta_${page!.id}_${i}`;

        return (
          <div key={vb.id || `video-${i}`} data-block-id={blockId(vb, 'video', i)}>
            <VideoBlockWithCTA
              parsed={parsed}
              isNative={isNative}
              videoTitle={videoTitle}
              revealSeconds={revealSeconds}
              revealText={revealText}
              revealUrl={revealUrl}
              storageKey={storageKey}
              colors={COLORS}
            />
          </div>
        );
      })}

      {/* Audio Blocks */}
      {audioBlocks.length > 0 && audioBlocks.map((ab, i) => {
        const audioUrl = ab.content?.url || '';
        const audioTitle = ab.content?.title || 'Audio';
        if (!audioUrl) return null;
        return (
          <section key={ab.id || `audio-${i}`} data-block-id={blockId(ab, 'audio', i)} className="px-4 py-12">
            <div
              style={{
                maxWidth: 600,
                margin: '0 auto',
                padding: 24,
                borderRadius: 16,
                background: COLORS.surface,
                backdropFilter: 'blur(24px)',
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>{audioTitle}</p>
              <audio controls style={{ width: '100%' }} src={audioUrl}>
                Your browser does not support audio.
              </audio>
            </div>
          </section>
        );
      })}

      {/* Booking Blocks (Calendly / Cal.com / Acuity / etc.) */}
      {bookingBlocks.map((bb, i) => {
        const bookingUrl = bb.content?.url || '';
        const bookingTitle = bb.content?.title || (bb.type === 'calendly' ? 'Schedule a Call' : (bb.content?.provider || 'Book a Time'));
        const bookingHeight = parseInt(String(bb.content?.height || '700'), 10) || 700;
        if (!bookingUrl) return null;
        return (
          <section
            key={bb.id || `booking-${i}`}
            data-block-id={blockId(bb, bb.type, i)}
            className="px-4 py-12"
          >
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {bookingTitle && (
                <h3
                  className="text-xl sm:text-2xl font-semibold mb-4 text-center"
                  style={{ color: COLORS.text, fontFamily: "'Instrument Serif', serif" }}
                >
                  {bookingTitle}
                </h3>
              )}
              <div
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.surface,
                }}
              >
                <iframe
                  src={bookingUrl}
                  title={bookingTitle}
                  loading="lazy"
                  allow="payment"
                  style={{ width: '100%', height: bookingHeight, border: 'none', display: 'block' }}
                />
              </div>
            </div>
          </section>
        );
      })}

      {/* Checkout Blocks */}
      {checkoutBlocks.map((cb, i) => (
        <CheckoutBlock
          key={cb.id || `checkout-${i}`}
          block={cb}
          pageId={page!.id}
          colors={COLORS}
        />
      ))}

      {/* Social Proof */}
      {socialProof && socialProof.content?.text && (
        <section data-block-id={blockId(socialProof, 'social_proof')} className="px-4 py-12 text-center">
          <p
            className="text-sm sm:text-base max-w-xl mx-auto italic"
            style={{ color: COLORS.muted }}
          >
            "{socialProof.content.text}"
          </p>
          {socialProof.content?.author && (
            <p className="mt-2 text-xs" style={{ color: COLORS.accent }}>
              — {socialProof.content.author}
            </p>
          )}
        </section>
      )}

      {/* Opt-in Form */}
      <section ref={formRef} data-block-id={blockId(optin, 'optin')} className="px-4 py-16 sm:py-24">
        <div className="max-w-md mx-auto">
          <div
            className="rounded-2xl p-6 sm:p-8 text-center"
            style={{
              background: COLORS.surface,
              backdropFilter: 'blur(24px)',
              border: `1px solid ${COLORS.border}`,
              boxShadow: `0 0 60px ${COLORS.accentGlow.replace(/[\d.]+\)$/, '0.08)')}`,
            }}
          >
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-10 w-10" style={{ color: COLORS.accent }} />
                <h3
                  className="text-xl font-semibold"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  You're in!
                </h3>
                <p className="text-sm" style={{ color: COLORS.muted }}>
                  Check your inbox for next steps.
                </p>
              </div>
            ) : (
              <>
                <h3
                  className="text-xl sm:text-2xl font-semibold mb-2"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {optin?.content?.headline || 'Get Started'}
                </h3>
                <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
                  {optin?.content?.subheadline || 'Enter your email to join.'}
                </p>
                <form onSubmit={handleSubmit} className={collectPhone ? 'flex flex-col gap-3' : 'flex flex-col sm:flex-row gap-3'}>
                  <div className={collectPhone ? 'flex flex-col sm:flex-row gap-3' : 'contents'}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={255}
                      autoComplete="email"
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                      style={{
                        background: COLORS.accentSubtle,
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.text,
                      }}
                      disabled={submitting}
                    />
                    {collectPhone && (
                      <input
                        type="tel"
                        required={phoneRequired}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder={phoneRequired ? 'Phone (required)' : 'Phone (optional)'}
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={20}
                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                        style={{
                          background: COLORS.accentSubtle,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.text,
                        }}
                        disabled={submitting}
                      />
                    )}
                    {requiresZip && (
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="ZIP code"
                        inputMode="text"
                        autoComplete="postal-code"
                        maxLength={12}
                        className="w-full sm:w-32 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                        style={{
                          background: COLORS.accentSubtle,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.text,
                        }}
                        disabled={submitting}
                      />
                    )}
                  </div>

                  {collectPhone && requireSmsConsent && (
                    <label className="flex items-start gap-2 text-left text-xs" style={{ color: COLORS.muted }}>
                      <input
                        type="checkbox"
                        checked={smsConsent}
                        onChange={e => setSmsConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded shrink-0"
                        style={{ accentColor: COLORS.accent }}
                        disabled={submitting}
                      />
                      <span className="leading-snug">{smsConsentText}</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !email.trim() ||
                      (requiresZip && !postalCode.trim()) ||
                      (phoneRequired && phone.replace(/\D+/g, '').length < 10)
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                      background: COLORS.accent,
                      color: COLORS.accentText,
                      boxShadow: `0 0 24px ${COLORS.accentGlow}`,
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {optin?.content?.buttonText || ctaText}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center">
        <p className="text-xs" style={{ color: COLORS.muted }}>
          Built with <span style={{ color: COLORS.accent }}>IntoIQ</span>
        </p>
      </footer>
    </div>
  );
}
