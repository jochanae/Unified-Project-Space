import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';

interface QuickCreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateLeadModal({ open, onOpenChange }: QuickCreateLeadModalProps) {
  const { user } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.orgId || !email.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').insert({
      email: email.trim().toLowerCase(),
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      org_id: user.orgId,
      pipeline_stage: 'new',
    });
    setSaving(false);
    if (error) {
      toast.error('Could not add lead', { description: error.message });
      return;
    }
    toast.success('Lead added to your pipeline');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            New Lead
          </DialogTitle>
          <DialogDescription>
            Add a contact directly to your pipeline. They'll appear in CRM as a new lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email *</Label>
            <Input
              id="lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lead@example.com"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-first">First name</Label>
              <Input id="lead-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-last">Last name</Label>
              <Input id="lead-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !email.trim()} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
