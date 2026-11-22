import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { authRequest, miniAppData } from '@/lib/authRequest';
import { authErrorMessage, safeAuthReturn } from '@/lib/authNavigation';
import { pendingReferral } from '@/lib/referral';
import { EntryWordmark } from '@/components/EntryWordmark';
import './welcome.css';

type PendingLogin = { token: string; expiresAt: string; botLink?: string; returnTo?: string };
const pendingKey = 'contentmap_pending_login';
function remember(pending: PendingLogin | null) {
  try {
    if (pending) sessionStorage.setItem(pendingKey, JSON.stringify(pending));
    else sessionStorage.removeItem(pendingKey);
  } catch { /* In-memory polling still works. */ }
}
function initialPending(queryToken: string | null): PendingLogin | null {
  if (miniAppData()) return null;
  try {
    const stored: PendingLogin | null = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
    if (stored?.token && (!queryToken || queryToken === stored.token)) return stored;
  } catch { /* A callback can resume without storage. */ }
  return queryToken ? { token: queryToken, expiresAt: new Date(Date.now() + 600000).toISOString() } : null;
}
export default function Welcome() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAuthenticated, signInMiniApp, confirmBrowserLogin, entryError } = useAuth();
  const [pending, setPending] = useState(() => initialPending(params.get('telegramLoginToken')));
  const returnTo = safeAuthReturn(params.get('returnTo') || pending?.returnTo);
  const reauthenticate = returnTo === '/admin' && params.get('reauth') === '1';
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const checking = useRef(false);
  const redirect = isAuthenticated && !reauthenticate;
  useEffect(() => {
    if (!params.has('telegramLoginToken')) return;
    if (pending) remember(pending);
    const clean = new URLSearchParams(params);
    clean.delete('telegramLoginToken');
    setParams(clean, { replace: true });
  }, [params, setParams, pending]);

  const check = useCallback(async () => {
    if (!pending || checking.current || document.visibilityState === 'hidden') return;
    checking.current = true;
    try {
      if (!(Date.parse(pending.expiresAt) > Date.now())) throw new Error('login_token_expired');
      if (await confirmBrowserLogin(pending.token, returnTo)) remember(null);
      else setMessage('');
    } catch (e) {
      const err = e as Error & { status?: number };
      if ([403, 404, 410].includes(err.status || 0) || err.message === 'login_token_expired') {
        remember(null);
        setPending(null);
        setMessage(authErrorMessage(err.message));
      } else setMessage('Пока нет связи с сайтом. Проверим подтверждение ещё раз.');
    } finally { checking.current = false; }
  }, [pending, confirmBrowserLogin, returnTo]);
  useEffect(() => {
    if (!pending || redirect) return;
    void check();
    const timer = window.setInterval(check, 3000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [check, pending, redirect]);

  async function enter() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setMessage('');
    let popup: Window | null = null;
    try {
      if (miniAppData()) {
        await signInMiniApp();
        navigate(returnTo, { replace: true });
      } else {
        popup = window.open('about:blank', '_blank');
        if (popup) popup.opener = null;
        const start: PendingLogin = await authRequest('/api/auth/telegram-login-token', { returnTo, referralCode: pendingReferral() });
        if (!start.token || !start.botLink || !Date.parse(start.expiresAt)) throw Error('request_failed');
        remember(start);
        setPending(start);
        if (popup) popup.location.href = start.botLink;
      }
    } catch (e) { popup?.close(); setMessage(authErrorMessage((e as Error).message)); }
    finally { starting.current = false; setBusy(false); }
  }
  if (redirect) return <Navigate to={returnTo} replace />;
  return <div className="entry-page">
    <main className="entry-main">
      <EntryWordmark />
      <p className="entry-intro">Идеи, тексты и публикации —<br />в одном пространстве.</p>
      {pending ? <div className="entry-feedback" role="status">
        <p>{message || 'Подтвердите вход в боте и вернитесь в эту вкладку. Кабинет откроется автоматически.'}</p>
        {pending.botLink && <a href={pending.botLink} target="_blank" rel="noopener noreferrer">Открыть Telegram</a>}
      </div> : <>
        <button type="button" onClick={enter} disabled={busy} className="entry-primary">
          {busy ? <><Loader2 className="animate-spin" />Входим…</> : <>Войти через Telegram<ArrowRight /></>}
        </button>
        {(message || entryError) && <p role="alert" className="entry-feedback">{message || entryError}</p>}
      </>}
      <a href="/legal" className="text-xs text-muted-foreground underline underline-offset-4 inline-flex items-center min-h-11">Документы сервиса</a>
    </main>
  </div>;
}
