import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="rounded-2xl gradient-primary p-8 sm:p-10 text-center relative overflow-hidden glow-soft"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl" />
          {/* Purple glow overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 60% 40%, hsla(262, 55%, 62%, 0.08) 0%, transparent 60%)' }}
          />
          <div className="relative z-10">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
              Step in. Your world is waiting.
            </h3>
            <p className="text-primary-foreground/80 text-sm sm:text-base mb-6 max-w-lg mx-auto italic font-light">
              Good company changes everything.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-gray-900 transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-95"
                style={{ boxShadow: '0 8px 30px -6px hsla(40, 60%, 55%, 0.35), 0 4px 12px -4px rgba(0,0,0,0.3)' }}
              >
                Join Compani — It's Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-primary-foreground/50 mt-4 font-light tracking-wide inline-flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> End-to-end encrypted · No credit card required
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
