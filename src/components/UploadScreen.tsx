import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, Loader2, AlertCircle, Scan } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Case } from '@/lib/supabase';

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function isRetryableCase(caseData: Case | null): caseData is Case {
  return Boolean(
    caseData?.file_path &&
    ['created', 'error'].includes(caseData.status) &&
    Object.keys(caseData.extracted_fields ?? {}).length === 0
  );
}

function mimeTypeFromPath(filePath: string): string | null {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return null;
}

export function UploadScreen() {
  const { currentCase, setScreen, setCurrentCase, setAgentStep } = useAppStore();
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canRetry = isRetryableCase(currentCase);

  const handleFile = useCallback((selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setFile(null);
      setError('Please upload a PDF or image file (PNG, JPG, or WebP).');
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError('This file is empty. Please choose a PDF or image that contains your denial letter.');
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    if (isRetryableCase(currentCase)) setCurrentCase(null);
    setFile(selectedFile);
  }, [currentCase, setCurrentCase]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleProcess = async () => {
    const retrying = !file && isRetryableCase(currentCase);
    if (!file && !retrying) return;
    if (!user) {
      setError('Please sign in again before uploading your letter.');
      return;
    }

    setUploading(true);
    setError(null);
    setAgentStep('intake_extracting');

    let activeCase: Case | null = retrying ? currentCase : null;
    let unreferencedUploadPath: string | null = null;

    try {
      let mimeType: string;
      let fileName: string;

      if (retrying && activeCase?.file_path) {
        mimeType = mimeTypeFromPath(activeCase.file_path) ?? '';
        if (!mimeType) throw new Error('The saved document type could not be recognized. Upload a sample PDF or image again.');
        fileName = activeCase.file_path.split('/').pop() ?? 'your sample document';
      } else if (file) {
        const fileExt = file.type === 'application/pdf'
          ? 'pdf'
          : file.type === 'image/png'
            ? 'png'
            : file.type === 'image/webp'
              ? 'webp'
              : 'jpg';
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('denial-letters')
          .upload(filePath, file);
        if (uploadError) throw new Error('Could not upload this file. Please try again with a sample PDF or image.');
        unreferencedUploadPath = filePath;

        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .insert({ file_path: filePath })
          .select()
          .single();
        if (caseError) throw new Error('Could not create your case. Please try again.');

        activeCase = caseData as Case;
        unreferencedUploadPath = null;
        fileName = file.name;
        mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
        setCurrentCase(activeCase);
      } else {
        return;
      }

      if (!activeCase) throw new Error('Could not load your case. Please try again.');
      setCurrentCase(activeCase);

      // Call the upload-denial edge function through the authenticated Supabase client
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const { data: result, error: functionError } = await supabase.functions.invoke('upload-denial', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          case_id: activeCase.id,
          file_name: fileName,
          mime_type: mimeType,
        },
      });

      if (functionError) {
        throw new Error('Document processing did not complete. Please try again with a fictional or sample document.');
      }

      if (!result || typeof result !== 'object') {
        throw new Error('Extraction returned an invalid response. Please try again.');
      }

      // Update local state with the extracted case
      const { data: updatedCase } = await supabase
        .from('cases')
        .select('*')
        .eq('id', activeCase.id)
        .single();

      if (updatedCase) {
        setCurrentCase(updatedCase);
        setAgentStep(updatedCase.agent_step || 'intake_reviewing');
        setScreen('review');
      } else if (result.case && typeof result.case === 'object') {
        const responseCase = result.case as Record<string, unknown>;
        const fallbackCase = { ...activeCase, ...responseCase, id: activeCase.id, user_id: user.id };
        setCurrentCase(fallbackCase);
        setAgentStep((fallbackCase.agent_step as Case['agent_step']) || 'intake_reviewing');
        setScreen('review');
      } else {
        throw new Error('Extraction finished, but the case details could not be loaded. Please try again.');
      }
    } catch (err) {
      if (unreferencedUploadPath) {
        await supabase.storage.from('denial-letters').remove([unreferencedUploadPath]).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : 'Something went wrong during extraction.');
      if (activeCase) {
        setCurrentCase(activeCase);
        setFile(null);
      }
      setAgentStep('idle');
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return <ExtractingAnimation fileName={file?.name ?? 'your letter'} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-navy-900 mb-3">Upload your denial letter</h1>
        <p className="text-navy-500 text-body-lg">
          Drag and drop your insurance denial letter below. We support PDF and image files.
        </p>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning-100 bg-warning-50 px-4 py-4 text-warning-700" role="note" aria-labelledby="demo-upload-warning">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-600" aria-hidden="true" />
        <p id="demo-upload-warning" className="text-sm leading-relaxed">
          <strong>Demonstration build:</strong> document processing is still being refined. Use fictional or sample documents only. <strong>Do not upload real health, insurance, or other personal information.</strong>
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={(e) => {
          if (e.target !== inputRef.current) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Choose a PDF or image of your denial letter"
        aria-describedby="upload-file-guidance"
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? 'border-navy-500 bg-navy-50 scale-[1.01]'
            : 'border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.currentTarget.value = '';
          }}
          className="hidden"
        />

        <div className="px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-100 mb-4">
            <UploadCloud className="w-8 h-8 text-navy-500" />
          </div>
          <p className="text-lg font-semibold text-navy-700">
            {dragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
          </p>
          <p id="upload-file-guidance" className="text-sm text-navy-400 mt-1">PDF, PNG, JPG, or WebP — up to 10MB</p>
        </div>
      </div>

      {file && (
        <div className="mt-4 card p-4 flex items-center gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-navy-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-navy-800 truncate">{file.name}</p>
            <p className="text-sm text-navy-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remove selected file"
            className="p-2 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {canRetry && !file && (
        <p className="mt-4 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm leading-relaxed text-navy-600">
          Your previous sample document is still available. Retry processing it, or choose a different fictional/sample document above.
        </p>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleProcess}
          disabled={(!file && !canRetry) || uploading}
          className="btn-primary"
        >
          <Scan className="w-5 h-5" />
          {canRetry && !file ? 'Retry extraction' : 'Extract denial details'}
        </button>
      </div>
    </div>
  );
}

function ExtractingAnimation({ fileName }: { fileName: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 animate-fade-in" role="status" aria-live="polite" aria-busy="true">
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center w-24 h-32 mb-6">
          {/* Document outline */}
          <div className="absolute inset-0 rounded-xl border-2 border-navy-200 bg-white overflow-hidden">
            <div className="p-3 space-y-1.5">
              <div className="h-2 rounded shimmer-bg animate-shimmer" />
              <div className="h-2 rounded shimmer-bg animate-shimmer w-4/5" />
              <div className="h-2 rounded shimmer-bg animate-shimmer w-3/5" />
              <div className="h-2 rounded shimmer-bg animate-shimmer w-2/3" />
              <div className="h-2 rounded shimmer-bg animate-shimmer w-4/5" />
              <div className="h-2 rounded shimmer-bg animate-shimmer w-3/4" />
            </div>
          </div>
          {/* Scanning line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-amber-400 to-transparent animate-scan" />
        </div>

        <h2 className="text-2xl font-bold text-navy-900 mb-2">Extracting your denial letter...</h2>
        <p className="text-navy-500 text-body-lg">
          Our Intake Agent is reading <span className="font-medium text-navy-700">{fileName}</span> and
          identifying the insurer, denial reason, policy type, and key details.
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <ExtractingItem label="Reading document" delay={0} />
        <ExtractingItem label="Identifying insurer" delay={800} />
        <ExtractingItem label="Extracting denial code" delay={1600} />
        <ExtractingItem label="Analyzing policy details" delay={2400} />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-navy-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Processing may take a little while. Keep this page open.
      </div>
    </div>
  );
}

function ExtractingItem({ label, delay }: { label: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-3 animate-slide-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="w-6 h-6 rounded-full border-2 border-navy-200 border-t-navy-500 animate-spin flex-shrink-0" />
      <span className="text-navy-600">{label}</span>
    </div>
  );
}
