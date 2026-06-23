import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Check, Sparkles, Lock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSanctuaryKeys } from '@/hooks/useSanctuaryKeys';
import { useFoundingMemberStatus } from '@/hooks/useFoundingMemberStatus';
import { toast } from 'sonner';

export default function SanctuaryKeysSection() {
  const { tier } = useFoundingMemberStatus();
  const { keys, loading, minting, mint, remaining } = useSanctuaryKeys();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isGenesis = tier === 'genesis';

  if (!isGenesis) {
    // Foundation teaser
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/[0.04] border border-white/[0.06] mb-3">
          <Lock className="h-4 w-4 text-white/40" />
        </div>
        <h3 className="text-[14px] font-medium text-white/80 tracking-tight">
          Sanctuary Keys
        </h3>
        <p className="mt-1.5 text-[12px] text-white/40 leading-relaxed max-w-xs mx-auto">
          A Genesis-only ritual. The first 100 founding members can mint up to 3 Keys to gift this sanctuary to people they trust.
        </p>
      </div>
    );
  }

  const handleMint = async () => {
    if (remaining <= 0) {
      toast.error('You\'ve gifted all 3 of your Keys.');
      return;
    }
    const result = await mint();
    if (result.success) {
      toast.success('A new Key has been minted.');
    } else {
      toast.error(
        result.error === 'quota_exceeded' ? 'You\'ve gifted all 3 of your Keys.' :
        result.error === 'genesis_only' ? 'Genesis members only.' :
        'Could not mint Key.'
      );
    }
  };

  const handleCopy = async (key: string) => {
    const url = `${window.location.origin}/key/${key}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(key);
    toast.success('Key link copied');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleShare = async (key: string) => {
    const url = `${window.location.origin}/key/${key}`;
    const text = `I'm gifting you a Key to my sanctuary. ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'A Key to the Sanctuary', text, url });
      } catch {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-gradient-to-b from-[rgba(212,175,55,0.04)] to-transparent p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[rgba(212,175,55,0.7)] font-medium flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Genesis privilege
          </p>
          <h3 className="mt-1.5 text-[16px] font-light text-white tracking-tight">
            Keys to the Sanctuary
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[20px] font-extralight text-[rgba(212,175,55,0.9)] leading-none">
            {remaining}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40 mt-1">
            remaining
          </div>
        </div>
      </div>

      <p className="text-[12px] text-white/45 leading-relaxed mb-4">
        Gift up to 3 Keys to people you'd want here. Each is engraved with your serial.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-4 w-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {keys.length > 0 && (
            <div className="space-y-2 mb-4">
              {keys.map((k) => {
                const claimed = !!k.claimed_at;
                return (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border px-3.5 py-3 ${
                      claimed
                        ? 'border-white/[0.06] bg-white/[0.02]'
                        : 'border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.03)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Key className={`h-3 w-3 ${claimed ? 'text-white/30' : 'text-[rgba(212,175,55,0.8)]'}`} />
                          <code className={`text-[12px] font-mono tracking-tight ${claimed ? 'text-white/40 line-through' : 'text-white/85'}`}>
                            {k.key_code}
                          </code>
                        </div>
                        <p className="mt-0.5 text-[10px] text-white/40">
                          {claimed
                            ? `Claimed ${new Date(k.claimed_at!).toLocaleDateString()}`
                            : `Unclaimed · expires ${new Date(k.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      {!claimed && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(k.key_code)}
                            className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Copy link"
                          >
                            <AnimatePresence mode="wait">
                              {copiedCode === k.key_code ? (
                                <motion.div key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                </motion.div>
                              ) : (
                                <motion.div key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                                  <Copy className="h-3.5 w-3.5" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                          <button
                            onClick={() => handleShare(k.key_code)}
                            className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Share"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {remaining > 0 && (
            <Button
              onClick={handleMint}
              disabled={minting}
              className="w-full bg-gradient-to-r from-[rgba(212,175,55,0.9)] to-[rgba(232,195,75,0.9)] text-black hover:from-[rgba(212,175,55,1)] hover:to-[rgba(232,195,75,1)] font-medium tracking-tight"
            >
              {minting ? (
                <span className="inline-flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Minting…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mint a Key {keys.length > 0 ? `(${remaining} left)` : ''}
                </span>
              )}
            </Button>
          )}

          {remaining === 0 && keys.length > 0 && (
            <p className="text-center text-[11px] text-white/35 italic">
              You've shared all 3 of your Keys.
            </p>
          )}
        </>
      )}
    </div>
  );
}
