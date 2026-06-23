import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Check, Clock } from "lucide-react";
import { toast } from "sonner";

interface Expectation {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  updated_at: string;
}

interface Acknowledgment {
  acknowledged_at: string;
  expectations_version: number;
}

interface FamilyExpectationsParentProps {
  kidProfileId: string;
  kidName: string;
}

export function FamilyExpectationsParent({ kidProfileId, kidName }: FamilyExpectationsParentProps) {
  const [expectations, setExpectations] = useState<Expectation[]>([]);
  const [acknowledgment, setAcknowledgment] = useState<Acknowledgment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    fetchExpectations();
  }, [kidProfileId]);

  const fetchExpectations = async () => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch expectations
      const { data: expectationsData, error: expError } = await supabase
        .from("family_expectations")
        .select("*")
        .eq("kid_profile_id", kidProfileId)
        .eq("is_active", true)
        .order("display_order");

      if (expError) throw expError;
      setExpectations(expectationsData || []);

      // Fetch latest acknowledgment
      const { data: ackData } = await supabase
        .from("expectation_acknowledgments")
        .select("*")
        .eq("kid_profile_id", kidProfileId)
        .order("acknowledged_at", { ascending: false })
        .limit(1)
        .single();

      setAcknowledgment(ackData);
    } catch (error) {
      console.error("Error fetching expectations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addExpectation = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter an expectation");
      return;
    }

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from("family_expectations").insert({
        parent_user_id: user.user.id,
        kid_profile_id: kidProfileId,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        display_order: expectations.length,
      });

      if (error) throw error;

      toast.success("Expectation added");
      setNewTitle("");
      setNewDescription("");
      fetchExpectations();
    } catch (error) {
      console.error("Error adding expectation:", error);
      toast.error("Failed to add expectation");
    } finally {
      setIsSaving(false);
    }
  };

  const removeExpectation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("family_expectations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Expectation removed");
      fetchExpectations();
    } catch (error) {
      console.error("Error removing expectation:", error);
      toast.error("Failed to remove expectation");
    }
  };

  const hasUnacknowledgedChanges = acknowledgment 
    ? new Date(acknowledgment.acknowledged_at) < new Date(expectations[0]?.updated_at || 0)
    : expectations.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Family Expectations for {kidName}</CardTitle>
          {acknowledgment ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              <span>Acknowledged {new Date(acknowledgment.acknowledged_at).toLocaleDateString()}</span>
            </div>
          ) : expectations.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Clock className="h-3.5 w-3.5" />
              <span>Pending acknowledgment</span>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Set clear expectations for {kidName}. They'll see this list and acknowledge they understand.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing expectations */}
        {expectations.length > 0 && (
          <div className="space-y-2">
            {expectations.map((exp, index) => (
              <div
                key={exp.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group"
              >
                <div className="text-muted-foreground mt-0.5">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exp.title}</p>
                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{exp.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => removeExpectation(exp.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new expectation */}
        <div className="space-y-3 pt-2 border-t">
          <Input
            placeholder="Add an expectation (e.g., 'Keep your room clean')"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addExpectation()}
          />
          <Textarea
            placeholder="Optional details..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <Button
            onClick={addExpectation}
            disabled={isSaving || !newTitle.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expectation
          </Button>
        </div>

        {expectations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No expectations set yet. Add some above to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
