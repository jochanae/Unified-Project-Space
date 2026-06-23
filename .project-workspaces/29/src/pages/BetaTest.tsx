import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, Send, Star, Loader2,
  ClipboardCheck, User, MessageSquare, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { betaTestSteps, betaTestCategories, type BetaTestStep } from '@/data/betaTestSteps';

interface StepResult {
  passed: boolean | null;
  comment: string;
}

type WizardPhase = 'info' | 'testing' | 'feedback' | 'submitted';

export default function BetaTest() {
  const [phase, setPhase] = useState<WizardPhase>('info');
  const [testerName, setTesterName] = useState('');
  const [testerEmail, setTesterEmail] = useState('');
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategory = betaTestCategories[activeCategoryIdx];
  const categorySteps = useMemo(
    () => betaTestSteps.filter(s => s.category === activeCategory),
    [activeCategory],
  );

  const totalSteps = betaTestSteps.length;
  const completedSteps = Object.values(results).filter(r => r.passed !== null).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const setStepResult = (globalIdx: number, passed: boolean) => {
    setResults(prev => ({
      ...prev,
      [globalIdx]: { passed, comment: prev[globalIdx]?.comment || '' },
    }));
  };

  const setStepComment = (globalIdx: number, comment: string) => {
    setResults(prev => ({
      ...prev,
      [globalIdx]: { passed: prev[globalIdx]?.passed ?? null, comment },
    }));
  };

  const canProceedFromInfo = testerName.trim().length > 0 && testerEmail.trim().length > 0 && testerEmail.includes('@');

  // Check if any failed step is missing a comment
  const hasIncompleteFails = Object.entries(results).some(
    ([, r]) => r.passed === false && r.comment.trim().length === 0,
  );

  const handleSubmit = async () => {
    if (hasIncompleteFails) {
      toast.error('Please add a comment for all failed steps');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get browser / device info
      const deviceInfo = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
      const browserInfo = navigator.userAgent;

      // Insert submission
      const { data: submission, error: subError } = await supabase
        .from('beta_test_submissions')
        .insert({
          tester_name: testerName.trim(),
          tester_email: testerEmail.trim(),
          device_info: deviceInfo,
          browser_info: browserInfo,
          overall_rating: overallRating || null,
          general_feedback: generalFeedback.trim() || null,
          suggestions: suggestions.trim() || null,
        })
        .select('id')
        .single();

      if (subError) throw subError;

      // Insert step results
      const stepRows = betaTestSteps.map((step, idx) => ({
        submission_id: submission.id,
        step_category: step.category,
        step_name: step.name,
        step_description: step.description,
        passed: results[idx]?.passed ?? true,
        comment: results[idx]?.comment || null,
        sort_order: idx,
      }));

      const { error: stepsError } = await supabase
        .from('beta_test_step_results')
        .insert(stepRows);

      if (stepsError) throw stepsError;

      // Send email notification (fire-and-forget)
      const passedCount = Object.values(results).filter(r => r.passed === true).length;
      const failedCount = Object.values(results).filter(r => r.passed === false).length;
      supabase.functions.invoke('notify-beta-submission', {
        body: {
          tester_name: testerName.trim(),
          tester_email: testerEmail.trim(),
          overall_rating: overallRating || null,
          device_info: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          general_feedback: generalFeedback.trim() || null,
          suggestions: suggestions.trim() || null,
          total_steps: totalSteps,
          passed_steps: passedCount,
          failed_steps: failedCount,
        },
      }).catch(err => console.error('Email notification failed:', err));

      setPhase('submitted');
      toast.success('Thank you! Your test results have been submitted.');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">IntoIQ Beta Test</h1>
              <p className="text-xs text-muted-foreground">Help us improve by testing features</p>
            </div>
          </div>
          {phase === 'testing' && (
            <Badge variant="secondary" className="text-xs">
              {completedSteps}/{totalSteps} tested
            </Badge>
          )}
        </div>
        {phase === 'testing' && (
          <Progress value={progressPercent} className="h-1 rounded-none" />
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── Phase 1: Tester Info ── */}
          {phase === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Welcome, Tester!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Thank you for helping us test IntoIQ! Please enter your information below, then
                    you'll walk through each feature step-by-step marking it as pass or fail.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Your Name *</label>
                      <Input
                        placeholder="Jane Doe"
                        value={testerName}
                        onChange={e => setTesterName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Your Email *</label>
                      <Input
                        type="email"
                        placeholder="jane@example.com"
                        value={testerEmail}
                        onChange={e => setTesterEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h4 className="font-medium text-sm mb-2">📋 Testing Instructions</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                      <li>Go through each feature listed in the checklist</li>
                      <li>Mark each step as <span className="text-gain font-medium">Pass ✓</span> or <span className="text-loss font-medium">Fail ✗</span></li>
                      <li>If a step fails, <strong>you must leave a comment</strong> explaining the issue</li>
                      <li>For Pro features, use the demo account credentials provided to you</li>
                      <li>After testing, leave your overall feedback and submit</li>
                    </ol>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canProceedFromInfo}
                    onClick={() => setPhase('testing')}
                  >
                    Start Testing
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Phase 2: Feature Testing ── */}
          {phase === 'testing' && (
            <motion.div key="testing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Category navigation */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
                {betaTestCategories.map((cat, idx) => {
                  const catSteps = betaTestSteps.filter(s => s.category === cat);
                  const catCompleted = catSteps.filter((_, i) => {
                    const globalIdx = betaTestSteps.indexOf(catSteps[i]);
                    return results[globalIdx]?.passed !== undefined && results[globalIdx]?.passed !== null;
                  }).length;
                  const allDone = catCompleted === catSteps.length;

                  return (
                    <Button
                      key={cat}
                      variant={idx === activeCategoryIdx ? 'default' : 'outline'}
                      size="sm"
                      className="shrink-0 rounded-full text-xs"
                      onClick={() => setActiveCategoryIdx(idx)}
                    >
                      {allDone && <CheckCircle2 className="h-3 w-3 mr-1 text-gain" />}
                      {cat}
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                        {catCompleted}/{catSteps.length}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {/* Steps for active category */}
              <div className="space-y-3">
                {categorySteps.map(step => {
                  const globalIdx = betaTestSteps.indexOf(step);
                  const result = results[globalIdx];
                  const isPassed = result?.passed;
                  const isFailed = result?.passed === false;

                  return (
                    <Card
                      key={globalIdx}
                      className={`transition-colors ${
                        isPassed ? 'border-gain/30 bg-gain/5' : isFailed ? 'border-loss/30 bg-loss/5' : ''
                      }`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{step.name}</span>
                              <Badge
                                variant={step.tier === 'pro' ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5"
                              >
                                {step.tier === 'pro' ? '⭐ Pro' : 'Free'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant={isPassed ? 'default' : 'outline'}
                              size="icon"
                              className={`h-8 w-8 ${isPassed ? 'bg-gain hover:bg-gain/90 text-white' : ''}`}
                              onClick={() => setStepResult(globalIdx, true)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={isFailed ? 'default' : 'outline'}
                              size="icon"
                              className={`h-8 w-8 ${isFailed ? 'bg-loss hover:bg-loss/90 text-white' : ''}`}
                              onClick={() => setStepResult(globalIdx, false)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Comment field — required on fail, optional on pass */}
                        {result?.passed !== null && result?.passed !== undefined && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-2"
                          >
                            <Textarea
                              placeholder={
                                isFailed
                                  ? 'Required: Describe what went wrong...'
                                  : 'Optional: Any notes about this step...'
                              }
                              value={result.comment}
                              onChange={e => setStepComment(globalIdx, e.target.value)}
                              className={`text-xs min-h-[60px] ${
                                isFailed && !result.comment.trim() ? 'border-loss' : ''
                              }`}
                            />
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  disabled={activeCategoryIdx === 0}
                  onClick={() => setActiveCategoryIdx(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {activeCategoryIdx < betaTestCategories.length - 1 ? (
                  <Button onClick={() => setActiveCategoryIdx(prev => prev + 1)}>
                    Next Category
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={() => setPhase('feedback')}>
                    Continue to Feedback
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Phase 3: Overall Feedback ── */}
          {phase === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Overall Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-2xl font-bold">{completedSteps}</div>
                      <div className="text-xs text-muted-foreground">Tested</div>
                    </div>
                    <div className="rounded-lg bg-gain/10 p-3">
                      <div className="text-2xl font-bold text-gain">
                        {Object.values(results).filter(r => r.passed === true).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                    <div className="rounded-lg bg-loss/10 p-3">
                      <div className="text-2xl font-bold text-loss">
                        {Object.values(results).filter(r => r.passed === false).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div>
                    <label className="text-sm font-medium">Overall Rating</label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setOverallRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= overallRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* General feedback */}
                  <div>
                    <label className="text-sm font-medium">General Feedback</label>
                    <Textarea
                      placeholder="How was your overall experience? Any bugs or issues not covered above?"
                      value={generalFeedback}
                      onChange={e => setGeneralFeedback(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  {/* Suggestions */}
                  <div>
                    <label className="text-sm font-medium">Suggestions for Improvement</label>
                    <Textarea
                      placeholder="Any features you'd like to see? UI improvements? Anything at all..."
                      value={suggestions}
                      onChange={e => setSuggestions(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  {hasIncompleteFails && (
                    <div className="rounded-lg border border-loss/30 bg-loss/5 p-3 text-sm text-loss">
                      ⚠️ Some failed steps are missing comments. Please go back and add details.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setPhase('testing')} className="flex-1">
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back to Testing
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || hasIncompleteFails}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Phase 4: Submitted ── */}
          {phase === 'submitted' && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="text-center py-12">
                <CardContent className="space-y-4">
                  <Sparkles className="h-16 w-16 text-primary mx-auto" />
                  <h2 className="text-2xl font-bold">Thank You! 🎉</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your test results have been submitted successfully. We truly appreciate you taking
                    the time to help us improve IntoIQ.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Return to IntoIQ
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
