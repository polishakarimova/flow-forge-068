import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

const STORAGE_KEY = "contentmap-auth";

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw) as User;
      return { user, isAuthenticated: true, isLoading: false };
    }
  } catch { /* ignore */ }
  return { user: null, isAuthenticated: false, isLoading: false };
}

function saveAuth(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadAuth);

  const registerWithEmail = useCallback(async (name: string, email: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    const user: User = {
      id: `user_${Date.now()}`,
      name,
      email,
      provider: "email",
      emailVerified: false,
    };
    setState({ user, isAuthenticated: true, isLoading: false });
    saveAuth(user);
    return { success: true, message: "Письмо с подтверждением отправлено на " + email };
  }, []);

  const registerWithGoogle = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    // Simulate Google OAuth
    await new Promise((r) => setTimeout(r, 1200));
    const user: User = {
      id: `google_${Date.now()}`,
      name: "Пользователь Google",
      email: "user@gmail.com",
      provider: "google",
      emailVerified: true,
    };
    setState({ user, isAuthenticated: true, isLoading: false });
    saveAuth(user);
    return { success: true, message: "Вход через Google выполнен" };
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 600));
    if (code.length >= 4) {
      setState((s) => ({
        ...s,
        user: s.user ? { ...s.user, emailVerified: true } : null,
        isLoading: false,
      }));
      if (state.user) saveAuth({ ...state.user, emailVerified: true });
      return { success: true, message: "Email подтвержден!" };
    }
    setState((s) => ({ ...s, isLoading: false }));
    return { success: false, message: "Неверный код подтверждения" };
  }, [state.user]);

  const resendVerification = useCallback(async (email: string) => {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, message: "Код отправлен повторно на " + email };
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 800));
    const user: User = {
      id: `user_${Date.now()}`,
      name: email.split("@")[0],
      email,
      provider: "email",
      emailVerified: true,
    };
    setState({ user, isAuthenticated: true, isLoading: false });
    saveAuth(user);
    return { success: true, message: "Вход выполнен" };
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, isAuthenticated: false, isLoading: false });
    saveAuth(null);
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
