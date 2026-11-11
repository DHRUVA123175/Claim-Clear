import { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check, Lock, FileText, Loader2, ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';

export function LetterPreviewScreen() {
  const { currentCase, setCurrentCase, setAgentStep, setScreen, reset } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const generatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentCase) return;
    if (currentCase.letter_draft) {
      setAgentStep('done');
      return;
    }
    if (currentCase.payment_status !== 'paid') return;
    if (generatedRef.current === currentCase.id) return;
    generatedRef.current = currentCase.id;
    generateLetter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCase?.id, currentCase?.payment_status, currentCase?.letter_draft]);

  if (!currentCase) return null;

  const generateLetter = async () => {
    setGenerating(true);
    setError(null);
    setAgentStep('letter_drafting');

    try {
      const { data: result, error: functionError } = await supabase.functions.invoke('case-ops', {
        body: {
          action: 'generate_letter',
          case_id: currentCase.id,
        },
      });
      if (functionError || typeof result?.letter !== 'string' || result.letter.trim().length < 40) {
        throw new Error('The draft could not be generated. Please try again.');
      }

      const { data: updatedCase } = await supabase
        .from('cases')
        .select('*')
        .eq('id', currentCase.id)
        .single();

      const caseWithLetter = updatedCase?.letter_draft
        ? updatedCase
        : {
            ...currentCase,
            letter_draft: result.letter,
            status: 'completed' as const,
            agent_step: 'done' as const,
          };
      setCurrentCase(caseWithLetter);
      setAgentStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!currentCase.letter_draft) return;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 72;
    const maxWidth = doc.internal.pageSize.width - margin * 2;
    const lineHeight = 16;
    let y = margin;

    const lines = currentCase.letter_draft.split('\n');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    for (const line of lines) {
      if (line.trim() === '') {
        y += lineHeight / 2;
        continue;
      }

      const wrapped = doc.splitTextToSize(line, maxWidth);
      for (const wLine of wrapped) {
        if (y > doc.internal.pageSize.height - margin) {
          doc.addPage();
          y = margin;
        }
        if (line.endsWith(':') && line.length < 60) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(wLine, margin, y);
        y += lineHeight;
      }
    }

    doc.save(`appeal-letter-${currentCase.id.slice(0, 8)}.pdf`);
  };

  const handleCopy = async () => {
    if (!currentCase.letter_draft) return;
    try {
      await navigator.clipboard.writeText(currentCase.letter_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard. Please select the text manually.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    setError(null);

    try {
      const { data: result, error: functionError } = await supabase.functions.invoke('paypal-capture', {
        body: { action: 'create_order', case_id: currentCase.id },
      });
      if (functionError) throw new Error('Sandbox checkout could not be started. Please try again later.');
      if (result?.alreadyPaid === true && result.status === 'COMPLETED') {
        const { data: updatedCase } = await supabase
          .from('cases')
          .select('*')
          .eq('id', currentCase.id)
          .single();
        const paidCase = updatedCase ?? { ...currentCase, payment_status: 'paid' as const };
        setCurrentCase(paidCase);
        setAgentStep(paidCase.agent_step || 'letter_drafting');
        return;
      }
      if (!result || typeof result.approvalUrl !== 'string') throw new Error('Sandbox checkout returned an invalid approval link.');

      const approvalUrl = new URL(result.approvalUrl);
      if (
        approvalUrl.protocol !== 'https:' ||
        !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(approvalUrl.hostname)
      ) {
        throw new Error('The sandbox returned an unexpected checkout address.');
      }

      window.localStorage.setItem('claimclear-paypal-case', currentCase.id);
      window.location.assign(approvalUrl.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sandbox checkout failed. Please try again.');
      setPaying(false);
    }
  };

  const handleNewAppeal = () => {
    reset();
    setScreen('upload');
  };

  // Payment gate
  if (currentCase.payment_status !== 'paid' && !currentCase.letter_draft) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 mb-4 shadow-lg shadow-amber-200">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-3">Your case is ready</h1>
          <p className="text-navy-500 text-body-lg">
            Your case details are ready for a draft. This demonstration uses PayPal sandbox checkout only; no real payment is processed. Do not enter real payment details.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-navy-400">Sandbox test amount</p>
              <p className="text-2xl font-bold text-navy-900">USD 19.00</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-navy-400">Test checkout</p>
              <p className="text-sm font-medium text-navy-600">Not a real charge</p>
            </div>
          </div>

          <div className="space-y-2 mb-6 pb-6 border-b border-navy-100">
            <Feature text="Draft based on the details in your case" />
            <Feature text="Download the draft as a PDF or copy its text" />
            <Feature text="Review and correct it before deciding whether to send" />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying}
            type="button"
            className="btn-accent w-full text-lg py-4"
          >
            {paying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Opening sandbox checkout...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Open PayPal sandbox checkout
              </>
            )}
          </button>

          <p className="text-center text-xs text-navy-400 mt-4">
            Test-only checkout. Do not use real payment details; draft generation may take a short time after the test flow.
          </p>
        </div>
      </div>
    );
  }

  // Generating state
  if (currentCase.payment_status === 'paid' && !currentCase.letter_draft && !error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center animate-fade-in" role="status" aria-live="polite" aria-busy={generating}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 mb-6">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-3">{generating ? 'Drafting your appeal letter...' : 'Preparing your draft...'}</h2>
        <p className="text-navy-500 text-body-lg">
          Your case details are being used to prepare a draft. Review all facts and references carefully before using it.
        </p>
      </div>
    );
  }

  // Error state
  if (error && !currentCase.letter_draft) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error-50 mb-4">
          <AlertCircle className="w-8 h-8 text-error-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-3">Something went wrong</h2>
        <p className="text-navy-500 mb-6">{error}</p>
        <button onClick={generateLetter} className="btn-primary">
          Try again
        </button>
      </div>
    );
  }

  // Letter ready
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-success-400 to-success-500 mb-4 shadow-lg shadow-success-200">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Your appeal letter is ready</h1>
        <p className="text-navy-500 text-body-lg">
          Review this draft carefully. Correct any inaccurate details before deciding whether to send it.
        </p>
      </div>

      <div role="note" className="mb-6 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm leading-relaxed text-warning-700">
        This AI-generated draft is for general information and is not legal advice. It does not guarantee coverage or appeal success. Verify all facts, deadlines, and policy references with your insurer or a qualified professional before submitting.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button type="button" onClick={handleDownloadPDF} className="btn-primary flex-1">
          <Download className="w-5 h-5" />
          Download PDF
        </button>
        <button type="button" onClick={handleCopy} className="btn-secondary flex-1">
          {copied ? (
            <>
              <Check className="w-5 h-5 text-success-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy to clipboard
            </>
          )}
        </button>
        <button type="button" onClick={handleNewAppeal} className="btn-ghost flex-1">
          <RotateCcw className="w-5 h-5" />
          Start a new appeal
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="bg-navy-50 px-5 py-3 border-b border-navy-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-navy-500" />
          <span className="text-sm font-medium text-navy-500">Appeal Letter</span>
        </div>
        <div className="p-6 sm:p-10 max-h-[600px] overflow-y-auto scrollbar-thin">
          <pre className="whitespace-pre-wrap font-serif text-base text-navy-800 leading-relaxed">
            {currentCase.letter_draft}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="w-4 h-4 text-success-500 flex-shrink-0" />
      <span className="text-sm text-navy-600">{text}</span>
    </div>
  );
}
