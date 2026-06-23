import { useState } from 'react';
import { Loader2, Plus, Star, Trash2, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandKits } from '../hooks/use-brand-kits';
import { MoodGalleryButton } from './MoodGalleryButton';

/** Multi-brand kits — switch the active "Brand Environment". */
export function BrandEnvironmentsPanel() {
  const { kits, isLoading, active, setActiveId, create, setDefault, remove } = useBrandKits();
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ name: newName.trim(), makeDefault: kits.length === 0 });
      setNewName('');
      toast.success('Brand kit created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    }
  };

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="h-4 w-4 text-gold" />
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
          Brand Environments
        </p>
      </div>
      <h2 className="text-xl font-serif tracking-tight">Multi-brand vault.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Create separate kits for each brand. Switch the active environment — MarQ and every template inherit it instantly.
      </p>

      <div className="mt-5 grid gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {kits.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No additional brand kits yet — your default vault is in use.
              </p>
            )}
            {kits.map((k) => {
              const isActive = active?.id === k.id;
              const accent = (k.kit as { accent_hex?: string })?.accent_hex || '#D4AF37';
              return (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3"
                  style={isActive ? { borderColor: `${accent}80`, background: `${accent}0d` } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-8 w-8 rounded-lg border border-border/40 shrink-0"
                      style={{ background: accent }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{k.name}</span>
                        {k.is_default && (
                          <span className="text-[9px] uppercase tracking-wider text-gold">default</span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-emerald-400">
                            <Check className="h-2.5 w-2.5" /> active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {(k.kit as { tagline?: string })?.tagline || 'No tagline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <MoodGalleryButton brand={k.kit} brandName={k.name} />
                    {!isActive && (
                      <Button size="sm" variant="ghost" onClick={() => setActiveId(k.id)}>
                        Use
                      </Button>
                    )}
                    {!k.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Make default"
                        onClick={() => setDefault.mutate(k.id)}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete "${k.name}"?`)) remove.mutate(k.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="mt-2 flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New brand name (e.g. Luxe Listings)"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || create.isPending}
                className="bg-gold text-black hover:bg-gold/90 shrink-0"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              After creating, edit a kit's full details from the Brand Vault tab.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
