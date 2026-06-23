import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, Send, User, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistSection {
  title: string;
  icon: string;
  items: ChecklistItem[];
}

const BetaTesting = () => {
  const navigate = useNavigate();
  const [testerName, setTesterName] = useState("");
  const [device, setDevice] = useState("");
  const [browser, setBrowser] = useState("");
  const [feedback, setFeedback] = useState("");
  const [bugs, setBugs] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [sections, setSections] = useState<ChecklistSection[]>([
    {
      title: "Account & Authentication",
      icon: "🔐",
      items: [
        { id: "auth-1", label: "Can you create a new account?", checked: false },
        { id: "auth-2", label: "Can you sign in with Google?", checked: false },
        { id: "auth-3", label: "Can you sign out and back in?", checked: false },
        { id: "auth-4", label: "Does 'Forgot Password' work?", checked: false },
      ],
    },
    {
      title: "Dashboard",
      icon: "📊",
      items: [
        { id: "dash-1", label: "Does the dashboard load correctly?", checked: false },
        { id: "dash-2", label: "Are charts/graphs displaying?", checked: false },
        { id: "dash-3", label: "Is the data accurate?", checked: false },
        { id: "dash-4", label: "Do navigation links work?", checked: false },
      ],
    },
    {
      title: "Transactions",
      icon: "💳",
      items: [
        { id: "trans-1", label: "Can you add a new transaction?", checked: false },
        { id: "trans-2", label: "Can you edit a transaction?", checked: false },
        { id: "trans-3", label: "Can you delete a transaction?", checked: false },
        { id: "trans-4", label: "Do filters and search work?", checked: false },
      ],
    },
    {
      title: "Goals & Savings",
      icon: "🎯",
      items: [
        { id: "goals-1", label: "Can you create a savings goal?", checked: false },
        { id: "goals-2", label: "Can you add money to a goal?", checked: false },
        { id: "goals-3", label: "Does progress display correctly?", checked: false },
        { id: "goals-4", label: "Can you edit or delete goals?", checked: false },
      ],
    },
    {
      title: "Bills & Budgets",
      icon: "📅",
      items: [
        { id: "bills-1", label: "Can you add a bill?", checked: false },
        { id: "bills-2", label: "Can you create a budget?", checked: false },
        { id: "bills-3", label: "Do reminders/notifications work?", checked: false },
        { id: "bills-4", label: "Is spending tracking accurate?", checked: false },
      ],
    },
    {
      title: "KidsBloom",
      icon: "👶",
      items: [
        { id: "kids-1", label: "Can you create a child profile?", checked: false },
        { id: "kids-2", label: "Can kids log in with their PIN?", checked: false },
        { id: "kids-3", label: "Do chores and rewards work?", checked: false },
        { id: "kids-4", label: "Is the kids interface kid-friendly?", checked: false },
      ],
    },
    {
      title: "Mobile Experience",
      icon: "📱",
      items: [
        { id: "mobile-1", label: "Does the app work well on your phone?", checked: false },
        { id: "mobile-2", label: "Are buttons easy to tap?", checked: false },
        { id: "mobile-3", label: "Does the PWA install work?", checked: false },
        { id: "mobile-4", label: "Does offline mode work?", checked: false },
      ],
    },
  ]);

  const handleCheckItem = (sectionIndex: number, itemId: string) => {
    setSections((prev) =>
      prev.map((section, idx) =>
        idx === sectionIndex
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : section
      )
    );
  };

  const totalItems = sections.reduce((acc, section) => acc + section.items.length, 0);
  const checkedItems = sections.reduce(
    (acc, section) => acc + section.items.filter((item) => item.checked).length,
    0
  );
  const progressPercent = Math.round((checkedItems / totalItems) * 100);

  const handleSubmit = async () => {
    if (!testerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsSubmitting(true);

    try {
      const insertData = {
        tester_name: testerName,
        device: device || null,
        browser: browser || null,
        checklist_data: JSON.parse(JSON.stringify(sections)),
        bugs_reported: bugs || null,
        suggestions: suggestions || null,
        general_feedback: feedback || null,
        progress_percent: progressPercent,
        items_completed: checkedItems,
        total_items: totalItems,
      };
      
      const { error } = await (supabase.from("beta_test_submissions") as any).insert(insertData);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Thank you for your feedback! Your test results have been saved.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Helmet>
        <title>Beta Testing Checklist | CoinsBloom</title>
        <meta name="description" content="Help us improve CoinsBloom by testing features and providing feedback." />
      </Helmet>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Beta Testing Checklist
            </h1>
            <p className="text-muted-foreground">Help us improve CoinsBloom with your feedback</p>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Testing Progress</span>
              <span className="text-sm text-muted-foreground">
                {checkedItems} of {totalItems} items ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tester Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tester Information
            </CardTitle>
            <CardDescription>Tell us about your testing environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="device">Device</Label>
                <Input
                  id="device"
                  placeholder="iPhone 14, Samsung S23, etc."
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="browser">Browser</Label>
                <Input
                  id="browser"
                  placeholder="Chrome, Safari, etc."
                  value={browser}
                  onChange={(e) => setBrowser(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Sections */}
        <div className="space-y-4 mb-6">
          {sections.map((section, sectionIndex) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {section.items.filter((i) => i.checked).length}/{section.items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={() => handleCheckItem(sectionIndex, item.id)}
                      />
                      <Label
                        htmlFor={item.id}
                        className={`cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feedback Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Additional Feedback
            </CardTitle>
            <CardDescription>Share any issues, bugs, or suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bugs">Bugs or Errors Found</Label>
              <Textarea
                id="bugs"
                placeholder="Describe any crashes, errors, or things that didn't work correctly..."
                value={bugs}
                onChange={(e) => setBugs(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="suggestions">Suggestions for Improvement</Label>
              <Textarea
                id="suggestions"
                placeholder="What features would you add? What would you change?"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="feedback">General Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Any other thoughts about your experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {!isSubmitted ? (
          <div className="flex justify-center">
            <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Test Results"}
            </Button>
          </div>
        ) : (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-700 dark:text-green-400">
                Your feedback has been submitted!
              </p>
              <p className="text-muted-foreground">Thank you for helping us improve CoinsBloom.</p>
            </CardContent>
          </Card>
        )}

        {/* Completion Message */}
        {progressPercent === 100 && !isSubmitted && (
          <Card className="mt-6 border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-700 dark:text-green-400">
                Amazing! You've completed all test items!
              </p>
              <p className="text-muted-foreground">Don't forget to submit your feedback above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BetaTesting;
