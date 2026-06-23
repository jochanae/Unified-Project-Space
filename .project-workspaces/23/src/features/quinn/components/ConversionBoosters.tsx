import { useMemo, useState } from 'react';
import { MapPin, Quote, Users, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ConversionBoostersProps {
  socialProof: string;
  serviceAreaZips: string[];
  serviceAreaRequired: boolean;
  serviceAreaLabel?: string;
  onUpdateField: (field: string, value: string) => void;
  qualifiedHref?: string;
}

/**
 * Surfaces the two highest-impact, easy-to-miss controls (social proof + ZIP gating)
 * directly above the landing preview, plus a shortcut to the qualified leads view.
 *
 * The same fields exist inside `LandingPagePreview`, but they're buried in the opt-in
 * section. This panel makes them obvious so users don't have to hunt.
 */
export function ConversionBoosters({
  socialProof,
  serviceAreaZips,
  serviceAreaRequired,
  serviceAreaLabel,
  onUpdateField,
  qualifiedHref = '/contacts?stage=qualified',
}: ConversionBoostersProps) {
  const [proofDraft, setProofDraft] = useState(socialProof || '');
  const [zipsDraft, setZipsDraft] = useState((serviceAreaZips || []).join(', '));
  const [proofSaved, setProofSaved] = useState(false);
  const [zipsSaved, setZipsSaved] = useState(false);

  const zipCount = useMemo(
    () => zipsDraft.split(/[,\n]/).map((z) => z.trim()).filter(Boolean).length,
    [zipsDraft],
  );

  const saveProof = () => {
    onUpdateField('social_proof', proofDraft.trim());
    setProofSaved(true);
    setTimeout(() => setProofSaved(false), 1500);
  };

  const saveZips = () => {
    onUpdateField('service_area_zips', zipsDraft);
    setZipsSaved(true);
    setTimeout(() => setZipsSaved(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/40 backdrop-blur-xl p-4 sm:p-5 space-y-4 shadow-[0_0_60px_hsl(var(--primary)/0.08)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Conversion boosters
          </h3>
          <p className="text-[11px] text-muted-foreground">
            The two edits the audit asks for most. Edit here — they live-update the page below.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
          <Link to={qualifiedHref}>
            <Users className="h-3.5 w-3.5" />
            Qualified leads
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Social proof */}
        <div className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Quote className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              Social proof
            </span>
          </div>
          <Textarea
            value={proofDraft}
            onChange={(e) => setProofDraft(e.target.value)}
            placeholder='e.g. "Trusted by 1,200+ Atlanta homeowners — 4.9★ avg rating."'
            className="min-h-[72px] text-xs resize-none bg-background/60 border-border/40"
            maxLength={300}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {proofDraft.length}/300
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2.5"
              disabled={proofDraft.trim() === (socialProof || '').trim()}
              onClick={saveProof}
            >
              {proofSaved ? (
                <><Check className="h-3 w-3 mr-1" /> Saved</>
              ) : (
                'Apply to page'
              )}
            </Button>
          </div>
        </div>

        {/* Service area ZIPs */}
        <div className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">
                Service-area ZIPs
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Require ZIP</span>
              <Switch
                checked={serviceAreaRequired}
                onCheckedChange={(v) =>
                  onUpdateField('service_area_required', v ? 'true' : '')
                }
              />
            </div>
          </div>
          <Input
            value={zipsDraft}
            onChange={(e) => setZipsDraft(e.target.value)}
            placeholder="30303, 30308, 30312…"
            className="h-9 text-xs bg-background/60 border-border/40"
          />
          <Input
            value={serviceAreaLabel || ''}
            onChange={(e) => onUpdateField('service_area_label', e.target.value)}
            placeholder="Label shown on form (optional)"
            className="h-8 text-[11px] bg-background/60 border-border/40"
          />
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[10px]',
                zipCount > 0 ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {zipCount === 0 ? 'No ZIPs — leads from anywhere' : `${zipCount} ZIP${zipCount === 1 ? '' : 's'} qualifying leads`}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2.5"
              disabled={
                zipsDraft.trim() === (serviceAreaZips || []).join(', ').trim()
              }
              onClick={saveZips}
            >
              {zipsSaved ? (
                <><Check className="h-3 w-3 mr-1" /> Saved</>
              ) : (
                'Apply to page'
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        Leads matching your ZIPs are auto-tagged <span className="text-primary">qualified</span> in your CRM.
      </p>
    </div>
  );
}
