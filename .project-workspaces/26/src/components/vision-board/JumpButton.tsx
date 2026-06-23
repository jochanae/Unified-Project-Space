import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JumpButtonProps {
  onClick: () => void;
}

export function JumpButton({ onClick }: JumpButtonProps) {
  return (
    <motion.div
      className="fixed left-4 top-1/3 z-50"
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
    >
      <Button
        onClick={onClick}
        className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-4 py-4 shadow-xl flex flex-col items-center gap-1 border border-blue-400/30"
      >
        <ChevronDown className="h-5 w-5" />
        <span className="text-xs font-bold">Jump</span>
      </Button>
    </motion.div>
  );
}
