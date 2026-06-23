import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBloomCoachProfile, type BloomCoachProfile } from "@/hooks/useBloomCoachProfile";

interface BloomCoachProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { key: "life", title: "About You", emoji: "👋" },
  { key: "finances", title: "Financial Basics", emoji: "💰" },
  { key: "goals", title: "Goals & Style", emoji: "🎯" },
];

const AGE_OPTIONS = [
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65+", label: "65+" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "freelance", label: "Freelance / Gig" },
  { value: "self-employed", label: "Self-employed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "not-working", label: "Not currently working" },
];

const FAMILY_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "partnered", label: "In a partnership" },
  { value: "single-parent", label: "Single parent" },
  { value: "family", label: "Family with kids" },
];

const INCOME_OPTIONS = [
  { value: "under-25k", label: "Under $25k" },
  { value: "25k-50k", label: "$25k – $50k" },
  { value: "50k-75k", label: "$50k – $75k" },
  { value: "75k-100k", label: "$75k – $100k" },
  { value: "100k-150k", label: "$100k – $150k" },
  { value: "150k+", label: "$150k+" },
  { value: "prefer-not", label: "Prefer not to say" },
];

const LITERACY_OPTIONS = [
  { value: "beginner", label: "Beginner", desc: "Learning the basics" },
  { value: "intermediate", label: "Intermediate", desc: "Know the fundamentals" },
  { value: "advanced", label: "Advanced", desc: "Comfortable with complex topics" },
];

const GOAL_OPTIONS = [
  { value: "emergency-fund", label: "Build emergency fund" },
  { value: "debt-payoff", label: "Pay off debt" },
  { value: "save-for-home", label: "Save for a home" },
  { value: "retirement", label: "Retirement planning" },
  { value: "investing", label: "Start investing" },
  { value: "budgeting", label: "Better budgeting" },
  { value: "credit-score", label: "Improve credit score" },
  { value: "save-for-kids", label: "Save for kids" },
];

const CHALLENGE_OPTIONS = [
  { value: "overspending", label: "Overspending" },
  { value: "debt", label: "Too much debt" },
  { value: "saving", label: "Trouble saving" },
  { value: "budgeting", label: "Sticking to a budget" },
  { value: "investing", label: "Not sure how to invest" },
  { value: "income", label: "Not enough income" },
];

const STYLE_OPTIONS = [
  { value: "motivational", label: "Motivational", desc: "Keep me pumped up! 🔥" },
  { value: "direct", label: "Direct", desc: "Give it to me straight 💪" },
  { value: "balanced", label: "Balanced", desc: "Mix of encouragement & honesty" },
  { value: "detailed", label: "Detailed", desc: "I want deep explanations 📊" },
];

export function BloomCoachProfileSheet({ open, onOpenChange }: BloomCoachProfileSheetProps) {
  const { profile, saveProfile } = useBloomCoachProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BloomCoachProfile>({
    age_range: null,
    employment_type: null,
    family_status: null,
    has_dependents: false,
    income_range: null,
    financial_literacy: "beginner",
    top_financial_goals: [],
    biggest_challenges: [],
    coaching_style: "balanced",
  });

  // Load existing profile data when opened
  useEffect(() => {
    if (profile && open) {
      setForm({
        age_range: profile.age_range || null,
        employment_type: profile.employment_type || null,
        family_status: profile.family_status || null,
        has_dependents: profile.has_dependents || false,
        income_range: profile.income_range || null,
        financial_literacy: profile.financial_literacy || "beginner",
        top_financial_goals: profile.top_financial_goals || [],
        biggest_challenges: profile.biggest_challenges || [],
        coaching_style: profile.coaching_style || "balanced",
      });
    }
  }, [profile, open]);

  const toggleGoal = (goal: string) => {
    setForm((prev) => {
      const goals = prev.top_financial_goals || [];
      return {
        ...prev,
        top_financial_goals: goals.includes(goal)
          ? goals.filter((g) => g !== goal)
          : [...goals, goal],
      };
    });
  };

  const toggleChallenge = (challenge: string) => {
    setForm((prev) => {
      const challenges = prev.biggest_challenges || [];
      return {
        ...prev,
        biggest_challenges: challenges.includes(challenge)
          ? challenges.filter((c) => c !== challenge)
          : [...challenges, challenge],
      };
    });
  };

  const handleSave = async () => {
    await saveProfile({ ...form, is_complete: true });
    onOpenChange(false);
    setStep(0);
  };

  const canProceed = () => {
    if (step === 0) return true; // All optional
    if (step === 1) return true;
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">
                {STEPS[step].emoji} {STEPS[step].title}
              </SheetTitle>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      i <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Everything is optional — share what you're comfortable with.
            </p>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {step === 0 && (
                  <>
                    {/* Age */}
                    <FieldGroup label="Age range">
                      <RadioGroup
                        value={form.age_range || ""}
                        onValueChange={(v) => setForm({ ...form, age_range: v })}
                        className="grid grid-cols-3 gap-2"
                      >
                        {AGE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              form.age_range === opt.value
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} className="sr-only" />
                            {opt.label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>

                    {/* Employment */}
                    <FieldGroup label="Employment">
                      <RadioGroup
                        value={form.employment_type || ""}
                        onValueChange={(v) => setForm({ ...form, employment_type: v })}
                        className="grid grid-cols-2 gap-2"
                      >
                        {EMPLOYMENT_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              form.employment_type === opt.value
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} className="sr-only" />
                            {opt.label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>

                    {/* Family */}
                    <FieldGroup label="Family status">
                      <RadioGroup
                        value={form.family_status || ""}
                        onValueChange={(v) => setForm({ ...form, family_status: v })}
                        className="grid grid-cols-2 gap-2"
                      >
                        {FAMILY_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              form.family_status === opt.value
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} className="sr-only" />
                            {opt.label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>
                  </>
                )}

                {step === 1 && (
                  <>
                    {/* Income */}
                    <FieldGroup label="Household income">
                      <RadioGroup
                        value={form.income_range || ""}
                        onValueChange={(v) => setForm({ ...form, income_range: v })}
                        className="grid grid-cols-2 gap-2"
                      >
                        {INCOME_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              form.income_range === opt.value
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} className="sr-only" />
                            {opt.label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>

                    {/* Financial literacy */}
                    <FieldGroup label="Financial knowledge">
                      <RadioGroup
                        value={form.financial_literacy || "beginner"}
                        onValueChange={(v) => setForm({ ...form, financial_literacy: v })}
                        className="space-y-2"
                      >
                        {LITERACY_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                              form.financial_literacy === opt.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <div>
                              <div className="text-sm font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.desc}</div>
                            </div>
                            <RadioGroupItem value={opt.value} />
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>

                    {/* Biggest challenge */}
                    <FieldGroup label="Biggest financial challenges (pick all that apply)">
                      <div className="grid grid-cols-2 gap-2">
                        {CHALLENGE_OPTIONS.map((opt) => {
                          const selected = form.biggest_challenges?.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => toggleChallenge(opt.value)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                                selected
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              <Checkbox checked={selected} className="pointer-events-none" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </FieldGroup>
                  </>
                )}

                {step === 2 && (
                  <>
                    {/* Goals (multi-select) */}
                    <FieldGroup label="Top financial goals (pick all that apply)">
                      <div className="grid grid-cols-2 gap-2">
                        {GOAL_OPTIONS.map((opt) => {
                          const selected = form.top_financial_goals?.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => toggleGoal(opt.value)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                                selected
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              <Checkbox checked={selected} className="pointer-events-none" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </FieldGroup>

                    {/* Coaching style */}
                    <FieldGroup label="How should Bloom talk to you?">
                      <RadioGroup
                        value={form.coaching_style || "balanced"}
                        onValueChange={(v) => setForm({ ...form, coaching_style: v })}
                        className="space-y-2"
                      >
                        {STYLE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                              form.coaching_style === opt.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <div>
                              <div className="text-sm font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.desc}</div>
                            </div>
                            <RadioGroupItem value={opt.value} />
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldGroup>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-4 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Skip for now
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Check className="h-4 w-4" />
                Save & Finish
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
