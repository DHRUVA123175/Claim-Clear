import { useEffect, useState } from 'react';
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Plus,
  Lock,
  FileSearch,
  MessageSquare,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Case } from '@/lib/supabase';

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-success-50 text-success-600' },
  drafting: { label: 'Drafting', icon: Loader2, className: 'bg-amber-50 text-amber-600' },
  clarifying: { label: 'In progress', icon: MessageSquare, className: 'bg-amber-50 text-amber-600' },
  reviewing: { label: 'Reviewing', icon: FileSearch, className: 'bg-navy-50 text-navy-600' },
  extracting: { label: 'Extracting', icon: Loader2, className: 'bg-navy-50 text-navy-600' },
  error: { label: 'Error', icon: AlertCircle, className: 'bg-error-50 text-error-600' },
  created: { label: 'Created', icon: Clock, className: 'bg-navy-50 text-navy-600' },
};

const PAYMENT_META: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-success-50 text-success-600' },
  pending: { label: 'Payment pending', className: 'bg-amber-50 text-amber-600' },
  unpaid: { label: 'Not paid', className: 'bg-navy-50 text-navy-500' },
};

export function DashboardScreen() {
  const { user } = useAuth();
  const { setScreen, setCurrentCase } = useAppStore();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) {
      setCases([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('cases')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        if (cancelled) return;
        if (queryError) {
          setError('Could not load your appeals. Please try again.');
          setCases([]);
        } else {
          setCases((data as Case[]) ?? []);
        }
      } catch {
        if (cancelled) return;
        setCases([]);
        setError('Could not load your appeals. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  const handleOpenCase = (c: Case) => {
    setCurrentCase(c);
    if (c.agent_step === 'done' || c.letter_draft) {
      setScreen('preview');
    } else if (c.agent_step === 'letter_drafting' || c.status === 'drafting') {
      setScreen('preview');
    } else if (c.follow_up_questions && c.follow_up_questions.length > 0) {
      setScreen('questions');
    } else if (c.extracted_fields && Object.keys(c.extracted_fields).length > 0) {
      setScreen('review');
    } else {
      setScreen('upload');
    }
  };

  const handleNewAppeal = () => {
    setCurrentCase(null);
    setScreen('upload');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex items-center justify-center" role="status" aria-label="Loading your appeals">
        <Loader2 className="w-7 h-7 animate-spin text-navy-400" aria-hidden="true" />
      </div>
    );
  }

  const completed = cases.filter((c) => c.status === 'completed' && c.letter_draft).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Your appeals</h1>
          <p className="text-navy-500">
            {cases.length === 0
              ? 'No appeals yet. Start your first one below.'
              : `${cases.length} appeal${cases.length > 1 ? 's' : ''} · ${completed} letter${completed !== 1 ? 's' : ''} ready`}
          </p>
        </div>
        <button onClick={handleNewAppeal} className="btn-primary self-start sm:self-auto">
          <Plus className="w-5 h-5" />
          New appeal
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {error ? null : cases.length === 0 ? (
        <EmptyState onStart={handleNewAppeal} />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <CaseRow key={c.id} caseData={c} onOpen={() => handleOpenCase(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseRow({ caseData, onOpen }: { caseData: Case; onOpen: () => void }) {
  const statusKey = caseData.status in STATUS_META ? caseData.status : 'created';
  const statusMeta = STATUS_META[statusKey];
  const StatusIcon = statusMeta.icon;
  const paymentKey = caseData.payment_status in PAYMENT_META ? caseData.payment_status : 'unpaid';
  const paymentMeta = PAYMENT_META[paymentKey];

  const insurer = caseData.insurer || caseData.extracted_fields?.insurer?.value || 'Unknown insurer';
  const denialCode = caseData.denial_code || caseData.extracted_fields?.denial_code?.value || '';
  const serviceDesc = caseData.extracted_fields?.service_description?.value || '';

  const updatedDate = new Date(caseData.updated_at);
  const updated = Number.isNaN(updatedDate.getTime()) ? 'Date unavailable' : updatedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <button
      onClick={onOpen}
      className="card w-full text-left p-5 flex items-center gap-4 hover:shadow-md hover:border-navy-200 transition-all duration-200 group"
    >
      <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-navy-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-navy-800 truncate">{insurer}</p>
          {denialCode && (
            <span className="text-xs font-mono text-navy-400 bg-navy-50 px-2 py-0.5 rounded">{denialCode}</span>
          )}
        </div>
        {serviceDesc && (
          <p className="text-sm text-navy-400 truncate">{serviceDesc}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusMeta.className}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${caseData.status === 'extracting' || caseData.status === 'drafting' ? 'animate-spin' : ''}`} />
            {statusMeta.label}
          </span>
          {caseData.letter_draft && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${paymentMeta.className}`}>
              {caseData.payment_status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {paymentMeta.label}
            </span>
          )}
          <span className="text-xs text-navy-400">{updated}</span>
        </div>
      </div>

      <ArrowRight className="w-5 h-5 text-navy-300 group-hover:text-navy-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="card p-10 sm:p-14 text-center animate-slide-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-50 mb-5">
        <FileSearch className="w-8 h-8 text-navy-400" />
      </div>
      <h2 className="text-xl font-bold text-navy-900 mb-2">No appeals yet</h2>
      <p className="text-navy-500 max-w-md mx-auto mb-6">
        Start with a denial letter. ClaimClear helps organize case details into a draft you can review.
      </p>
      <button onClick={onStart} className="btn-primary mx-auto">
        <Plus className="w-5 h-5" />
        Start your first appeal
      </button>
    </div>
  );
}
