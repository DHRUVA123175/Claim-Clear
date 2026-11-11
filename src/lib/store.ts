import { create } from 'zustand';
import type { Case, AgentStep } from '@/lib/supabase';

export type AppScreen =
  | 'landing'
  | 'auth'
  | 'upload'
  | 'review'
  | 'questions'
  | 'preview'
  | 'dashboard';

interface AppState {
  screen: AppScreen;
  currentCase: Case | null;
  agentStep: AgentStep;
  agentSteps: { step: AgentStep; label: string; status: 'pending' | 'active' | 'done' }[];
  setScreen: (screen: AppScreen) => void;
  setCurrentCase: (c: Case | null) => void;
  setAgentStep: (step: AgentStep) => void;
  updateCaseFromStep: (step: AgentStep) => void;
  reset: () => void;
}

const STEP_LABELS: { step: AgentStep; label: string }[] = [
  { step: 'intake_extracting', label: 'Extracting denial letter' },
  { step: 'intake_reviewing', label: 'Reviewing case details' },
  { step: 'letter_clarifying', label: 'Analyzing gaps' },
  { step: 'letter_drafting', label: 'Drafting appeal letter' },
  { step: 'done', label: 'Appeal letter ready' },
];

function buildSteps(activeStep: AgentStep) {
  const activeIdx = STEP_LABELS.findIndex((s) => s.step === activeStep);
  return STEP_LABELS.map((s, i) => ({
    step: s.step,
    label: s.label,
    status:
      activeStep === 'done' || i < activeIdx
        ? ('done' as const)
        : i === activeIdx
          ? ('active' as const)
          : ('pending' as const),
  }));
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'landing',
  currentCase: null,
  agentStep: 'idle',
  agentSteps: buildSteps('idle'),
  setScreen: (screen) => set({ screen }),
  setCurrentCase: (c) =>
    set({ currentCase: c, agentStep: c?.agent_step ?? 'idle', agentSteps: buildSteps(c?.agent_step ?? 'idle') }),
  setAgentStep: (step) => set({ agentStep: step, agentSteps: buildSteps(step) }),
  updateCaseFromStep: (step) =>
    set((state) => ({
      agentStep: step,
      agentSteps: buildSteps(step),
      currentCase: state.currentCase ? { ...state.currentCase, agent_step: step } : null,
    })),
  reset: () =>
    set({
      screen: 'landing',
      currentCase: null,
      agentStep: 'idle',
      agentSteps: buildSteps('idle'),
    }),
}));
