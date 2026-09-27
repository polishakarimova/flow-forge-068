import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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
  registerWithEmail: () => Promise<{ success: boolean; message: string }>;
  registerWithGoogle: () => Promise<{ success: boolean; message: string }>;
  verifyEmail: (code: string, email: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  login: () => Promise<{ success: boolean; message: string }>;
  loginWithTelegram: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ApiUser {
  id: string | number;
  name?: string;
  email?: string;
  avatar?: string;
  authProvider?: string;
}

interface TelegramWebApp {
  initData?: string;
  openTelegramLink?: (url: string) => void;
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function mapUser(user: ApiUser): User {
  return {
    id: String(user.id),
    name: user.name || user.email || "Пользователь",
    email: user.email || "",
    avatar: user.avatar,
    provider: user.authProvider === "telegram" ? "telegram" : "email",
    emailVerified: true,
  };
}

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "request_failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true });

  const refreshMe = useCallback(async () => {
    const data = await api("/api/auth/me");
    const user = data.user ? mapUser(data.user) : null;
    setState({ user, isAuthenticated: Boolean(user), isLoading: false });
    return user;
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const user = await refreshMe();
      const initData = (window as TelegramWindow).Telegram?.WebApp?.initData;
      if (!user && initData) {
        await api("/api/auth/telegram-mini-app", {
          method: "POST",
          body: JSON.stringify({ initData }),
        });
        await refreshMe();
      }
    };
    restoreSession().catch(() => setState({ user: null, isAuthenticated: false, isLoading: false }));
  }, [refreshMe]);

  const registerWithEmail = useCallback(async () => {
    return { success: false, message: "Вход по паролю отключён. Используйте Telegram." };
  }, []);

  const registerWithGoogle = useCallback(async () => {
    return { success: false, message: "Google-вход сейчас отключён. Используйте Telegram." };
  }, []);

  const verifyEmail = useCallback(async () => {
    return { success: true, message: "Email подтверждён" };
  }, []);

  const resendVerification = useCallback(async () => {
    return { success: true, message: "Подтверждение не требуется" };
  }, []);

  const login = useCallback(async () => {
    return { success: false, message: "Вход по паролю отключён. Используйте Telegram." };
  }, []);

  const loginWithTelegram = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const webApp = (window as TelegramWindow).Telegram?.WebApp;
      if (webApp?.initData) {
        await api("/api/auth/telegram-mini-app", {
          method: "POST",
          body: JSON.stringify({ initData: webApp.initData }),
        });
        await refreshMe();
        return { success: true, message: "Вход через Telegram выполнен" };
      }

      const pendingKey = "contentmap_pending_login";
      let pending: { token: string; expiresAt: string; botLink: string } | null = null;
      try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null"); } catch { /* storage may be unavailable */ }
      if (!pending?.token || !Number.isFinite(Date.parse(pending.expiresAt)) || Date.parse(pending.expiresAt) <= Date.now()) pending = null;
      const popup = pending || webApp?.openTelegramLink ? null : window.open("about:blank", "_blank");
      if (popup) popup.opener = null;
      const requestedReturn = new URLSearchParams(window.location.search).get("returnTo") || "/calendar";
      const returnTo = requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "/calendar";
      const start = pending || await api("/api/auth/telegram-login-token", {
        method: "POST",
        body: JSON.stringify({ returnTo }),
      });
      try { sessionStorage.setItem(pendingKey, JSON.stringify(start)); } catch { /* login still works without storage */ }
      if (pending) {
        // Resume the same one-time request after a blocked popup or returning from Telegram.
      } else if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(start.botLink);
      } else if (popup) {
        popup.location.href = start.botLink;
      } else {
        return { success: false, message: `Откройте бота: ${start.botLink} После подтверждения вернитесь сюда и нажмите «Войти через Telegram» ещё раз.` };
      }

      for (let attempt = 0; attempt < 300; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const response = await fetch(`/api/auth/telegram-login-token/${encodeURIComponent(start.token)}`, { credentials: "include" });
        if (response.status === 202) continue;
        if (response.ok) {
          try { sessionStorage.removeItem(pendingKey); } catch { /* optional storage */ }
          const data = await response.json().catch(() => ({}));
          await refreshMe();
          if (data.returnTo && data.returnTo !== window.location.pathname) {
            window.location.assign(data.returnTo);
          }
          return { success: true, message: "Вход через Telegram выполнен" };
        }
        try { sessionStorage.removeItem(pendingKey); } catch { /* optional storage */ }
        return { success: false, message: "Ссылка для входа устарела. Нажмите «Войти через Telegram» ещё раз." };
      }
      return { success: false, message: "Telegram не подтвердил вход. Нажмите кнопку ещё раз." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Не удалось войти через Telegram" };
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [refreshMe]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
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
