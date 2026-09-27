import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyPublications, parsePublications, type PublicationState } from '@/lib/publications';

type Status = 'loading' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict';
type Draft = { data: PublicationState; revision: string };
const endpoint = '/api/state/publications';
export function usePublications(userId: string) {
  const [data, setData] = useState<PublicationState>(emptyPublications);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const state = useRef({ data: emptyPublications, revision: 'new', dirty: false, running: false, conflict: false, ready: false });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const key = `karta-publications-draft:${userId}`;
  const persistDraft = useCallback(() => {
    try { localStorage.setItem(key, JSON.stringify({ data: state.current.data, revision: state.current.revision })); }
    catch { setMessage('Нет места для резервной копии. Не закрывайте страницу до сохранения на сервере.'); }
  }, [key]);

  const flush = useCallback(async () => {
    const s = state.current;
    if (!s.dirty || s.running || s.conflict || !s.ready) return;
    s.running = true;
    try {
      while (s.dirty && !s.conflict) {
        const snapshot = s.data;
        setStatus('saving');
        const response = await fetch(endpoint, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'If-Match': s.revision }, body: JSON.stringify({ data: snapshot }) });
        if (response.status === 409) { s.conflict = true; setStatus('conflict'); setMessage('Календарь изменился на другом устройстве. Ваши правки сохранены на этом устройстве.'); break; }
        if (!response.ok) throw new Error(response.status === 401 ? 'Войдите снова: сессия закончилась.' : 'Не удалось сохранить на сервере. Правки остаются на этом устройстве.');
        const result = await response.json();
        if (typeof result.revision !== 'string') throw new Error('Сервер ещё не обновлён для календаря. Правки сохранены на устройстве.');
        s.revision = result.revision;
        s.dirty = snapshot !== s.data;
        if (s.dirty) persistDraft();
        else { localStorage.removeItem(key); setStatus('saved'); setMessage(''); }
      }
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Ошибка сохранения.'); persistDraft(); }
    finally { s.running = false; }
  }, [key, persistDraft]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch(endpoint, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить календарь. Попробуйте ещё раз.');
      const result = await response.json();
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
    const hide = () => { if (document.visibilityState === 'hidden') void flush(); };
    const online = () => void flush();
    const leave = (event: BeforeUnloadEvent) => { if (state.current.dirty) { event.preventDefault(); event.returnValue = ''; } };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('online', online); window.addEventListener('beforeunload', leave);
    return () => { clearTimeout(timer.current); void flush(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('online', online); window.removeEventListener('beforeunload', leave); };
  }, [flush]);

  const change = useCallback((next: PublicationState) => {
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
  return { data, change, ready, status, message, retry: () => state.current.ready ? flush() : load(), loadServer };
}
