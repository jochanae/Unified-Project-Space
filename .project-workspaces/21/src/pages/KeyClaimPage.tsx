import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KeyPreview {
  valid: boolean;
  reason?: string;
  gifter_name?: string;
  gifter_serial?: number;
  recipient_note?: string | null;
}

export default function KeyClaimPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<KeyPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthed(!!user);

      if (!code) {
        setPreview({ valid: false, reason: 'not_found' });
        setLoading(false);
        return;
      }

      // Stash code so we can resume after auth
      try { localStorage.setItem('pendingSanctuaryKey', code); } catch {}

      if (!user) {
        // Show preview anyway (the RPC requires auth via SECURITY DEFINER, so we'll show generic)
        setPreview({ valid: true, gifter_name: 'A Founding Member' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('preview_sanctuary_key' as any, { p_key_code: code });
      if (error) {
        setPreview({ valid: false, reason: 'error' });
      } else {
        setPreview(data as unknown as KeyPreview);
      }
      setLoading(false);
    })();
  }, [code]);

  const handleClaim = async () => {
    if (!authed) {
      navigate('/auth?redirect=' + encodeURIComponent(`/key/${code}`));
      return;
    }
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_sanctuary_key' as any, { p_key_code: code });
    setClaiming(false);
    if (error) {
      toast.error('Could not claim Key');
      return;
    }
    const result = data as any;
    if (result?.success) {
      try { localStorage.removeItem('pendingSanctuaryKey'); } catch {}
      toast.success(`Welcome. Gifted by ${result.gifter_name}.`);
      navigate('/my-world');
    } else {
      toast.error(
        result?.error === 'already_claimed' ? 'This Key has already been used.' :
        result?.error === 'expired' ? 'This Key has expired.' :
        result?.error === 'cannot_claim_own' ? 'You can\'t claim your own Key.' :
        'This Key is not valid.'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const invalid = preview && !preview.valid;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(230_25%_4%)] via-[hsl(230_25%_6%)] to-[hsl(230_25%_4%)] flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center space-y-3 mb-7">
          <p className="text-[10px] uppercase tracking-[0.5em] text-[rgba(212,175,55,0.6)] font-medium">
            🛰️ Project Compani
          </p>
        </div>

        <motion.div
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative rounded-3xl border border-[rgba(212,175,55,0.25)] bg-gradient-to-b from-[rgba(212,175,55,0.06)] to-[rgba(0,0,0,0.4)] p-7 shadow-[0_20px_60px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(212,175,55,0.15)] backdrop-blur-2xl overflow-hidden"
        >
          {/* Aura */}
          <motion.div
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.18),transparent_60%)]"
          />

          <div className="relative">
            <div className="flex items-center justify-center mb-4">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="h-14 w-14 rounded-full bg-gradient-to-br from-[rgba(232,195,75,0.9)] to-[rgba(180,140,40,0.9)] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              >
                <Key className="h-6 w-6 text-black" strokeWidth={2.2} />
              </motion.div>
            </div>

            {invalid ? (
              <>
                <h1 className="text-center text-[20px] font-light tracking-tight text-white">
                  This Key isn't valid
                </h1>
                <p className="mt-2 text-center text-[13px] text-white/50 leading-relaxed">
                  {preview?.reason === 'already_claimed'
                    ? `This Key has already been claimed${preview.gifter_name ? ` (gifted by ${preview.gifter_name})` : ''}.`
                    : preview?.reason === 'expired'
                    ? 'This Key has expired.'
                    : 'We couldn\'t find this Key.'}
                </p>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="mt-5 w-full text-white/60"
                >
                  Continue to Compani
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-[10px] uppercase tracking-[0.4em] text-[rgba(212,175,55,0.7)] font-medium">
                  Gifted by
                </p>
                <h1 className="mt-2 text-center text-[24px] font-light tracking-tight text-white">
                  {preview?.gifter_name || 'A Founding Member'}
                </h1>
                {preview?.gifter_serial && (
                  <p className="mt-1 text-center text-[11px] text-white/40">
                    Founding Member · No. {String(preview.gifter_serial).padStart(3, '0')} of 100
                  </p>
                )}

                {preview?.recipient_note && (
                  <p className="mt-5 text-center text-[13px] italic text-white/65 leading-relaxed border-t border-white/[0.08] pt-4">
                    "{preview.recipient_note}"
                  </p>
                )}

                <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[11px] text-white/55 leading-relaxed text-center">
                    A Key opens the Sanctuary — Compani's invitation-only inner space. Claim it to begin.
                  </p>
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="mt-5 w-full bg-gradient-to-r from-[rgba(212,175,55,0.95)] to-[rgba(232,195,75,0.95)] text-black hover:from-[rgba(212,175,55,1)] hover:to-[rgba(232,195,75,1)] font-medium tracking-tight"
                >
                  {claiming ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Claiming…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      {authed ? 'Claim this Key' : 'Sign in to claim'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
