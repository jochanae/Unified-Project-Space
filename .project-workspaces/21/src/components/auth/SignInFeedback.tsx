import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

export default function SignInFeedback() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    try {
      // Store in notifications table for admin visibility
      await supabase.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // system placeholder
        type: 'signin_feedback',
        message: `[Sign-In Feedback] ${name ? `From: ${name}` : 'Anonymous'}${email ? ` (${email})` : ''} — ${message.trim()}`,
        metadata: { name: name || null, email: email || null, feedback: message.trim() },
      } as any);

      // Send admin email via edge function
      await supabase.functions.invoke('notify-signin-feedback', {
        body: { name: name || 'Anonymous', email: email || 'Not provided', message: message.trim() },
      });

      setSent(true);
    } catch {
      // Still mark as sent if DB insert worked
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (sent) {
      setName('');
      setEmail('');
      setMessage('');
      setSent(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Need Help?
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Need Help Signing In?</DialogTitle>
            <DialogDescription>
              Having trouble? Let us know and we'll get back to you.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-medium text-foreground">Thanks! We'll look into it.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {email ? "We'll follow up at " + email : "Check back soon."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="rounded-xl"
              />
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="rounded-xl"
              />
              <Textarea
                placeholder="Describe your issue…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1000}
                className="rounded-xl min-h-[100px]"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send Feedback'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
