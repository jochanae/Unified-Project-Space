import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

export interface PracticeScenario {
  id: string;
  title: string;
  emoji: string;
  description: string;
  prompt: string; // The companion's opening line
  coachingFocus: string;
}

export const FOUNDATION_SCENARIOS: PracticeScenario[] = [
  {
    id: 'freeze',
    title: "When You Don't Know What to Say",
    emoji: '🔥',
    description: 'Practice responding under pressure without overthinking',
    prompt: "You're a little hard to read… I can't tell what you're thinking.",
    coachingFocus: "Don't over-explain. Stay calm and controlled.",
  },
  {
    id: 'playful',
    title: 'Playful Energy',
    emoji: '💬',
    description: 'Keep tension alive with playful, intriguing responses',
    prompt: "You seem like trouble.",
    coachingFocus: "Keep tension alive. Avoid killing the moment with logic.",
  },
  {
    id: 'emotional',
    title: 'Emotional Depth',
    emoji: '❤️',
    description: 'Express without overexposing — stay grounded',
    prompt: "I feel like you don't really let people in.",
    coachingFocus: "Express without overexposing. Stay grounded. No rambling.",
  },
  {
    id: 'boundaries',
    title: 'Boundaries',
    emoji: '🛑',
    description: 'Set clear boundaries without over-apologizing',
    prompt: "Why are you being so distant lately?",
    coachingFocus: "No over-apologizing. Clear ≠ harsh. Hold your position.",
  },
  {
    id: 'intrigue',
    title: 'First Impression',
    emoji: '🧠',
    description: "Let curiosity build — don't oversell yourself",
    prompt: "So what makes you different?",
    coachingFocus: "Don't oversell. Let curiosity build. Avoid resume answers.",
  },
];

export type PracticeTone = 'composed' | 'magnetic' | 'unfiltered';

export interface PracticeToneOption {
  id: PracticeTone;
  label: string;
  emoji: string;
  description: string;
}

export const PRACTICE_TONES: PracticeToneOption[] = [
  { id: 'composed', label: 'Composed', emoji: '🪨', description: 'Calm, controlled confidence' },
  { id: 'magnetic', label: 'Magnetic', emoji: '✨', description: 'Playful, intriguing' },
  { id: 'unfiltered', label: 'Unfiltered', emoji: '⚡', description: 'Direct, clean, unapologetic' },
];

interface PracticeModeState {
  active: boolean;
  scenario: PracticeScenario | null;
  waitingForResponse: boolean;
  showFreezeAssist: boolean;
  showScenarioPicker: boolean;
  showToneSelector: boolean;
  sessionCount: number; // number of exchanges in current session
  lastUserSendTime: number | null;
}

interface PracticeModeContextValue extends PracticeModeState {
  toggle: () => void;
  activate: (scenario?: PracticeScenario) => void;
  deactivate: () => void;
  selectScenario: (scenario: PracticeScenario) => void;
  setShowScenarioPicker: (v: boolean) => void;
  setShowFreezeAssist: (v: boolean) => void;
  setShowToneSelector: (v: boolean) => void;
  markUserSent: () => void;
  markResponseReceived: () => void;
  incrementSession: () => void;
  freezeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

const PracticeModeContext = createContext<PracticeModeContextValue | null>(null);

export function PracticeModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PracticeModeState>({
    active: false,
    scenario: null,
    waitingForResponse: false,
    showFreezeAssist: false,
    showScenarioPicker: false,
    showToneSelector: false,
    sessionCount: 0,
    lastUserSendTime: null,
  });

  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFreezeTimer = useCallback(() => {
    if (freezeTimerRef.current) {
      clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setState(prev => {
      if (prev.active) {
        clearFreezeTimer();
        return { ...prev, active: false, scenario: null, waitingForResponse: false, showFreezeAssist: false, showScenarioPicker: false, showToneSelector: false, sessionCount: 0 };
      }
      return { ...prev, active: true, showScenarioPicker: true };
    });
  }, [clearFreezeTimer]);

  const activate = useCallback((scenario?: PracticeScenario) => {
    setState(prev => ({
      ...prev,
      active: true,
      scenario: scenario || null,
      showScenarioPicker: !scenario,
      sessionCount: 0,
    }));
  }, []);

  const deactivate = useCallback(() => {
    clearFreezeTimer();
    setState(prev => ({
      ...prev,
      active: false,
      scenario: null,
      waitingForResponse: false,
      showFreezeAssist: false,
      showScenarioPicker: false,
      showToneSelector: false,
      sessionCount: 0,
    }));
  }, [clearFreezeTimer]);

  const selectScenario = useCallback((scenario: PracticeScenario) => {
    setState(prev => ({
      ...prev,
      scenario,
      showScenarioPicker: false,
      waitingForResponse: true,
    }));
  }, []);

  const markUserSent = useCallback(() => {
    clearFreezeTimer();
    setState(prev => ({ ...prev, waitingForResponse: false, showFreezeAssist: false, showToneSelector: false, lastUserSendTime: Date.now() }));
  }, [clearFreezeTimer]);

  const markResponseReceived = useCallback(() => {
    // Start freeze detection timer — after 7s of no user input, show assist
    clearFreezeTimer();
    freezeTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.active && !prev.showFreezeAssist) {
          return { ...prev, showFreezeAssist: true };
        }
        return prev;
      });
    }, 7000);
    setState(prev => ({ ...prev, waitingForResponse: true }));
  }, [clearFreezeTimer]);

  const incrementSession = useCallback(() => {
    setState(prev => ({ ...prev, sessionCount: prev.sessionCount + 1 }));
  }, []);

  const setShowScenarioPicker = useCallback((v: boolean) => {
    setState(prev => ({ ...prev, showScenarioPicker: v }));
  }, []);

  const setShowFreezeAssist = useCallback((v: boolean) => {
    setState(prev => ({ ...prev, showFreezeAssist: v }));
  }, []);

  const setShowToneSelector = useCallback((v: boolean) => {
    setState(prev => ({ ...prev, showToneSelector: v }));
  }, []);

  return (
    <PracticeModeContext.Provider value={{
      ...state,
      toggle,
      activate,
      deactivate,
      selectScenario,
      setShowScenarioPicker,
      setShowFreezeAssist,
      setShowToneSelector,
      markUserSent,
      markResponseReceived,
      incrementSession,
      freezeTimerRef,
    }}>
      {children}
    </PracticeModeContext.Provider>
  );
}

const NOOP = () => {};
const noopRef = { current: null };
const FALLBACK: PracticeModeContextValue = {
  active: false, scenario: null, waitingForResponse: false,
  showFreezeAssist: false, showScenarioPicker: false, showToneSelector: false,
  sessionCount: 0, lastUserSendTime: null,
  toggle: NOOP, activate: NOOP, deactivate: NOOP,
  selectScenario: NOOP, setShowScenarioPicker: NOOP,
  setShowFreezeAssist: NOOP, setShowToneSelector: NOOP,
  markUserSent: NOOP, markResponseReceived: NOOP, incrementSession: NOOP,
  freezeTimerRef: noopRef as React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
};

export function usePracticeMode() {
  const ctx = useContext(PracticeModeContext);
  return ctx ?? FALLBACK;
}
