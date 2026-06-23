import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, PiggyBank, Heart, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SplitSettingsCardProps {
  kidId: string;
  kidName: string;
}

interface SplitValues {
  spend: number;
  save: number;
  give: number;
}

const PRESETS = [
  { label: "50/30/20", spend: 50, save: 30, give: 20 },
  { label: "70/20/10", spend: 70, save: 20, give: 10 },
  { label: "100% Spend", spend: 100, save: 0, give: 0 },
  { label: "Equal Split", spend: 34, save: 33, give: 33 },
];

export const SplitSettingsCard = ({ kidId, kidName }: SplitSettingsCardProps) => {
  const [splits, setSplits] = useState<SplitValues>({ spend: 100, save: 0, give: 0 });
  const [originalSplits, setOriginalSplits] = useState<SplitValues>({ spend: 100, save: 0, give: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSplits = async () => {
      const { data } = await supabase
        .from("kids_profiles")
        .select("split_spend_percent, split_save_percent, split_give_percent")
        .eq("id", kidId)
        .single();

      if (data) {
        const fetched = {
          spend: data.split_spend_percent ?? 100,
          save: data.split_save_percent ?? 0,
          give: data.split_give_percent ?? 0,
        };
        setSplits(fetched);
        setOriginalSplits(fetched);
      }
    };
    fetchSplits();
  }, [kidId]);

  useEffect(() => {
    setHasChanges(
      splits.spend !== originalSplits.spend ||
      splits.save !== originalSplits.save ||
      splits.give !== originalSplits.give
    );
  }, [splits, originalSplits]);

  const adjustSplits = (bucket: keyof SplitValues, newValue: number) => {
    const remaining = 100 - newValue;
    const otherBuckets = Object.keys(splits).filter(k => k !== bucket) as (keyof SplitValues)[];
    
    // Distribute remaining among other buckets proportionally
    const currentOtherTotal = otherBuckets.reduce((sum, k) => sum + splits[k], 0);
    
    const newSplits = { ...splits, [bucket]: newValue };
    
    if (currentOtherTotal === 0) {
      // Distribute evenly
      const each = Math.floor(remaining / 2);
      newSplits[otherBuckets[0]] = each;
      newSplits[otherBuckets[1]] = remaining - each;
    } else {
      // Distribute proportionally
      let distributed = 0;
      otherBuckets.forEach((k, i) => {
        if (i === otherBuckets.length - 1) {
          newSplits[k] = remaining - distributed;
        } else {
          const proportion = splits[k] / currentOtherTotal;
          const value = Math.round(remaining * proportion);
          newSplits[k] = value;
          distributed += value;
        }
      });
    }

    // Ensure all values are >= 0
    Object.keys(newSplits).forEach(k => {
      if (newSplits[k as keyof SplitValues] < 0) {
        newSplits[k as keyof SplitValues] = 0;
      }
    });

    setSplits(newSplits);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSplits({ spend: preset.spend, save: preset.save, give: preset.give });
  };

  const handleSave = async () => {
    // Validate total is 100
    const total = splits.spend + splits.save + splits.give;
    if (total !== 100) {
      toast.error("Split percentages must add up to 100%");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("kids_profiles")
        .update({
          split_spend_percent: splits.spend,
          split_save_percent: splits.save,
          split_give_percent: splits.give,
        })
        .eq("id", kidId);

      if (error) throw error;

      setOriginalSplits(splits);
      toast.success("Split settings saved!");
    } catch (error) {
      console.error("Error saving splits:", error);
      toast.error("Failed to save split settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSplits(originalSplits);
  };

  const total = splits.spend + splits.save + splits.give;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Auto-Split Settings
        </CardTitle>
        <CardDescription>
          Configure how {kidName}'s incoming money is automatically divided
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          {/* Spend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium">Spend</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{splits.spend}%</span>
            </div>
            <Slider
              value={[splits.spend]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => adjustSplits("spend", v)}
              className="[&_[role=slider]]:bg-purple-500"
            />
          </div>

          {/* Save */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-medium">Save</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{splits.save}%</span>
            </div>
            <Slider
              value={[splits.save]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => adjustSplits("save", v)}
              className="[&_[role=slider]]:bg-emerald-500"
            />
          </div>

          {/* Give */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-pink-600" />
                </div>
                <span className="font-medium">Give</span>
              </div>
              <span className="text-lg font-bold text-pink-600">{splits.give}%</span>
            </div>
            <Slider
              value={[splits.give]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => adjustSplits("give", v)}
              className="[&_[role=slider]]:bg-pink-500"
            />
          </div>
        </div>

        {/* Total indicator */}
        <div className={`text-center text-sm ${total === 100 ? "text-muted-foreground" : "text-destructive font-medium"}`}>
          Total: {total}% {total !== 100 && "(must equal 100%)"}
        </div>

        {/* Visual preview */}
        <div className="h-4 rounded-full overflow-hidden flex">
          <motion.div
            className="bg-purple-500"
            animate={{ width: `${splits.spend}%` }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="bg-emerald-500"
            animate={{ width: `${splits.save}%` }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="bg-pink-500"
            animate={{ width: `${splits.give}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Actions */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || total !== 100}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
