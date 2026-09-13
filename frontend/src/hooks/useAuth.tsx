import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, apiGet, apiPost, tokenStore } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Role, Session } from '../types';

interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  role: Exclude<Role, 'admin'>;
  organization_name: string;
  phone?: string;
  location_name?: string;
  activity_type?: string;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  role: Role | null;
  loginDemo: (role: Role) => Promise<Session>;
  loginWithPassword: (email: string, password: string) => Promise<Session>;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) {
      setSession(null);
      return;
    }
    try {
      setSession(await apiGet<Session>('/profile'));
    } catch {
      tokenStore.set(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Si hay Supabase, sincroniza el token de acceso con el backend
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) tokenStore.set(data.session.access_token);
        supabase.auth.onAuthStateChange((_event, s) => {
          if (s?.access_token) {
            tokenStore.set(s.access_token);
            void loadProfile();
          }
        });
      }
      await loadProfile();
      setLoading(false);
    })();
  }, [loadProfile]);

  const loginDemo = useCallback(
    async (role: Role) => {
      const res = await api<Session & { token: string }>('/auth/demo-login', { method: 'POST', body: { role }, token: null });
      tokenStore.set(res.token);
      const s: Session = { profile: res.profile, producer: res.producer, supplier: res.supplier, carrier: res.carrier, isDemo: true };
      setSession(s);
      queryClient.clear();
      return s;
    },
    [queryClient],
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error('Supabase no está configurado. Usa el acceso demo.');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      tokenStore.set(data.session?.access_token ?? null);
      const s = await apiGet<Session>('/profile');
      setSession(s);
      queryClient.clear();
      return s;
    },
    [queryClient],
  );

  const register = useCallback(async (input: RegisterInput) => {
    if (!supabase) throw new Error('El registro requiere Supabase. En modo demo usa el acceso por rol.');
    const { email, password, ...metadata } = input;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) throw new Error(error.message);
    if (data.session?.access_token) {
      tokenStore.set(data.session.access_token);
      setSession(await apiGet<Session>('/profile'));
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      /* ignore */
    }
    if (supabase) await supabase.auth.signOut();
    tokenStore.set(null);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, role: session?.profile.role ?? null, loginDemo, loginWithPassword, register, logout, refresh: loadProfile }),
    [session, loading, loginDemo, loginWithPassword, register, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
