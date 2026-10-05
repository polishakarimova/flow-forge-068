import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyPublications, parsePublications, type PublicationFormat, type PublicationState } from '@/lib/publications';

type Status = 'loading' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict';
type Draft = { data: PublicationState; revision: string };
const endpoint = '/api/state/publications';
export function usePublications(userId: string) {
  const [data, setData] = useState<PublicationState>(emptyPublications);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [approving, setApproving] = useState(false);
  const approvalLock = useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const state = useRef({ data: emptyPublications, revision: 'new', dirty: false, running: false, conflict: false, ready: false });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const key = `karta-publications-draft:${userId}`;
  const persistDraft = useCallback(() => {
    try { localStorage.setItem(key, JSON.stringify({ data: state.current.data, revision: state.current.revision })); }
    catch { setMessage('Нет места для резервной копии. Не закрывайте страницу до сохранения на сервере.'); }
  }, [key]);

  const flush = useCallback(async () => {
    const s = state.current;
    if (!mounted.current || !s.dirty || s.running || s.conflict || !s.ready) return;
    s.running = true;
    try {
      while (s.dirty && !s.conflict) {
        const snapshot = s.data;
        setStatus('saving');
        const response = await fetch('/api/content-workspace', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'If-Match': s.revision }, body: JSON.stringify({type:"publications.replace",input:{data:snapshot},revisions:{publications:s.revision}}) });
        if(!mounted.current)return;
        if (response.status === 409) { s.conflict = true; setStatus('conflict'); setMessage('Календарь изменился на другом устройстве. Ваши правки сохранены на этом устройстве.'); break; }
        if (!response.ok) throw new Error(response.status === 401 ? 'Войдите снова: сессия закончилась.' : 'Не удалось сохранить на сервере. Правки остаются на этом устройстве.');
        const result = await response.json();
        if (typeof result.revision !== 'string') throw new Error('Сервер ещё не обновлён для календаря. Правки сохранены на устройстве.');
        s.revision = result.revision;
        s.dirty = snapshot !== s.data;
        if (s.dirty) persistDraft();
        else { localStorage.removeItem(key); setStatus('saved'); setMessage(''); window.dispatchEvent(new CustomEvent('content-map:saved',{detail:{...result,userId}})); }
      }
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Ошибка сохранения.'); persistDraft(); }
    finally { s.running = false; }
  }, [key, persistDraft,userId]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch(endpoint, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить календарь. Попробуйте ещё раз.');
      const result = await response.json();
      if(!mounted.current)return;
      // A revision is required before writing: old deployments must not silently overwrite data.
      if (typeof result.revision !== 'string') throw new Error('Сервер календаря ещё не обновлён.');
      const server = result.data ? parsePublications(result.data) : emptyPublications;
      let draft: Draft | null = null;
      const raw = localStorage.getItem(key);
      if (raw) { const parsed = JSON.parse(raw); draft = { data: parsePublications(parsed.data), revision: parsed.revision }; }
      state.current = { data: draft?.data || server, revision: result.revision, dirty: Boolean(draft), running: false, conflict: Boolean(draft && draft.revision !== result.revision), ready: true };
      setData(state.current.data); setReady(true);
      setStatus(state.current.conflict ? 'conflict' : draft ? 'pending' : 'saved');
      setMessage(state.current.conflict ? 'Есть правки на этом устройстве и новая версия на сервере. Скачайте свои правки перед загрузкой серверной версии.' : '');
      if (draft && !state.current.conflict) void flush();
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Ошибка загрузки.'); }
  }, [key, flush]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      const s = state.current;
      if (refreshing || document.visibilityState === 'hidden' || !s.ready || s.dirty || s.running || s.conflict) return;
      const revision = s.revision;
      refreshing = true;
      try {
        const response = await fetch(endpoint, { credentials: 'include', cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        // Recheck after awaiting: a user may have started editing during the request.
        if (!active || state.current !== s || s.dirty || s.running || s.conflict || s.revision !== revision || typeof result.revision !== 'string' || result.revision === revision) return;
        const fresh = result.data ? parsePublications(result.data) : emptyPublications;
        s.data = fresh; s.revision = result.revision;
        setData(fresh);
      } catch { /* Preserve the loaded calendar through temporary connection errors. */ }
      finally { refreshing = false; }
    };
    const timer = setInterval(() => void refresh(), 20000);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible); window.addEventListener('content-map:saved', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); window.removeEventListener('content-map:saved', visible); };
  }, []);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') void flush(); };
    const online = () => void flush();
    const leave = (event: BeforeUnloadEvent) => { if (state.current.dirty) { event.preventDefault(); event.returnValue = ''; } };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('online', online); window.addEventListener('beforeunload', leave);
    return () => { clearTimeout(timer.current); document.removeEventListener('visibilitychange', hide); window.removeEventListener('online', online); window.removeEventListener('beforeunload', leave); };
  }, [flush]);

  const change = useCallback((next: PublicationState) => {
    if (approvalLock.current) return;
    if (!state.current.ready) return;
    const validated = parsePublications(next);
    state.current.data = validated; state.current.dirty = true;
    setData(validated); persistDraft();
    if (!state.current.conflict) setStatus('pending');
    clearTimeout(timer.current); timer.current = setTimeout(() => void flush(), 450);
  }, [flush, persistDraft]);

  const loadServer = async () => {
    if (state.current.running) return;
    // User explicitly chooses this after being offered a download of their local copy.
    localStorage.removeItem(key); state.current.dirty = false; await load();
  };
  const approveDay = async (date: string, format: PublicationFormat, action: 'approve' | 'unapprove') => {
    if (approvalLock.current) return;
    approvalLock.current = true; setApproving(true);
    const s = state.current;
    let ownsRequest = false;
    try {
      await flush();
      if (s.dirty || s.running || s.conflict || !s.ready) throw new Error('Сначала дождитесь сохранения правок или загрузите актуальную версию календаря.');
      s.running = true; ownsRequest = true;
      const response = await fetch('/api/publications/approval', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'If-Match': s.revision }, body: JSON.stringify({ date, format, action }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) { s.conflict = true; setStatus('conflict'); setMessage(result.message || 'Календарь обновился. Загрузите актуальную версию.'); }
        throw new Error(result.message || (response.status === 401 ? 'Войдите снова: сессия закончилась.' : 'Не удалось утвердить серию.'));
      }
      if (typeof result.revision !== 'string') throw new Error('Сервер не подтвердил сохранение. Обновите страницу и проверьте статус серии.');
      s.data = parsePublications(result.data); s.revision = result.revision;
      setData(s.data); setStatus('saved'); setMessage(''); localStorage.removeItem(key);
    } finally { if (ownsRequest) s.running = false; approvalLock.current = false; setApproving(false); }
  };
  return { data, change, ready, status, message, retry: () => state.current.ready ? flush() : load(), loadServer, approveDay, approving };
}
