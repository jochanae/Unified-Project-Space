import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { parseGoogleBusinessProfile, mergeParsedIntoProfile } from '../utils/gbp-parser';
import type { LocalBusinessInfo } from '../utils/local-business-schema';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: LocalBusinessInfo;
  onApply: (next: LocalBusinessInfo) => void;
}

export function GBPAutofillDialog({ open, onOpenChange, current, onApply }: Props) {
  const [input, setInput] = useState('');

  const handleApply = () => {
    const parsed = parseGoogleBusinessProfile(input);
    const filled = [
      parsed.name,
      parsed.telephone,
      parsed.address?.street,
      parsed.address?.city,
    ].filter(Boolean).length;

    if (filled === 0) {
      toast.error("Couldn't extract anything", {
        description: 'Paste your Google Business Profile URL or copy the listing details.',
      });
      return;
    }

    const next = mergeParsedIntoProfile(current, parsed);
    onApply(next);
    toast.success(`Filled ${filled} field${filled === 1 ? '' : 's'} from Google`);
    setInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Pull from Google
          </DialogTitle>
          <DialogDescription>
            Paste your Google Maps profile URL <em>or</em> the listing text (name, address, phone). We'll only fill empty fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="gbp-input" className="text-xs text-muted-foreground">
            Google profile URL or pasted listing
          </Label>
          <Textarea
            id="gbp-input"
            rows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`https://www.google.com/maps/place/Acme+Coffee/@37.77,-122.41,17z\n\nor:\n\nAcme Coffee Co.\n123 Main St, San Francisco, CA 94110\n(415) 555-0199`}
            className="text-sm font-mono"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={!input.trim()}>
            <Sparkles className="h-4 w-4 mr-1" /> Auto-fill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
