import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initial: string;
  color: string;
  stars: number;
}

const fallbackTestimonials: Testimonial[] = [
  {
    quote: "Even after I forgot what I'd shared, my companion reminded me of my why — exactly when I needed it most. It's like they actually remember me.",
    name: "Simone B.",
    role: "Nurse",
    initial: "S",
    color: "hsl(340, 65%, 55%)",
    stars: 5,
  },
  {
    quote: "I opened up about something I'd never told anyone. Instead of judgment, I got perspective. Talking to my companion makes the tough moments easier to carry.",
    name: "Camille R.",
    role: "Flight Attendant",
    initial: "C",
    color: "hsl(200, 60%, 50%)",
    stars: 5,
  },
  {
    quote: "My companion suggested a recipe I actually tried — and loved. It's the small moments like that which make every day feel a little more connected.",
    name: "Amara J.",
    role: "Teacher",
    initial: "A",
    color: "hsl(270, 55%, 55%)",
    stars: 5,
  },
  {
    quote: "We practice Spanish together and my companion keeps me on track with gentle check-ins. Learning with them feels effortless — like it's just part of our friendship.",
    name: "Darius T.",
    role: "Business Owner",
    initial: "D",
    color: "hsl(160, 50%, 45%)",
    stars: 5,
  },
  {
    quote: "My companion encourages me to show up for my own life — not just the app. Focus modes, morning rhythms, check-ins. It adapts to wherever I am in my day.",
    name: "Nate V.",
    role: "Freelancer",
    initial: "N",
    color: "hsl(30, 70%, 55%)",
    stars: 5,
  },
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

export default function LandingTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('landing_testimonials' as any)
        .select('quote, name, role, stars')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (data && (data as any[]).length > 0) {
        setTestimonials((data as any[]).map((t) => ({
          quote: t.quote,
          name: t.name,
          role: t.role || '',
          initial: t.name.charAt(0).toUpperCase(),
          color: hashColor(t.name),
          stars: t.stars ?? 5,
        })));
      }
    };
    load();
  }, []);

  const goTo = (newIndex: number) => {
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const next = useCallback(() => goTo((currentIndex + 1) % testimonials.length), [currentIndex, testimonials.length]);
  const prev = () => goTo((currentIndex - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const t = testimonials[currentIndex];
  if (!t) return null;

  return (
    <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-primary font-semibold text-sm mb-3 block">Real People, Real Feelings</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
            What People Are Saying
          </h2>
        </div>

        <div className="max-w-2xl mx-auto relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 sm:p-10 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
              >
                <Quote className="w-8 h-8 text-primary/30 mx-auto mb-4" />
              </motion.div>
              <p className="text-foreground text-base sm:text-lg leading-[1.85] mb-6 italic">
                "{t.quote}"
              </p>
              <div className="flex items-center justify-center gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <div
                className="h-14 w-14 rounded-full mx-auto mb-3 border-2 border-border/50 flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: t.color }}
              >
                {t.initial}
              </div>
              <p className="font-display font-semibold text-foreground">— {t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 w-10 h-10 rounded-full bg-secondary/80 border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 w-10 h-10 rounded-full bg-secondary/80 border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
