import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, X } from 'lucide-react';
import { useBlueprintTemplates, type BlueprintTemplate } from '@/hooks/useBlueprintTemplates';
import { useFoundingMemberStatus } from '@/hooks/useFoundingMemberStatus';
import { useAppContext } from '@/contexts/AppContext';

interface BlueprintTemplatesSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BlueprintTemplate) => void;
  mode?: string;
}

export default function BlueprintTemplatesSheet({
  open,
  onClose,
  onSelectTemplate,
  mode = 'strategist',
}: BlueprintTemplatesSheetProps) {
  const navigate = useNavigate();
  const { templates, loading } = useBlueprintTemplates(mode);
  const { tier } = useFoundingMemberStatus();
  const { subscription } = useAppContext();
  const isGenesis = tier === 'genesis';
  const isPremium = !!subscription?.subscribed;
  const hasPaidAccess = isGenesis || isPremium;

  const isLocked = (t: BlueprintTemplate) => {
    if (t.tier_required === 'genesis') return !isGenesis;
    if (t.tier_required === 'premium') return !hasPaidAccess;
    return false;
  };

  const lockLabel = (t: BlueprintTemplate) =>
    t.tier_required === 'genesis' ? 'Genesis' : 'Premium';

  // Group: starter (free) vs wealth_legacy (premium-gated)
  const { starterTemplates, wealthLegacyTemplates } = useMemo(() => {
    const wealth = templates.filter((t) => t.category === 'wealth_legacy');
    const starter = templates.filter((t) => t.category !== 'wealth_legacy');
    return { starterTemplates: starter, wealthLegacyTemplates: wealth };
  }, [templates]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[181] max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-[rgba(100,220,180,0.25)] bg-[hsl(230_20%_6%/0.96)] backdrop-blur-2xl shadow-[0_-8px_40px_rgba(100,220,180,0.15)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mx-auto mt-3 mb-1 h-1 w-12 rounded-full bg-white/15" />

            <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.4em] text-[rgba(100,220,180,0.7)] font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Strategist Templates
                </p>
                <h2 className="mt-1 text-[17px] font-light tracking-tight text-white">
                  Skip the blank page
                </h2>
                <p className="mt-1 text-[12px] text-white/45 leading-relaxed">
                  Pick a sprint and we'll begin together.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-6 pt-3 space-y-5">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              )}

              {!loading && templates.length === 0 && (
                <p className="text-center text-[12px] text-white/40 py-8">
                  No templates available yet.
                </p>
              )}

              {/* ── Starter Sprints ── */}
              {!loading && starterTemplates.length > 0 && (
                <section>
                  <div className="px-1 mb-2 flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">
                      Starter Sprints
                    </p>
                    <span className="text-[10px] text-white/25">— quick wins, free for everyone</span>
                  </div>
                  <div className="space-y-2">
                    {starterTemplates.map((t, i) => {
                      const locked = isLocked(t);
                      return (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25 }}
                          onClick={() => {
                            if (locked) return;
                            onSelectTemplate(t);
                            onClose();
                          }}
                          disabled={locked}
                          className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-300 active:scale-[0.98] ${
                            locked
                              ? 'border-white/[0.06] bg-white/[0.02] opacity-60 cursor-not-allowed'
                              : 'border-white/[0.08] bg-white/[0.03] hover:border-[rgba(100,220,180,0.3)] hover:bg-[rgba(100,220,180,0.04)]'
                          }`}
                        >
                          <TemplateBody t={t} locked={locked} lockLabel={lockLabel(t)} />
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Wealth & Legacy (Premium) ── */}
              {!loading && wealthLegacyTemplates.length > 0 && (
                <section>
                  <div className="px-1 mb-2 flex items-center gap-2 flex-wrap">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                      style={{ color: 'hsl(var(--primary))', textShadow: '0 0 12px hsl(var(--primary) / 0.25)' }}
                    >
                      🗝️ Wealth & Legacy
                    </p>
                    <span className="text-[10px] text-white/30">— high-stakes, premium</span>
                  </div>

                  {!hasPaidAccess && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/settings');
                      }}
                      className="mb-2 w-full rounded-xl border border-primary/25 bg-primary/[0.05] px-3 py-2 text-left text-[11px] text-primary/85 hover:bg-primary/[0.09] transition-colors"
                    >
                      Unlock the consultant tier — portfolio stress-tests, equity moves, legacy architecture →
                    </button>
                  )}

                  <div className="space-y-2">
                    {wealthLegacyTemplates.map((t, i) => {
                      const locked = isLocked(t);
                      return (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25 }}
                          onClick={() => {
                            if (locked) {
                              onClose();
                              navigate('/settings');
                              return;
                            }
                            onSelectTemplate(t);
                            onClose();
                          }}
                          className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-300 active:scale-[0.98] ${
                            locked
                              ? 'border-primary/15 bg-primary/[0.025] hover:border-primary/30 hover:bg-primary/[0.05]'
                              : 'border-primary/25 bg-primary/[0.04] hover:border-primary/40 hover:bg-primary/[0.07]'
                          }`}
                          style={
                            !locked
                              ? {
                                  boxShadow:
                                    'inset 0 1px 1px hsl(var(--primary) / 0.06), 0 0 12px hsl(var(--primary) / 0.06)',
                                }
                              : undefined
                          }
                        >
                          <TemplateBody t={t} locked={locked} lockLabel={lockLabel(t)} />
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TemplateBody({
  t,
  locked,
  lockLabel,
}: {
  t: BlueprintTemplate;
  locked: boolean;
  lockLabel: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-[22px] leading-none mt-0.5 shrink-0">{t.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[14px] font-medium text-white tracking-tight">{t.title}</h3>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[rgba(212,175,55,0.85)] font-medium">
              <Lock className="h-2.5 w-2.5" /> {lockLabel}
            </span>
          )}
        </div>
        {t.subtitle && (
          <p className="mt-0.5 text-[12px] text-white/50 leading-relaxed">{t.subtitle}</p>
        )}
        {t.suggested_steps && t.suggested_steps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {t.suggested_steps.slice(0, 3).map((step: any, idx: number) => (
              <span
                key={idx}
                className="text-[10px] text-white/35 bg-white/[0.03] rounded-full px-2 py-0.5 border border-white/[0.05]"
              >
                {typeof step === 'string' ? step : step?.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
