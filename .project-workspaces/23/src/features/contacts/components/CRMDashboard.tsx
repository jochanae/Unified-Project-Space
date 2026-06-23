import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useContacts, Contact, PipelineStage } from '@/features/contacts';
import { PipelineView } from './PipelineView';
import { ContactDetailSheet } from './ContactDetailSheet';
import { Users, LayoutGrid, List, Search, Filter, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuinnCRMHint } from '@/components/shared/QuinnContextualHint';
import { classifyLeadTemperature } from '@/lib/lead-temperature';
import { LeadTemperatureBadge } from '@/components/shared/LeadTemperatureBadge';
import { GeoInsightsPanel } from '@/features/analytics/components/GeoInsightsPanel';

import { useCurrentUser } from '@/hooks/use-current-user';
import { setQuinnGeoContext } from '@/features/quinn/lib/quinn-context';

interface CRMDashboardProps {
  projectId: string | null;
}

export function CRMDashboard({ projectId }: CRMDashboardProps) {
  const { contacts, loading, updateContact, deleteContact, addTag, removeTag, moveToStage, refetch } = useContacts(projectId);
  const { user } = useCurrentUser();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [hotOnly, setHotOnly] = useState(false);

  // Pre-classify all contacts once
  const withTemp = contacts.map(c => ({ contact: c, temp: classifyLeadTemperature(c).temperature }));
  const hotCount = withTemp.filter(x => x.temp === 'hot').length;

  const geoFilterKey = `intoiq_geo_filter_${projectId ?? 'all'}`;
  const [geoFilter, setGeoFilter] = useState<{ country?: string; city?: string; region?: string; postal_code?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(geoFilterKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (geoFilter) sessionStorage.setItem(geoFilterKey, JSON.stringify(geoFilter));
      else sessionStorage.removeItem(geoFilterKey);
    } catch { /* ignore */ }
    // Publish to MarQ so the HUD picks up the active geo segment.
    setQuinnGeoContext(geoFilter);
  }, [geoFilter, geoFilterKey]);

  // Clear MarQ geo context when this dashboard unmounts.
  useEffect(() => {
    return () => setQuinnGeoContext(null);
  }, []);

  const filtered = withTemp
    .filter(({ contact: c, temp }) => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        c.email.toLowerCase().includes(s) ||
        c.first_name?.toLowerCase().includes(s) ||
        c.last_name?.toLowerCase().includes(s);
      const matchTag = !filterTag || c.tags?.includes(filterTag);
      const matchHot = !hotOnly || temp === 'hot';
      const matchGeo = !geoFilter ||
        ((!geoFilter.country || c.country === geoFilter.country) &&
         (!geoFilter.city || c.city === geoFilter.city) &&
         (!geoFilter.region || c.region === geoFilter.region) &&
         (!geoFilter.postal_code || c.postal_code === geoFilter.postal_code));
      return matchSearch && matchTag && matchHot && matchGeo;
    })
    .map(x => x.contact);

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];

  const stats = {
    total: contacts.length,
    hot: hotCount,
    won: contacts.filter(c => c.pipeline_stage === 'won').length,
    avgScore: contacts.length > 0 ? Math.round(contacts.reduce((a, c) => a + c.score, 0) / contacts.length) : 0,
  };

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
      {/* MarQ contextual hint */}
      <div className="px-5 pt-4">
        <QuinnCRMHint />
      </div>
      {/* Header */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">CRM</h3>
              <p className="text-xs text-muted-foreground">Manage contacts & pipeline</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={view === 'pipeline' ? 'secondary' : 'ghost'} onClick={() => setView('pipeline')} className="h-8 px-2">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')} className="h-8 px-2">
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, accent: false },
            { label: '🔥 Hot', value: stats.hot, accent: stats.hot > 0 },
            { label: 'Won', value: stats.won, accent: false },
            { label: 'Avg Score', value: stats.avgScore, accent: false },
          ].map(s => (
            <div
              key={s.label}
              className={cn(
                'rounded-lg border p-2 text-center transition-colors',
                s.accent
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-card/30 border-border/20'
              )}
            >
              <p className={cn('text-xl font-bold', s.accent && 'text-red-400')}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>


      {/* Geo Insights */}
      {user?.orgId && (
        <div className="px-5 pt-4 space-y-2">
          <GeoInsightsPanel
            projectId={projectId}
            orgId={user.orgId}
            onLocationFilter={(f) => setGeoFilter(f)}
            activeFilter={geoFilter}
          />
          {geoFilter && (geoFilter.country || geoFilter.region || geoFilter.city || geoFilter.postal_code) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filtering CRM by:</span>
              {geoFilter.country && <Badge variant="secondary">Country: {geoFilter.country}</Badge>}
              {geoFilter.region && <Badge variant="secondary">Region: {geoFilter.region}</Badge>}
              {geoFilter.city && <Badge variant="secondary">City: {geoFilter.city}</Badge>}
              {geoFilter.postal_code && <Badge variant="secondary">ZIP: {geoFilter.postal_code}</Badge>}
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setGeoFilter(null)}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border/20 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="pl-9 h-8 text-sm bg-card/20 border-border/20"
          />
        </div>
        <Button
          size="sm"
          variant={hotOnly ? 'default' : 'ghost'}
          onClick={() => setHotOnly(!hotOnly)}
          className={cn(
            'h-8 px-2.5 text-[11px] gap-1 shrink-0',
            hotOnly && 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          )}
          title="Show only hot leads"
        >
          <Flame className="h-3.5 w-3.5" />
          Hot only
          {hotCount > 0 && !hotOnly && (
            <span className="ml-0.5 text-[9px] text-muted-foreground">({hotCount})</span>
          )}
        </Button>
        {allTags.length > 0 && (
          <div className="flex gap-1 overflow-x-auto">
            {filterTag && (
              <Button size="sm" variant="ghost" onClick={() => setFilterTag(null)} className="h-7 text-[10px] px-2">Clear</Button>
            )}
            {allTags.slice(0, 5).map(tag => (
              <Badge
                key={tag}
                variant={filterTag === tag ? 'default' : 'secondary'}
                className="cursor-pointer text-[10px] h-6"
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="text-center py-12"><LoadingSpinner size="md" text="Loading contacts…" /></div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No contacts yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Deploy your funnel to start capturing leads</p>
          </div>
        ) : view === 'pipeline' ? (
          <PipelineView
            contacts={filtered}
            onSelectContact={setSelectedContact}
            onMoveToStage={moveToStage}
          />
        ) : (
          /* List view */
          <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto">
            {filtered.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="px-3 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors cursor-pointer rounded-lg"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name || contact.email.split('@')[0]}
                      {contact.last_name ? ` ${contact.last_name}` : ''}
                    </p>
                    <LeadTemperatureBadge contact={contact} size="xs" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{contact.pipeline_stage}</Badge>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdate={async (id, updates) => {
          await updateContact(id, updates);
          setSelectedContact(prev => prev ? { ...prev, ...updates } : null);
        }}
        onDelete={deleteContact}
        onAddTag={async (id, tag) => {
          await addTag(id, tag);
          setSelectedContact(prev => prev ? { ...prev, tags: [...new Set([...(prev.tags || []), tag])] } : null);
        }}
        onRemoveTag={async (id, tag) => {
          await removeTag(id, tag);
          setSelectedContact(prev => prev ? { ...prev, tags: (prev.tags || []).filter(t => t !== tag) } : null);
        }}
      />
    </div>
  );
}
