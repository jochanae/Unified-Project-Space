import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Zap, Target, Mail } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const SUCCESS_STORIES = [
  {
    metric: '10 Demos / Day 1',
    icon: <Target className="w-4 h-4 text-primary" />,
    quote: 'Signal Lab forced me to sharpen my message. I had 10 demo requests before I even finished my first coffee.',
    author: 'Dani R.',
    feature: 'Signal Lab',
  },
  {
    metric: '$5k Weekend',
    icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
    quote: 'We ran an A/B Variant Duel on headlines. Performance Memory helped us scale the winner to a $5k weekend.',
    author: 'Jordan E.',
    feature: 'Marketing Studio',
  },
  {
    metric: '2x Closing Rate',
    icon: <Zap className="w-4 h-4 text-emerald-400" />,
    quote: 'The Lead Scoring Engine tagged our high-intent prospects automatically. Our closing rate doubled in three weeks.',
    author: 'Priya K.',
    feature: 'CRM & Scoring',
  },
  {
    metric: '42% Open Rate',
    icon: <Mail className="w-4 h-4 text-purple-400" />,
    quote: 'The MarQ Sequence Writer drafted a nurture flow that felt human. Deliverability is at an all-time high.',
    author: 'Marcus T.',
    feature: 'Email Engine',
  },
];

export function SuccessFeed() {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden border-y border-border/20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="max-w-6xl px-5 sm:px-6 lg:px-12 mx-auto relative z-10">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-400 bg-amber-500/5 px-4 py-1 tracking-widest uppercase text-[10px]">
              Command Results
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif mb-4 leading-tight [text-wrap:balance]">
              The <span className="gradient-text italic">Intelligence</span> in Action
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base [text-wrap:balance]">
              Real outcomes from builders who traded manual labor for autonomous systems.
            </p>
          </div>
        </ScrollReveal>

        {/* Mobile: swipeable horizontal carousel · Desktop: 4-up grid */}
        <div
          className={
            // On <sm: snap-x carousel; on sm+: switch to grid
            'sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 ' +
            'flex sm:flex-none gap-4 overflow-x-auto sm:overflow-visible ' +
            'snap-x snap-mandatory sm:snap-none ' +
            '-mx-5 px-5 sm:mx-0 sm:px-0 pb-2 sm:pb-0 ' +
            'scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] ' +
            '[&::-webkit-scrollbar]:hidden'
          }
        >
          {SUCCESS_STORIES.map((story, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="group p-6 rounded-2xl glass border border-border/30 hover:border-primary/30 transition-all duration-300 text-left h-full flex flex-col snap-center min-w-[78vw] sm:min-w-0">
                <div className="flex items-center justify-between mb-5">
                  <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    {story.icon}
                  </div>
                  <span className="text-xs font-bold text-foreground tracking-tight uppercase">
                    {story.metric}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic flex-1">
                  "{story.quote}"
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border/20">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{story.author}</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                      {story.feature}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        {/* Mobile-only swipe hint */}
        <p className="sm:hidden text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50 mt-3">
          ← Swipe for more results →
        </p>
      </div>
    </section>
  );
}
