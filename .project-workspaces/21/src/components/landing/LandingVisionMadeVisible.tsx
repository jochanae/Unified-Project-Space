import { motion } from 'framer-motion';
import { Eye, Sparkles, Camera } from 'lucide-react';

/**
 * Vision Made Visible — bridges thinking to showing.
 * Communicates the multimodal/visual capability without narrowing
 * the brand to any single industry.
 */
export default function LandingVisionMadeVisible() {
  return (
    <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-primary/60 font-medium mb-4">
              Vision Made Visible
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-light text-foreground leading-[1.2] mb-5">
              Bridge the gap between
              <br />
              <span className="text-primary italic">vision and reality.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-light mb-6">
              Show, don't just tell. Compani sees what you see — sketches, spaces,
              moments, ideas — and helps you shape them into something real.
              Seeing is believing.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Eye, label: 'Visual understanding of anything you share' },
                { icon: Sparkles, label: 'Generate, refine, and reveal in seconds' },
                { icon: Camera, label: 'Bring your craft into the conversation' },
              ].map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <span className="leading-relaxed pt-1">{item.label}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Visual frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-primary/20 bg-card/40 backdrop-blur-xl"
            style={{ boxShadow: '0 30px 80px -30px hsla(40, 60%, 50%, 0.25)' }}
          >
            {/* Layered gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, hsla(40, 60%, 55%, 0.18) 0%, transparent 60%)',
              }}
            />

            {/* AI overlay frame */}
            <div className="absolute inset-6 rounded-2xl border border-primary/25 flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-primary/70 font-medium">
                    Live Vision
                  </span>
                </div>
                <Camera className="h-3.5 w-3.5 text-primary/60" />
              </div>

              {/* Center frame */}
              <div className="flex-1 flex items-center justify-center relative">
                {/* Crosshair brackets */}
                <div className="relative h-32 w-32">
                  <span className="absolute top-0 left-0 h-4 w-4 border-l-2 border-t-2 border-primary/70 rounded-tl-md" />
                  <span className="absolute top-0 right-0 h-4 w-4 border-r-2 border-t-2 border-primary/70 rounded-tr-md" />
                  <span className="absolute bottom-0 left-0 h-4 w-4 border-l-2 border-b-2 border-primary/70 rounded-bl-md" />
                  <span className="absolute bottom-0 right-0 h-4 w-4 border-r-2 border-b-2 border-primary/70 rounded-br-md" />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.2} />
                  </motion.div>
                </div>
              </div>

              {/* Bottom caption */}
              <div className="px-4 py-3 border-t border-primary/15">
                <p className="text-[10px] text-muted-foreground/80 italic text-center">
                  "I see what you're going for — let's refine it."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
