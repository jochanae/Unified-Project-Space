import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Download, Map as MapIcon, List, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { openQuinnHUD } from '@/features/quinn/lib/quinn-context';

interface Row {
  postal_code: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  pipeline_stage: string | null;
  created_at: string | null;
}

interface Tally { key: string; count: number }

export interface GeoFilter { country?: string; city?: string; region?: string; postal_code?: string }

interface GeoInsightsPanelProps {
  projectId: string | null;
  orgId: string;
  onLocationFilter?: (filter: GeoFilter | null) => void;
  activeFilter?: GeoFilter | null;
}

const RANGES = [
  { label: 'All', days: null },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function filterRowsByGeo<T extends Partial<Row>>(rows: T[], f: GeoFilter | null | undefined): T[] {
  if (!f) return rows;
  return rows.filter(r =>
    (!f.country || r.country === f.country) &&
    (!f.city || r.city === f.city) &&
    (!f.region || r.region === f.region) &&
    (!f.postal_code || r.postal_code === f.postal_code)
  );
}

export function describeFilter(f: GeoFilter | null | undefined): string {
  if (!f) return '';
  const parts: string[] = [];
  if (f.country) parts.push(`Country: ${f.country}`);
  if (f.region) parts.push(`Region: ${f.region}`);
  if (f.city) parts.push(`City: ${f.city}`);
  if (f.postal_code) parts.push(`ZIP: ${f.postal_code}`);
  return parts.join(' · ');
}

export function GeoInsightsPanel({ projectId, orgId, onLocationFilter, activeFilter }: GeoInsightsPanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<number | null>(30);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('contacts')
        .select('postal_code, country, city, region, pipeline_stage, created_at')
        .eq('org_id', orgId);
      if (projectId) q = q.eq('source_project_id', projectId);
      if (rangeDays != null) {
        const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
        q = q.gte('created_at', since);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) console.error('GeoInsightsPanel error:', error);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, projectId, rangeDays]);

  const { topZips, topCountries, topCities, topRegions, hasData } = useMemo(() => {
    const wonRows = rows.filter(r => r.pipeline_stage === 'won');
    const tally = (items: (string | null | undefined)[]): Tally[] => {
      const m = new Map<string, number>();
      for (const k of items) {
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return Array.from(m.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    };
    const zips = tally(wonRows.map(r => r.postal_code)).slice(0, 10);
    const countries = tally(rows.map(r => r.country)).slice(0, 8);
    const cities = tally(rows.map(r => r.city)).slice(0, 8);
    const regions = tally(rows.map(r => r.region)).slice(0, 8);
    return {
      topZips: zips,
      topCountries: countries,
      topCities: cities,
      topRegions: regions,
      hasData: zips.length + countries.length + cities.length + regions.length > 0,
    };
  }, [rows]);

  const f = activeFilter;
  const isFiltered = Boolean(f && (f.country || f.region || f.city || f.postal_code));

  function exportCsv() {
    const filteredRows = filterRowsByGeo(rows, f);
    const header = 'country,region,city,postal_code,pipeline_stage,created_at';
    const lines = filteredRows.map(r => [r.country, r.region, r.city, r.postal_code, r.pipeline_stage, r.created_at]
      .map(v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = isFiltered ? `-${(f!.country || f!.region || f!.city || f!.postal_code || '').replace(/[^a-z0-9]+/gi, '_')}` : '';
    a.download = `intoiq-geo-export${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilter() {
    onLocationFilter?.(null);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="h-4 w-4" />
          <span>Loading geo data…</span>
        </div>
      </div>
    );
  }

  const exportLabel = isFiltered ? `Export CSV (filtered)` : 'Export CSV';

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Geo Insights</span>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map(r => (
            <Button
              key={r.label}
              size="sm"
              variant={rangeDays === r.days ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-[11px]"
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={() => setShowMap(s => !s)}
            title="Toggle map view"
          >
            {showMap ? <List className="h-3 w-3" /> : <MapIcon className="h-3 w-3" />}
            {showMap ? 'List' : 'Map'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-7 text-xs gap-1', isFiltered && 'border-primary/40 text-primary')}
            onClick={exportCsv}
            disabled={rows.length === 0}
            title={isFiltered ? `Export only rows matching: ${describeFilter(f)}` : 'Export all rows in range'}
          >
            <Download className="h-3 w-3" />
            {exportLabel}
          </Button>
        </div>
      </div>

      {isFiltered && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide text-primary/80">Drill-down</span>
          <span className="text-xs font-medium">{describeFilter(f)}</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
            onClick={() => openQuinnHUD(`Analyze my leads filtered by ${describeFilter(f)}. What patterns, conversion rates, or follow-up tactics should I focus on for this segment?`)}
            title="Open MarQ scoped to this region"
          >
            <Sparkles className="h-3 w-3" />
            Ask MarQ
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] gap-1"
            onClick={clearFilter}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {!hasData && (
        <p className="text-xs text-muted-foreground">
          No geo data in this range. Try widening the time range, or wait for new leads.
        </p>
      )}

      {showMap && topCountries.length > 0 && (
        <div className="rounded-md border border-border/40 bg-muted/20 overflow-hidden">
          <CountryBubbleMap
            countries={topCountries}
            activeCountry={f?.country}
            onSelect={c => onLocationFilter?.({ country: c })}
          />
        </div>
      )}

      {topCountries.length > 0 && (
        <Section title="Top Countries (All Leads)">
          <div className="flex flex-wrap gap-1.5">
            {topCountries.map(row => (
              <Chip
                key={row.key}
                label={row.key}
                count={row.count}
                active={f?.country === row.key}
                onClick={onLocationFilter ? () => onLocationFilter(f?.country === row.key ? null : { country: row.key }) : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      {topCities.length > 0 && (
        <Section title="Top Cities">
          <div className="flex flex-wrap gap-1.5">
            {topCities.map(row => (
              <Chip
                key={row.key}
                label={row.key}
                count={row.count}
                active={f?.city === row.key}
                onClick={onLocationFilter ? () => onLocationFilter(f?.city === row.key ? null : { city: row.key }) : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      {topRegions.length > 0 && (
        <Section title="Top Regions">
          <div className="flex flex-wrap gap-1.5">
            {topRegions.map(row => (
              <Chip
                key={row.key}
                label={row.key}
                count={row.count}
                active={f?.region === row.key}
                onClick={onLocationFilter ? () => onLocationFilter(f?.region === row.key ? null : { region: row.key }) : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      {topZips.length > 0 && (
        <Section title="Top ZIPs by Won Contacts">
          <div className="space-y-1.5">
            {topZips.map(row => {
              const max = topZips[0].count;
              const active = f?.postal_code === row.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Filter by ZIP ${row.key} (${row.count} won)${active ? ', currently active' : ''}`}
                  onClick={onLocationFilter ? () => onLocationFilter(active ? null : { postal_code: row.key }) : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 text-left rounded px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    onLocationFilter && 'hover:bg-muted/50 cursor-pointer',
                    active && 'bg-primary/10 ring-1 ring-primary/40'
                  )}
                  disabled={!onLocationFilter}
                >
                  <span className="text-xs font-mono w-16 shrink-0">{row.key}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{row.count}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Chip({ label, count, onClick, active }: { label: string; count: number; onClick?: () => void; active?: boolean }) {
  if (!onClick) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      aria-label={`Filter by ${label} (${count})${active ? ', currently active' : ''}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        active ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:bg-muted/50'
      )}
    >
      <span className="font-medium">{label}</span>
      <span className={cn('text-muted-foreground', active && 'text-primary/80')}>{count}</span>
    </button>
  );
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  'United States': [-98.5, 39.8], US: [-98.5, 39.8], USA: [-98.5, 39.8],
  Canada: [-106.3, 56.1], CA: [-106.3, 56.1],
  'United Kingdom': [-2, 54], UK: [-2, 54], GB: [-2, 54],
  Germany: [10.4, 51.2], DE: [10.4, 51.2],
  France: [2.2, 46.2], FR: [2.2, 46.2],
  Spain: [-3.7, 40.5], ES: [-3.7, 40.5],
  Italy: [12.6, 41.9], IT: [12.6, 41.9],
  Netherlands: [5.3, 52.1], NL: [5.3, 52.1],
  Australia: [134, -25], AU: [134, -25],
  India: [78.9, 20.6], IN: [78.9, 20.6],
  Brazil: [-51.9, -14.2], BR: [-51.9, -14.2],
  Mexico: [-102.5, 23.6], MX: [-102.5, 23.6],
  Japan: [138.3, 36.2], JP: [138.3, 36.2],
  China: [104.2, 35.9], CN: [104.2, 35.9],
  'South Africa': [22.9, -30.6], ZA: [22.9, -30.6],
  Nigeria: [8.7, 9.1], NG: [8.7, 9.1],
  Singapore: [103.8, 1.35], SG: [103.8, 1.35],
  'United Arab Emirates': [54, 24], AE: [54, 24],
  Sweden: [18.6, 60.1], SE: [18.6, 60.1],
  Ireland: [-8, 53.4], IE: [-8, 53.4],
};

function CountryBubbleMap({ countries, onSelect, activeCountry }: { countries: Tally[]; onSelect?: (c: string) => void; activeCountry?: string }) {
  const max = countries[0]?.count ?? 1;
  const markers = countries
    .map(c => ({ ...c, coords: COUNTRY_COORDS[c.key] }))
    .filter(c => c.coords);

  return (
    <div className="w-full" style={{ aspectRatio: '2 / 1' }}>
      <ComposableMap projectionConfig={{ scale: 130 }} style={{ width: '100%', height: '100%' }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))', strokeWidth: 0.4, outline: 'none' },
                  hover: { fill: 'hsl(var(--muted))', outline: 'none' },
                  pressed: { fill: 'hsl(var(--muted))', outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
        {markers.map(m => {
          const r = 3 + Math.round((m.count / max) * 10);
          const isActive = activeCountry === m.key;
          return (
            <Marker key={m.key} coordinates={m.coords!} onClick={() => onSelect?.(m.key)}>
              <circle
                r={isActive ? r + 2 : r}
                fill="hsl(var(--primary))"
                fillOpacity={isActive ? 0.9 : 0.55}
                stroke="hsl(var(--primary))"
                strokeWidth={isActive ? 2 : 1}
                style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
                tabIndex={onSelect ? 0 : -1}
                role={onSelect ? 'button' : undefined}
                aria-pressed={onSelect ? isActive : undefined}
                aria-label={`${m.key}: ${m.count} leads${isActive ? ', currently active' : ''}`}
                onKeyDown={onSelect ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(m.key);
                  }
                } : undefined}
                onFocus={(e) => { e.currentTarget.setAttribute('stroke-width', '3'); }}
                onBlur={(e) => { e.currentTarget.setAttribute('stroke-width', isActive ? '2' : '1'); }}
              />
              <title>{`${m.key}: ${m.count}`}</title>
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
