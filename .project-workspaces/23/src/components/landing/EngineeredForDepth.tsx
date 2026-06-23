import { Map, Mic2, FileArchive, Layout } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const FEATURES = [
  {
    title: 'Geo-Spatial Intelligence',
    description:
      'Stop guessing where your leads are. Drill into density by country, region, city, and ZIP/postal code to weaponize your local marketing spend.',
    icon: Map,
    tag: 'Advanced Analytics',
    accent: 'primary' as const,
  },
  {
    title: 'Brand Voice Cloning',
    description:
      "MarQ doesn't just write — MarQ learns. Clone your tone so every funnel, email, and ad sounds unmistakably you.",
    icon: Mic2,
    tag: 'MarQ AI',
    accent: 'gold' as const,
    tier: 'Innovation',
  },
  {
    title: 'Campaign Bundling',
    description:
      'Portability is power. Export entire campaigns — copy, sequences, social posts — as professional .zip bundles for handoff or backup.',
    icon: FileArchive,
    tag: 'Studio Pro',
    accent: 'primary' as const,
  },
  {
    title: 'Strategic Blueprints',
    description:
      'Turn your highest-performing funnels into downloadable architectural blueprints. Map the journey before you scale the reach.',
    icon: Layout,
    tag: 'Architecture',
    accent: 'gold' as const,
  },
];

export function EngineeredForDepth() {
  return (
    <section className="relative px-5 sm:px-6 lg:px-12 py-20 sm:py-24 overflow-hidden">
      {/* Cinematic backdrop glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] sm:text-xs text-gold font-medium tracking-[0.22em] uppercase mb-5">
              Depth by Design
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight [text-wrap:balance]">
              Intelligence <span className="text-muted-foreground italic">Active.</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-sm sm:text-base leading-relaxed [text-wrap:balance]">
              IntoIQ isn't just a funnel builder — it's a strategic command center engineered for the
              professional who demands structural integrity. MarQ rides shotgun on every screen via the HUD.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const accentText = f.accent === 'gold' ? 'text-gold' : 'text-primary';
            return (
              <ScrollReveal key={f.title} delay={i * 100}>
                <div className="group relative h-full glass rounded-2xl border border-border/30 p-6 sm:p-7 transition-all duration-500 hover:border-gold/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="relative">
                    <div className="mb-5 inline-flex p-3 bg-foreground/5 rounded-xl border border-border/40 group-hover:scale-110 transition-transform duration-500">
                      <Icon className={`h-5 w-5 ${accentText}`} />
                    </div>

                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 group-hover:${accentText} transition-colors`}>
                        {f.tag}
                      </span>
                      {f.tier && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-gold bg-gold/10 border border-gold/30 rounded-full px-2 py-0.5">
                          {f.tier}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif text-foreground mb-2 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
