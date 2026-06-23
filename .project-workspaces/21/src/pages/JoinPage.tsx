import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Sparkles } from 'lucide-react';
import CompaniLogo from '@/components/CompaniLogo';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toLowerCase().replace(/\s+/g, '');
    if (!trimmed) return;

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('custom_circles')
        .select('id, name, emoji, invite_code')
        .eq('invite_code', trimmed)
        .maybeSingle();

      if (error || !data) {
        toast.error("Hmm, that code doesn't match any Circle. Double-check and try again.");
        setChecking(false);
        return;
      }

      navigate(`/circles/join/${trimmed}`);
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#0f1221' }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/6 blur-[80px]" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 z-10"
      >
        <CompaniLogo size="lg" />
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="w-full max-w-sm z-10"
      >
        <div
          className="rounded-3xl border border-border/60 p-8 text-center shadow-2xl"
          style={{
            background: 'linear-gradient(160deg, hsl(225 22% 13%) 0%, hsl(225 25% 10%) 100%)',
            boxShadow: '0 16px 64px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Users className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-1">Join a Circle</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the invite code you received to join a private Circle.
          </p>

          {/* Code input */}
          <div className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your invite code"
              className="text-center text-lg tracking-widest font-mono h-12 rounded-xl bg-background/60 border-border/50 placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
              maxLength={64}
            />

            <button
              onClick={handleJoin}
              disabled={!code.trim() || checking}
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {checking ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <>
                  Join Circle
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border/30" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">or</span>
            <div className="h-px flex-1 bg-border/30" />
          </div>

          {/* Sign in link */}
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Sign in to your account →
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Don't have a code? Ask your friend or host for an invite link.
        </p>
      </motion.div>
    </div>
  );
}
