import { motion } from 'framer-motion';

/**
 * Legacy of Craft — the "soul" close before the final CTA.
 * Honors the artisan inspiration behind Compani: built with the same
 * care a master applies to their craft.
 */
export default function LandingLegacyOfCraft() {
  return (
    <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Ambient gold wash */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        {/* Hairline divider — gold thread */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="mx-auto mb-10 h-px w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-primary/60 font-medium mb-6"
        >
          The Legacy of Craft
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="font-display text-2xl sm:text-3xl md:text-4xl font-light text-foreground leading-[1.25] mb-6"
        >
          Inspired by generations of artisans.
          <br />
          <span className="text-primary italic">Built for the modern master.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed max-w-lg mx-auto font-light"
        >
          Compani was shaped by a lifetime of watching real craft happen — the
          quiet precision of a steady hand, the patience of a perfect finish, the
          care that turns work into art. Every detail here carries that same
          inheritance.
        </motion.p>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.7 }}
          className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
      </div>
    </section>
  );
}
