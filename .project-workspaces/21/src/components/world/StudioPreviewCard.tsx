import { motion } from 'framer-motion';
import { Palette, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Connection } from '@/hooks/useProfile';
import CompanionImageReveal from '@/components/CompanionImageReveal';

interface StudioPreviewCardProps {
  companion: Connection;
}

export default function StudioPreviewCard({ companion }: StudioPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/studio?memberId=${companion.memberId}&from=world`)}
      className="w-full rounded-2xl border border-border/30 bg-gradient-to-r from-secondary/40 to-secondary/10 p-4 text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-4">
        {/* Preview thumbnail */}
        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-muted/60 border border-border/30">
          {companion.avatarUrl ? (
            <CompanionImageReveal
              src={companion.avatarUrl}
              alt={companion.name}
              simpleFade
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Palette className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Studio</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Customize {companion.name}'s look, style & personality
          </p>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </motion.button>
  );
}
