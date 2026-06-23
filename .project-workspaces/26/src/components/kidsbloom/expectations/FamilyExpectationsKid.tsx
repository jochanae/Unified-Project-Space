import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface Expectation {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
}

interface FamilyExpectationsKidProps {
  kidProfileId: string;
}

export function FamilyExpectationsKid({ kidProfileId }: FamilyExpectationsKidProps) {
  const [expectations, setExpectations] = useState<Expectation[]>([]);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [lastAcknowledgedAt, setLastAcknowledgedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchExpectations();
  }, [kidProfileId]);

  const fetchExpectations = async () => {
    setIsLoading(true);
    try {
      // Fetch expectations
      const { data: expectationsData, error: expError } = await supabase
        .from("family_expectations")
        .select("id, title, description, display_order")
        .eq("kid_profile_id", kidProfileId)
        .eq("is_active", true)
        .order("display_order");

      if (expError) throw expError;
      setExpectations(expectationsData || []);

      // Check for existing acknowledgment
      const { data: ackData } = await supabase
        .from("expectation_acknowledgments")
        .select("acknowledged_at")
        .eq("kid_profile_id", kidProfileId)
        .order("acknowledged_at", { ascending: false })
        .limit(1)
        .single();

      if (ackData) {
        setHasAcknowledged(true);
        setLastAcknowledgedAt(ackData.acknowledged_at);
      }
    } catch (error) {
      console.error("Error fetching expectations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      const { error } = await supabase.from("expectation_acknowledgments").insert({
        kid_profile_id: kidProfileId,
        expectations_version: expectations.length,
      });

      if (error) throw error;

      setHasAcknowledged(true);
      setLastAcknowledgedAt(new Date().toISOString());
      setShowSuccess(true);

      // Celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });

      toast.success("Great job! You've acknowledged your family expectations!");

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error acknowledging:", error);
      toast.error("Something went wrong. Try again!");
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-emerald-200/50 rounded w-1/2" />
            <div className="h-4 bg-emerald-200/50 rounded w-3/4" />
            <div className="h-4 bg-emerald-200/50 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expectations.length === 0) {
    return null; // Don't show anything if no expectations set
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
            <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200">
              My Family Expectations
            </CardTitle>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              What my family expects from me
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Expectations list */}
        <div className="space-y-2">
          {expectations.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-white/60 dark:bg-white/5 rounded-lg"
            >
              <div className="mt-0.5 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{exp.title}</p>
                {exp.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Acknowledgment section */}
        <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
          <AnimatePresence mode="wait">
            {hasAcknowledged ? (
              <motion.div
                key="acknowledged"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  I understand! 
                  {lastAcknowledgedAt && (
                    <span className="text-emerald-600/70 dark:text-emerald-400/70 font-normal ml-1">
                      (acknowledged {new Date(lastAcknowledgedAt).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="unacknowledged"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                  className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                >
                  {isAcknowledging ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="h-5 w-5" />
                      I've Read & Understand
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Tap to let your family know you understand these expectations
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
