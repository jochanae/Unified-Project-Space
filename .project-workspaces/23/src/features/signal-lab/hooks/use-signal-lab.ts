import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFunnelHub } from '@/features/projects';
import { toast } from 'sonner';
import { callQuinnStream, extractJSON } from '../components/SignalAIHelper';
import { useSharpenSignal, type SignalOutputs } from './use-sharpen-signal';

export type { SignalOutputs };

export interface SavedSignal {
  id: string;
  created_at: string;
  outputs: SignalOutputs;
}

export const QUESTIONS = [
  {
    key: 'who',
    label: 'Who are you helping?',
    ghosts: [
      'e.g., First-time founders who feel stuck turning their expertise into a business...',
      'e.g., Coaches who have a transformative method but struggle to explain it simply...',
      'e.g., Designers looking to pivot from freelance work into a high-ticket consultancy...',
    ],
  },
  {
    key: 'pain',
    label: 'What is their biggest pain?',
    ghosts: [
      "e.g., They know they have something valuable but can't articulate it in a way that attracts paying clients...",
      'e.g., They spend hours creating content but never convert followers into customers...',
      'e.g., They feel invisible in a crowded market despite being deeply skilled...',
    ],
  },
  {
    key: 'solution',
    label: 'How do you solve it uniquely?',
    ghosts: [
      'e.g., An AI-powered platform that distills their vision into a launch-ready funnel in under 30 minutes...',
      'e.g., A guided strategy session that turns scattered ideas into a clear, magnetic offer...',
      'e.g., A signal-first approach that finds the core message before building anything...',
    ],
  },
];

export const ANALYSIS_PHASES = [
  'Filtering the noise...',
  'Isolating the Signal...',
  'Drafting your Core Identity...',
  'Sharpening the message...',
  'Signal Found. Assembling your blueprint.',
];

const HANDOFF_PHASES = [
  'Signal Locked.',
  'Initializing Intelligence...',
  'Preparing your workspace.',
];

export type BarState = 'idle' | 'typing' | 'analyzing' | 'complete';

/** Rotates through ghost text variants for a question */
export function useRotatingGhost(ghosts: string[], intervalMs = 5000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const t = setInterval(() => setIndex(i => (i + 1) % ghosts.length), intervalMs);
    return () => clearInterval(t);
  }, [ghosts, intervalMs]);
  return ghosts[index];
}

/** Cycles through the analysis phase labels */
export function useAnalysisPhase(active: boolean) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t = setInterval(() => {
      setPhase(p => (p < ANALYSIS_PHASES.length - 1 ? p + 1 : p));
    }, 1800);
    return () => clearInterval(t);
  }, [active]);
  return ANALYSIS_PHASES[phase];
}

export function useSignalLab() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { projects, activeProjectId, addProject, setActiveProject } = useFunnelHub();
  const sharpenSignal = useSharpenSignal(activeProjectId);

  const [projectConfirmed, setProjectConfirmed] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<SignalOutputs | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [sharpening, setSharpening] = useState(false);
  const [isSharpened, setIsSharpened] = useState(false);
  const [barState, setBarState] = useState<BarState>('idle');
  const [handingOff, setHandingOff] = useState(false);
  const [handoffPhase, setHandoffPhase] = useState(0);
  const [signalHistory, setSignalHistory] = useState<SavedSignal[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'message' | 'style' | 'hooks' | 'persona' | 'export'>('message');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQ = QUESTIONS[step] || QUESTIONS[0];
  const currentAnswer = answers[currentQ?.key] || '';
  const isLastQuestion = step === QUESTIONS.length - 1;
  const showResults = step >= QUESTIONS.length && outputs;
  const activeProjectName = projects?.find(p => p.id === activeProjectId)?.name || null;

  // Load history
  useEffect(() => {
    if (!user?.orgId) return;
    const load = async () => {
      const { data } = await supabase
        .from('project_context')
        .select('id, directive, created_at')
        .eq('org_id', user.orgId)
        .eq('context_type', 'signal_lab')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!data?.length) return;
      const parsed: SavedSignal[] = [];
      for (const row of data) {
        try {
          const o = JSON.parse(row.directive as string) as SignalOutputs;
          if (o.oneLiner && o.elevatorPitch && o.socialBio) {
            parsed.push({ id: row.id, created_at: row.created_at, outputs: o });
          }
        } catch {}
      }
      setSignalHistory(parsed);
      if (parsed.length > 0 && !outputs) {
        setOutputs(parsed[0].outputs);
        setStep(QUESTIONS.length);
        setBarState('complete');
        setProjectConfirmed(true);
      }
    };
    load();
  }, [user?.orgId]);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Reset bar state on step change
  useEffect(() => {
    if (step < QUESTIONS.length) setBarState('idle');
  }, [step]);

  const handleInputChange = useCallback(
    (value: string) => {
      setAnswers(prev => ({ ...prev, [currentQ.key]: value }));
      setBarState('typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setBarState('idle'), 1500);
    },
    [currentQ.key],
  );

  const handleNext = useCallback(async () => {
    if (!currentAnswer.trim()) return;
    if (isLastQuestion) {
      setStep(QUESTIONS.length);
      setBarState('analyzing');
      setGenerating(true);
      try {
        const prompt = `You are MarQ, an elite brand strategist known for ruthless clarity. A founder answered three questions. Generate three pitch formats.

## Their Answers
**Who they help:** ${answers.who}
**Biggest pain they solve:** ${answers.pain}
**Their unique solution:** ${answers.solution}

## Voice Rules (MANDATORY)
- Write like a sharp human, not a marketing AI
- NEVER use: "leverage", "transform", "streamline", "innovative", "cutting-edge", "game-changing", "revolutionary", "strategic architecture", "empower", "elevate", "holistic", "synergy", "unlock", "harness"
- Replace abstract nouns with concrete verbs
- Every sentence must pass the "would a real person say this out loud?" test
- Prefer short, punchy words over long, impressive-sounding ones
- The one-liner must be under 12 words. Aim for 8-10.
- The elevator pitch should sound like a confident founder talking to a friend
- The social bio should feel like something you'd actually put on your profile

## Output
Return ONLY valid JSON (no markdown, no code fences):
{
  "oneLiner": "Under 12 words. Concrete. No buzzwords.",
  "elevatorPitch": "3-4 sentences. Conversational. Specific.",
  "socialBio": "2 lines. Punchy. Would actually work on Instagram/LinkedIn/X."
}`;

        const raw = await callQuinnStream(prompt, activeProjectId || 'signal-lab');
        const rawParsed = extractJSON<SignalOutputs>(raw);
        if (!rawParsed) throw new Error('Failed to parse Signal outputs');

        const parsed = await sharpenSignal(rawParsed);
        setOutputs(parsed);
        setIsSharpened(true);
        setBarState('complete');

        if (user?.orgId) {
          const projectId = activeProjectId || projects?.[0]?.id;
          if (projectId) {
            const { data: contextRows } = await supabase
              .from('project_context')
              .select('context_type, directive')
              .eq('project_id', projectId)
              .eq('org_id', user.orgId)
              .in('context_type', ['style_signal', 'signal_persona', 'signal_hooks']);

            let persona: any = {};
            let style: any = {};
            let hooks: any = {};

            for (const row of contextRows || []) {
              try {
                const parsedContext = JSON.parse((row.directive as string) || '{}');
                if (row.context_type === 'signal_persona') {
                  persona = parsedContext;
                }
                if (row.context_type === 'style_signal') {
                  style = parsedContext;
                }
                if (row.context_type === 'signal_hooks') {
                  hooks = parsedContext;
                }
              } catch {}
            }

            const hookList = Array.isArray(hooks.hooks) ? hooks.hooks : [];
            const instagramHooks = hooks.instagram ?? hookList.filter((h: any) => h?.platform === 'Instagram').map((h: any) => h.hook);
            const linkedinHooks = hooks.linkedin ?? hookList.filter((h: any) => h?.platform === 'LinkedIn').map((h: any) => h.hook);
            const language = persona.language ?? persona.languagePatterns;
            const direction = style.direction ?? style.visualDirection;
            const palette = Array.isArray(style.palette)
              ? style.palette.map((entry: any) => (entry && typeof entry === 'object' && 'hex' in entry ? entry.hex : entry))
              : style.palette;

            const signalBlueprint = {
              oneLiner: parsed.oneLiner,
              elevatorPitch: parsed.elevatorPitch,
              socialBio: parsed.socialBio,
              persona: {
                role: persona.role,
                frustrations: persona.frustrations,
                desires: persona.desires,
                language,
                objections: persona.objections
              },
              style: {
                mood: style.mood,
                direction,
                palette
              },
              hooks: {
                instagram: instagramHooks?.slice(0, 2),
                linkedin: linkedinHooks?.slice(0, 2),
                emailSubjects: hooks.emailSubjects?.slice(0, 2)
              }
            };

            const { data: inserted } = await supabase.from('project_context').insert({
              project_id: projectId,
              org_id: user.orgId,
              context_type: 'signal_lab',
              directive: JSON.stringify(signalBlueprint),
            }).select('id, created_at').single();
            if (inserted) {
              setSignalHistory(prev => [
                { id: inserted.id, created_at: inserted.created_at, outputs: parsed },
                ...prev,
              ]);
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to generate. Try again.');
        setStep(QUESTIONS.length - 1);
        setBarState('idle');
      } finally {
        setGenerating(false);
      }
    } else {
      setStep(s => s + 1);
    }
  }, [currentAnswer, isLastQuestion, answers, activeProjectId, user?.orgId, projects, sharpenSignal]);

  const handleCopy = useCallback((field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleBuildFunnel = useCallback(async () => {
    if (!outputs) return;
    const pitch = outputs.oneLiner;
    setHandingOff(true);
    setHandoffPhase(0);
    const phaseTimers = HANDOFF_PHASES.slice(1).map((_, i) =>
      setTimeout(() => setHandoffPhase(i + 1), (i + 1) * 1200)
    );
    setTimeout(async () => {
      if (activeProjectId) {
        if (user?.orgId) {
          await supabase.from('projects').update({ goal: pitch }).eq('id', activeProjectId);
        }
        navigate('/workspace', { state: { prompt: pitch } });
      } else {
        addProject('Signal Lab Project', pitch);
        setTimeout(() => navigate('/workspace', { state: { prompt: pitch } }), 300);
      }
    }, HANDOFF_PHASES.length * 1200);
    return () => phaseTimers.forEach(clearTimeout);
  }, [outputs, activeProjectId, user?.orgId, navigate, addProject]);

  const handleReset = useCallback(() => {
    setStep(0);
    setAnswers({});
    setOutputs(null);
    setGenerating(false);
    setBarState('idle');
    setIsSharpened(false);
    setProjectConfirmed(false);
    setActiveTab('message');
  }, []);

  const handleSharpen = useCallback(async () => {
    if (!outputs || sharpening) return;
    setSharpening(true);
    try {
      const refined = await sharpenSignal(outputs);
      setOutputs(refined);
      setIsSharpened(true);
      toast.success('Signal sharpened.');
    } catch {
      toast.error('Failed to sharpen. Try again.');
    } finally {
      setSharpening(false);
    }
  }, [outputs, sharpening, sharpenSignal]);

  const loadSignal = useCallback((signal: SavedSignal) => {
    setOutputs(signal.outputs);
    setStep(QUESTIONS.length);
    setBarState('complete');
    setProjectConfirmed(true);
  }, []);

  const selectProject = useCallback((projectId: string) => {
    setActiveProject(projectId);
    setProjectConfirmed(true);
  }, [setActiveProject]);

  const createAndSelectProject = useCallback((name: string) => {
    addProject(name, '');
    setProjectConfirmed(true);
  }, [addProject]);

  return {
    // State
    step, answers, generating, outputs, copiedField, entered, sharpening, isSharpened,
    barState, handingOff, handoffPhase, signalHistory, historyOpen, activeTab,
    currentQ, currentAnswer, isLastQuestion, showResults, activeProjectId,
    projectConfirmed, projects, activeProjectName,
    // Setters
    setStep, setHistoryOpen, setActiveTab,
    // Actions
    handleInputChange, handleNext, handleCopy, handleBuildFunnel, handleReset, handleSharpen, loadSignal,
    selectProject, createAndSelectProject,
    // Constants
    HANDOFF_PHASES,
  };
}
