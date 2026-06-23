import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AnimatedPortrait from '@/components/AnimatedPortrait';
import { Switch } from '@/components/ui/switch';
import { usePortraitAnimations } from '@/hooks/usePortraitAnimations';

interface PortraitPreviewProps {
  open: boolean;
  onClose: () => void;
  companionName: string;
  companionAvatarUrl: string;
}

export default function PortraitPreview({
  open,
  onClose,
  companionName,
  companionAvatarUrl,
}: PortraitPreviewProps) {
  const [animationsEnabled, setAnimationsEnabled] = usePortraitAnimations();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(225 25% 6%), hsl(262 30% 12%), hsl(225 25% 8%))',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Portrait */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="rounded-3xl overflow-hidden"
        >
          <AnimatedPortrait
            src={companionAvatarUrl}
            alt={companionName}
            isSpeaking={false}
            enabled={animationsEnabled}
            className="h-80 w-80 sm:h-96 sm:w-96"
          />
        </motion.div>

        {/* Animation toggle pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2"
        >
          <span className="text-xs text-white/60">Breathing &amp; glow</span>
          <Switch
            checked={animationsEnabled}
            onCheckedChange={setAnimationsEnabled}
            className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-white/20"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
