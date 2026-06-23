import { Radar, Hammer, Clapperboard, Brain } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const STAGES = [
  {
    step: '01',
    title: 'Signal Lab',
    desc: "Don't guess your message. MarQ sharpens your positioning and ICP until your message cuts through the noise.",
    icon: Radar,
  },
  {
    step: '02',
    title: 'Build Stream',
    desc: 'Watch a 3-step funnel manifest in real-time. Copy, design, and logic synced into a high-converting workspace.',
    icon: Hammer,
  },
  {
    step: '03',
    title: 'Creative Director',
    desc: "MarQ audits every manual edit against your organization's winning patterns. Never publish weak copy again.",
    icon: Clapperboard,
  },
  {
    step: '04',
    title: 'Performance Memory',
    desc: 'The loop closes. Successful campaigns become the DNA for your future plans. The app gets smarter as you grow.',
    icon: Brain,
  },
];

export function IntelligenceJourney() {
  return (
    <section id="process" className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-20 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-primary font-medium tracking-widest uppercase mb-4">
              The Closed-Loop
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif [text-wrap:balance]">
              Signal → Build → Audit →{' '}
              <span className="gradient-text italic">Learn</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base [text-wrap:balance]">
              Four systems that turn raw ideas into autonomous revenue — and get smarter with every lead.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <ScrollReveal key={s.step} delay={i * 120}>
                <div className="relative p-6 rounded-2xl glass border border-border/30 hover:border-primary/30 transition-all duration-300 h-full overflow-hidden group">
                  <div className="text-[10px] font-bold tracking-widest text-muted-foreground/60 mb-4 uppercase">
                    Stage {s.step}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-serif mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
