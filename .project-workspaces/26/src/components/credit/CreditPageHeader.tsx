import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Home } from 'lucide-react';

const CreditPageHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(250,70%,55%)] via-[hsl(220,75%,50%)] to-[hsl(195,80%,50%)] -mx-4 px-4 py-5 mb-6">
      {/* Decorative circles */}
      <div className="absolute -left-8 bottom-0 w-32 h-32 rounded-full bg-white/10 blur-sm" />
      <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10 blur-sm" />

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20 h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-white hover:bg-white/20 h-10 w-10"
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Content - left-aligned like PageHeroHeader */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-6 w-6 text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Credit Score</h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-sm text-white/90"
          >
            Track your scores, set goals, and monitor credit health
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xs text-white/70 mt-1 italic"
          >
            Scores are manually entered — update them anytime from your credit reports
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default CreditPageHeader;
