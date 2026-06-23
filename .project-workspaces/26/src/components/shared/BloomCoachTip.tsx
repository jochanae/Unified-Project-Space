import { useNavigate } from "react-router-dom";
import { Flower2, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BloomCoachTipProps {
  /** Example prompt to show the user */
  example: string;
  /** localStorage key to remember dismissal */
  dismissKey: string;
}

export function BloomCoachTip({ example, dismissKey }: BloomCoachTipProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem(dismissKey) === "true"
  );

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    localStorage.setItem(dismissKey, "true");
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-4 mt-3 max-w-xl lg:mx-auto"
        >
          <button
            onClick={() => navigate("/coach")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all group text-left"
          >
             <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
               <Flower2 className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">💡 Try asking Bloom:</p>
              <p className="text-xs text-muted-foreground italic truncate">"{example}"</p>
            </div>
            <X
              className="h-4 w-4 text-muted-foreground/50 hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDismiss}
            />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
