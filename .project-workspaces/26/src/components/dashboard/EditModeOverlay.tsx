import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardEdit } from "@/contexts/DashboardEditContext";

export function EditModeOverlay() {
  const { isEditMode, setIsEditMode } = useDashboardEdit();

  if (!isEditMode) return null;

  return (
    <>
      {/* Orange/gradient edit mode banner at top - NO dark overlay */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white px-6 py-3 rounded-full shadow-xl">
          <p className="text-sm font-semibold">
            Edit Mode — Tap the <span className="font-bold">?</span> on any card to customize
          </p>
        </div>
      </motion.div>
      
      {/* Fixed Done button at bottom */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
      >
        <Button
          onClick={() => setIsEditMode(false)}
          size="lg"
          className="gap-2 px-8 py-6 text-lg font-semibold rounded-full shadow-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <X className="h-5 w-5" />
          Done Editing
        </Button>
      </motion.div>
    </>
  );
}
