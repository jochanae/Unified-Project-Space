import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Star, ClipboardCheck, Trash2, Eye, ChevronDown, ChevronUp, Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  tester_name: string;
  tester_email: string;
  device_info: string | null;
  overall_rating: number | null;
  general_feedback: string | null;
  suggestions: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface StepResult {
  id: string;
  step_category: string;
  step_name: string;
  step_description: string | null;
  passed: boolean;
  comment: string | null;
  sort_order: number;
}

export function AdminBetaTests() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchSubmissions = async () => {
    setLoading(true);
    let query = supabase
      .from('beta_test_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load submissions');
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const openDetail = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setAdminNotes(sub.admin_notes || '');
    setStepsLoading(true);
    setExpandedCategories(new Set());

    const { data, error } = await supabase
      .from('beta_test_step_results')
      .select('*')
      .eq('submission_id', sub.id)
      .order('sort_order');

    if (!error) setStepResults(data || []);
    setStepsLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('beta_test_submissions')
      .update({ status, admin_notes: adminNotes.trim() || null })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(`Marked as ${status}`);
      fetchSubmissions();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(prev => prev ? { ...prev, status, admin_notes: adminNotes } : null);
      }
    }
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase.from('beta_test_submissions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Submission deleted');
      setSelectedSubmission(null);
      fetchSubmissions();
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Group steps by category
  const groupedSteps = stepResults.reduce<Record<string, StepResult[]>>((acc, step) => {
    (acc[step.step_category] ||= []).push(step);
    return acc;
  }, {});

  const totalPassed = submissions.reduce((sum, s) => sum, 0); // just count
  const failedStepsCount = (steps: StepResult[]) => steps.filter(s => !s.passed).length;

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <div className="text-2xl font-bold">{submissions.length}</div>
            <div className="text-xs text-muted-foreground">Total Submissions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <div className="text-2xl font-bold text-gain">
              {submissions.filter(s => s.status === 'reviewed').length}
            </div>
            <div className="text-xs text-muted-foreground">Reviewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <div className="text-2xl font-bold text-chart-3">
              {submissions.filter(s => s.status === 'submitted').length}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 text-center">
            <div className="text-2xl font-bold">
              {submissions.length > 0
                ? (submissions.reduce((s, sub) => s + (sub.overall_rating || 0), 0) / submissions.filter(s => s.overall_rating).length || 0).toFixed(1)
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No beta test submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map(sub => (
            <Card key={sub.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openDetail(sub)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{sub.tester_name}</span>
                      <span className="text-xs text-muted-foreground">{sub.tester_email}</span>
                      <Badge
                        variant={sub.status === 'reviewed' ? 'default' : sub.status === 'dismissed' ? 'outline' : 'secondary'}
                        className="text-[10px]"
                      >
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{sub.device_info}</span>
                      <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                      {sub.overall_rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {sub.overall_rating}/5
                        </span>
                      )}
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={open => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  {selectedSubmission.tester_name}'s Test Results
                </DialogTitle>
              </DialogHeader>

              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <a href={`mailto:${selectedSubmission.tester_email}`} className="text-primary hover:underline">
                    {selectedSubmission.tester_email}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground">Device:</span> {selectedSubmission.device_info}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  {new Date(selectedSubmission.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Rating:</span>{' '}
                  {selectedSubmission.overall_rating ? (
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= selectedSubmission.overall_rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`}
                        />
                      ))}
                    </span>
                  ) : '—'}
                </div>
              </div>

              {/* Feedback */}
              {selectedSubmission.general_feedback && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground mb-1">General Feedback</div>
                  {selectedSubmission.general_feedback}
                </div>
              )}
              {selectedSubmission.suggestions && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Suggestions</div>
                  {selectedSubmission.suggestions}
                </div>
              )}

              {/* Step Results */}
              {stepsLoading ? (
                <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Test Steps</h4>
                  {Object.entries(groupedSteps).map(([category, steps]) => {
                    const fails = failedStepsCount(steps);
                    const isExpanded = expandedCategories.has(category);
                    return (
                      <div key={category} className="rounded-lg border">
                        <button
                          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-accent/50 transition-colors"
                          onClick={() => toggleCategory(category)}
                        >
                          <span className="flex items-center gap-2">
                            {category}
                            {fails > 0 && (
                              <Badge variant="destructive" className="text-[10px]">{fails} failed</Badge>
                            )}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t px-3 pb-3 space-y-2">
                            {steps.map(step => (
                              <div key={step.id} className={`flex items-start gap-2 py-1.5 text-sm ${!step.passed ? 'text-loss' : ''}`}>
                                {step.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-loss shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{step.step_name}</span>
                                  {step.comment && (
                                    <p className="text-xs text-muted-foreground mt-0.5">"{step.comment}"</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Admin Actions */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this submission..."
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'reviewed')}
                    disabled={selectedSubmission.status === 'reviewed'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark Reviewed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'dismissed')}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSubmission(selectedSubmission.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
