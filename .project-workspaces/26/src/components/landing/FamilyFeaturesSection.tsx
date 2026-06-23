import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Crown,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Building2,
  Landmark,
  Gem,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export const FamilyFeaturesSection = () => {
  const { isFeatureEnabled } = useFeatureFlags();

  const showBankingPartners = isFeatureEnabled("banking_partners");
  const showKidsChat = isFeatureEnabled("kids_chat");
  const showKids = isFeatureEnabled("kids");

  if (!showBankingPartners && !showKidsChat && !showKids) return null;

  return (
    <section className="relative py-24 overflow-hidden bg-[#0a0a0f]">
      {/* Obsidian backdrop with gold ambient light */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0f] to-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-amber-500/[0.06] blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-amber-600/[0.04] blur-[100px]" />

      {/* Subtle gold grid */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #d4af37 1px, transparent 1px), linear-gradient(to bottom, #d4af37 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative z-10">
        {/* Section header — stacked positioning */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          {/* Eyebrow: Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/[0.06] text-amber-300 text-xs font-medium tracking-[0.2em] uppercase mb-6"
          >
            <Crown className="h-3.5 w-3.5" />
            Legacy Architecture
          </motion.div>

          {/* Headline: Promise */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-b from-white via-amber-50 to-amber-200/80 bg-clip-text text-transparent leading-[1.1]"
          >
            Architecture for the Entire Family
          </motion.h2>

          {/* System layer */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Build, guide, and transfer wealth with{" "}
            <span className="text-amber-300/90 italic">Generational Intelligence</span>
            {" "}— a system designed to support every member of your dynasty.
          </motion.p>

          {/* Decorative gold divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 mx-auto h-px w-32 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"
          />
        </div>

        {/* Partner Banking — Obsidian/Gold reskin */}
        {showBankingPartners && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <Link to="/credit?tab=products" className="block">
              <div className="relative rounded-3xl overflow-hidden group cursor-pointer border border-amber-500/20 bg-gradient-to-br from-[#15151c] via-[#0f0f15] to-[#15151c] hover:border-amber-500/40 transition-all duration-500">
                <div className="absolute top-0 right-0 w-[400px] h-[300px] rounded-full bg-amber-500/[0.08] blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[200px] rounded-full bg-amber-600/[0.05] blur-[70px]" />

                <div className="relative z-10 p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0 order-2 lg:order-1">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                      className="relative"
                    >
                      <div className="w-32 h-32 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-700/5 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-105 group-hover:border-amber-500/50 transition-all duration-500">
                        <Landmark className="h-16 w-16 text-amber-400" strokeWidth={1.2} />
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex-1 text-center lg:text-left order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs font-medium tracking-wider uppercase mb-4">
                      <Sparkles className="h-3.5 w-3.5" />
                      Curated Banking Partners
                    </div>

                    <h3 className="text-3xl md:text-4xl font-display font-bold mb-4 bg-gradient-to-b from-white to-amber-100/80 bg-clip-text text-transparent">
                      Banking Built for the Dynasty
                    </h3>

                    <p className="text-white/60 mb-6 max-w-lg text-lg leading-relaxed">
                      A vetted suite of debit cards, high-yield savings, and family banking instruments — from trusted names like Varo, SoFi, and Greenlight.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start">
                      {["Adult Debit Cards", "Kids Cards", "High-Yield Savings"].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.04] text-amber-100/80 text-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 font-semibold shadow-[0_8px_30px_rgba(212,175,55,0.25)] border-0"
                    >
                      <Building2 className="h-5 w-5 mr-2" />
                      Explore Banking Partners
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Suite cards */}
        {(showKids || showKidsChat) && (
          <div
            className={`grid ${
              showKids && showKidsChat ? "md:grid-cols-2" : "md:grid-cols-1 max-w-2xl mx-auto"
            } gap-6`}
          >
            {/* The Heir Suite (KidsBloom) */}
            {showKids && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#13131a] to-[#0c0c11] overflow-hidden group hover:border-amber-500/40 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/[0.06] rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-700/5 flex items-center justify-center">
                      <Gem className="h-7 w-7 text-amber-400" strokeWidth={1.4} />
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 uppercase">
                      Always Free
                    </span>
                  </div>

                  <div className="text-[10px] tracking-[0.2em] uppercase text-amber-400/70 font-medium mb-2">
                    The Heir Suite
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-3 text-white">
                    KidsBloom
                  </h3>

                  <p className="text-white/55 mb-6 leading-relaxed">
                    A secure, age-adaptive environment where the next generation learns the principles of capital — through guided lessons, real savings goals, and supervised autonomy.
                  </p>

                  <ul className="space-y-2.5 mb-6">
                    {[
                      "Age-adaptive UI (Little, Tween, Teen)",
                      "Interactive money games & video lessons",
                      "Personal savings goals & vision boards",
                      "Greenlight integration for kids cards",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                        <CheckCircle2 className="h-4 w-4 text-amber-400/80 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 font-semibold border-0"
                      asChild
                    >
                      <Link to="/kidsbloom">
                        Explore Suite
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
                      asChild
                    >
                      <Link to="/kidsbloom/login">Sign In</Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Family Communications */}
            {showKidsChat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#13131a] to-[#0c0c11] overflow-hidden group hover:border-amber-500/40 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/[0.06] rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-700/5 flex items-center justify-center mb-6">
                    <MessageCircle className="h-7 w-7 text-amber-400" strokeWidth={1.4} />
                  </div>

                  <div className="text-[10px] tracking-[0.2em] uppercase text-amber-400/70 font-medium mb-2">
                    The Concierge Channel
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-3 text-white">
                    Family Communications
                  </h3>

                  <p className="text-white/55 mb-6 leading-relaxed">
                    Private, secure messaging between principals and heirs. Approve allowances, coordinate chores, and stay aligned on financial decisions in one channel.
                  </p>

                  <ul className="space-y-2.5 mb-6">
                    {[
                      "Direct parent-to-heir messaging",
                      "Unified family group channel",
                      "Chore approvals & spending requests",
                      "Reactions, stickers & rich media",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                        <CheckCircle2 className="h-4 w-4 text-amber-400/80 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-amber-200/40 italic tracking-wide">
                    Included with linked principal accounts
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Bottom summary */}
        {showKids && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-sm text-white/40 tracking-wide">
              The Heir Suite is complimentary for life. Principals may monitor at no cost or unlock active management with Premium.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};
