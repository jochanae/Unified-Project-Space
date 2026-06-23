import { BookOpen, Compass, Mail, Megaphone } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { NarrativeArcInline } from '@/components/landing/NarrativeArcInline';

const ROWS = [
  {
    icon: Compass,
    phase: 'Sales Page Architecture',
    old: 'Wireframing in Figma and hiring a $3K copywriter — for a page that may never convert.',
    intoiq:
      'MarQ drafts conversion-optimized hero, social proof, and CTA structure in under 60 seconds.',
  },
  {
    icon: Megaphone,
    phase: '7-Day Content Calendar',
    old: 'Staring at a blank screen every Monday, improvising posts across LinkedIn, IG, and X.',
    intoiq:
      'Social Lab deploys a coordinated 7-day narrative arc across every platform — automatically.',
  },
  {
    icon: Mail,
    phase: 'Lead Magnet Logic',
    old: 'Linking to a generic PDF and hoping browsers turn into subscribers.',
    intoiq:
      'Lead-capture funnels convert traffic into a permanent, scored email list you own.',
  },
];

export function AuthorsEdge() {
  return (
    <section className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] sm:text-xs text-primary font-medium tracking-[0.22em] uppercase mb-5">
              <BookOpen className="w-3 h-3 mr-2" />
              The Operator's Edge
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif leading-[1.1] mb-4 [text-wrap:balance]">
              From expertise to{' '}
              <span className="gradient-text italic">revenue engine</span> in 60 seconds
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto [text-wrap:balance]">
              You bring the signal. MarQ architects the system — every asset, every funnel, every
              conversion, working as one.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            {/* Header row — desktop only */}
            <div className="hidden sm:grid grid-cols-[140px_1fr_1fr] text-[10px] tracking-[0.22em] uppercase text-muted-foreground/60 font-medium border-b border-border/30 bg-muted/20">
              <div className="px-5 py-3">Phase</div>
              <div className="px-5 py-3">The Old Way</div>
              <div className="px-5 py-3 text-primary/80">The IntoIQ Way</div>
            </div>

            {ROWS.map((row, i) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.phase}
                  className={`grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-3 sm:gap-0 ${
                    i !== ROWS.length - 1 ? 'border-b border-border/20' : ''
                  }`}
                >
                  {/* Phase cell */}
                  <div className="flex items-center gap-3 px-5 pt-5 sm:py-5 sm:border-r sm:border-border/20">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-serif text-base sm:text-lg">{row.phase}</span>
                  </div>

                  {/* Old way */}
                  <div className="px-5 py-3 sm:py-5 sm:border-r sm:border-border/20">
                    <span className="sm:hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50 block mb-1">
                      Old way
                    </span>
                    <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/30 leading-relaxed">
                      {row.old}
                    </p>
                  </div>

                  {/* IntoIQ way */}
                  <div className="px-5 pb-5 sm:py-5 relative">
                    <span className="sm:hidden text-[10px] uppercase tracking-[0.22em] text-primary/70 block mb-1">
                      The IntoIQ way
                    </span>
                    <p className="text-sm text-foreground/95 leading-relaxed">{row.intoiq}</p>
                    {/* Embedded proof — only on the 7-Day Content Calendar row */}
                    {row.phase === '7-Day Content Calendar' && <NarrativeArcInline />}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={350}>
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/60 mt-6 italic">
            Built for consultants, coaches, founders, and authority builders with something worth scaling.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
