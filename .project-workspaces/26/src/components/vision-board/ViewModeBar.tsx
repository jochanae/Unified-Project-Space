import { motion } from 'framer-motion';
import { Layers, LayoutGrid, Focus, Camera, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'floating' | 'grid' | 'focus';

interface ViewModeBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSnapVision: () => void;
  onManage: () => void;
}

export function ViewModeBar({ 
  viewMode, 
  onViewModeChange, 
  onSnapVision, 
  onManage 
}: ViewModeBarProps) {
  const modes = [
    { value: 'floating' as ViewMode, label: 'Float', icon: Layers, color: 'from-pink-500 to-rose-500' },
    { value: 'grid' as ViewMode, label: 'Grid', icon: LayoutGrid, color: 'from-slate-500 to-slate-600' },
    { value: 'focus' as ViewMode, label: 'Focus', icon: Focus, color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap px-4">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = viewMode === mode.value;
        
        return (
          <motion.div key={mode.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                "h-11 px-5 rounded-2xl flex items-center gap-2 font-semibold shadow-md transition-all",
                isActive
                  ? `bg-gradient-to-r ${mode.color} text-white border border-white/30`
                  : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </Button>
          </motion.div>
        );
      })}

      {/* Snap Vision - Primary CTA */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={onSnapVision}
          className={cn(
            "h-11 px-5 rounded-2xl flex items-center gap-2 font-bold shadow-lg",
            "bg-gradient-to-r from-pink-500 via-purple-500 to-violet-600 text-white",
            "border border-white/30 hover:from-pink-600 hover:via-purple-600 hover:to-violet-700"
          )}
          style={{ boxShadow: '0 8px 32px -8px rgba(168, 85, 247, 0.5)' }}
        >
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
            <Camera className="h-3.5 w-3.5" />
          </div>
          <span>Snap Vision</span>
        </Button>
      </motion.div>

      {/* Manage */}
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onManage}
          className="h-11 px-5 rounded-2xl flex items-center gap-2 font-semibold bg-white text-slate-800 hover:bg-white/90 shadow-md"
        >
          <Settings2 className="h-4 w-4" />
          <span>Manage</span>
        </Button>
      </motion.div>
    </div>
  );
}
