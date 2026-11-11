import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const NavBar = lazy(() => import('@/components/NavBar').then((module) => ({ default: module.NavBar })));
const AuthScreen = lazy(() => import('@/components/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const LandingPage = lazy(() => import('@/components/LandingPage').then((module) => ({ default: module.LandingPage })));
const UploadScreen = lazy(() => import('@/components/UploadScreen').then((module) => ({ default: module.UploadScreen })));
const CaseReviewScreen = lazy(() => import('@/components/CaseReviewScreen').then((module) => ({ default: module.CaseReviewScreen })));
const FollowUpQuestionsScreen = lazy(() => import('@/components/FollowUpQuestionsScreen').then((module) => ({ default: module.FollowUpQuestionsScreen })));
const LetterPreviewScreen = lazy(() => import('@/components/LetterPreviewScreen').then((module) => ({ default: module.LetterPreviewScreen })));
const DashboardScreen = lazy(() => import('@/components/DashboardScreen').then((module) => ({ default: module.DashboardScreen })));
const AgentStepper = lazy(() => import('@/components/AgentStepper').then((module) => ({ default: module.AgentStepper })));

function AppContent() {
  const { user, loading } = useAuth();
  const { screen, setScreen, setCurrentCase } = useAppStore();
  const [paymentReturning, setPaymentReturning] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user && screen !== 'landing' && screen !== 'auth') {
      setScreen('landing');
    }
  }, [user, loading, screen, setScreen]);

  useEffect(() => {
    if (!loading && user && screen === 'auth') {
      setScreen('dashboard');
    }
  }, [user, loading, screen, setScreen]);

  useEffect(() => {
    if (loading || !user) return;

    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('paypal');
    const caseId = params.get('case_id') || window.localStorage.getItem('claimclear-paypal-case');
    const orderId = params.get('token');

    // Only handle explicit PayPal return states; never infer payment success from
    // an arbitrary callback value. A cancelled checkout still reloads the case so
    // the user can retry, but it is not captured here.
    if (!['success', 'cancelled'].includes(paymentResult ?? '') || !caseId) return;

    let cancelled = false;
    const finalizePayment = async () => {
      setPaymentReturning(true);
      setPaymentError(null);

      try {
        if (paymentResult === 'success') {
          if (!orderId) throw new Error('PayPal did not return an order ID.');
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) throw new Error('Your session has expired. Please sign in again.');

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ action: 'capture_order', case_id: caseId, order_id: orderId }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.status !== 'COMPLETED') {
            throw new Error(result.error || 'PayPal could not verify the payment.');
          }
        }

        const { data: updatedCase, error } = await supabase
          .from('cases')
          .select('*')
          .eq('id', caseId)
          .maybeSingle();
        if (error || !updatedCase) throw new Error('We could not reload your case after checkout.');

        if (!cancelled) {
          setCurrentCase(updatedCase);
          setScreen('preview');
          window.localStorage.removeItem('claimclear-paypal-case');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        if (!cancelled) setPaymentError(error instanceof Error ? error.message : 'Payment verification failed.');
      } finally {
        if (!cancelled) setPaymentReturning(false);
      }
    };

    void finalizePayment();
    return () => {
      cancelled = true;
    };
  }, [loading, user, setCurrentCase, setScreen]);

  if (loading || paymentReturning) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          <p className="mt-4 text-sm font-medium text-navy-500">Loading your ClaimClear workspace...</p>
        </div>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center px-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-navy-900">Payment verification needs attention</h1>
          <p className="mt-3 text-sm leading-relaxed text-navy-500">{paymentError}</p>
          <button onClick={() => setPaymentError(null)} className="btn-primary mt-6 w-full">Return to ClaimClear</button>
        </div>
      </div>
    );
  }

  // Unauthenticated: landing or auth
  if (!user) {
    if (screen === 'auth') {
      return (
        <Suspense fallback={<ScreenLoading />}>
          <AuthScreen />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoading />}>
        <div className="min-h-screen bg-navy-50">
          <NavBar />
          <LandingPage />
        </div>
      </Suspense>
    );
  }

  // Authenticated: show nav + content + stepper
  const showStepper = screen === 'review' || screen === 'questions' || screen === 'preview';

  return (
    <Suspense fallback={<ScreenLoading />}>
      <div className="min-h-screen bg-navy-50">
        <NavBar />
        <div className={showStepper ? 'max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_320px] gap-6' : ''}>
          <div className={showStepper ? 'py-8' : ''}>
            {screen === 'landing' && <LandingPage />}
            {screen === 'upload' && <UploadScreen />}
            {screen === 'review' && <CaseReviewScreen />}
            {screen === 'questions' && <FollowUpQuestionsScreen />}
            {screen === 'preview' && <LetterPreviewScreen />}
            {screen === 'dashboard' && <DashboardScreen />}
          </div>
          {showStepper && (
            <div className="py-8 lg:sticky lg:top-20 lg:self-start">
              <AgentStepper />
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}

function ScreenLoading() {
  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center px-6" role="status" aria-live="polite">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium text-navy-500">Opening your workspace...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
