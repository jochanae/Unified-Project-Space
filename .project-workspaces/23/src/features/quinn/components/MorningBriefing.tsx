import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Zap, Sun, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserTimezone, subscribeUserTimezone } from '@/lib/user-timezone';


interface IntelligenceTrigger {
  type: 'positive' | 'warning' | 'critical';
  icon: React.ReactNode;
  label: string;
  message: string;
}

interface MorningBriefingProps {
  orgId: string;
}

export function MorningBriefing({ orgId }: MorningBriefingProps) {
  // Fetch user's display name for personalized greeting (timezone is handled
  // globally via useUserTimezoneSync + the patched Intl helpers in user-timezone.ts).
  const { data: userProfile } = useQuery({
    queryKey: ['briefing-user-name'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', auth.user.id)
        .single();
      return data as { display_name: string | null; email: string | null } | null;
    },
    staleTime: 10 * 60_000,
  });
  const firstName = (userProfile?.display_name?.trim().split(/\s+/)[0])
    || (userProfile?.email?.split('@')[0])
    || 'there';

  // Timezone-aware greeting that follows the user's saved preference and
  // refreshes every minute so it stays accurate across noon/5pm.
  const [tz, setTz] = useState<string>(() => getUserTimezone());
  useEffect(() => subscribeUserTimezone(setTz), []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const localHour = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).formatToParts(now);
      const h = Number(parts.find(p => p.type === 'hour')?.value ?? now.getHours());
      return h === 24 ? 0 : h;
    } catch {
      return now.getHours();
    }
  }, [now, tz]);
  const greeting = localHour < 12 ? 'Good morning' : localHour < 17 ? 'Good afternoon' : 'Good evening';

  // Fetch pages for the org
  const { data: pages } = useQuery({
    queryKey: ['briefing-pages', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('pages').select('id, title, slug, is_published, project_id');
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const pageIds = useMemo(() => (pages || []).map(p => p.id), [pages]);

  // Last 24h views
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }, []);

  // Previous 24h (for comparison)
  const twoDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString();
  }, []);

  const { data: recentViews } = useQuery({
    queryKey: ['briefing-views-24h', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('page_views')
        .select('id, page_id, created_at')
        .in('page_id', pageIds)
        .gte('created_at', yesterday);
      return data || [];
    },
    enabled: pageIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const { data: previousViews } = useQuery({
    queryKey: ['briefing-views-prev24h', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('page_views')
        .select('id, page_id, created_at')
        .in('page_id', pageIds)
        .gte('created_at', twoDaysAgo)
        .lt('created_at', yesterday);
      return data || [];
    },
    enabled: pageIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const { data: recentLeads } = useQuery({
    queryKey: ['briefing-leads-24h', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('form_submissions')
        .select('id, page_id, created_at')
        .in('page_id', pageIds)
        .gte('created_at', yesterday);
      return data || [];
    },
    enabled: pageIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const { data: previousLeads } = useQuery({
    queryKey: ['briefing-leads-prev24h', pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      const { data } = await supabase
        .from('form_submissions')
        .select('id, page_id, created_at')
        .in('page_id', pageIds)
        .gte('created_at', twoDaysAgo)
        .lt('created_at', yesterday);
      return data || [];
    },
    enabled: pageIds.length > 0,
    staleTime: 5 * 60_000,
  });

  // Geo-aware: 7d contacts split by region for anomaly detection
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const { data: recentContacts } = useQuery({
    queryKey: ['briefing-contacts-geo-7d', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, country, region, city, pipeline_stage, created_at')
        .eq('org_id', orgId)
        .gte('created_at', sevenDaysAgo);
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Compute intelligence triggers
  const { briefing, triggers, geoBriefing } = useMemo(() => {
    const todayViews = recentViews?.length || 0;
    const prevViews = previousViews?.length || 0;
    const todayLeads = recentLeads?.length || 0;
    const prevLeads = previousLeads?.length || 0;

    const viewDelta = prevViews > 0 ? ((todayViews - prevViews) / prevViews) * 100 : todayViews > 0 ? 100 : 0;
    const leadDelta = prevLeads > 0 ? ((todayLeads - prevLeads) / prevLeads) * 100 : todayLeads > 0 ? 100 : 0;
    const convRate = todayViews > 0 ? (todayLeads / todayViews) * 100 : 0;

    const triggers: IntelligenceTrigger[] = [];

    // Traffic surge
    if (viewDelta > 50 && todayViews > 5) {
      triggers.push({
        type: 'positive',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        label: 'Traffic Surge',
        message: `Views up ${viewDelta.toFixed(0)}% vs yesterday. Your signal is amplifying.`,
      });
    }

    // Traffic drop
    if (viewDelta < -40 && prevViews > 5) {
      triggers.push({
        type: 'warning',
        icon: <TrendingDown className="h-3.5 w-3.5" />,
        label: 'Traffic Drop',
        message: `Views down ${Math.abs(viewDelta).toFixed(0)}%. Check if ads or links are still active.`,
      });
    }

    // Lead surge
    if (leadDelta > 30 && todayLeads > 3) {
      triggers.push({
        type: 'positive',
        icon: <Zap className="h-3.5 w-3.5" />,
        label: 'Lead Surge',
        message: `${todayLeads} new leads in the last 24h — ${leadDelta.toFixed(0)}% increase.`,
      });
    }

    // Low conversion warning
    if (todayViews > 20 && convRate < 1) {
      triggers.push({
        type: 'critical',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: 'Low Conversion',
        message: `${todayViews} views but only ${convRate.toFixed(1)}% converting. Sharpen your CTA.`,
      });
    }

    // High conversion celebration
    if (convRate > 10 && todayViews > 5) {
      triggers.push({
        type: 'positive',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        label: 'High Conversion',
        message: `${convRate.toFixed(1)}% conversion rate — elite performance. Consider scaling.`,
      });
    }

    // Zero traffic on published pages
    const publishedCount = (pages || []).filter(p => p.is_published).length;
    if (publishedCount > 0 && todayViews === 0) {
      triggers.push({
        type: 'warning',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: 'Silent Pages',
        message: `${publishedCount} published page${publishedCount > 1 ? 's' : ''} with zero views today. Time to amplify.`,
      });
    }

    // Geo-aware: top region + concentration anomaly nudges
    const contacts = recentContacts || [];
    const tally = (vals: (string | null | undefined)[]) => {
      const m = new Map<string, number>();
      for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    };
    const wonContacts = contacts.filter(c => c.pipeline_stage === 'won');
    const topRegions = tally(wonContacts.map(c => c.region));
    const topCountries = tally(contacts.map(c => c.country));
    let geoBriefing = '';

    if (topRegions.length > 0 && wonContacts.length >= 3) {
      const [region, count] = topRegions[0];
      const pct = Math.round((count / wonContacts.length) * 100);
      if (pct >= 40) {
        geoBriefing = `${pct}% of your won deals this week came from ${region} (${count} of ${wonContacts.length}).`;
        triggers.push({
          type: 'positive',
          icon: <MapPin className="h-3.5 w-3.5" />,
          label: 'Geo Hotspot',
          message: `${region} is converting hard. Consider a region-targeted follow-up sequence or ad set.`,
        });
      }
    }

    // Anomaly: country with traffic but zero conversions
    if (topCountries.length > 0) {
      const wonCountries = new Set(wonContacts.map(c => c.country).filter(Boolean));
      const ghostCountry = topCountries.find(([c, n]) => n >= 5 && !wonCountries.has(c));
      if (ghostCountry) {
        triggers.push({
          type: 'warning',
          icon: <MapPin className="h-3.5 w-3.5" />,
          label: 'Ghost Region',
          message: `${ghostCountry[0]} sent ${ghostCountry[1]} leads this week but zero closed. Investigate friction in that segment.`,
        });
      }
    }

    // Build briefing narrative
    const parts: string[] = [];
    if (todayViews > 0) {
      parts.push(`${todayViews} view${todayViews !== 1 ? 's' : ''} and ${todayLeads} lead${todayLeads !== 1 ? 's' : ''} in the last 24 hours.`);
      if (viewDelta !== 0 && prevViews > 0) {
        parts.push(`Traffic is ${viewDelta > 0 ? 'up' : 'down'} ${Math.abs(viewDelta).toFixed(0)}% compared to yesterday.`);
      }
    } else if (publishedCount > 0) {
      parts.push('Your pages are live but quiet. Consider sharing or promoting them today.');
    } else {
      parts.push('No published pages yet. Deploy your first page to start capturing intelligence.');
    }

    return { briefing: parts.join(' '), triggers, geoBriefing };
  }, [recentViews, previousViews, recentLeads, previousLeads, pages, recentContacts]);

  const triggerColors: Record<string, string> = {
    positive: 'border-green-500/30 bg-green-500/5 text-green-400',
    warning: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
    critical: 'border-red-500/30 bg-red-500/5 text-red-400',
  };

  return (
    <div className="space-y-4">
      {/* Morning Briefing Card */}
      <div className="glass rounded-2xl border border-primary/20 p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, hsl(var(--primary)), transparent 70%)' }}
        />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
            <Sun className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 font-medium mb-1">{greeting}, {firstName}</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{briefing}</p>
            {geoBriefing && (
              <p className="mt-1.5 text-xs text-primary/80 leading-relaxed flex items-start gap-1.5">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{geoBriefing}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Intelligence Triggers */}
      {triggers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Intelligence Triggers</p>
          </div>
          {triggers.map((trigger, i) => (
            <div
              key={i}
              className={cn(
                'glass rounded-xl border p-3 flex items-start gap-2.5',
                triggerColors[trigger.type]
              )}
            >
              <div className="mt-0.5 shrink-0">{trigger.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5">{trigger.label}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{trigger.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
