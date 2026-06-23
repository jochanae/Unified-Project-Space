import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paintbrush, Upload, Loader2, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#0d0d0d', '#475569', '#0ea5e9',
];

export function AgencyBranding() {
  const { user } = useCurrentUser();
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.orgId) return;
    supabase
      .from('organizations')
      .select('brand_name, brand_primary_color, brand_logo_url, name')
      .eq('id', user.orgId)
      .single()
      .then(({ data }) => {
        if (data) {
          setBrandName((data as any).brand_name || data.name || '');
          setBrandColor((data as any).brand_primary_color || '#6366f1');
          setLogoUrl((data as any).brand_logo_url || null);
        }
        setLoaded(true);
      });
  }, [user?.orgId]);

  const handleSave = async () => {
    if (!user?.orgId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          brand_name: brandName.trim() || null,
          brand_primary_color: brandColor,
          brand_logo_url: logoUrl,
        } as any)
        .eq('id', user.orgId);
      if (error) throw error;
      toast.success('Brand settings saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.orgId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.orgId}/brand-logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('project-assets')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: signed } = await supabase.storage
        .from('project-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      setLogoUrl(signed?.signedUrl ? `${signed.signedUrl}&t=${Date.now()}` : '');
      toast.success('Logo uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [user?.orgId]);

  if (!loaded) return null;

  return (
    <section className="glass rounded-2xl p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-primary" /> White-Label Branding
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </Button>
      </div>

      <div className="space-y-5">
        {/* Logo */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Brand Logo</Label>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative h-16 w-16 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </button>
            <div className="text-xs text-muted-foreground">
              <p>Upload your brand logo</p>
              <p className="mt-0.5">PNG or SVG, max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Brand Name */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Brand Name</Label>
          <Input
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="Your Agency Name"
            className="mt-1.5 max-w-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Shown to clients instead of "IntoIQ"</p>
        </div>

        {/* Primary Color */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Primary Color</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setBrandColor(c)}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 transition-all flex items-center justify-center',
                  brandColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              >
                {brandColor === c && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
              </button>
            ))}
            <div className="relative">
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer h-8 w-8"
              />
              <div
                className="h-8 w-8 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-[10px] text-muted-foreground"
              >
                +
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Branding
        </Button>
      </div>

      {/* Live Preview */}
      {showPreview && (
        <Card className="mt-5 overflow-hidden">
          <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: brandColor }}>
            {logoUrl && <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />}
            <span className="text-sm font-semibold text-white">{brandName || 'Your Brand'}</span>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              This is how your branding will appear to clients in reports and shared pages.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
