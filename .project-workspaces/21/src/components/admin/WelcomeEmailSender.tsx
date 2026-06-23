import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function WelcomeEmailSender() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [sentList, setSentList] = useState<string[]>([]);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: { recipientEmail: email.trim(), testerName: name.trim() || undefined },
      });

      if (error) throw error;

      if (data?.sent) {
        toast.success(`Welcome email sent to ${email}`);
        setSentList(prev => [...prev, email.trim()]);
        setEmail('');
        setName('');
      } else {
        toast.error(data?.reason === 'no_api_key' ? 'Email API key not configured' : 'Failed to send');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send welcome email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Tester name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          className="rounded-xl"
        />
        <Input
          type="email"
          placeholder="tester@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          maxLength={255}
          className="rounded-xl"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={sending || !email.trim()}
        className="w-full gap-2 rounded-xl"
      >
        <Send className="h-4 w-4" />
        {sending ? 'Sending…' : 'Send Welcome Email'}
      </Button>

      {sentList.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Sent ({sentList.length})
          </p>
          {sentList.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground/70">
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
