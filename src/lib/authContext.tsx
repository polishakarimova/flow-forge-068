import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authRequest, miniAppData } from './authRequest';
import { useNavigate } from 'react-router-dom';
import { authErrorMessage, safeAuthReturn } from './authNavigation';
import { captureReferral, clearReferral, pendingReferral } from './referral';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  telegramId?: string;
  telegramUsername?: string;
  provider: 'email' | 'google' | 'telegram';
  emailVerified: boolean;
  isAdmin?: boolean;
}
type ApiUser = Pick<User, 'name' | 'email' | 'avatar' | 'telegramId' | 'telegramUsername' | 'isAdmin'> & { id: string | number };
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  entryError: string;
  sessionError: boolean;
  restore: () => Promise<void>;
  sessionExpired: () => void;
  signInMiniApp: () => Promise<void>;
  confirmBrowserLogin: (token: string, returnTo: string) => Promise<boolean>;
  saveName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const sessionEvent = 'contentmap_session_change';
const manualKey = 'contentmap_manual_login';
// This hint can only trigger server verification. The server selects the account.
function launchUserId(initData: string) {
  try { return String(JSON.parse(new URLSearchParams(initData).get('user') || 'null')?.id || ''); }
  catch { return ''; }
}
function manualLogin(value?: boolean) {
  try {
    if (value === true) sessionStorage.setItem(manualKey, '1');
    if (value === false) sessionStorage.removeItem(manualKey);
    return sessionStorage.getItem(manualKey) === '1';
  } catch { return false; }
}
function notifyTabs(action: 'login' | 'logout') {
  try { localStorage.setItem(sessionEvent, action + ':' + Date.now()); } catch { /* optional */ }
}
async function verifyMiniApp(initData: string) {
  const { user } = await authRequest('/api/auth/telegram-mini-app', { initData, referralCode: pendingReferral() });
  if (!user?.id) throw new Error('user_missing');
  return user as ApiUser;
}
function mapUser(value: ApiUser): User {
  return { id: String(value.id), name: value.name || 'Пользователь', email: value.email || '', avatar: value.avatar,
    provider: 'telegram', emailVerified: true, telegramId: value.telegramId, telegramUsername: value.telegramUsername, isAdmin: value.isAdmin === true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [entryError, setEntryError] = useState('');
  const generation = useRef(0);
  const accept = useCallback((value: ApiUser) => {
    setUser(mapUser(value));
    clearReferral();
    setEntryError('');
    manualLogin(false);
  }, []);
  const restore = useCallback(async (allowMiniAppLogin = true) => {
    const attempt = ++generation.current;
    setLoading(true);
    setSessionError(false);
    setEntryError('');
    const initData = miniAppData();
    try {
      const { user: existing } = await authRequest('/api/auth/me');
      if (generation.current !== attempt) return;
      if (existing?.id && (!initData || String(existing.telegramId) === launchUserId(initData))) {
        accept(existing);
      } else if (allowMiniAppLogin && initData && !manualLogin()) {
        setUser(null);
        try {
          const verified = await verifyMiniApp(initData);
          if (generation.current === attempt) {
            accept(verified);
            notifyTabs('login');
          }
        } catch (e) {
          if (generation.current === attempt) setEntryError(authErrorMessage((e as Error).message));
        }
      } else setUser(null);
    } catch {
      if (generation.current === attempt) setSessionError(true);
    } finally {
      if (generation.current === attempt) setLoading(false);
    }
  }, [accept]);
  useEffect(() => {
    captureReferral();
    void restore();
    const onSession = (event: StorageEvent) => {
      if (event.key !== sessionEvent) return;
      if (event.newValue?.startsWith('logout:')) manualLogin(true);
      void restore(false);
    };
    window.addEventListener('storage', onSession);
    return () => { generation.current++; window.removeEventListener('storage', onSession); };
  }, [restore]);

  const signInMiniApp = useCallback(async () => {
    const value = await verifyMiniApp(miniAppData());
    accept(value);
    notifyTabs('login');
  }, [accept]);
  const confirmBrowserLogin = useCallback(async (token: string, returnTo: string) => {
    const data = await authRequest('/api/auth/telegram-login-token/' + encodeURIComponent(token));
    if (data.status === 'pending') return false;
    if (!data.user?.id) throw new Error('user_missing');
    navigate(safeAuthReturn(data.returnTo, returnTo), { replace: true });
    accept(data.user);
    notifyTabs('login');
    return true;
  }, [accept, navigate]);
  const saveName = useCallback(async (name: string) => {
    const { user: updated } = await authRequest('/api/account/profile', { name, accountId: user?.id });
    setUser(current => current && current.id === String(updated.id) ? mapUser(updated) : current);
  }, [user?.id]);
  const sessionExpired = useCallback(() => {
    generation.current++;
    setUser(null);
    setEntryError('Срок входа истёк. Войдите через Telegram ещё раз.');
  }, []);
  const logout = useCallback(async () => {
    await authRequest('/api/auth/logout', {});
    generation.current++;
    manualLogin(true);
    try { sessionStorage.removeItem('contentmap_pending_login'); } catch { /* optional */ }
    clearReferral();
    notifyTabs('logout');
    window.location.replace('/');
  }, []);
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, entryError, sessionError, restore, sessionExpired, signInMiniApp, confirmBrowserLogin, saveName, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
