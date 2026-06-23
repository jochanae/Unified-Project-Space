import { useState, useRef } from "react";
import { Loader2, Mic, Upload, Trash2, Star, StarOff, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBrandVoices } from "../hooks/use-brand-voices";
import { useSubscription } from "@/features/billing/hooks/use-subscription";

/** Innovation-tier voice cloning panel. Lives inside Brand Vault. */
export function BrandVoicePanel() {
  const { list, cloneVoice, setDefault, deleteVoice } = useBrandVoices();
  const { tier } = useSubscription();
  // Innovation === "growth" in the billing model ($79 tier)
  const isInnovation = tier === "growth";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Upload a sample first (MP3/WAV/M4A, ~30s+ for best quality)");
      return;
    }
    if (!name.trim()) {
      toast.error("Give your voice a name");
      return;
    }
    try {
      await cloneVoice.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        file,
        setDefault: setAsDefault,
      });
      toast.success(`"${name}" cloned. MarQ will speak as you.`);
      setName("");
      setDescription("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clone failed");
    }
  };

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <Mic className="h-4 w-4 text-gold" />
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
          Brand Voice Cloning
        </p>
        <span className="ml-auto text-[9px] uppercase tracking-[0.18em] text-gold/60 border border-gold/30 rounded-full px-2 py-0.5">
          Innovation
        </span>
      </div>
      <h2 className="text-xl font-serif tracking-tight">MarQ speaks as you.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload a 30-second sample. MarQ clones your voice for every video, ad, and outreach asset.
      </p>

      {!isInnovation && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-black/40 p-5 text-center">
          <Lock className="h-5 w-5 text-gold mx-auto mb-2" />
          <p className="text-sm font-serif">Innovation tier required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Voice cloning is available on the $79 Innovation plan.
          </p>
          <Button
            asChild
            size="sm"
            className="mt-3 bg-gold text-black hover:bg-gold/90"
          >
            <a href="/subscribe">Upgrade</a>
          </Button>
        </div>
      )}

      {isInnovation && (
        <>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Voice name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Founder Voice"
                  maxLength={80}
                />
              </div>
              <div>
                <Label className="text-xs">Sample file (MP3 / WAV / M4A)</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/webm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Calm, decisive founder voice — for product walkthroughs."
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="accent-gold"
                />
                Make this the default voice for MarQ
              </label>
              <Button
                type="submit"
                disabled={cloneVoice.isPending || !file}
                className="bg-gold text-black hover:bg-gold/90"
              >
                {cloneVoice.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Clone Voice
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tip: 30–90 seconds of clean speech with no music or noise gives the best clone.
            </p>
          </form>

          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Your cloned voices
            </p>
            {list.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !list.data?.length ? (
              <p className="text-xs text-muted-foreground italic">No cloned voices yet.</p>
            ) : (
              <div className="grid gap-2">
                {list.data.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{v.name}</p>
                        {v.is_default && (
                          <span className="text-[9px] uppercase tracking-[0.18em] text-gold border border-gold/40 rounded-full px-1.5 py-0.5">
                            Default
                          </span>
                        )}
                      </div>
                      {v.description && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {v.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDefault.mutate(v.id)}
                      disabled={v.is_default || setDefault.isPending}
                      title={v.is_default ? "Default voice" : "Set as default"}
                    >
                      {v.is_default ? <Star className="h-4 w-4 text-gold" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${v.name}"? This removes the voice profile.`)) {
                          deleteVoice.mutate(v.id);
                        }
                      }}
                      disabled={deleteVoice.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
