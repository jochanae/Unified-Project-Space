import { motion } from 'framer-motion';
import { Focus, Camera, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomActionToolbarProps {
  onFocus: () => void;
  onSnapVision: () => void;
  onManage: () => void;
  isFocusMode?: boolean;
}

export function BottomActionToolbar({ 
  onFocus, 
  onSnapVision, 
  onManage,
  isFocusMode = false 
}: BottomActionToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', damping: 20 }}
      className="relative z-40 pb-safe mt-8"
    >
      {/* Gradient fade at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      
      <div className="relative px-4 pb-6 pt-4">
        <div className="flex items-center justify-center gap-3">
          {/* Focus Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onFocus}
              className={cn(
                "h-14 px-6 rounded-2xl flex items-center gap-2 font-semibold shadow-lg",
                "bg-gradient-to-r border border-white/20 backdrop-blur-sm",
                isFocusMode 
                  ? "from-cyan-500 to-blue-600 text-white" 
                  : "from-white/15 to-white/10 text-white hover:from-white/20 hover:to-white/15"
              )}
            >
              <Focus className="h-5 w-5" />
              <span>Focus</span>
            </Button>
          </motion.div>

          {/* Snap Vision Button - Primary CTA */}
          <motion.div 
            whileHover={{ scale: 1.08 }} 
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onSnapVision}
              className={cn(
                "h-16 px-8 rounded-2xl flex items-center gap-3 font-bold text-lg shadow-2xl",
                "bg-gradient-to-r from-pink-500 via-purple-500 to-violet-600 text-white",
                "border-2 border-white/30 hover:from-pink-600 hover:via-purple-600 hover:to-violet-700",
                "ring-2 ring-white/20 ring-offset-2 ring-offset-transparent"
              )}
              style={{
                boxShadow: '0 10px 40px -10px rgba(168, 85, 247, 0.5)',
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <span>Snap Vision</span>
            </Button>
          </motion.div>

          {/* Manage Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onManage}
              className={cn(
                "h-14 px-6 rounded-2xl flex items-center gap-2 font-semibold shadow-lg",
                "bg-gradient-to-r from-white/15 to-white/10 border border-white/20 backdrop-blur-sm",
                "text-white hover:from-white/20 hover:to-white/15"
              )}
            >
              <Settings2 className="h-5 w-5" />
              <span>Manage</span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
