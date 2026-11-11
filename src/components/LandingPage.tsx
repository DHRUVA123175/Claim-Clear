import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleCheck,
  FileCheck2,
  FileSearch,
  FileText,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Timer,
  Mail,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

const featureCards = [
  {
    eyebrow: '01 / Intake Agent',
    title: 'Turn a denial letter into a clear case file.',
    description:
      'ClaimClear attempts to identify the insurer, claim number, denial code, dates, and service. Automated extraction can miss details, so review and correct every field.',
    image:
      'https://images.pexels.com/photos/7731332/pexels-photo-7731332.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Hands holding an insurance document',
    icon: FileSearch,
    tone: 'teal',
  },
  {
    eyebrow: '02 / Guided review',
    title: 'Know exactly what to add before you appeal.',
    description:
      'The agent finds the gaps, asks only the questions that matter, and gives you a calm path from uncertainty to a complete case.',
    image:
      'https://images.pexels.com/photos/6627938/pexels-photo-6627938.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Healthcare worker reviewing patient files',
    icon: MessageSquare,
    tone: 'amber',
  },
  {
    eyebrow: '03 / Letter Drafting Agent',
    title: 'Send a stronger letter, built around your denial.',
    description:
      'ClaimClear can suggest an appeal approach and prepare a draft from the details you confirm. Review it carefully and add any supporting records before you send it.',
    image:
      'https://images.pexels.com/photos/7731331/pexels-photo-7731331.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    alt: 'Person reviewing an insurance form on a clipboard',
    icon: FileText,
    tone: 'navy',
  },
] as const;

export function LandingPage() {
  const { setScreen } = useAppStore();
  const { user } = useAuth();

  const handleStart = () => {
    setScreen(user ? 'upload' : 'auth');
  };

  return (
    <div className="animate-fade-in bg-[#f7f8fa]">
      <section className="relative overflow-hidden border-b border-navy-100 bg-[radial-gradient(circle_at_84%_20%,rgba(20,184,166,0.12),transparent_25%),radial-gradient(circle_at_70%_100%,rgba(245,158,11,0.11),transparent_28%)]">
        <div className="absolute -left-32 top-32 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 lg:pb-20 relative">
          <div className="grid lg:grid-cols-[1fr_0.82fr] items-center gap-12 lg:gap-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/75 px-3.5 py-1.5 text-sm font-semibold text-teal-700 shadow-sm backdrop-blur-sm mb-7">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100">
                  <Sparkles className="h-3 w-3 text-teal-700" />
                </span>
                A clearer way to appeal a denied claim
              </div>
              <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-[4.25rem] font-bold tracking-[-0.055em] text-navy-950 leading-[1.03]">
                Take the next step <span className="text-teal-600">with confidence.</span>
              </h1>
              <p className="max-w-2xl text-lg sm:text-xl text-navy-500 mt-7 leading-relaxed">
                ClaimClear helps make a confusing insurance denial easier to understand and prepares a draft response you can review and edit.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button onClick={handleStart} className="btn-primary rounded-full px-7 py-3.5 shadow-[0_12px_24px_-12px_rgba(15,42,67,0.65)]">
                  Start your appeal
                  <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-sm text-navy-400">Sandbox test checkout · no real charge</span>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-navy-400">
                <span className="inline-flex items-center gap-1.5"><CircleCheck className="h-4 w-4 text-teal-500" /> Verify every extracted detail</span>
                <span className="inline-flex items-center gap-1.5"><CircleCheck className="h-4 w-4 text-amber-500" /> You review before use</span>
              </div>
              <p className="mt-5 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                Demonstration build: document processing is still being refined. Use fictional or sample documents only; do not upload real health or insurance information.
              </p>
            </div>
            <HeroWorkflow />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-400 mb-3">How ClaimClear works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.035em] text-navy-900">From denial to next move.</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-navy-400">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Built for the human on the other side of the claim
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 items-stretch">
          {featureCards.map((card, index) => (
            <FeatureCard key={card.eyebrow} card={card} featured={index === 1} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="rounded-[1.75rem] bg-navy-900 px-7 sm:px-10 py-9 sm:py-12 relative overflow-hidden">
            <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-teal-400/20" />
            <div className="absolute right-8 -top-10 w-48 h-48 rounded-full border border-amber-400/20" />
            <div className="relative max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300 mb-4">Your case, not a template</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.035em] text-white leading-tight">
                Your story stays at the center of every letter.
              </h2>
              <p className="text-navy-200 mt-5 leading-relaxed">
                You review the extracted details, answer follow-up questions, and decide what to include. The assistant prepares a draft; the final response is yours to verify and send.
              </p>
              <button onClick={handleStart} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors">
                See how it works
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white border border-navy-100 p-7 sm:p-9 shadow-[0_20px_60px_-40px_rgba(15,42,67,0.35)]">
            <div className="flex items-center justify-between mb-8">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-xs font-semibold text-success-600 bg-success-50 px-2.5 py-1 rounded-full">Review before use</span>
            </div>
            <h3 className="text-2xl font-bold text-navy-900 tracking-[-0.025em]">Built to feel steady when the process feels anything but.</h3>
            <div className="mt-7 space-y-4">
              <TrustRow icon={Lock} text="Use fictional or sample documents in this demonstration" />
              <TrustRow icon={BadgeCheck} text="You review every detail before drafting" />
              <TrustRow icon={Timer} text="Processing time and extraction quality can vary" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900 px-7 sm:px-14 py-14 sm:py-20 text-center shadow-[0_40px_100px_-40px_rgba(15,42,67,0.8)]">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
          {/* Content */}
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-teal-300 mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Your next move starts here
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.045em] text-white leading-tight max-w-3xl mx-auto">
              A denial is a decision.
              <br /><span className="text-teal-300">It is not the end of the conversation.</span>
            </h2>
            <p className="max-w-xl mx-auto text-navy-200 mt-5 leading-relaxed">Review the denial, confirm the details, and prepare a draft response. You remain responsible for checking it and deciding whether to send it.</p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={handleStart} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-base font-bold text-navy-900 shadow-[0_12px_32px_-8px_rgba(245,158,11,0.7)] transition-all duration-200 hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_16px_36px_-8px_rgba(245,158,11,0.8)] active:scale-[0.98]">
                Start your appeal <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-navy-300">Sandbox test checkout · no real charge</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

type FeatureCardData = (typeof featureCards)[number];

function HeroWorkflow() {
  return (
    <div className="relative mx-auto w-full max-w-[430px] lg:justify-self-end">
      <div className="absolute -right-5 top-8 h-20 w-20 rounded-full bg-amber-300/35 blur-2xl" />
      <div className="absolute -left-5 bottom-5 h-24 w-24 rounded-full bg-teal-300/30 blur-2xl" />
      <div className="relative rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-[0_28px_70px_-30px_rgba(15,42,67,0.55)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-[1.45rem] border border-navy-100 bg-[#f5f7fa]">
          <div className="flex items-center justify-between border-b border-navy-100 bg-white/90 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-900">
                <ShieldCheck className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-900">Your appeal workspace</p>
                <p className="text-[10px] font-medium text-navy-400">Case #CC-2048</p>
              </div>
            </div>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">In progress</span>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-700"><FileCheck2 className="h-4 w-4 text-teal-500" /> Denial letter</div>
                <span className="text-[10px] font-semibold text-navy-400">PDF uploaded</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-4/5 rounded-full bg-navy-100" />
                <div className="h-2 w-full rounded-full bg-navy-100" />
                <div className="h-2 w-3/5 rounded-full bg-amber-100" />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800"><Activity className="h-3.5 w-3.5" /> Key denial detail found</div>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-4 text-white shadow-lg shadow-teal-500/20">
              <div className="flex items-start justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-100">Agent insight</p><p className="mt-2 text-sm font-bold leading-snug">Your strongest appeal angle is ready to review.</p></div>
                <ArrowUpRight className="h-5 w-5 text-teal-100" />
              </div>
              <div className="mt-5 h-1.5 rounded-full bg-white/25"><div className="h-1.5 w-[78%] rounded-full bg-amber-300" /></div>
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-teal-100"><span>Case clarity</span><span>78%</span></div>
            </div>
            <div className="flex items-center gap-3 px-1 text-[11px] font-semibold text-navy-500"><span className="h-2 w-2 rounded-full bg-amber-400" /> Asking only what matters next</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ card, featured }: { card: FeatureCardData; featured: boolean }) {
  const Icon = card.icon;

  const t = {
    teal: {
      rail: 'bg-gradient-to-r from-teal-400 to-cyan-400',
      surface: 'bg-[linear-gradient(160deg,#ffffff_0%,#f0fdfa_100%)]',
      border: 'border-teal-100',
      iconWrap: 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-200',
      badge: 'bg-teal-50 text-teal-700 border border-teal-200',
      link: 'text-teal-700',
      shadow: 'hover:shadow-[0_0_0_1.5px_rgba(20,184,166,0.5),0_28px_60px_-20px_rgba(20,184,166,0.4)]',
    },
    amber: {
      rail: 'bg-navy-200 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-orange-400',
      surface: 'bg-white',
      border: 'border-navy-100 group-hover:border-amber-200',
      iconWrap: 'bg-navy-800 text-white shadow-md group-hover:bg-gradient-to-br group-hover:from-amber-400 group-hover:to-orange-500 group-hover:shadow-lg group-hover:shadow-amber-200',
      badge: 'bg-navy-50 text-navy-700 border border-navy-200 group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-200',
      link: 'text-navy-600 group-hover:text-amber-700',
      shadow: 'hover:shadow-[0_0_0_1.5px_rgba(251,191,36,0.65),0_28px_60px_-16px_rgba(251,191,36,0.5)]',
    },
    navy: {
      rail: 'bg-gradient-to-r from-sky-400 to-indigo-400',
      surface: 'bg-[linear-gradient(160deg,#ffffff_0%,#f0f9ff_100%)]',
      border: 'border-sky-100',
      iconWrap: 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-200',
      badge: 'bg-sky-50 text-sky-700 border border-sky-200',
      link: 'text-sky-700',
      shadow: 'hover:shadow-[0_0_0_1.5px_rgba(56,189,248,0.5),0_28px_60px_-20px_rgba(56,189,248,0.4)]',
    },
  }[card.tone];

  return (
    <article className={`group relative overflow-hidden rounded-[1.5rem] border ${t.border} ${t.surface} ${t.shadow} transition-all duration-300 hover:-translate-y-1.5 ${featured ? 'lg:-translate-y-3 lg:scale-[1.01]' : ''}`}>
      {/* Colored top rail */}
      <div className={`absolute inset-x-0 top-0 h-1 ${t.rail}`} />

      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img src={card.image} alt={card.alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-navy-950/10 to-transparent" />
        {/* Step badge overlaid on photo */}
        <span className={`absolute left-4 top-5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-md ${t.badge}`}>
          <Icon className="w-3.5 h-3.5" />
          {card.eyebrow}
        </span>
        {/* Icon badge bottom-right of photo */}
        <div className={`absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-2xl ${t.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-7 flex flex-col min-h-[200px]">
        <h3 className="text-[1.15rem] font-bold tracking-[-0.025em] text-navy-900 leading-snug">{card.title}</h3>
        <p className="text-sm text-navy-500 leading-relaxed mt-3">{card.description}</p>
        <div className={`mt-auto pt-5 flex items-center gap-2 text-sm font-bold transition-colors ${t.link}`}>
          Explore this step
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </article>
  );
}

function TrustRow({ icon: Icon, text }: { icon: typeof Lock; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm font-medium text-navy-700">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex-shrink-0 shadow shadow-teal-200">
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1">{text}</span>
      <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-navy-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-lg font-bold text-navy-900">ClaimClear</span>
            </div>
            <p className="text-sm text-navy-400 leading-relaxed max-w-xs">
              A clearer way to appeal a denied insurance claim. Built for the human on the other side.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-navy-700 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-navy-400">
              <li>Upload & extract denial details</li>
              <li>Guided follow-up questions</li>
              <li>AI-drafted appeal letter</li>
              <li>Download as PDF</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-navy-700 mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-navy-400">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@claimclear.app</li>
              <li>Test checkout only</li>
              <li>No real payment is processed</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-navy-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-navy-400">&copy; {new Date().getFullYear()} ClaimClear. All rights reserved.</p>
            <p className="text-xs text-navy-400">Demonstration build — do not upload real health or insurance information.</p>
          </div>
          <p className="mt-5 max-w-5xl text-xs leading-relaxed text-navy-500">
            ClaimClear is an assistance and document-preparation tool, not an insurance company, law firm, or medical provider. Its content is not legal or medical advice and cannot guarantee that an appeal will be approved. Automated extraction and draft suggestions may be incomplete or incorrect. Verify all details, deadlines, and requirements with your insurer or a qualified professional before acting.
          </p>
      </div>
    </footer>
  );
}
