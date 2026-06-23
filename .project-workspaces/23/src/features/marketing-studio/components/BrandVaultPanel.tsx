import { useEffect, useState } from 'react';
import { Loader2, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from '@/components/shared/ImageUploadField';
import { useBrandKit } from '../hooks/use-brand-kit';

/** Editor for the org-level brand kit (Brand Vault). */
export function BrandVaultPanel() {
  const { orgBrand, saveOrgBrand, isLoading } = useBrandKit(null);
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [accentHex, setAccentHex] = useState('#D4AF37');
  const [voice, setVoice] = useState('');
  const [mood, setMood] = useState('');

  useEffect(() => {
    setBrandName(orgBrand.brand_name ?? '');
    setTagline(orgBrand.tagline ?? '');
    setLogoUrl(orgBrand.logo_url ?? '');
    setHeadshotUrl(orgBrand.headshot_url ?? '');
    setAccentHex(orgBrand.accent_hex ?? '#D4AF37');
    setVoice(orgBrand.voice ?? '');
    setMood(orgBrand.mood ?? '');
  }, [orgBrand.brand_name, orgBrand.tagline, orgBrand.logo_url, orgBrand.headshot_url, orgBrand.accent_hex, orgBrand.voice, orgBrand.mood]);

  const handleSave = async () => {
    try {
      await saveOrgBrand.mutateAsync({
        brand_name: brandName || undefined,
        tagline: tagline || undefined,
        logo_url: logoUrl || undefined,
        headshot_url: headshotUrl || undefined,
        accent_hex: accentHex || undefined,
        voice: voice || undefined,
        mood: mood || undefined,
      });
      toast.success('Brand vault saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-4 w-4 text-gold" />
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
          Brand Vault
        </p>
      </div>
      <h2 className="text-xl font-serif tracking-tight">Your signature, locked-in.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Set once — every template across the studio inherits these defaults.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand name</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="IntoIQ" />
            </div>
            <div>
              <Label className="text-xs">Accent color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={accentHex}
                  onChange={(e) => setAccentHex(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={accentHex}
                  onChange={(e) => setAccentHex(e.target.value)}
                  placeholder="#D4AF37"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Tagline</Label>
            <Textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="The autonomous revenue engine."
              rows={2}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Logo</Label>
              <ImageUploadField value={logoUrl} onChange={setLogoUrl} placeholder="https://…/logo.png" folder="brand" />
            </div>
            <div>
              <Label className="text-xs">Headshot</Label>
              <ImageUploadField value={headshotUrl} onChange={setHeadshotUrl} placeholder="https://…/me.jpg" folder="brand" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Voice</Label>
              <Input
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                placeholder="authoritative · warm · rebellious"
                maxLength={40}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">One word. MarQ writes copy in this tone.</p>
            </div>
            <div>
              <Label className="text-xs">Mood</Label>
              <Input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="obsidian luxe · editorial minimal"
                maxLength={40}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Aesthetic MarQ matches when designing.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveOrgBrand.isPending} className="bg-gold text-black hover:bg-gold/90">
              {saveOrgBrand.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Brand Vault
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
