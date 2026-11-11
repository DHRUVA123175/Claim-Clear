import { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { FollowUpQuestion } from '@/lib/supabase';

export function FollowUpQuestionsScreen() {
  const { currentCase, setCurrentCase, setScreen, setAgentStep } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [questionList, setQuestionList] = useState<FollowUpQuestion[]>(() => currentCase?.follow_up_questions ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = questionList;
  const totalQs = questions.length;
  const isLast = currentQ >= totalQs - 1;
  const question = questions[currentQ];

  useEffect(() => {
    setQuestionList(currentCase?.follow_up_questions ?? []);
    setCurrentQ(0);
    setAnswers({});
    setInput('');
  // Keep the original sequence for this case; the backend removes each answered question.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCase?.id]);

  useEffect(() => {
    if (totalQs === 0 && currentCase) {
      setAgentStep('letter_drafting');
      setScreen('preview');
    }
  }, [totalQs, currentCase, setAgentStep, setScreen]);

  if (!currentCase) return null;

  if (totalQs === 0) return null;

  const handleSubmitAnswer = async () => {
    if (!currentCase || !question || !input.trim() || submitting) return;

    const answerText = input.trim();
    if (question.field_key === 'denial_date' && !isValidISODate(answerText)) {
      setError('Enter the denial date in YYYY-MM-DD format.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { data: answerResult, error: functionError } = await supabase.functions.invoke('case-ops', {
        body: {
          action: 'answer',
          case_id: currentCase.id,
          field_key: question.field_key,
          answer: answerText,
        },
      });
      if (functionError || answerResult?.success !== true) throw new Error('Could not save your answer. Please try again.');

      const { data: updatedCase, error: refreshError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', currentCase.id)
        .single();

      const fallbackCase = {
        ...currentCase,
        user_answers: { ...(currentCase.user_answers ?? {}), [question.field_key]: answerText },
        follow_up_questions: (currentCase.follow_up_questions ?? []).filter((item) => item.field_key !== question.field_key),
        agent_step: answerResult.agent_step ?? currentCase.agent_step,
      };
      setCurrentCase(refreshError || !updatedCase ? fallbackCase : updatedCase);
      setAnswers((previous) => ({ ...previous, [question.field_key]: answerText }));

      setInput('');

      if (isLast) {
        setAgentStep('letter_drafting');
        setScreen('preview');
      } else {
        setCurrentQ(currentQ + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentQ + 1) / totalQs) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">A few questions about your case</h1>
        <p className="text-navy-500 text-body-lg">
          A few more details can help make the draft more complete.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-navy-500">
              Question {Math.min(currentQ + 1, totalQs)} of {totalQs}
          </span>
          <span className="text-sm text-navy-400">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-navy-100 overflow-hidden" role="progressbar" aria-label="Question progress" aria-valuemin={0} aria-valuemax={totalQs} aria-valuenow={currentQ + 1}>
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div key={currentQ} className="card p-6 sm:p-8 animate-slide-up">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-navy-800 leading-snug">
              {question?.question}
            </p>
            {question?.placeholder && (
              <p className="text-sm text-navy-400 mt-1">{question.placeholder}</p>
            )}
          </div>
        </div>

        <textarea
          id="follow-up-answer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Your answer"
          aria-describedby="answer-hint"
          placeholder="Type your answer here..."
          maxLength={4000}
          className="input-field min-h-[120px] resize-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmitAnswer();
            }
          }}
        />

        {error && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span id="answer-hint" className="text-xs text-navy-400">
            {isLast ? 'Last question — almost there!' : 'Press Cmd/Ctrl+Enter to submit'}
          </span>
          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={!input.trim() || submitting}
            className="btn-primary"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLast ? (
              <>
                <Check className="w-5 h-5" />
                Submit & draft letter
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {Object.keys({ ...(currentCase.user_answers ?? {}), ...answers }).length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-navy-400">Previous answers:</p>
          {Object.entries({ ...(currentCase.user_answers ?? {}), ...answers }).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2 text-sm text-navy-500">
              <Check className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
              <span><span className="font-medium">{key.replace(/_/g, ' ')}:</span> {val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
