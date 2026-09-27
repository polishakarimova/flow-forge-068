import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { safeAuthReturn } from '@/lib/authNavigation';
import { EntryWordmark } from '@/components/EntryWordmark';
import './welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const returnTo = safeAuthReturn(params.get('returnTo'));
  const { isAuthenticated, isLoading, loginWithTelegram, completeTelegramLogin } = useAuth();
  const [message, setMessage] = useState('');
  const [botLink, setBotLink] = useState('');
  const [attempted, setAttempted] = useState(false);
  const completedToken = useRef('');
  const token = params.get('telegramLoginToken');

  useEffect(() => {
    if (isAuthenticated && (attempted || token)) navigate(returnTo, { replace: true });
  }, [isAuthenticated, attempted, token, navigate, returnTo]);
  useEffect(() => {
    if (!token || completedToken.current === token) return;
    completedToken.current = token;
    void completeTelegramLogin(token).then(result => {
      setMessage(result.message);
      if (!result.success && result.message.startsWith('Ссылка для входа устарела')) setParams({ returnTo }, { replace: true });
    });
  }, [token, completeTelegramLogin, setParams, returnTo]);

  async function enter() {
    if (isLoading) return;
    if (isAuthenticated) { navigate(returnTo); return; }
    setAttempted(true); setMessage('');
    const result = token ? await completeTelegramLogin(token) : await loginWithTelegram(returnTo);
    setBotLink(result.botLink || ''); setMessage(result.message);
    if (result.success) navigate(returnTo, { replace: true });
  }
  useEffect(() => {
    if (!botLink) return;
    let active = true;
    const resume = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = await loginWithTelegram(returnTo);
      if (!active) return;
      if (result.success) navigate(returnTo, { replace: true });
      else setMessage(result.message);
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { active = false; window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [botLink, loginWithTelegram, navigate, returnTo]);

  return <div className="entry-page">
    <main className="entry-main">
      <EntryWordmark />
      <p className="entry-intro">Идеи, тексты и публикации —<br />в одном пространстве.</p>
      <button type="button" onClick={enter} disabled={isLoading} className="entry-primary">
        {isLoading ? <><Loader2 className="animate-spin" />{attempted || token ? 'Входим…' : 'Проверяем вход…'}</> : botLink ? 'Я подтвердил(а)' : <>Начать<ArrowRight /></>}
      </button>
      <p className="entry-footnote">Вход через Telegram</p>
      {(message || botLink) && <div role={botLink ? 'status' : 'alert'} className="entry-feedback">
        <p>{message}</p>
        {botLink && <a href={botLink} target="_blank" rel="noopener noreferrer" className="inline-flex py-2 text-primary underline underline-offset-4">Открыть Telegram</a>}
      </div>}
    </main>
  </div>;
}
