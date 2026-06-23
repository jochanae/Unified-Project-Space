import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PhoneSmsEditorProps {
  content: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}

const DEFAULT_CONSENT =
  'I agree to receive text messages about this offer. Msg & data rates may apply. Reply STOP to opt out.';

/**
 * Inline editor for opt-in phone + SMS consent collection.
 * Stored on block.content as: collect_phone, phone_required,
 * require_sms_consent, sms_consent_text (all strings — 'true'/'false' for booleans).
 */
export function PhoneSmsEditor({ content, onChange }: PhoneSmsEditorProps) {
  const collect = content.collect_phone === 'true' || content.collect_phone === true;
  const phoneRequired = content.phone_required === 'true' || content.phone_required === true;
  const consentRequired =
    content.require_sms_consent === 'true' || content.require_sms_consent === true;
  const consentText = content.sms_consent_text || DEFAULT_CONSENT;

  const patch = (p: Record<string, any>) => onChange({ ...content, ...p });

  return (
    <div className="space-y-3 border-t border-border/30 pt-3 mt-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collect phone number
          </Label>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Adds a phone field next to email. Essential for SMS follow-up.
          </p>
        </div>
        <Switch
          checked={collect}
          onCheckedChange={(v) => patch({ collect_phone: v ? 'true' : 'false' })}
        />
      </div>

      {collect && (
        <>
          <div className="flex items-center justify-between pl-2 border-l-2 border-border/40">
            <Label className="text-xs text-muted-foreground">Make phone required</Label>
            <Switch
              checked={phoneRequired}
              onCheckedChange={(v) => patch({ phone_required: v ? 'true' : 'false' })}
            />
          </div>

          <div className="flex items-center justify-between pl-2 border-l-2 border-border/40">
            <div>
              <Label className="text-xs text-muted-foreground">Require SMS opt-in checkbox</Label>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Required by carriers (TCPA) to send marketing texts.
              </p>
            </div>
            <Switch
              checked={consentRequired}
              onCheckedChange={(v) => patch({ require_sms_consent: v ? 'true' : 'false' })}
            />
          </div>

          {consentRequired && (
            <div className="pl-2 border-l-2 border-border/40">
              <Label className="text-[11px] text-muted-foreground">Consent text shown to lead</Label>
              <Input
                value={consentText}
                onChange={(e) => patch({ sms_consent_text: e.target.value })}
                placeholder={DEFAULT_CONSENT}
                className="h-8 text-xs mt-1"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
