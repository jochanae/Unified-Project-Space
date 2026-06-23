import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  ClipboardCheck,
  User,
  Smartphone,
  Calendar,
  Bug,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BetaSubmission {
  id: string;
  tester_name: string;
  device: string | null;
  browser: string | null;
  checklist_data: any;
  bugs_reported: string | null;
  suggestions: string | null;
  general_feedback: string | null;
  progress_percent: number;
  items_completed: number;
  total_items: number;
  created_at: string;
}

const AdminBetaResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<BetaSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAndFetch();
    }
  }, [user]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .single();

      if (roleData) {
        setIsAdmin(true);
        fetchSubmissions();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await (supabase
        .from("beta_test_submissions") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading results..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <ClipboardCheck className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const copyTestLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/beta-testing`);
    toast.success("Beta test link copied!");
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Helmet>
        <title>Beta Test Results | Admin | CoinsBloom</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-500 px-4 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute left-4 top-32 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-0 top-16 w-40 h-40 rounded-full bg-blue-400/30" />

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <ClipboardCheck className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">Beta Test Results</h1>
            <p className="text-white/80 text-sm">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyTestLink} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Copy Test Link
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSubmissions} 
            className="gap-2 bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 hover:text-emerald-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Submissions */}
        {submissions.length === 0 ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-white/40" />
              <p className="text-white/60">No submissions yet</p>
              <p className="text-sm text-white/40 mt-2">
                Share the test link with your testers to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {submissions.map((submission) => (
              <AccordionItem
                key={submission.id}
                value={submission.id}
                className="border-0"
              >
                <Card className="bg-white/10 border-white/20">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <User className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-white truncate max-w-[150px] sm:max-w-[200px]">{submission.tester_name}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs flex-shrink-0 ${
                              submission.progress_percent === 100 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {submission.progress_percent}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(submission.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                          {submission.device && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              {submission.device}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-white/70">
                          Completed {submission.items_completed} of {submission.total_items} items
                        </span>
                      </div>

                      {/* Bugs */}
                      {submission.bugs_reported && (
                        <div className="bg-red-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Bug className="h-4 w-4 text-red-400" />
                            <span className="font-medium text-red-400">Bugs Reported</span>
                          </div>
                          <p className="text-sm text-white/80">{submission.bugs_reported}</p>
                        </div>
                      )}

                      {/* Suggestions */}
                      {submission.suggestions && (
                        <div className="bg-yellow-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-yellow-400" />
                            <span className="font-medium text-yellow-400">Suggestions</span>
                          </div>
                          <p className="text-sm text-white/80">{submission.suggestions}</p>
                        </div>
                      )}

                      {/* General Feedback */}
                      {submission.general_feedback && (
                        <div className="bg-blue-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-blue-400" />
                            <span className="font-medium text-blue-400">General Feedback</span>
                          </div>
                          <p className="text-sm text-white/80">{submission.general_feedback}</p>
                        </div>
                      )}

                      {/* Device Info */}
                      <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                        Device: {submission.device || 'Not specified'} • Browser: {submission.browser || 'Not specified'}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default AdminBetaResults;
