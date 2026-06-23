import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MapPin, Sparkles, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LocalBusinessInfo, DAY_KEYS, DAY_LABELS, emptyLocalBusiness } from '../utils/local-business-schema';
import { GBPAutofillDialog } from './GBPAutofillDialog';
import { NapConsistencyPanel } from './NapConsistencyPanel';

interface Props {
  pageId: string;
  initial: LocalBusinessInfo | null;
}

/**
 * Inline editor for LocalBusiness JSON-LD info attached to a page.
 * Persists directly to pages.local_business with a debounced save.
 */
export function LocalBusinessEditor({ pageId, initial }: Props) {
  const [info, setInfo] = useState<LocalBusinessInfo>(initial || emptyLocalBusiness());
  const [open, setOpen] = useState(!!initial?.enabled);
  const [gbpOpen, setGbpOpen] = useState(false);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setInfo(initial || emptyLocalBusiness());
  }, [pageId, initial]);

  const persist = (next: LocalBusinessInfo) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('pages')
        .update({ local_business: next as any })
        .eq('id', pageId);
      if (error) toast.error('Could not save SEO info');
    }, 400);
  };

  const update = (patch: Partial<LocalBusinessInfo>) => {
    const next = { ...info, ...patch };
    setInfo(next);
    persist(next);
  };

  const updateAddress = (key: keyof LocalBusinessInfo['address'], value: string) => {
    const next = { ...info, address: { ...info.address, [key]: value } };
    setInfo(next);
    persist(next);
  };

  const updateGeo = (key: 'latitude' | 'longitude', value: string) => {
    const next = { ...info, geo: { ...(info.geo || { latitude: '', longitude: '' }), [key]: value } };
    setInfo(next);
    persist(next);
  };

  const updateHours = (day: typeof DAY_KEYS[number], key: 'open' | 'close', value: string) => {
    const hours = { ...(info.hours || {}) } as NonNullable<LocalBusinessInfo['hours']>;
    hours[day] = { ...(hours[day] || { open: '', close: '' }), [key]: value };
    const next = { ...info, hours };
    setInfo(next);
    persist(next);
  };

  const applyParsed = (next: LocalBusinessInfo) => {
    setInfo(next);
    persist(next);
    if (!open) setOpen(true);
  };

  const loadOrgDefault = async () => {
    setLoadingDefault(true);
    try {
      const { data: userRow } = await supabase.from('users').select('org_id').single();
      if (!userRow?.org_id) { toast.error('No organization found'); return; }
      const { data: org } = await supabase
        .from('organizations')
        .select('default_local_business')
        .eq('id', userRow.org_id)
        .single();
      const def = (org as any)?.default_local_business as LocalBusinessInfo | null;
      if (!def || !def.name) {
        toast.info('No default profile set yet', {
          description: 'Add one in Settings → Default Business Profile.',
        });
        return;
      }
      const merged: LocalBusinessInfo = {
        ...emptyLocalBusiness(),
        ...def,
        enabled: true,
        address: { ...emptyLocalBusiness().address, ...(def.address || {}) },
      };
      setInfo(merged);
      persist(merged);
      setOpen(true);
      toast.success('Loaded default business profile');
    } finally {
      setLoadingDefault(false);
    }
  };

  return (
    <Card className="mb-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Local Business / SEO</span>
              {info.enabled && info.name && (
                <span className="text-xs text-muted-foreground">· {info.name}</span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div>
                <Label htmlFor="lb-enabled" className="text-sm">Inject LocalBusiness schema</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adds structured data so search engines understand your business.
                </p>
              </div>
              <Switch
                id="lb-enabled"
                checked={info.enabled}
                onCheckedChange={(v) => update({ enabled: v })}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setGbpOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Pull from Google
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={loadOrgDefault} disabled={loadingDefault}>
                <Building2 className="h-3.5 w-3.5 mr-1" /> Use org default
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name *">
                <Input value={info.name} onChange={e => update({ name: e.target.value })} placeholder="Acme Coffee Co." />
              </Field>
              <Field label="Business type">
                <Input value={info.businessType || ''} onChange={e => update({ businessType: e.target.value })} placeholder="LocalBusiness, Restaurant, Store…" />
              </Field>
              <Field label="Phone">
                <Input value={info.telephone || ''} onChange={e => update({ telephone: e.target.value })} placeholder="+1-555-555-5555" />
              </Field>
              <Field label="Email">
                <Input value={info.email || ''} onChange={e => update({ email: e.target.value })} placeholder="hello@acme.com" />
              </Field>
              <Field label="Website URL">
                <Input value={info.url || ''} onChange={e => update({ url: e.target.value })} placeholder="https://acme.com" />
              </Field>
              <Field label="Image URL">
                <Input value={info.image || ''} onChange={e => update({ image: e.target.value })} placeholder="https://…/logo.png" />
              </Field>
              <Field label="Price range">
                <Input value={info.priceRange || ''} onChange={e => update({ priceRange: e.target.value })} placeholder="$$" />
              </Field>
            </div>

            <Field label="Description">
              <Textarea rows={2} value={info.description || ''} onChange={e => update({ description: e.target.value })} placeholder="Short description shown to search engines." />
            </Field>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Address</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={info.address.street} onChange={e => updateAddress('street', e.target.value)} placeholder="Street address" />
                <Input value={info.address.city} onChange={e => updateAddress('city', e.target.value)} placeholder="City" />
                <Input value={info.address.region} onChange={e => updateAddress('region', e.target.value)} placeholder="State / Region" />
                <Input value={info.address.postalCode} onChange={e => updateAddress('postalCode', e.target.value)} placeholder="Postal code" />
                <Input value={info.address.country} onChange={e => updateAddress('country', e.target.value)} placeholder="Country (e.g. US)" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Coordinates (optional)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={info.geo?.latitude || ''} onChange={e => updateGeo('latitude', e.target.value)} placeholder="Latitude" />
                <Input value={info.geo?.longitude || ''} onChange={e => updateGeo('longitude', e.target.value)} placeholder="Longitude" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Opening hours (24h, leave blank for closed)</p>
              <div className="space-y-1.5">
                {DAY_KEYS.map(day => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{DAY_LABELS[day]}</span>
                    <Input
                      type="time"
                      value={info.hours?.[day]?.open || ''}
                      onChange={e => updateHours(day, 'open', e.target.value)}
                      className="text-sm h-8"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={info.hours?.[day]?.close || ''}
                      onChange={e => updateHours(day, 'close', e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Field label="Social profile URLs (one per line)">
              <Textarea
                rows={3}
                value={(info.sameAs || []).join('\n')}
                onChange={e => update({ sameAs: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                placeholder={'https://instagram.com/acme\nhttps://facebook.com/acme'}
              />
            </Field>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <div className="px-3 pb-3">
        <NapConsistencyPanel canonical={info} />
      </div>

      <GBPAutofillDialog
        open={gbpOpen}
        onOpenChange={setGbpOpen}
        current={info}
        onApply={applyParsed}
      />
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
