import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupaUser, Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google" | "telegram";
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
  verifyEmail: (code: string, email: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithTelegram: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSupaUser(su: SupaUser): User {
  const provider = su.user_metadata?.auth_provider === "telegram" ? "telegram" : su.app_metadata?.provider === "google" ? "google" : "email";
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
    const redirectUrl = window.location.origin + "/";
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
    const redirectUrl = window.location.origin + "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Перенаправление на Google..." };
  }, []);

  const verifyEmail = useCallback(async (code: string, email: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    setState((s) => ({ ...s, isLoading: false }));
    if (error) return { success: false, message: "Неверный код. Попробуйте ещё раз." };
    return { success: true, message: "Email подтверждён!" };
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

  const signInWithTelegramCredentials = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Вход через Telegram выполнен" };
  }, []);

  const loginWithTelegram = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp?.initData) {
        const miniAppResponse = await fetch("/api/auth/telegram/miniapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: webApp.initData }),
        });
        const miniAppResult = await miniAppResponse.json();
        if (!miniAppResponse.ok || !miniAppResult.ok) {
          return { success: false, message: miniAppResult.error || "Не удалось войти через Telegram" };
        }
        return await signInWithTelegramCredentials(miniAppResult.email, miniAppResult.password);
      }

      const startResponse = await fetch("/api/auth/telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const start = await startResponse.json();
      if (!startResponse.ok || !start.ok) {
        return { success: false, message: start.error || "Не удалось открыть Telegram-бота" };
      }

      window.open(start.botUrl, "_blank", "noopener,noreferrer");

      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const statusResponse = await fetch(`/api/auth/telegram/status?token=${encodeURIComponent(start.token)}`);
        const status = await statusResponse.json();
        if (status.status === "pending") continue;
        if (status.status === "confirmed") {
          return await signInWithTelegramCredentials(status.email, status.password);
        }
        return { success: false, message: "Токен входа устарел. Попробуйте ещё раз." };
      }

      return { success: false, message: "Telegram не подтвердил вход. Нажмите кнопку ещё раз." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Не удалось войти через Telegram" };
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [signInWithTelegramCredentials]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, registerWithEmail, registerWithGoogle, verifyEmail, resendVerification, login, loginWithTelegram, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
