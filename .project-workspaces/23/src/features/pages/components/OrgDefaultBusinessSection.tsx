import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { LocalBusinessInfo, DAY_KEYS, DAY_LABELS, emptyLocalBusiness } from '../utils/local-business-schema';

/**
 * Org-level default business profile. New pages can pre-fill from this so
 * users don't retype their NAP for every funnel page.
 */
export function OrgDefaultBusinessSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [info, setInfo] = useState<LocalBusinessInfo>(emptyLocalBusiness());
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: userRow } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single();
      if (!userRow?.org_id) { setLoading(false); return; }
      setOrgId(userRow.org_id);
      const { data: org } = await supabase
        .from('organizations')
        .select('default_local_business')
        .eq('id', userRow.org_id)
        .single();
      const stored = (org as any)?.default_local_business as LocalBusinessInfo | null;
      if (stored && typeof stored === 'object') {
        setInfo({ ...emptyLocalBusiness(), ...stored, address: { ...emptyLocalBusiness().address, ...(stored.address || {}) } });
      }
      setLoading(false);
    })();
  }, [userId]);

  const update = (patch: Partial<LocalBusinessInfo>) => setInfo({ ...info, ...patch });
  const updateAddress = (key: keyof LocalBusinessInfo['address'], value: string) =>
    setInfo({ ...info, address: { ...info.address, [key]: value } });
  const updateHours = (day: typeof DAY_KEYS[number], key: 'open' | 'close', value: string) => {
    const hours = { ...(info.hours || {}) } as NonNullable<LocalBusinessInfo['hours']>;
    hours[day] = { ...(hours[day] || { open: '', close: '' }), [key]: value };
    setInfo({ ...info, hours });
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ default_local_business: info as any } as any)
      .eq('id', orgId);
    setSaving(false);
    if (error) toast.error('Could not save default business');
    else toast.success('Default business profile saved');
  };

  if (loading) {
    return (
      <section className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-1 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" /> Default Business Profile
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Used as the starting point for new pages' Local Business / SEO info. You can still override per-page.
      </p>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={info.name} onChange={e => update({ name: e.target.value })} placeholder="Acme Coffee Co." />
            </Field>
            <Field label="Business type">
              <Input value={info.businessType || ''} onChange={e => update({ businessType: e.target.value })} placeholder="LocalBusiness, Restaurant…" />
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
            <Field label="Price range">
              <Input value={info.priceRange || ''} onChange={e => update({ priceRange: e.target.value })} placeholder="$$" />
            </Field>
          </div>

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
            <p className="text-xs font-medium text-muted-foreground mb-2">Default opening hours</p>
            <div className="space-y-1.5">
              {DAY_KEYS.map(day => (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-muted-foreground">{DAY_LABELS[day]}</span>
                  <Input type="time" value={info.hours?.[day]?.open || ''} onChange={e => updateHours(day, 'open', e.target.value)} className="text-sm h-8" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="time" value={info.hours?.[day]?.close || ''} onChange={e => updateHours(day, 'close', e.target.value)} className="text-sm h-8" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save default
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
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
