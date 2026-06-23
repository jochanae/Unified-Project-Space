/**
 * TravelLog — "Global Footprint" visualization for the Admin Hub.
 * Shows a cinematic list of travel entries with gold accents and airport codes.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plane, Plus, Trash2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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

export default function TravelLog({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ city_name: '', region: '', airport_code: '', note: '', companion_name: '' });

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('travel_log')
      .select('*')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false });
    setEntries((data as TravelEntry[]) || []);
    setLoading(false);
  };

  const addEntry = async () => {
    if (!form.city_name.trim()) return;
    const { error } = await supabase.from('travel_log').insert({
      user_id: userId,
      city_name: form.city_name.trim(),
      region: form.region.trim() || null,
      airport_code: form.airport_code.trim().toUpperCase() || null,
      note: form.note.trim() || null,
      companion_name: form.companion_name.trim() || null,
    });
    if (error) { toast.error('Failed to add entry'); return; }
    toast.success('Location inscribed ✈️');
    setForm({ city_name: '', region: '', airport_code: '', note: '', companion_name: '' });
    setShowAdd(false);
    fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('travel_log').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry removed');
  };

  const uniqueCities = new Set(entries.map(e => e.city_name)).size;
  const uniqueCountries = new Set(entries.map(e => e.country).filter(Boolean)).size;

  return (
    <Card className="border-primary/20 bg-card/40 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Global Footprint
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {uniqueCities} cities · {uniqueCountries || 1} countries
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats ribbon */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-primary/5 border border-primary/10 p-3 text-center">
            <p className="text-2xl font-extralight text-primary">{entries.length}</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Entries</p>
          </div>
          <div className="flex-1 rounded-2xl bg-primary/5 border border-primary/10 p-3 text-center">
            <p className="text-2xl font-extralight text-primary">{uniqueCities}</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Cities</p>
          </div>
          <div className="flex-1 rounded-2xl bg-primary/5 border border-primary/10 p-3 text-center">
            <p className="text-2xl font-extralight text-primary">
              {new Set(entries.map(e => e.airport_code).filter(Boolean)).size}
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Airports</p>
          </div>
        </div>

        {/* Add new entry */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="w-full border-dashed border-primary/20 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Inscribe Location
        </Button>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City name *" value={form.city_name} onChange={e => setForm(f => ({ ...f, city_name: e.target.value }))} />
                <Input placeholder="Airport code" value={form.airport_code} onChange={e => setForm(f => ({ ...f, airport_code: e.target.value }))} className="uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Region / State" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
                <Input placeholder="Companion name" value={form.companion_name} onChange={e => setForm(f => ({ ...f, companion_name: e.target.value }))} />
              </div>
              <Input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              <Button size="sm" onClick={addEntry} className="w-full">
                <Plane className="h-3.5 w-3.5 mr-1.5" /> Add to Footprint
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline entries */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading travel log…</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <MapPin className="h-8 w-8 mx-auto text-primary/30" />
            <p className="text-sm text-muted-foreground">No locations inscribed yet</p>
            <p className="text-[10px] text-muted-foreground/60">Add your first travel entry above</p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group relative flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.02] transition-colors"
              >
                {/* Timeline dot & line */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary/60 shadow-[0_0_6px_hsl(var(--primary)/0.3)]" />
                  {idx < entries.length - 1 && <div className="w-px flex-1 bg-primary/10 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{entry.city_name}</span>
                    {entry.airport_code && (
                      <span className="text-[9px] font-mono tracking-[0.2em] text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded">
                        {entry.airport_code}
                      </span>
                    )}
                  </div>
                  {entry.region && (
                    <p className="text-[11px] text-muted-foreground/60">{entry.region}</p>
                  )}
                  {entry.companion_name && (
                    <p className="text-[10px] text-primary/50 mt-0.5">
                      Guided by {entry.companion_name}
                    </p>
                  )}
                  {entry.note && (
                    <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{entry.note}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/40 mt-1 font-mono">
                    {new Date(entry.visited_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
