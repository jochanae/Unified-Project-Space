/**
 * PassportVaultPage — "The Inscribed Journey" full-screen overlay.
 * Shows travel stamps, timeline, photo clusters, and stats in Centurion Gold glass aesthetic.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Plane, Plus, Trash2, CalendarIcon, X, Home, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeGoBack } from '@/lib/navigation';
import { supabase } from '@/integrations/supabase/client';
import { resolveToSignedUrl } from '@/lib/signedUrl';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import PassportStamp from '@/components/PassportStamp';
import StampPhotoTray, { type TravelPhoto } from '@/components/travel/StampPhotoTray';
import ShareStampCard from '@/components/travel/ShareStampCard';

interface TravelEntry {
  id: string;
  city_name: string;
  region: string | null;
  country: string | null;
  airport_code: string | null;
  companion_name: string | null;
  mode_used: string | null;
  note: string | null;
  visited_at: string;
}


export default function PassportVaultPage() {
  const navigate = useNavigate();
  const { user, activeConnection } = useAppContext();
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ city_name: '', region: '', airport_code: '', note: '' });
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  // Photo tray state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TravelPhoto[]>>({});
  const [shareEntry, setShareEntry] = useState<TravelEntry | null>(null);

  // Filtered entries based on selected date
  const filteredEntries = useMemo(() => {
    if (!filterDate) return entries;
    return entries.filter(e => isSameDay(new Date(e.visited_at), filterDate));
  }, [entries, filterDate]);

  // Dates that have stamps (for highlighting in calendar)
  const stampDates = useMemo(() => {
    return entries.map(e => new Date(e.visited_at));
  }, [entries]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('travel_log')
      .select('*')
      .eq('user_id', user.id)
      .order('visited_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data as TravelEntry[]) || []);
        setLoading(false);
      });
  }, [user?.id]);

  // Fetch photos when an entry is expanded
  useEffect(() => {
    if (!expandedEntryId || !user?.id) return;
    if (entryPhotos[expandedEntryId]) return; // already fetched
    (supabase
      .from('travel_photos' as any)
      .select('id, image_url, caption, travel_entry_id')
      .eq('travel_entry_id', expandedEntryId) as any)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const photos = (data as TravelPhoto[]) || [];
        // Resolve private bucket URLs to signed URLs
        const resolved = await Promise.all(
          photos.map(async (p) => ({
            ...p,
            image_url: await resolveToSignedUrl(p.image_url),
          }))
        );
        setEntryPhotos(prev => ({ ...prev, [expandedEntryId]: resolved }));
      });
  }, [expandedEntryId, user?.id]);

  const addEntry = async () => {
    if (!form.city_name.trim() || !user?.id) return;
    const { error } = await supabase.from('travel_log').insert({
      user_id: user.id,
      city_name: form.city_name.trim(),
      region: form.region.trim() || null,
      airport_code: form.airport_code.trim().toUpperCase() || null,
      note: form.note.trim() || null,
      companion_name: activeConnection?.name || null,
      member_id: activeConnection?.memberId || null,
    });
    if (error) { toast.error('Failed to inscribe'); return; }
    toast.success('Location inscribed ✈️');
    setForm({ city_name: '', region: '', airport_code: '', note: '' });
    setShowAdd(false);
    const { data } = await supabase
      .from('travel_log')
      .select('*')
      .eq('user_id', user.id)
      .order('visited_at', { ascending: false });
    setEntries((data as TravelEntry[]) || []);
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('travel_log').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const citySet = new Set(filteredEntries.map(e => e.city_name));
  const uniqueCities = citySet.size;
  const cityList = [...citySet].sort();

  const countrySet = new Set(filteredEntries.map(e => e.country).filter(Boolean));
  const uniqueCountries = countrySet.size;
  const countryList = [...countrySet].sort() as string[];

  const airportCodes = [...new Set(filteredEntries.map(e => e.airport_code).filter(Boolean))];

  // Stat card expand state
  const [expandedStat, setExpandedStat] = useState<'Stamps' | 'Cities' | 'Countries' | null>(null);
  const expandedEntry = filteredEntries.find(e => e.id === expandedEntryId);

  // Derive location type from auto-inscribed note
  const getLocationType = (note: string | null): 'home' | 'work' | null => {
    if (!note) return null;
    if (note.includes('Home base')) return 'home';
    if (note.includes('Work location')) return 'work';
    return null;
  };

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] relative" style={{ background: '#05050A' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, hsl(var(--primary) / 0.06) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 backdrop-blur-2xl border-b border-white/[0.04]"
        style={{ background: 'rgba(5, 5, 10, 0.92)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button onClick={() => navigate('/my-world')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[9px] uppercase tracking-[0.5em] text-primary/60 font-medium">
              The Inscribed Journey
            </h1>
            <p className="text-xs text-muted-foreground/40 mt-0.5">
              {uniqueCities} cities · {filteredEntries.length} entries
              {filterDate && ` · ${format(filterDate, 'MMM d, yyyy')}`}
            </p>
          </div>

          {/* Date filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "relative p-1.5 rounded-full transition-colors",
                  filterDate
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : "text-muted-foreground/50 hover:text-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {filterDate && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" style={{ background: 'rgba(15, 15, 20, 0.98)', borderColor: 'hsl(var(--primary) / 0.15)' }}>
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                className={cn("p-3 pointer-events-auto")}
                modifiers={{ hasStamp: stampDates }}
                modifiersClassNames={{ hasStamp: 'bg-primary/20 text-primary font-medium' }}
                disabled={(date) => date > new Date()}
              />
              {filterDate && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => setFilterDate(undefined)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear filter
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">
        {/* Stats */}
        <div className="flex gap-3 mt-6 mb-2">
          {([
            { value: filteredEntries.length, label: 'Stamps' as const, delay: 0.1 },
            { value: uniqueCities, label: 'Cities' as const, delay: 0.2 },
            { value: uniqueCountries, label: 'Countries' as const, delay: 0.3 },
          ] as const).map(stat => (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              onClick={() => setExpandedStat(prev => prev === stat.label ? null : stat.label)}
              className={cn(
                "flex-1 rounded-2xl border backdrop-blur-xl p-4 text-center transition-colors active:scale-[0.97]",
                expandedStat === stat.label
                  ? "border-primary/30 bg-primary/[0.08]"
                  : "border-primary/10 bg-primary/[0.03]"
              )}
            >
              <p className="text-3xl font-extralight text-primary">{stat.value}</p>
              <p className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground mt-1">{stat.label}</p>
            </motion.button>
          ))}
        </div>

        {/* Expanded stat summary */}
        <AnimatePresence>
          {expandedStat && (
            <motion.div
              key={expandedStat}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] backdrop-blur-xl p-4 mt-2">
                <p className="text-[9px] uppercase tracking-[0.4em] text-primary/50 font-medium mb-3">
                  {expandedStat === 'Stamps' && `${filteredEntries.length} Stamps`}
                  {expandedStat === 'Cities' && `${uniqueCities} Cities visited`}
                  {expandedStat === 'Countries' && `${uniqueCountries} Countries reached`}
                </p>

                {expandedStat === 'Stamps' && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                    {filteredEntries.slice(0, 20).map(entry => (
                      <div key={entry.id} className="flex items-center gap-2 text-xs text-foreground/70">
                        <Plane className="h-3 w-3 text-primary/40 shrink-0" />
                        <span className="truncate">{entry.city_name}{entry.region ? `, ${entry.region}` : ''}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0">
                          {format(new Date(entry.visited_at), 'MMM d')}
                        </span>
                      </div>
                    ))}
                    {filteredEntries.length > 20 && (
                      <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
                        + {filteredEntries.length - 20} more
                      </p>
                    )}
                  </div>
                )}

                {expandedStat === 'Cities' && (
                  <div className="flex flex-wrap gap-2">
                    {cityList.map(city => {
                      const count = filteredEntries.filter(e => e.city_name === city).length;
                      return (
                        <span key={city} className="text-xs text-foreground/70 bg-primary/[0.06] border border-primary/10 px-2.5 py-1 rounded-full">
                          {city} <span className="text-muted-foreground/40">({count})</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {expandedStat === 'Countries' && (
                  <div className="flex flex-wrap gap-2">
                    {countryList.map(country => {
                      const count = filteredEntries.filter(e => e.country === country).length;
                      const cities = [...new Set(filteredEntries.filter(e => e.country === country).map(e => e.city_name))];
                      return (
                        <div key={country} className="w-full flex items-start gap-2 text-xs text-foreground/70 py-1">
                          <MapPin className="h-3 w-3 text-primary/40 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{country}</span>
                            <span className="text-muted-foreground/40 ml-1">({count} stamps)</span>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                              {cities.join(' · ')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Airport code ribbon */}
        {airportCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {airportCodes.map(code => (
              <span
                key={code}
                className="text-[10px] font-mono tracking-[0.3em] text-primary/50 bg-primary/[0.04] border border-primary/10 px-3 py-1.5 rounded-full"
              >
                {code}
              </span>
            ))}
          </motion.div>
        )}

        {/* Add entry */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setShowAdd(!showAdd)}
          className="w-full py-3 rounded-2xl border border-dashed border-primary/20 text-muted-foreground/60 text-xs uppercase tracking-[0.3em] hover:text-primary hover:border-primary/40 transition-colors mb-6 flex items-center justify-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Inscribe Location
        </motion.button>

        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden space-y-2 mb-8"
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="City name *"
                value={form.city_name}
                onChange={e => setForm(f => ({ ...f, city_name: e.target.value }))}
                className="bg-white/[0.03] border-white/[0.06]"
              />
              <Input
                placeholder="Airport code"
                value={form.airport_code}
                onChange={e => setForm(f => ({ ...f, airport_code: e.target.value }))}
                className="bg-white/[0.03] border-white/[0.06] uppercase font-mono"
              />
            </div>
            <Input
              placeholder="Region / State"
              value={form.region}
              onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              className="bg-white/[0.03] border-white/[0.06]"
            />
            <Input
              placeholder="Note (optional)"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="bg-white/[0.03] border-white/[0.06]"
            />
            <Button onClick={addEntry} className="w-full">
              <Plane className="h-3.5 w-3.5 mr-1.5" />
              Add to Journey
            </Button>
          </motion.div>
        )}

        {/* Stamp gallery — tap to expand photo tray */}
        {filteredEntries.length > 0 && (
          <div className="mb-8">
            <p className="text-[8px] uppercase tracking-[0.4em] text-muted-foreground/40 text-center mb-4">
              Stamp Gallery · Tap to expand
            </p>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
              {filteredEntries.slice(0, 12).map((entry) => (
                <div
                  key={entry.id}
                  className="snap-center shrink-0 cursor-pointer"
                  onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                >
                  <PassportStamp
                    cityName={entry.city_name}
                    date={new Date(entry.visited_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: '2-digit',
                    })}
                    companionName={entry.companion_name || undefined}
                    locationType={getLocationType(entry.note)}
                  />
                </div>
              ))}
            </div>

            {/* Expanding photo tray */}
            <AnimatePresence>
              {expandedEntryId && expandedEntry && (
                <StampPhotoTray
                  entryId={expandedEntryId}
                  cityName={expandedEntry.city_name}
                  date={new Date(expandedEntry.visited_at).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  companionName={expandedEntry.companion_name || undefined}
                  userId={user.id}
                  photos={entryPhotos[expandedEntryId] || []}
                  onPhotosChange={(photos) =>
                    setEntryPhotos(prev => ({ ...prev, [expandedEntryId]: photos }))
                  }
                  onClose={() => setExpandedEntryId(null)}
                  onShare={() => setShareEntry(expandedEntry)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-0">
          <p className="text-[8px] uppercase tracking-[0.4em] text-muted-foreground/40 text-center mb-6">
            Travel Timeline
          </p>

          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading your journey…</p>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MapPin className="h-10 w-10 mx-auto text-primary/20" />
              <p className="text-sm text-muted-foreground/60">
                {filterDate ? 'No stamps on this date' : 'Your journey begins here'}
              </p>
              <p className="text-[10px] text-muted-foreground/30">
                {filterDate ? 'Try another date or clear the filter' : 'Inscribe your first location above'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * Math.min(idx, 10) }}
                className="group relative flex gap-4 pb-6"
              >
                {/* Timeline spine */}
                <div className="flex flex-col items-center pt-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-primary/40 bg-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.2)]" />
                  {idx < filteredEntries.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-primary/20 to-transparent mt-1" />
                  )}
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{entry.city_name}</span>
                        {getLocationType(entry.note) === 'home' && (
                          <span className="text-[8px] text-emerald-400/70 bg-emerald-400/[0.08] px-1.5 py-0.5 rounded-full border border-emerald-400/15 flex items-center gap-1">
                            <Home className="h-2.5 w-2.5" /> Home
                          </span>
                        )}
                        {getLocationType(entry.note) === 'work' && (
                          <span className="text-[8px] text-sky-400/70 bg-sky-400/[0.08] px-1.5 py-0.5 rounded-full border border-sky-400/15 flex items-center gap-1">
                            <Briefcase className="h-2.5 w-2.5" /> Work
                          </span>
                        )}
                        {entry.airport_code && (
                          <span className="text-[9px] font-mono tracking-[0.25em] text-primary/60 bg-primary/[0.06] px-2 py-0.5 rounded-full border border-primary/10">
                            {entry.airport_code}
                          </span>
                        )}
                        {/* Photo count badge */}
                        {(entryPhotos[entry.id]?.length || 0) > 0 && (
                          <span className="text-[8px] text-primary/50 bg-primary/[0.06] px-1.5 py-0.5 rounded-full border border-primary/10">
                            📷 {entryPhotos[entry.id].length}
                          </span>
                        )}
                      </div>
                      {entry.region && (
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">{entry.region}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground/30 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {entry.companion_name && (
                    <p className="text-[10px] text-primary/40 mt-2 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
                      Guided by {entry.companion_name}
                    </p>
                  )}

                  {entry.note && (
                    <p className="text-[11px] text-muted-foreground/50 mt-2 italic leading-relaxed">
                      {entry.note}
                    </p>
                  )}

                  <p className="text-[9px] text-muted-foreground/30 mt-3 font-mono tabular-nums">
                    {new Date(entry.visited_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Share stamp overlay */}
      <AnimatePresence>
        {shareEntry && (
          <ShareStampCard
            cityName={shareEntry.city_name}
            date={new Date(shareEntry.visited_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: '2-digit',
            })}
            companionName={shareEntry.companion_name || undefined}
            airportCode={shareEntry.airport_code || undefined}
            heroPhotoUrl={entryPhotos[shareEntry.id]?.[0]?.image_url}
            entriesCount={entries.length}
            citiesCount={uniqueCities}
            photosCount={entryPhotos[shareEntry.id]?.length || 0}
            onClose={() => setShareEntry(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
