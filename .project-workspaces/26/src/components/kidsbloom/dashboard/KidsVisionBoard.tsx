import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, Upload, X, Trash2, Edit3, Target, Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KidsVisionBoardProps {
  kidId: string;
  variant: "playful" | "modern";
}

interface Dream {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  image_url: string | null;
  icon: string | null;
}

// Playful icons for younger kids
const playfulDreamIcons = ["🎮", "🚲", "🎸", "📱", "👟", "🎨", "🐕", "✈️", "🏀", "📚", "🎁", "⭐"];

// Modern icons for teens - more mature/aspirational
const modernDreamIcons = ["🎮", "💻", "🎧", "📱", "👟", "📸", "🚗", "✈️", "🏋️", "🎓", "💰", "⭐"];

const dreamColors = [
  "from-pink-400 to-rose-500",
  "from-purple-400 to-violet-500",
  "from-blue-400 to-indigo-500",
  "from-green-400 to-emerald-500",
  "from-yellow-400 to-orange-500",
  "from-cyan-400 to-teal-500",
];

export function KidsVisionBoard({ kidId, variant }: KidsVisionBoardProps) {
  const isPlayful = variant === "playful";
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Dream | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formIcon, setFormIcon] = useState("⭐");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDreams = useCallback(async () => {
    const { data, error } = await supabase
      .from("kid_savings_goals")
      .select("id, title, target_amount, current_amount, image_url, icon")
      .eq("kid_id", kidId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (data) setDreams(data);
    setIsLoading(false);
  }, [kidId]);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  const resetForm = () => {
    setFormTitle("");
    setFormAmount("");
    setFormIcon("⭐");
    setFormImageUrl(null);
    setEditingDream(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddSheet(true);
  };

  const handleOpenEdit = (dream: Dream) => {
    setFormTitle(dream.title);
    setFormAmount(dream.target_amount.toString());
    setFormIcon(dream.icon || "⭐");
    setFormImageUrl(dream.image_url);
    setEditingDream(dream);
    setShowContextMenu(null);
    setShowAddSheet(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error(isPlayful ? "Give your dream a name! 🌟" : "Please enter a title");
      return;
    }

    const dreamData = {
      title: formTitle.trim(),
      target_amount: parseFloat(formAmount) || 0,
      icon: formIcon,
      image_url: formImageUrl,
    };

    if (editingDream) {
      const { error } = await supabase
        .from("kid_savings_goals")
        .update(dreamData)
        .eq("id", editingDream.id);

      if (error) {
        toast.error("Couldn't update dream");
        return;
      }
      toast.success(isPlayful ? "Dream updated! ✨" : "Dream updated");
    } else {
      const { error } = await supabase
        .from("kid_savings_goals")
        .insert({
          ...dreamData,
          kid_id: kidId,
          current_amount: 0,
        });

      if (error) {
        toast.error("Couldn't add dream");
        return;
      }
      toast.success(isPlayful ? "New dream added! 🌈" : "Dream added");
    }

    setShowAddSheet(false);
    resetForm();
    fetchDreams();
  };

  const handleDelete = async (dream: Dream) => {
    const { error } = await supabase
      .from("kid_savings_goals")
      .delete()
      .eq("id", dream.id);

    if (error) {
      toast.error("Couldn't delete dream");
      return;
    }

    toast.success(isPlayful ? "Dream removed 💫" : "Dream deleted");
    setShowDeleteConfirm(null);
    fetchDreams();
  };

  const handleImageUpload = async (useCamera: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (useCamera) input.capture = "environment";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      document.body.removeChild(input);

      if (!file) return;

      // Validate
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setIsUploading(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${kidId}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("vision-images")
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("vision-images")
          .getPublicUrl(data.path);

        setFormImageUrl(urlData.publicUrl);
        toast.success(isPlayful ? "Picture added! 📸" : "Image uploaded");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Couldn't upload image");
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  const handleLongPress = (dreamId: string) => {
    setShowContextMenu(dreamId);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
          ✨
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className={`h-5 w-5 ${isPlayful ? "text-pink-500" : "text-violet-400"}`} />
          <h3 className={`font-bold text-lg ${isPlayful ? "text-purple-600" : "text-white"}`}>
            {isPlayful ? "My Dreams ✨" : "Vision Board"}
          </h3>
        </div>
        <Button
          size="sm"
          onClick={handleOpenAdd}
          className={`gap-1 ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" : "bg-violet-600 hover:bg-violet-700"}`}
        >
          <Plus className="h-4 w-4" />
          {isPlayful ? "Add" : "New"}
        </Button>
      </div>

      {/* Dreams Grid - Scrollable Container */}
      {dreams.length > 0 ? (
        <div className="relative rounded-2xl p-4"
          style={{
            background: isPlayful
              ? "linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #eff6ff 100%)"
              : "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
          }}
        >
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent pr-1">
            <div className="grid grid-cols-3 gap-3">
              {dreams.map((dream, index) => {
                const progress = dream.target_amount > 0 
                  ? (dream.current_amount / dream.target_amount) * 100 
                  : 0;
                
                return (
                  <DreamCard
                    key={dream.id}
                    dream={dream}
                    index={index}
                    progress={progress}
                    isPlayful={isPlayful}
                    onLongPress={() => handleLongPress(dream.id)}
                    onClick={() => handleOpenEdit(dream)}
                  />
                );
              })}
            </div>
          </div>

          {/* Dream count indicator */}
          {dreams.length > 6 && (
            <p className={`text-xs text-center mt-2 ${isPlayful ? "text-purple-500" : "text-white/60"}`}>
              {dreams.length} dreams • scroll to see all
            </p>
          )}

          {/* Floating decorations for playful mode */}
          {isPlayful && (
            <>
              <motion.div
                className="absolute -top-2 -right-2 text-2xl pointer-events-none"
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <motion.div
                className="absolute bottom-2 left-2 text-xl pointer-events-none"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🌈
              </motion.div>
            </>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-8 rounded-2xl ${isPlayful ? "bg-gradient-to-br from-pink-50 to-purple-50" : "bg-white/5"}`}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-3"
          >
            {isPlayful ? "🌟" : "✨"}
          </motion.div>
          <p className={`font-medium ${isPlayful ? "text-purple-600" : "text-white"}`}>
            {isPlayful ? "What do you dream of?" : "Add your first dream"}
          </p>
          <p className={`text-sm mt-1 ${isPlayful ? "text-purple-400" : "text-white/60"}`}>
            {isPlayful ? "Tap + to add a dream!" : "Start building your vision board"}
          </p>
        </motion.div>
      )}

      {/* Helper hint text */}
      <p className={`text-center text-xs mt-3 ${isPlayful ? "text-purple-400" : "text-white/40"}`}>
        {isPlayful 
          ? "Tap + to add dreams, hold to edit or remove! ✨" 
          : "Tap + to add, hold a card to edit or remove"}
      </p>

      {/* Context Menu Dialog */}
      <AlertDialog open={!!showContextMenu} onOpenChange={() => setShowContextMenu(null)}>
        <AlertDialogContent className="w-[90%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{isPlayful ? "What would you like to do?" : "Dream Actions"}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const dream = dreams.find(d => d.id === showContextMenu);
                if (dream) handleOpenEdit(dream);
              }}
              className="w-full justify-start"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const dream = dreams.find(d => d.id === showContextMenu);
                if (dream) {
                  setShowContextMenu(null);
                  setShowDeleteConfirm(dream);
                }
              }}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent className="w-[90%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlayful ? "Remove this dream?" : "Delete dream?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {isPlayful
                  ? `"${showDeleteConfirm?.title}" will be gone forever!`
                  : `This will permanently delete "${showDeleteConfirm?.title}"`}
              </span>
              {showDeleteConfirm?.current_amount && showDeleteConfirm.current_amount > 0 && (
                <span className="block text-foreground font-medium">
                  {isPlayful
                    ? `💰 You saved ${showDeleteConfirm.current_amount} coins toward this! You can add it back to your piggy bank.`
                    : `You have $${showDeleteConfirm.current_amount.toFixed(2)} saved toward this goal. You can add this back to your account balance.`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl px-0 py-0">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className={`text-xl font-bold ${isPlayful ? "text-purple-600" : "text-foreground"}`}>
              {editingDream 
                ? (isPlayful ? "Edit Dream ✏️" : "Edit Dream") 
                : (isPlayful ? "New Dream ✨" : "Add Dream")}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowAddSheet(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-6 space-y-5 overflow-y-auto pb-8">
            {/* Image Upload */}
            <div className="flex flex-col items-center gap-4">
              {formImageUrl ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border">
                  <img src={formImageUrl} alt="Dream" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormImageUrl(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center ${isPlayful ? "border-purple-300 bg-purple-50" : "border-muted-foreground/30 bg-muted/30"}`}>
                  <span className="text-4xl">{formIcon}</span>
                </div>
              )}

              {isUploading ? (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImageUpload(true)}
                    className={`flex-1 h-12 rounded-xl ${isPlayful ? "border-pink-300 text-pink-600" : "border-primary/50 text-primary"}`}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImageUpload(false)}
                    className={`flex-1 h-12 rounded-xl ${isPlayful ? "border-purple-300 text-purple-600" : "border-primary/50 text-primary"}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              )}
            </div>

            {/* Icon Selector */}
            <div className="space-y-2">
              <Label>{isPlayful ? "Pick an icon!" : "Icon"}</Label>
              <div className="flex flex-wrap gap-2">
                {(isPlayful ? playfulDreamIcons : modernDreamIcons).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      formIcon === icon
                        ? isPlayful
                          ? "bg-purple-500 shadow-lg scale-110"
                          : "bg-violet-600 shadow-lg scale-110"
                        : isPlayful
                        ? "bg-purple-100 hover:bg-purple-200"
                        : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>{isPlayful ? "What's your dream?" : "Title"}</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={isPlayful ? "A new bike 🚲" : "Enter dream title"}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>{isPlayful ? "How much does it cost?" : "Target Amount"}</Label>
              <Input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="$0"
                className="h-12 rounded-xl"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className={`w-full h-12 rounded-xl text-lg font-bold ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" : "bg-violet-600 hover:bg-violet-700"}`}
            >
              {editingDream 
                ? (isPlayful ? "Save Changes! ✨" : "Save Changes") 
                : (isPlayful ? "Add Dream! 🌟" : "Add Dream")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Dream Card Component
interface DreamCardProps {
  dream: Dream;
  index: number;
  progress: number;
  isPlayful: boolean;
  onLongPress: () => void;
  onClick: () => void;
}

function DreamCard({ dream, index, progress, isPlayful, onLongPress, onClick }: DreamCardProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      onLongPress();
    }, 500);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotate: index % 2 === 0 ? 2 : -2,
      }}
      whileHover={{ scale: 1.05, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", damping: 15 }}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      className="cursor-pointer select-none"
    >
      <div
        className={cn(
          "relative rounded-xl overflow-hidden shadow-lg aspect-square",
          !dream.image_url && `bg-gradient-to-br ${dreamColors[index % dreamColors.length]}`
        )}
      >
        {dream.image_url ? (
          <img
            src={dream.image_url}
            alt={dream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">{dream.icon || "⭐"}</span>
          </div>
        )}

        {/* Overlay with title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-white text-xs font-medium line-clamp-1">{dream.title}</p>
          {dream.target_amount > 0 && (
            <div className="mt-1">
              <Progress value={progress} className="h-1" />
              <p className="text-white/70 text-[10px] mt-0.5">
                ${dream.current_amount} / ${dream.target_amount}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
