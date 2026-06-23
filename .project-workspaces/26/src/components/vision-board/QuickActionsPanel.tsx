import { motion } from 'framer-motion';
import { Camera, ChevronUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsPanelProps {
  onAddPhoto: () => void;
  onJumpUp: () => void;
}

export function QuickActionsPanel({ onAddPhoto, onJumpUp }: QuickActionsPanelProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="fixed bottom-6 left-4 right-4 md:left-auto md:right-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 z-40"
    >
      <div className="bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-400" />
          <span className="text-white font-semibold">Quick Actions</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onAddPhoto}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl py-6 flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-500/30 flex items-center justify-center">
              <Camera className="h-5 w-5 text-teal-300" />
            </div>
            <span className="text-xs">📸 Add Photo</span>
          </Button>

          <Button
            variant="ghost"
            onClick={onJumpUp}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl py-6 flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <ChevronUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs">⬆️ Jump Up</span>
          </Button>
        </div>
      </div>

      {/* FAB for quick add - mobile */}
      <motion.div
        className="fixed right-4 bottom-32 md:hidden z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={onAddPhoto}
          className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 p-0"
        >
          <Camera className="h-6 w-6 text-white" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
