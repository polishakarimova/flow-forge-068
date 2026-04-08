import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupaUser, Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google";
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerWithGoogle: () => Promise<{ success: boolean; message: string }>;
  verifyEmail: (code: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSupaUser(su: SupaUser): User {
  const provider = su.app_metadata?.provider === "google" ? "google" : "email";
  return {
    id: su.id,
    name: su.user_metadata?.full_name || su.user_metadata?.name || su.email?.split("@")[0] || "Пользователь",
    email: su.email || "",
    avatar: su.user_metadata?.avatar_url,
    provider,
    emailVerified: !!su.email_confirmed_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true });

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState({ user: mapSupaUser(session.user), isAuthenticated: true, isLoading: false });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({ user: mapSupaUser(session.user), isAuthenticated: true, isLoading: false });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    const redirectUrl = window.location.origin + "/flow-forge-068/";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: redirectUrl,
      },
    });
    setState((s) => ({ ...s, isLoading: false }));
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Письмо с подтверждением отправлено на " + email };
  }, []);

  const registerWithGoogle = useCallback(async () => {
    const redirectUrl = window.location.origin + "/flow-forge-068/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Перенаправление на Google..." };
  }, []);

  const verifyEmail = useCallback(async (_code: string) => {
    // Supabase handles email verification via link, not code
    // This is kept for UI compatibility
    return { success: true, message: "Проверьте почту — перейдите по ссылке из письма" };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Письмо отправлено повторно на " + email };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setState((s) => ({ ...s, isLoading: false }));
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Вход выполнен" };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, registerWithEmail, registerWithGoogle, verifyEmail, resendVerification, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
