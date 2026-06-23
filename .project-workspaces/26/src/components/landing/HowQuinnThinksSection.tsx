import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Wallet, Target, Lightbulb, Crown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const layers = [
  {
    icon: User,
    title: "Identity Layer",
    description: "Who you are, what you value, how you make decisions. Bloom learns your financial personality.",
    accent: "from-amber-300/20 to-amber-500/5",
    glow: "shadow-[0_0_40px_-12px_rgba(217,180,108,0.4)]",
  },
  {
    icon: Wallet,
    title: "Financial Layer",
    description: "Income, debts, accounts, bills, goals — the live state of your money, always current.",
    accent: "from-emerald-300/20 to-emerald-500/5",
    glow: "shadow-[0_0_40px_-12px_rgba(52,211,153,0.4)]",
  },
  {
    icon: Target,
    title: "Project Layer",
    description: "Active blueprints — buying a home, killing debt, launching a business. Bloom tracks every move.",
    accent: "from-teal-300/20 to-teal-500/5",
    glow: "shadow-[0_0_40px_-12px_rgba(45,212,191,0.4)]",
  },
  {
    icon: Lightbulb,
    title: "Insight Layer",
    description: "Patterns, trade-offs, and second-order effects. Bloom surfaces what you'd otherwise miss.",
    accent: "from-sky-300/20 to-sky-500/5",
    glow: "shadow-[0_0_40px_-12px_rgba(125,211,252,0.4)]",
  },
  {
    icon: Crown,
    title: "Legacy Layer",
    description: "Long-horizon decisions — generational wealth, exits, estate. Bloom thinks decades ahead with you.",
    accent: "from-amber-400/25 to-amber-600/5",
    glow: "shadow-[0_0_40px_-12px_rgba(245,158,11,0.45)]",
  },
];

export const HowQuinnThinksSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || firedRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          trackEvent("how_quinn_thinks_in_view");
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 overflow-hidden">
      {/* Obsidian sneak-peek background panel */}
      <div className="absolute inset-x-4 sm:inset-x-8 md:inset-x-12 top-8 bottom-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-black dark:via-slate-950 dark:to-black overflow-hidden">
        {/* Gold vein hairline */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,180,108,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
      </div>

      <div className="container relative z-10 px-6 sm:px-12 md:px-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-amber-300/90 font-medium mb-3 text-sm tracking-[0.2em] uppercase"
          >
            The Architecture
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold mb-4 text-white"
          >
            How Bloom Thinks
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-300/80 text-base md:text-lg"
          >
            Five layers of intelligence stack into a living model of your financial world.
            <span className="block mt-2 text-amber-200/70 italic text-sm">A glimpse of what's waiting inside.</span>
          </motion.p>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto">
          {layers.map((layer, idx) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className={`group relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 hover:border-amber-300/30 hover:bg-white/[0.06] transition-all duration-500 ${layer.glow}`}
            >
              {/* Accent gradient overlay */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${layer.accent} opacity-60 pointer-events-none`} />
              {/* Gold hairline on hover */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <layer.icon className="w-5 h-5 text-amber-200/90" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] font-mono text-amber-300/60 tracking-wider">
                      0{idx + 1}
                    </span>
                    <h3 className="font-semibold text-white text-base md:text-lg">
                      {layer.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300/80 leading-relaxed">
                    {layer.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10 text-xs text-slate-400/70 italic"
        >
          Most AI forgets. Bloom builds the architecture.
        </motion.p>
      </div>
    </section>
  );
};
