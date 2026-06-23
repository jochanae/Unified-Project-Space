/**
 * BriefingBottomSheet — A luxurious glassmorphism drawer that slides up
 * when a user taps the discreet "compass" icon in the hero card.
 * Houses travel-legal intelligence, knowledge vault snippets, and
 * quick-action buttons for Pro/Aviation users. Keeps the main dashboard clean.
 *
 * Styled to the 'Smoked Glass' standard: #131424 at 95% opacity with
 * backdrop-blur-2xl and 1px white/10 border.
 */
import { useState, useEffect, useRef } from 'react';
import { MapPin, BookOpen, ChevronRight, X, Plane, Briefcase, Shield, Clock, Hotel, Coffee, Calendar, Navigation, MessageCircle, Search, Loader2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface BriefingBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userName: string;
  companionName: string;
  onNavigateToSettings?: () => void;
}

interface TravelEntry {
  city_name: string;
  region?: string;
  country?: string;
  airport_code?: string;
  visited_at: string;
  mode_used?: string;
}

interface KnowledgeSnippet {
  id: string;
  title: string;
  category: string;
  preview: string;
}

const CATEGORY_META: Record<string, { icon: typeof Plane; label: string }> = {
  'work-rules': { icon: Briefcase, label: 'Work Rules' },
  travel: { icon: Plane, label: 'Travel Intel' },
  safety: { icon: Shield, label: 'Safety' },
  logistics: { icon: Hotel, label: 'Logistics' },
};

export default function BriefingBottomSheet({
  open,
  onOpenChange,
  userId,
  userName,
  companionName,
  onNavigateToSettings,
}: BriefingBottomSheetProps) {
  const { updateProfile, profile, activeConnection } = useAppContext();
  const navigate = useNavigate();
  const [latestCity, setLatestCity] = useState<TravelEntry | null>(null);
  const [knowledgeSnippets, setKnowledgeSnippets] = useState<KnowledgeSnippet[]>([]);
  const [cityIntel, setCityIntel] = useState<string | null>(null);
  const [cityIntelLoading, setCityIntelLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastFetchedCity = useRef<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'base'>('home');

  // Explore inline state
  const [exploreResult, setExploreResult] = useState<string | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreCity, setExploreCity] = useState<string>('');
  const [showExploreInput, setShowExploreInput] = useState(false);
  const exploreFetchedRef = useRef<string | null>(null);

  const homeSet = !!(profile?.homeAddress || (profile?.homeLat != null && profile?.homeLon != null));
  const workSet = !!(profile?.workAddress || (profile?.workLat != null && profile?.workLon != null));
  const currentCityKnown = latestCity && latestCity.city_name !== 'Unknown' && latestCity.city_name !== 'this area';
  const isAtHome = latestCity?.mode_used === 'home';
  const isAtWork = latestCity?.mode_used === 'work';
  const currentLocationTitle = latestCity
    ? isAtHome
      ? profile?.homeAddress || latestCity.city_name
      : isAtWork
      ? profile?.workAddress || latestCity.city_name
      : latestCity.city_name
    : null;
  const currentLocationSubtitle = latestCity
    ? [
        currentLocationTitle !== latestCity.city_name ? latestCity.city_name : null,
        latestCity.region || null,
        latestCity.country || 'US',
      ].filter(Boolean).join(', ')
    : '';

  useEffect(() => {
    if (!userId || !open) return;

    const fetchBriefing = async () => {
      setLoading(true);
      const [travelResult, knowledgeResult] = await Promise.all([
        supabase
          .from('travel_log')
          .select('city_name, region, country, airport_code, visited_at, mode_used')
          .eq('user_id', userId)
          .order('visited_at', { ascending: false })
          .limit(1),
        supabase
          .from('knowledge_documents' as any)
          .select('id, title, category, content_text')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(3),
      ]);

      if (travelResult.data?.[0]) setLatestCity(travelResult.data[0]);
      if (knowledgeResult.data?.length) {
        setKnowledgeSnippets(
          (knowledgeResult.data as any[]).map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            preview: d.content_text?.substring(0, 100) + '…',
          }))
        );
      }
      setLoading(false);
    };

    fetchBriefing();
  }, [userId, open]);

  // Auto-fetch city intel for destination cities (not home/hub)
  useEffect(() => {
    if (!open || !latestCity || loading) return;
    if (latestCity.mode_used === 'home') return; // No need to brief at home
    if (lastFetchedCity.current === latestCity.city_name) return; // Already fetched

    const fetchCityIntel = async () => {
      setCityIntelLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            query: `Top things to do, eat, and see in ${latestCity.city_name}${latestCity.region ? `, ${latestCity.region}` : ''} right now. Include a great restaurant, a cafe, something fun or cultural, and any current events or local tips.`,
            companionName,
            userName,
            currentCity: latestCity.city_name,
          }),
        });

        if (resp.ok) {
          const { answer } = await resp.json();
          const clean = answer?.replace(/\[\d+\](\[\d+\])*/g, '').replace(/\s{2,}/g, ' ').trim();
          if (clean) {
            setCityIntel(clean);
            lastFetchedCity.current = latestCity.city_name;
          }
        }
      } catch (e) {
        console.error('[BriefingSheet] City intel fetch failed:', e);
      } finally {
        setCityIntelLoading(false);
      }
    };

    fetchCityIntel();
  }, [open, latestCity, loading, companionName, userName]);


  // Manual explore fetch — works for any city, including home
  const fetchExploreIntel = async (cityName: string) => {
    if (!cityName.trim() || exploreLoading) return;
    setExploreLoading(true);
    setExploreResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          query: `Top things to do, eat, and see in ${cityName}. Include a great restaurant, a cafe, something fun or cultural, and any current events or local tips.`,
          companionName,
          userName,
          currentCity: cityName,
          searchMode: 'general',
        }),
      });

      if (resp.ok) {
        const { answer } = await resp.json();
        const clean = answer?.replace(/\[\d+\](\[\d+\])*/g, '').replace(/\s{2,}/g, ' ').trim();
        if (clean) {
          setExploreResult(clean);
          exploreFetchedRef.current = cityName;
        } else {
          setExploreResult('No results found — try a different destination.');
        }
      } else {
        setExploreResult('Could not fetch intel right now. Try again.');
      }
    } catch (e) {
      console.error('[BriefingSheet] Explore fetch failed:', e);
      setExploreResult('Something went wrong. Try again.');
    } finally {
      setExploreLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = userName?.split(' ')[0] || '';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[85vh] border-t border-white/[0.1]"
        style={{
          background: 'rgba(19, 20, 36, 0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Grab handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-primary/25" />
        </div>

        <DrawerHeader className="pb-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sync helix indicator */}
              <div className="relative h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary/80" />
                {/* Calibrated pulse */}
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500/80 border border-card" />
              </div>
              <div>
                <DrawerTitle className="text-sm font-serif font-semibold text-foreground">
                  {greeting}, {firstName}
                </DrawerTitle>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Intelligence from {companionName} · Calibrated
                </p>
              </div>
            </div>
            <DrawerClose className="p-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Location Slate ── */}
              {latestCity && (
                <div
                  className="rounded-2xl p-4 border border-white/[0.08]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary/50">Current Location</span>
                  </div>
                  <p className="text-[15px] font-medium text-foreground">
                    {currentLocationTitle}
                    {latestCity.airport_code && (
                      <span className="text-primary/60 font-normal ml-1.5 text-xs">({latestCity.airport_code})</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {currentLocationSubtitle}
                    {latestCity.mode_used && latestCity.mode_used !== 'destination' && (
                      <span className="ml-1.5 text-primary/50">
                        · {latestCity.mode_used === 'home' ? '🏠 Home' : '✈️ Work'}
                      </span>
                    )}
                    {' · '}Arrived {new Date(latestCity.visited_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}

              {/* ── City Intel (destination/hub only) ── */}
              {latestCity && latestCity.mode_used !== 'home' && (
                <div
                  className="rounded-2xl p-4 border border-primary/[0.12]"
                  style={{ background: 'rgba(255, 215, 0, 0.03)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary/50">
                      {companionName}'s City Guide
                    </span>
                  </div>
                  {cityIntelLoading ? (
                    <div className="flex items-center gap-2 py-3">
                      <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-[11px] text-muted-foreground/60">
                        Researching {latestCity.city_name} for you…
                      </span>
                    </div>
                  ) : cityIntel ? (
                    <p className="text-[12px] leading-relaxed text-foreground/80">
                      {cityIntel}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50 italic">
                      Ask {companionName} about things to do in {latestCity.city_name}
                    </p>
                  )}
                </div>
              )}
              {/* ── Quick Actions ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Navigation className="h-3 w-3 text-primary/50" />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary/50">Quick Actions</span>
                  {/* Contextual location badge */}
                  {isAtHome && (
                    <span className="ml-auto text-[8px] text-primary/40 bg-primary/[0.06] px-2 py-0.5 rounded-full border border-primary/10">
                      🏠 Home
                    </span>
                  )}
                  {isAtWork && (
                    <span className="ml-auto text-[8px] text-primary/40 bg-primary/[0.06] px-2 py-0.5 rounded-full border border-primary/10">
                      💼 Work
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Slot 1 — Explore (inline AI fetch) */}
                  <button
                    onClick={() => {
                      const city = latestCity?.city_name || '';
                      if (city && city !== 'Unknown') {
                        fetchExploreIntel(city);
                      } else {
                        setShowExploreInput(true);
                        setExploreCity('');
                      }
                    }}
                    disabled={exploreLoading}
                    className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-white/[0.08] active:scale-95 transition-all hover:bg-primary/5 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.025)' }}
                  >
                    {exploreLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
                    ) : (
                      <span className="text-base">🔍</span>
                    )}
                    <span className="text-[10px] font-medium text-foreground/80 tracking-wide">Explore</span>
                    <span className="text-[8px] text-muted-foreground/40 leading-tight">What's around</span>
                  </button>

                  {/* Slot 2 — Smart location setup */}
                  {(!homeSet || !workSet) && (
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        onNavigateToSettings?.();
                      }}
                      className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-white/[0.08] active:scale-95 transition-all hover:bg-primary/5"
                      style={{ background: 'rgba(255,255,255,0.025)' }}
                    >
                      <span className="text-base">{!homeSet ? '🏠' : '💼'}</span>
                      <span className="text-[10px] font-medium text-foreground/80 tracking-wide text-center leading-tight">
                        {!homeSet ? 'Set Home' : 'Set Work'}
                      </span>
                      <span className="text-[8px] text-muted-foreground/40 leading-tight text-center">
                        Open address settings
                      </span>
                    </button>
                  )}

                  {/* Slot 2 fallback — contextual vault doc when at base */}
                  {homeSet && workSet && knowledgeSnippets.length > 0 && (() => {
                    const workRuleDoc = isAtWork
                      ? knowledgeSnippets.find(s => s.category === 'work-rules') || knowledgeSnippets[0]
                      : knowledgeSnippets[0];
                    return (
                      <button
                        onClick={() => {
                          sessionStorage.setItem('briefing-prompt', `Tell me something useful from my ${workRuleDoc.title}`);
                          onOpenChange(false);
                        }}
                        className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-white/[0.08] active:scale-95 transition-all hover:bg-primary/5"
                        style={{ background: isAtWork ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.025)' }}
                      >
                        <span className="text-base">{isAtWork ? '💼' : '📋'}</span>
                        <span className="text-[10px] font-medium text-foreground/80 tracking-wide text-center leading-tight line-clamp-1">
                          {workRuleDoc.title.length > 14 ? workRuleDoc.title.slice(0, 14) + '…' : workRuleDoc.title}
                        </span>
                        <span className="text-[8px] text-muted-foreground/40 leading-tight">
                          {isAtWork ? 'Work Rules' : 'From Vault'}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Slot 2 fallback — nearby when both set, no vault docs */}
                  {homeSet && workSet && knowledgeSnippets.length === 0 && (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('briefing-prompt', `What are some good restaurants or places nearby in ${latestCity?.city_name || 'my current area'}?`);
                        onOpenChange(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-white/[0.08] active:scale-95 transition-all hover:bg-primary/5"
                      style={{ background: 'rgba(255,255,255,0.025)' }}
                    >
                      <span className="text-base">🗺️</span>
                      <span className="text-[10px] font-medium text-foreground/80 tracking-wide">What's Nearby</span>
                      <span className="text-[8px] text-muted-foreground/40 leading-tight">Places & food</span>
                    </button>
                  )}

                  {/* Slot 3 — Vault or Add to Vault */}
                  {knowledgeSnippets.length >= 2 ? (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('briefing-prompt', `Tell me something useful from my ${knowledgeSnippets[1].title}`);
                        onOpenChange(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-white/[0.08] active:scale-95 transition-all hover:bg-primary/5"
                      style={{ background: 'rgba(255,255,255,0.025)' }}
                    >
                      <span className="text-base">📋</span>
                      <span className="text-[10px] font-medium text-foreground/80 tracking-wide text-center leading-tight line-clamp-1">
                        {knowledgeSnippets[1].title.length > 14
                          ? knowledgeSnippets[1].title.slice(0, 14) + '…'
                          : knowledgeSnippets[1].title}
                      </span>
                      <span className="text-[8px] text-muted-foreground/40 leading-tight">From Vault</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        onNavigateToSettings?.();
                      }}
                      className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 border border-primary/[0.12] active:scale-95 transition-all hover:bg-primary/5"
                      style={{ background: 'rgba(212,175,55,0.04)' }}
                    >
                      <span className="text-base">📚</span>
                      <span className="text-[10px] font-medium text-primary/60 tracking-wide text-center leading-tight">Add to Vault</span>
                      <span className="text-[8px] text-primary/30 leading-tight">Docs & rules</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Explore: Manual Destination Input ── */}
              {showExploreInput && !exploreResult && (
                <div
                  className="rounded-2xl border border-white/[0.1] p-4 space-y-3"
                  style={{ background: 'rgba(19,20,36,0.9)' }}
                >
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    Where would you like to explore?
                  </p>
                  <input
                    value={exploreCity}
                    onChange={e => setExploreCity(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && exploreCity.trim()) {
                        fetchExploreIntel(exploreCity.trim());
                      }
                    }}
                    placeholder="Type a city or destination…"
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowExploreInput(false); setExploreCity(''); }}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (exploreCity.trim()) fetchExploreIntel(exploreCity.trim());
                      }}
                      disabled={!exploreCity.trim() || exploreLoading}
                      className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary font-medium disabled:opacity-40 transition-opacity flex items-center justify-center gap-1.5"
                    >
                      {exploreLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      Explore
                    </button>
                  </div>
                </div>
              )}

              {/* ── Explore Result (inline AI summary) ── */}
              {(exploreResult || exploreLoading) && (
                <div
                  className="rounded-2xl p-4 border border-primary/[0.15] space-y-3"
                  style={{ background: 'rgba(255, 215, 0, 0.03)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-primary/70" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary/50">
                        {companionName}'s Guide
                      </span>
                    </div>
                    {exploreResult && (
                      <button
                        onClick={() => { setExploreResult(null); setShowExploreInput(false); exploreFetchedRef.current = null; }}
                        className="text-[9px] text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {exploreLoading ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
                      <span className="text-[11px] text-muted-foreground/60">
                        Researching {exploreFetchedRef.current || exploreCity || latestCity?.city_name || 'your area'} for you…
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] leading-relaxed text-foreground/80">
                        {exploreResult}
                      </p>
                      {/* Action row: Explore another + Continue in chat */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setExploreResult(null);
                            setShowExploreInput(true);
                            setExploreCity('');
                            exploreFetchedRef.current = null;
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                        >
                          <Search className="h-3 w-3" />
                          Try another city
                        </button>
                        <button
                          onClick={() => {
                            const city = exploreFetchedRef.current || exploreCity || latestCity?.city_name || '';
                            const prompt = `I was just looking at your city guide for ${city}. Tell me more — what would you personally recommend I check out?`;
                            sessionStorage.setItem('briefing-prompt', prompt);
                            onOpenChange(false);
                            if (activeConnection?.memberId) {
                              navigate(`/chat/${activeConnection.memberId}`);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary hover:bg-primary/15 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Continue in chat
                        </button>
                      </div>

                      {/* Quick Links — Food Delivery */}
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/40 px-0.5">
                          Order Food Nearby
                        </p>
                        <div className="flex gap-2">
                          {[
                            { name: 'DoorDash', emoji: '🔴', url: 'https://www.doordash.com' },
                            { name: 'Uber Eats', emoji: '🟢', url: 'https://www.ubereats.com' },
                            { name: 'Grubhub', emoji: '🟠', url: 'https://www.grubhub.com' },
                          ].map(app => (
                            <a
                              key={app.name}
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border border-white/[0.08] hover:bg-primary/5 active:scale-95 transition-all"
                              style={{ background: 'rgba(255,255,255,0.025)' }}
                            >
                              <span className="text-sm">{app.emoji}</span>
                              <span className="text-[9px] font-medium text-foreground/70">{app.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {showLocationPicker && (
                <div
                  className="rounded-2xl border border-white/[0.1] p-4 space-y-3"
                  style={{ background: 'rgba(19,20,36,0.9)' }}
                >
                  {/* Segmented pill toggle — Molten Gold active state */}
                  <div className="flex items-center justify-center">
                    <div className="flex rounded-full border border-white/[0.1] bg-white/[0.03] p-0.5 backdrop-blur-md w-full max-w-xs">
                      <button
                        onClick={() => {
                          setLocationType('home');
                          setCityInput(profile?.homeCity || (currentCityKnown ? latestCity!.city_name : ''));
                        }}
                        className={`flex-1 py-2 rounded-full text-[11px] font-medium tracking-wide transition-all duration-300 ${
                          locationType === 'home'
                            ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] text-black shadow-lg shadow-primary/30'
                            : 'text-muted-foreground/50 hover:text-foreground/60'
                        }`}
                      >
                        <span className="block">🏠 Set Home</span>
                        <span className={`block text-[9px] font-light ${locationType === 'home' ? 'opacity-70' : 'opacity-40'}`}>
                          Where you live
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setLocationType('base');
                          setCityInput(profile?.workHubCity || (currentCityKnown ? latestCity!.city_name : ''));
                        }}
                        className={`flex-1 py-2 rounded-full text-[11px] font-medium tracking-wide transition-all duration-300 ${
                          locationType === 'base'
                            ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] text-black shadow-lg shadow-primary/30'
                            : 'text-muted-foreground/50 hover:text-foreground/60'
                        }`}
                      >
                        <span className="block">💼 Set Base</span>
                        <span className={`block text-[9px] font-light ${locationType === 'base' ? 'opacity-70' : 'opacity-40'}`}>
                          Work / day-to-day
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/50 text-center">
                    {locationType === 'home' ? 'Where you live' : 'Work or day-to-day location'}
                  </p>

                  <input
                    value={cityInput}
                    onChange={e => setCityInput(e.target.value)}
                    placeholder={locationType === 'home' ? 'Your home city…' : 'Your work city…'}
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowLocationPicker(false); setCityInput(''); }}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!cityInput.trim()) return;
                        if (locationType === 'home') {
                          await updateProfile({ homeCity: cityInput.trim() });
                          toast.success(`${cityInput.trim()} saved as home 🏠`);
                        } else {
                          await updateProfile({ workHubCity: cityInput.trim() });
                          const hasWorkRules = knowledgeSnippets.some(s => s.category === 'work-rules');
                          toast.success(
                            hasWorkRules
                              ? `Base calibrated — Work Rules pinned to your Vault`
                              : `${cityInput.trim()} saved as your base 💼`,
                            { description: hasWorkRules ? `${cityInput.trim()} is now your active base` : undefined }
                          );
                        }
                        setShowLocationPicker(false);
                        setCityInput('');
                      }}
                      disabled={!cityInput.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary font-medium disabled:opacity-40 transition-opacity"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* ── Your Vault Intelligence (location-prioritized) ── */}
              {knowledgeSnippets.length > 0 && (() => {
                const isAtHomeLocation = latestCity?.mode_used === 'home';
                const isAtWorkLocation = latestCity?.mode_used === 'work';
                // Sort: work-rules first when at base, safety first when traveling
                const sorted = [...knowledgeSnippets].sort((a, b) => {
                  if (isAtWorkLocation) {
                    if (a.category === 'work-rules' && b.category !== 'work-rules') return -1;
                    if (b.category === 'work-rules' && a.category !== 'work-rules') return 1;
                  } else if (!isAtHomeLocation) {
                    // traveling — surface travel + safety
                    const travelPrio = ['safety', 'travel', 'logistics'];
                    const aIdx = travelPrio.indexOf(a.category);
                    const bIdx = travelPrio.indexOf(b.category);
                    if (aIdx !== -1 && bIdx === -1) return -1;
                    if (bIdx !== -1 && aIdx === -1) return 1;
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                  }
                  return 0;
                });

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-1">
                      <BookOpen className="h-3.5 w-3.5 text-primary/50" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary/50">
                        Your Vault
                      </span>
                      {isAtWorkLocation && (
                        <span className="text-[8px] text-primary/40 bg-primary/[0.06] px-1.5 py-0.5 rounded-full border border-primary/10">
                          Work mode
                        </span>
                      )}
                      <span className="ml-auto text-[9px] text-muted-foreground/40">
                        {knowledgeSnippets.length} active
                      </span>
                    </div>
                    {sorted.map((snippet) => {
                      const meta = CATEGORY_META[snippet.category] || CATEGORY_META['travel'];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={snippet.id}
                          className="rounded-xl px-3.5 py-3 flex items-center gap-3 border border-white/[0.06] active:scale-[0.98] transition-transform cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.025)' }}
                          onClick={() => {
                            sessionStorage.setItem('briefing-prompt', `Tell me about my ${snippet.title}`);
                            onOpenChange(false);
                          }}
                        >
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5 text-primary/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground truncate">{snippet.title}</p>
                            <p className="text-[10px] text-muted-foreground/50">{meta.label}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── Empty state ── */}
              {!latestCity && knowledgeSnippets.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <div className="h-12 w-12 mx-auto rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Plane className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground/50">No active briefing data</p>
                  <p className="text-[11px] text-muted-foreground/30">
                    Travel entries and vault items appear here
                  </p>
                </div>
              )}

              {/* ── Companion CTA ── */}
              <p className="text-[10px] text-muted-foreground/35 italic text-center pt-1">
                Ask {companionName} about anything around you or in your vault
              </p>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
