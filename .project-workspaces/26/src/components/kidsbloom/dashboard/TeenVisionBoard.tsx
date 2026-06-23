import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, Sparkles, Star, Rocket, Heart, Gamepad2, Car, Laptop, Music } from "lucide-react";
import { toast } from "sonner";

interface TeenVisionBoardProps {
  kidId: string;
  variant?: "playful" | "modern";
}

interface VisionItem {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  image_url: string | null;
  is_completed: boolean;
}

const VISION_ICONS = [
  { icon: "🎮", label: "Gaming", lucide: Gamepad2 },
  { icon: "📱", label: "Tech", lucide: Laptop },
  { icon: "🚗", label: "Vehicle", lucide: Car },
  { icon: "🎵", label: "Music", lucide: Music },
  { icon: "🎯", label: "Goals", lucide: Target },
  { icon: "⭐", label: "Dream", lucide: Star },
  { icon: "🚀", label: "Adventure", lucide: Rocket },
  { icon: "❤️", label: "Passion", lucide: Heart },
];

export const TeenVisionBoard = ({ kidId, variant = "modern" }: TeenVisionBoardProps) => {
  const isPlayful = variant === "playful";
  const [visionItems, setVisionItems] = useState<VisionItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", target_amount: "", icon: "🎯" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVisionItems();
  }, [kidId]);

  const fetchVisionItems = async () => {
    const { data } = await supabase
      .from("kid_savings_goals")
      .select("*")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false });

    if (data) setVisionItems(data);
  };

  const handleAddVision = async () => {
    if (!newItem.title || !newItem.target_amount) {
      toast.error("Fill in all fields");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("kid_savings_goals").insert({
      kid_id: kidId,
      title: newItem.title,
      target_amount: parseFloat(newItem.target_amount),
      icon: newItem.icon,
      current_amount: 0,
    });

    if (error) {
      toast.error("Failed to add vision");
    } else {
      toast.success("Vision added to your board!");
      setNewItem({ title: "", target_amount: "", icon: "🎯" });
      setIsAddModalOpen(false);
      fetchVisionItems();
    }
    setIsSubmitting(false);
  };

  const totalProgress = visionItems.length > 0
    ? (visionItems.reduce((acc, item) => acc + item.current_amount, 0) /
       visionItems.reduce((acc, item) => acc + item.target_amount, 0)) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-sm rounded-2xl p-4 border overflow-hidden relative ${
        isPlayful 
          ? "bg-gradient-to-br from-purple-200 via-pink-100 to-yellow-100 border-purple-200/50 rounded-3xl" 
          : "bg-gradient-to-br from-slate-900/80 via-indigo-900/50 to-violet-900/50 border-white/10"
      }`}
    >
      {/* Background glow effects */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
        isPlayful ? "bg-pink-300/30" : "bg-violet-500/20"
      }`} />
      <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
        isPlayful ? "bg-yellow-300/30" : "bg-indigo-500/20"
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {isPlayful ? (
              <span className="text-2xl">✨</span>
            ) : (
              <Sparkles className="h-5 w-5 text-violet-400" />
            )}
          </motion.div>
          <h3 className={`text-lg font-bold ${isPlayful ? "text-purple-700" : "text-white"}`}>
            {isPlayful ? "My Dreams! 🌈" : "Vision Board"}
          </h3>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className={`rounded-xl gap-1 ${
                isPlayful 
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white" 
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              }`}
            >
              <Plus className="h-4 w-4" />
              {isPlayful ? "Add Dream!" : "Add"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-violet-300">Add to Vision Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white/80">What's your dream?</Label>
                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g., New PS5, Car fund, Concert tickets"
                  className="bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/80">Target Amount ($)</Label>
                <Input
                  type="number"
                  value={newItem.target_amount}
                  onChange={(e) => setNewItem({ ...newItem, target_amount: e.target.value })}
                  placeholder="500"
                  className="bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white/80">Choose an Icon</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {VISION_ICONS.map(({ icon }) => (
                    <motion.button
                      key={icon}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setNewItem({ ...newItem, icon })}
                      className={`p-3 rounded-xl text-2xl ${
                        newItem.icon === icon 
                          ? "bg-violet-600 ring-2 ring-violet-400" 
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {icon}
                    </motion.button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleAddVision} 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              >
                {isSubmitting ? "Adding..." : "Add to Board"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Progress */}
      {visionItems.length > 0 && (
        <div className="mb-4 relative z-10">
          <div className={`flex items-center justify-between text-xs mb-1 ${
            isPlayful ? "text-purple-600" : "text-white/60"
          }`}>
            <span>{isPlayful ? "How close am I? 🎯" : "Overall Progress"}</span>
            <span>{totalProgress.toFixed(0)}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${
            isPlayful ? "bg-purple-200" : "bg-white/10"
          }`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full ${
                isPlayful 
                  ? "bg-gradient-to-r from-pink-400 to-purple-400" 
                  : "bg-gradient-to-r from-violet-500 to-indigo-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Vision Cards */}
      <div className="space-y-3 relative z-10">
        <AnimatePresence mode="popLayout">
          {visionItems.length > 0 ? (
            visionItems.slice(0, 4).map((item, index) => {
              const progress = (item.current_amount / item.target_amount) * 100;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`backdrop-blur-sm rounded-xl p-3 border ${
                    item.is_completed 
                      ? "border-emerald-500/50" 
                      : isPlayful 
                        ? "bg-white/60 border-purple-200" 
                        : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="text-2xl"
                      animate={item.is_completed ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: item.is_completed ? Infinity : 0, repeatDelay: 2 }}
                    >
                      {item.is_completed ? "🎉" : item.icon}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isPlayful ? "text-purple-800" : "text-white"
                      }`}>{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                          isPlayful ? "bg-purple-200" : "bg-white/10"
                        }`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full rounded-full ${
                              item.is_completed 
                                ? "bg-emerald-500" 
                                : isPlayful
                                  ? "bg-gradient-to-r from-pink-400 to-purple-400"
                                  : "bg-gradient-to-r from-violet-500 to-indigo-500"
                            }`}
                          />
                        </div>
                        <span className={`text-xs whitespace-nowrap ${
                          isPlayful ? "text-purple-600" : "text-white/60"
                        }`}>
                          ${item.current_amount}/${item.target_amount}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-3"
              >
                {isPlayful ? "🌟" : "✨"}
              </motion.div>
              <p className={`text-sm mb-3 ${isPlayful ? "text-purple-600" : "text-white/60"}`}>
                {isPlayful ? "What do you wish for?" : "What do you dream of?"}
              </p>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className={`rounded-xl ${
                  isPlayful 
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white" 
                    : "bg-violet-600/50 hover:bg-violet-600 text-white"
                }`}
              >
                {isPlayful ? "Add My Dream! ✨" : "Start Your Vision Board"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {visionItems.length > 4 && (
          <p className={`text-xs text-center ${isPlayful ? "text-purple-500" : "text-white/40"}`}>
            +{visionItems.length - 4} more {isPlayful ? "wishes" : "dreams"}
          </p>
        )}
      </div>
    </motion.div>
  );
};
