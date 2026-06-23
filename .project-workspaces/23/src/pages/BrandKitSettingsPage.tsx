import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Plus, Star, Trash2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImageUploadField } from '@/components/shared/ImageUploadField';
import { useBrandKits, type BrandKitRow } from '@/features/marketing-studio/hooks/use-brand-kits';

/**
 * Manual brand kit editor (/settings/brand).
 * Lets users populate the kit JSONB fields that MarQ's edge functions read
 * via supabase/functions/_shared/brand-kit-context.ts.
 */
type EditableKit = {
  voice?: string;
  audience?: string;
  positioning?: string;
  taglines?: string[];
  bannedWords?: string[];
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontHeading?: string;
  fontBody?: string;
  logoUrl?: string;
  visualStyle?: string;
};

const EMPTY: EditableKit = {};

export default function BrandKitSettingsPage() {
  const { kits, isLoading, active, setActiveId, create, update, setDefault, remove } = useBrandKits();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected: BrandKitRow | null = useMemo(() => {
    if (!kits.length) return null;
    return kits.find((k) => k.id === selectedId) || active || kits[0];
  }, [kits, selectedId, active]);

  const [name, setName] = useState('');
  const [kit, setKit] = useState<EditableKit>(EMPTY);
  const [taglinesText, setTaglinesText] = useState('');
  const [bannedText, setBannedText] = useState('');

  useEffect(() => {
    if (!selected) {
      setName('');
      setKit(EMPTY);
      setTaglinesText('');
      setBannedText('');
      return;
    }
    const k = (selected.kit ?? {}) as EditableKit;
    setName(selected.name);
    setKit(k);
    setTaglinesText((k.taglines ?? []).join('\n'));
    setBannedText((k.bannedWords ?? []).join(', '));
  }, [selected?.id]);

  const handleField = <K extends keyof EditableKit>(field: K, value: EditableKit[K]) => {
    setKit((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selected) return;
    const next: EditableKit = {
      ...kit,
      taglines: taglinesText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      bannedWords: bannedText.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30),
    };
    try {
      await update.mutateAsync({ id: selected.id, name: name.trim() || 'Untitled Brand', kit: next as never });
      toast.success('Brand kit saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleCreate = async () => {
    try {
      const row = await create.mutateAsync({ name: 'New Brand Kit', makeDefault: kits.length === 0 });
      setSelectedId(row.id);
      toast.success('Brand kit created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(selected.id);
      setSelectedId(null);
      toast.success('Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleMakeDefault = async () => {
    if (!selected) return;
    try {
      await setDefault.mutateAsync(selected.id);
      toast.success('Set as default — MarQ will use this kit');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="container max-w-6xl py-6 sm:py-10 px-4 sm:px-6">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/90">
            Brand Kit
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">Teach MarQ your brand</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Voice, palette, fonts and banned words flow into every AI-generated headline, email and image.
          The default kit is what MarQ reads.
        </p>
      </header>

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Sidebar list */}
        <aside className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your kits</p>
            <Button size="sm" variant="ghost" onClick={handleCreate} disabled={create.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : kits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">No brand kits yet.</p>
              <Button size="sm" onClick={handleCreate} disabled={create.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Create one
              </Button>
            </div>
          ) : (
            <ul className="space-y-1">
              {kits.map((k) => {
                const isActive = selected?.id === k.id;
                return (
                  <li key={k.id}>
                    <button
                      onClick={() => {
                        setSelectedId(k.id);
                        setActiveId(k.id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                        isActive
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{k.name}</span>
                        {k.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" /> Default
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Editor */}
        {selected ? (
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <Label className="text-xs">Kit name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </div>
              <div className="flex items-center gap-2">
                {!selected.is_default && (
                  <Button variant="outline" size="sm" onClick={handleMakeDefault} disabled={setDefault.isPending}>
                    <Star className="h-3.5 w-3.5 mr-1" /> Set as default
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={remove.isPending}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Voice */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Voice</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Voice / tone</Label>
                  <Input
                    value={kit.voice ?? ''}
                    onChange={(e) => handleField('voice', e.target.value)}
                    placeholder="warm authority · rebellious · editorial"
                    maxLength={80}
                  />
                </div>
                <div>
                  <Label className="text-xs">Audience</Label>
                  <Input
                    value={kit.audience ?? ''}
                    onChange={(e) => handleField('audience', e.target.value)}
                    placeholder="Solo founders scaling past $10k MRR"
                    maxLength={120}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Positioning / value prop</Label>
                <Textarea
                  value={kit.positioning ?? ''}
                  onChange={(e) => handleField('positioning', e.target.value)}
                  placeholder="The autonomous revenue engine for solo operators."
                  rows={2}
                  maxLength={240}
                />
              </div>
              <div>
                <Label className="text-xs">Reference taglines (one per line, max 6)</Label>
                <Textarea
                  value={taglinesText}
                  onChange={(e) => setTaglinesText(e.target.value)}
                  placeholder={'Momentum is the product.\nSignal over noise.'}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">Banned words / phrases (comma-separated)</Label>
                <Textarea
                  value={bannedText}
                  onChange={(e) => setBannedText(e.target.value)}
                  placeholder="synergy, leverage, game-changer, revolutionary"
                  rows={2}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  MarQ will avoid these in every generated headline, email, and caption.
                </p>
              </div>
            </div>

            {/* Palette */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Palette</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  ['primaryColor', 'Primary'],
                  ['accentColor', 'Accent'],
                  ['backgroundColor', 'Background'],
                  ['textColor', 'Text'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={kit[key] || '#000000'}
                        onChange={(e) => handleField(key, e.target.value)}
                        className="h-10 w-12 p-1 cursor-pointer shrink-0"
                      />
                      <Input
                        value={kit[key] ?? ''}
                        onChange={(e) => handleField(key, e.target.value)}
                        placeholder="#000000"
                        className="flex-1 font-mono text-xs"
                        maxLength={9}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography + Visual */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Typography & visual
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Heading font</Label>
                  <Input
                    value={kit.fontHeading ?? ''}
                    onChange={(e) => handleField('fontHeading', e.target.value)}
                    placeholder="Playfair Display"
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label className="text-xs">Body font</Label>
                  <Input
                    value={kit.fontBody ?? ''}
                    onChange={(e) => handleField('fontBody', e.target.value)}
                    placeholder="Inter"
                    maxLength={60}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Logo</Label>
                <ImageUploadField
                  value={kit.logoUrl ?? ''}
                  onChange={(url) => handleField('logoUrl', url)}
                  placeholder="https://…/logo.png"
                  folder="brand"
                />
              </div>
              <div>
                <Label className="text-xs">Visual style</Label>
                <Input
                  value={kit.visualStyle ?? ''}
                  onChange={(e) => handleField('visualStyle', e.target.value)}
                  placeholder="cinematic, high-contrast, obsidian luxe"
                  maxLength={120}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Drives the aesthetic of MarQ-generated images and assets.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save brand kit
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Create your first brand kit to teach MarQ how you sound.</p>
          </section>
        )}
      </div>
    </div>
  );
}
