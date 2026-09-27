import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authErrorMessage, safeAuthReturn } from './authNavigation';

export interface User { id: string; name: string; email: string; avatar?: string; provider: 'email' | 'google' | 'telegram'; emailVerified: boolean }
type AuthResult = { success: boolean; message: string; botLink?: string };
interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean }
interface AuthContextValue extends AuthState {
  loginWithTelegram: (returnTo?: string) => Promise<AuthResult>;
  completeTelegramLogin: (token: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
interface TelegramWindow extends Window { Telegram?: { WebApp?: { initData?: string; openTelegramLink?: (url: string) => void } } }
interface ApiUser { id: string | number; name?: string; email?: string; avatar?: string; authProvider?: string }
const mapUser = (user: ApiUser): User => ({ id: String(user.id), name: user.name || 'Пользователь', email: user.email || '', avatar: user.avatar, provider: 'telegram', emailVerified: true });
const pendingKey = 'contentmap_pending_login';
type PendingLogin = { token: string; expiresAt: string; botLink: string };
function clearPending() { try { sessionStorage.removeItem(pendingKey); } catch { /* optional */ } }
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers }, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'request_failed');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true });
  const flight = useRef<Promise<AuthResult> | null>(null);
  const generation = useRef(0);
  const acceptUser = useCallback((value: ApiUser | null) => {
    const user = value ? mapUser(value) : null;
    setState({ user, isAuthenticated: Boolean(user), isLoading: false });
  }, []);
  useEffect(() => {
    let active = true;
    const initialGeneration = generation.current;
    // Restoring is read-only. New sign-in starts only on a user's tap.
    api('/api/auth/me').then(data => { if (active && generation.current === initialGeneration) acceptUser(data.user); })
      .catch(() => { if (active && generation.current === initialGeneration) acceptUser(null); });
    return () => { active = false; };
  }, [acceptUser]);

  const runLogin = useCallback((work: () => Promise<AuthResult>) => {
    if (flight.current) return flight.current;
    generation.current++;
    setState(s => ({ ...s, isLoading: true }));
    const promise = work().catch((e: Error) => ({ success: false, message: authErrorMessage(e.message) }))
      .finally(() => { flight.current = null; setState(s => ({ ...s, isLoading: false })); });
    flight.current = promise;
    return promise;
  }, []);
  const finishToken = useCallback(async (token: string): Promise<AuthResult> => {
    const response = await fetch('/api/auth/telegram-login-token/' + encodeURIComponent(token), { credentials: 'include', signal: AbortSignal.timeout(20000) });
    if (response.status === 202) return { success: false, message: 'Подтвердите вход в боте и нажмите «Я подтвердил(а)».' };
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { if ([404,410].includes(response.status)) clearPending(); throw new Error(data.error || 'request_failed'); }
    if (!data.user) throw new Error('user_missing');
    clearPending(); acceptUser(data.user);
    return { success: true, message: '' };
  }, [acceptUser]);
  const completeTelegramLogin = useCallback((token: string) => runLogin(() => finishToken(token)), [runLogin, finishToken]);
  const loginWithTelegram = useCallback((destination?: string) => runLogin(async () => {
    const webApp = (window as TelegramWindow).Telegram?.WebApp;
    if (webApp?.initData) {
      const data = await api('/api/auth/telegram-mini-app', { method: 'POST', body: JSON.stringify({ initData: webApp.initData }) });
      if (!data.user) throw new Error('user_missing');
      acceptUser(data.user);
      return { success: true, message: '' };
    }
    let pending: PendingLogin | null = null;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch { /* optional */ }
    if (!pending?.token || !Number.isFinite(Date.parse(pending.expiresAt)) || Date.parse(pending.expiresAt) <= Date.now()) { pending = null; clearPending(); }
    if (pending) {
      const result = await finishToken(pending.token);
      return result.success ? result : { ...result, botLink: pending.botLink };
    }
    const popup = webApp?.openTelegramLink ? null : window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const start = await api('/api/auth/telegram-login-token', { method: 'POST', body: JSON.stringify({ returnTo: safeAuthReturn(destination) }) });
      try { sessionStorage.setItem(pendingKey, JSON.stringify(start)); } catch { /* optional */ }
      if (webApp?.openTelegramLink) webApp.openTelegramLink(start.botLink);
      else if (popup) popup.location.href = start.botLink;
      return { success: false, message: 'Подтвердите вход в Telegram, затем вернитесь сюда.', botLink: start.botLink };
    } catch (error) { popup?.close(); throw error; }
  }), [acceptUser, finishToken, runLogin]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    clearPending(); acceptUser(null);
  }, [acceptUser]);
  return <AuthContext.Provider value={{ ...state, loginWithTelegram, completeTelegramLogin, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; }
