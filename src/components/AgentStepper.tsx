import { Check, Loader2, FileSearch, MessageSquare, PenTool, CheckCircle2, Activity, Zap, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAgentEvents } from '@/lib/useAgentEvents';
import type { AgentStep, AgentEvent } from '@/lib/supabase';

const STEP_META: { step: AgentStep; label: string; sublabel: string; icon: typeof FileSearch }[] = [
  { step: 'intake_extracting', label: 'Intake Agent', sublabel: 'Extracting denial letter', icon: FileSearch },
  { step: 'intake_reviewing', label: 'Intake Agent', sublabel: 'Reviewing case details', icon: CheckCircle2 },
  { step: 'letter_clarifying', label: 'Letter Drafting Agent', sublabel: 'Analyzing gaps in your case', icon: MessageSquare },
  { step: 'letter_drafting', label: 'Letter Drafting Agent', sublabel: 'Drafting your appeal letter', icon: PenTool },
  { step: 'done', label: 'Complete', sublabel: 'Your appeal letter is ready', icon: Check },
];

const AGENT_COLORS: Record<string, string> = {
  intake_agent: 'text-teal-600 bg-teal-50',
  letter_drafting_agent: 'text-amber-600 bg-amber-50',
};

export function AgentStepper() {
  const { currentCase, agentSteps, agentStep } = useAppStore();
  const events = useAgentEvents(currentCase?.id ?? null);
  const activeIdx = STEP_META.findIndex((s) => s.step === agentStep);

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <section className="card p-5 sm:p-6" aria-labelledby="agent-activity-heading">
        <h3 id="agent-activity-heading" className="text-sm font-bold text-navy-700 uppercase tracking-wide mb-5">
          Agent Activity
        </h3>

        <div className="space-y-0" aria-live="polite" aria-relevant="text">
          {STEP_META.map((meta, idx) => {
            const stepState = agentSteps.find((s) => s.step === meta.step);
            const status = stepState?.status ?? 'pending';
            const isLast = idx === STEP_META.length - 1;
            const Icon = meta.icon;

            return (
              <div key={meta.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      status === 'done'
                        ? 'bg-success-500 text-white'
                        : status === 'active'
                          ? 'bg-navy-800 text-amber-400 ring-4 ring-navy-200 animate-pulse-soft'
                          : 'bg-navy-100 text-navy-300'
                    }`}
                  >
                    {status === 'active' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : status === 'done' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-[2.5rem] my-1 rounded-full transition-colors duration-500 ${
                        idx < activeIdx || agentStep === 'done' ? 'bg-success-500' : 'bg-navy-100'
                      }`}
                    />
                  )}
                </div>

                <div className={`flex-1 pb-5 ${isLast ? 'pb-0' : ''}`}>
                  <div className={`text-sm font-semibold transition-colors duration-300 ${status === 'pending' ? 'text-navy-300' : 'text-navy-800'}`}>
                    {meta.label}
                  </div>
                  <div className={`text-sm transition-colors duration-300 ${status === 'pending' ? 'text-navy-300' : 'text-navy-500'}`}>
                    {meta.sublabel}
                  </div>
                  {status === 'active' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-amber-600 font-medium">Working...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live case activity feed */}
      {events.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-navy-500" aria-hidden="true" />
            <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">
              Processing activity
            </h3>
            {events.some((e) => e.status === 'running') && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Zap className="w-3 h-3" />
                Live
              </span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-thin" aria-live="polite" aria-relevant="additions text">
            {events.map((event, idx) => (
              <EventRow key={event.id} event={event} isLast={idx === events.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, isLast }: { event: AgentEvent; isLast: boolean }) {
  const agentColor = AGENT_COLORS[event.agent_name] || 'text-navy-500 bg-navy-50';
  const agentLabel = event.agent_name === 'intake_agent'
    ? 'Intake'
    : event.agent_name === 'letter_drafting_agent'
      ? 'Drafting'
      : 'Case';
  const statusLabel = event.status === 'completed'
    ? 'Completed'
    : event.status === 'error'
      ? 'Needs attention'
      : 'In progress';
  const statusIcon = event.status === 'completed' ? (
    <Check className="w-3.5 h-3.5 text-success-500" />
  ) : event.status === 'error' ? (
    <span className="w-3.5 h-3.5 rounded-full bg-error-500" />
  ) : (
    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
  );

  return (
    <div
      className={`flex items-start gap-2.5 animate-slide-in ${isLast ? '' : 'pb-2.5 border-b border-navy-50'}`}
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${agentColor}`}>
            {agentLabel}
          </span>
          <span className="text-sm font-semibold text-navy-700 truncate">{event.step_label}</span>
        </div>
        <p className={`text-xs mt-0.5 leading-relaxed ${event.status === 'error' ? 'text-error-600' : 'text-navy-400'}`} role="status">
          {statusLabel}
        </p>
        {event.status === 'running' && (
          <div className="mt-1 flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-amber-500 animate-pulse" />
            <span className="text-xs text-amber-600">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
