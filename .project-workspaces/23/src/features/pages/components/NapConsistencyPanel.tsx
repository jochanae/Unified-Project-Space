import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ListChecks, Check, AlertTriangle, MinusCircle } from 'lucide-react';
import {
  DEFAULT_DIRECTORIES,
  buildNapReport,
  flattenAddress,
  type DirectoryListing,
  type FieldCheck,
} from '../utils/nap-consistency';
import type { LocalBusinessInfo } from '../utils/local-business-schema';

interface Props {
  canonical: LocalBusinessInfo;
}

const FIELD_LABEL: Record<FieldCheck['field'], string> = {
  name: 'Name',
  address: 'Address',
  phone: 'Phone',
};

const STATUS_TONE: Record<FieldCheck['status'], string> = {
  match: 'text-emerald-500',
  mismatch: 'text-destructive',
  missing: 'text-muted-foreground',
};

function StatusIcon({ status }: { status: FieldCheck['status'] }) {
  if (status === 'match') return <Check className="h-3.5 w-3.5" />;
  if (status === 'mismatch') return <AlertTriangle className="h-3.5 w-3.5" />;
  return <MinusCircle className="h-3.5 w-3.5" />;
}

export function NapConsistencyPanel({ canonical }: Props) {
  const [open, setOpen] = useState(false);
  const [listings, setListings] = useState<DirectoryListing[]>(DEFAULT_DIRECTORIES);

  const report = useMemo(() => buildNapReport(canonical, listings), [canonical, listings]);

  const updateListing = (key: string, patch: Partial<DirectoryListing>) => {
    setListings((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const canonicalAddress = flattenAddress(canonical);
  const hasCanonical = !!(canonical.name || canonicalAddress || canonical.telephone);

  return (
    <Card className="mb-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Directory NAP Check</span>
              {hasCanonical && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {report.overallScore}% consistent
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {!hasCanonical ? (
              <p className="text-xs text-muted-foreground">
                Fill out your Local Business name, address, and phone above to compare against directories.
              </p>
            ) : (
              <>
                <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">Canonical (this page)</p>
                  <p className="text-muted-foreground"><span className="text-foreground">Name:</span> {canonical.name || '—'}</p>
                  <p className="text-muted-foreground"><span className="text-foreground">Address:</span> {canonicalAddress || '—'}</p>
                  <p className="text-muted-foreground"><span className="text-foreground">Phone:</span> {canonical.telephone || '—'}</p>
                </div>

                <div className="space-y-3">
                  {report.reports.map((r) => (
                    <div key={r.listing.key} className="rounded-md border border-border/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.listing.label}</span>
                          {r.checks.some((c) => c.status !== 'missing') && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {r.score}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Name</Label>
                          <Input
                            value={r.listing.name || ''}
                            onChange={(e) => updateListing(r.listing.key, { name: e.target.value })}
                            placeholder="As shown on directory"
                            className="text-xs h-8 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Address</Label>
                          <Input
                            value={r.listing.address || ''}
                            onChange={(e) => updateListing(r.listing.key, { address: e.target.value })}
                            placeholder="Street, City, ST ZIP"
                            className="text-xs h-8 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Phone</Label>
                          <Input
                            value={r.listing.phone || ''}
                            onChange={(e) => updateListing(r.listing.key, { phone: e.target.value })}
                            placeholder="(555) 555-5555"
                            className="text-xs h-8 mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        {r.checks.map((c) => (
                          <span
                            key={c.field}
                            className={`inline-flex items-center gap-1 text-[11px] ${STATUS_TONE[c.status]}`}
                            title={
                              c.status === 'mismatch'
                                ? `Found: ${c.found}\nExpected: ${c.canonical}`
                                : undefined
                            }
                          >
                            <StatusIcon status={c.status} />
                            {FIELD_LABEL[c.field]}: {c.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Tip: paste exactly what each directory shows publicly — even small differences (St. vs Street) hurt local SEO trust.
                </p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
