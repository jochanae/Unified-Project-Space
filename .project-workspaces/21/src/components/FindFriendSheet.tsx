import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wand2, X } from 'lucide-react';

interface FindFriendSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function FindFriendSheet({ open, onClose }: FindFriendSheetProps) {
  const navigate = useNavigate();
  const go = (path: string) => { onClose(); navigate(path); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-6"
            style={{
              background: 'rgba(15,18,33,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8rem)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-white">Find a Friend</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => go('/browse')}
                className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.97]"
              >
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Browse</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">Meet someone from our community</p>
                </div>
              </button>
              <button
                onClick={() => go('/studio?from=create')}
                className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.97]"
              >
                <Wand2 className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Build your own</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">Design someone from scratch</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
