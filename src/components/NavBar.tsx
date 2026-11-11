import { ShieldCheck, LogOut, Info, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';

export function NavBar() {
  const { user, signOut } = useAuth();
  const { setScreen, screen } = useAppStore();

  return (
    <header className="sticky top-0 z-50 bg-navy-50/80 backdrop-blur-md border-b border-navy-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setScreen('landing')}
          aria-label="ClaimClear home"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-navy-800 flex items-center justify-center group-hover:bg-navy-700 transition-colors">
            <ShieldCheck className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold text-navy-900">ClaimClear</span>
        </button>

        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setScreen('landing')}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-700 transition-colors"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
            How it works
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setScreen('dashboard')}
              aria-current={screen === 'dashboard' ? 'page' : undefined}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${screen === 'dashboard' ? 'text-navy-800' : 'text-navy-500 hover:text-navy-700'}`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              My appeals
            </button>
          )}

          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-navy-500 max-w-[160px] truncate">
                {user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="btn-ghost text-sm"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
