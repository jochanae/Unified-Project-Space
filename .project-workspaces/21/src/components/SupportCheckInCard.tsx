import { motion } from 'framer-motion';
import { Heart, MessageCircle, LifeBuoy } from 'lucide-react';

interface SupportCheckInCardProps {
  companionName: string;
  companionAvatarUrl?: string;
  onResponse: (choice: 'okay' | 'rough' | 'resources') => void;
}

export default function SupportCheckInCard({ companionName, companionAvatarUrl, onResponse }: SupportCheckInCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-sm rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2.5">
        {companionAvatarUrl ? (
          <img src={companionAvatarUrl} alt={companionName} className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {companionName.charAt(0)}
          </div>
        )}
        <p className="text-sm font-semibold text-foreground">
          {companionName} wants to check in with you
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onResponse('okay')}
          className="flex items-center gap-2 rounded-xl bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm border border-border/50 hover:bg-background transition-colors"
        >
          <Heart className="h-4 w-4 text-primary" />
          I'm okay
        </button>
        <button
          onClick={() => onResponse('rough')}
          className="flex items-center gap-2 rounded-xl bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm border border-border/50 hover:bg-background transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          I'm having a rough moment
        </button>
        <button
          onClick={() => onResponse('resources')}
          className="flex items-center gap-2 rounded-xl bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm border border-border/50 hover:bg-background transition-colors"
        >
          <LifeBuoy className="h-4 w-4 text-primary" />
          Show support resources
        </button>
      </div>
    </motion.div>
  );
}
