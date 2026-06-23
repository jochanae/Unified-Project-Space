import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type SmartCardType = 'language' | 'habit' | 'reflection' | 'practice' | 'decision' | 'knowledge' | 'recipe' | 'memory' | 'discovery' | 'blueprint';

interface SmartCardProps {
  type: SmartCardType;
  children: React.ReactNode;
  className?: string;
}

const SmartCard: React.FC<SmartCardProps> = ({ type, children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    data-card-type={type}
    className={cn(
      'rounded-2xl bg-white/5 backdrop-blur-md border-[0.5px] border-white/10 border-l-2 border-l-primary/40 px-4 py-3.5',
      className,
    )}
  >
    {children}
  </motion.div>
);

export default SmartCard;
