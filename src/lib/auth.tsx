import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const authEventSeen = useRef(false);

  useEffect(() => {
    let active = true;
    authEventSeen.current = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      authEventSeen.current = true;
      setSession(newSession);
      setLoading(false);
    });

    // Subscribe first, then hydrate. If an auth event arrives while hydration is
    // pending, its newer session wins over the potentially stale getSession result.
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (!authEventSeen.current) setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        if (!authEventSeen.current) setSession(null);
        setLoading(false);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Supabase may require email confirmation and return no session. Treat a
      // successful signup as success; do not immediately attempt password login.
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: messageFromError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: messageFromError(error) };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// The context hook intentionally shares the provider module and is not a component.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
