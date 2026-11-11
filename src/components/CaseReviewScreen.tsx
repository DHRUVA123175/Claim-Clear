import { useState } from 'react';
import { ArrowRight, AlertTriangle, Check, Edit3, Save, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { ExtractedFields, ExtractedField } from '@/lib/supabase';

const FIELD_LABELS: Record<string, string> = {
  insurer: 'Insurance Company',
  denial_code: 'Denial Code',
  denial_reason: 'Denial Reason',
  policy_type: 'Policy Type',
  denial_date: 'Date of Denial',
  claim_number: 'Claim Number',
  patient_name: 'Patient Name',
  service_description: 'Service / Treatment',
};

const FIELD_ORDER = [
  'insurer',
  'denial_code',
  'denial_reason',
  'policy_type',
  'denial_date',
  'claim_number',
  'patient_name',
  'service_description',
];

const CASE_COLUMN_FIELDS = new Set([
  'insurer',
  'denial_code',
  'policy_type',
  'denial_date',
  'claim_number',
  'patient_name',
]);

export function CaseReviewScreen() {
  const { currentCase, setCurrentCase, setScreen, setAgentStep } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentCase) return null;

  const extracted = currentCase.extracted_fields || {};

  const handleEdit = (key: string, currentVal: string) => {
    setEditing(key);
    setEditValue(currentVal);
  };

  const handleSave = async (key: string) => {
    if (!currentCase || saving) return;
    const updatedFields: ExtractedFields = {
      ...extracted,
      [key]: { ...(extracted[key] as ExtractedField | undefined), value: editValue.trim(), confidence: 'high' },
    };

    setSaving(true);
    setError(null);
    try {
      const updatePayload: Record<string, unknown> = {
        extracted_fields: updatedFields,
      };
      if (CASE_COLUMN_FIELDS.has(key)) updatePayload[key] = editValue.trim();

      const { data, error: updateError } = await supabase
        .from('cases')
        .update(updatePayload)
        .eq('id', currentCase.id)
        .select()
        .single();

      if (updateError || !data) throw new Error('Could not save this correction. Please try again.');
      setCurrentCase(data);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this correction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!currentCase || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data: questionsResult, error: functionError } = await supabase.functions.invoke('case-ops', {
        body: { action: 'generate_questions', case_id: currentCase.id },
      });
      if (functionError || !Array.isArray(questionsResult?.questions)) {
        throw new Error('Could not prepare follow-up questions. Please try again.');
      }

      const { data: updatedCase } = await supabase
        .from('cases')
        .select('*')
        .eq('id', currentCase.id)
        .single();

      const questions = questionsResult.questions;
      const nextStep = questionsResult.agent_step || (questions.length ? 'letter_clarifying' : 'letter_drafting');
      const caseToContinue = updatedCase ?? {
        ...currentCase,
        follow_up_questions: questions,
        agent_step: nextStep,
        status: questions.length ? 'clarifying' as const : 'drafting' as const,
      };
      setCurrentCase(caseToContinue);
      if (caseToContinue.follow_up_questions?.length) {
        setAgentStep(caseToContinue.agent_step || 'letter_clarifying');
        setScreen('questions');
      } else {
        setAgentStep(caseToContinue.agent_step || 'letter_drafting');
        setScreen('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Review your case details</h1>
        <p className="text-navy-500 text-body-lg">
          We've extracted information from your denial letter. Please review and correct
          anything that looks wrong — this is your case, and accuracy matters.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FIELD_ORDER.map((key) => {
          const field = extracted[key] as ExtractedField | undefined;
          if (!field) return null;

          const isEditing = editing === key;
          const confidenceColor =
            field.confidence === 'high'
              ? 'text-success-600 bg-success-50'
              : field.confidence === 'medium'
                ? 'text-warning-600 bg-warning-50'
                : 'text-error-600 bg-error-50';

          return (
            <div key={key} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <span className="label-text mb-0">{FIELD_LABELS[key] || key}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColor}`}
                  >
                    {field.confidence} confidence
                  </span>
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    id={`edit-${key}`}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    aria-label={`Edit ${FIELD_LABELS[key] || key}`}
                    className="input-field text-base"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(key)}
                    disabled={saving}
                    aria-label={`Save ${FIELD_LABELS[key] || key}`}
                    className="p-2.5 rounded-xl bg-success-500 text-white hover:bg-success-600 transition-colors flex-shrink-0"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    aria-label={`Cancel editing ${FIELD_LABELS[key] || key}`}
                    className="p-2.5 rounded-xl bg-navy-100 text-navy-500 hover:bg-navy-200 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-navy-800 font-medium text-base">{field.value || 'Not found'}</p>
                  <button
                    type="button"
                    onClick={() => handleEdit(key, field.value)}
                    aria-label={`Edit ${FIELD_LABELS[key] || key}`}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors flex-shrink-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.values(extracted).some(
        (f) => (f as ExtractedField)?.confidence === 'low'
      ) && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-warning-50 border border-warning-100 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning-700">Some fields need your attention</p>
            <p className="text-sm text-warning-600 mt-1">
              Fields marked "low confidence" may have been misread. Please review and correct them
              before continuing.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-navy-500">
          <Check className="w-4 h-4 text-success-500" />
          {editing ? 'Save or cancel your correction to continue.' : 'Everything looks correct?'}
        </div>
        <button type="button" onClick={handleContinue} disabled={saving || editing !== null} className="btn-primary">
          {saving ? (
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Continue to questions
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
