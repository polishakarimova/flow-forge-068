import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Plus, Upload } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { AppBackButton } from '@/components/AppBackButton';
import { useAuth } from '@/lib/authContext';
import { usePublications } from '@/hooks/usePublications';
import { dayKey, validDate, mergePublications, movePublications, parsePublications, publicationFormats, uid, kaliningradTime, scheduleInKaliningrad, type Publication, type PublicationFormat, type PublicationPart, type PublicationState } from '@/lib/publications';
import Calendar from './Calendar';
import {useEditorial} from '@/lib/editorialContext';
import {WeeklyFocus} from '@/components/content/WeeklyFocus';
import './editorial.css';
import './publications.css';

type View = { date: string; month: string; screen: 'month' | 'day' | 'publication'; item: string; open: string[]; lastCopied: string; scroll: number };
type ThreadsStatus = { available: boolean; connected: boolean; username: string | null; queue: { publication_id: string; part_id: string; status: string }[] };
function defaultView(): View { const date = dayKey(new Date()); return { date, month: date.slice(0, 7), screen: 'month', item: '', open: [], lastCopied: '', scroll: 0 }; }
function readView(key: string): View { try { return { ...defaultView(), ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return defaultView(); } }
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'short' });
const done = (item: Publication) => item.parts.every(p => p.published);
function download(data: PublicationState) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'calendar-publications.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Publications() {
  const [params] = useSearchParams();
  const { user, isLoading } = useAuth();
  if (params.get('view') === 'legacy') return <><Link className="pub-legacy-link" to="/calendar">← Публикации</Link><Calendar /></>;
  if (isLoading) return <div className="p-6 text-sm">Загружаем календарь…</div>;
  if (!user) return <div className="p-6 max-w-sm mx-auto"><h1 className="text-lg font-semibold">Календарь публикаций</h1><p className="text-sm my-3">Войдите через Telegram, чтобы открыть свои тексты.</p><Link className="text-primary underline" to="/login?returnTo=%2Fcalendar">Войти через Telegram</Link></div>;
  return <Workspace key={user.id} userId={user.id} />;
}

function Workspace({ userId }: { userId: string }) {
  const [entryParams, setEntryParams] = useSearchParams();
  const store = usePublications(userId);
  const editorial=useEditorial();
  const pendingSlots=(editorial.data?.main.editorial?.slots||[]).filter(s=>s.date&&!s.selectedId);
  const openMaterial=(id:number)=>{const n=new URLSearchParams(entryParams);n.set('material',String(id));setEntryParams(n);};
  const key = `karta-publications-view:${userId}`;
  const [view, setView] = useState<View>(() => readView(key));
  const viewRef = useRef(view); viewRef.current = view;
  const [dialog, setDialog] = useState<'add' | 'import' | 'move' | 'server' | null>(null);
  const [moveWholeDay,setMoveWholeDay]=useState(false);
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState(view.date);
  const [format, setFormat] = useState<PublicationFormat>('Сторис');
  const [title, setTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState('');
  const [threadsStatus, setThreadsStatus] = useState<ThreadsStatus | null>(null);
  const originals = useRef<Record<string, string>>({});
  const lastTap = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const item = store.data.items.find(i => i.id === view.item);
  const dayItems = store.data.items.filter(i => i.date === view.date);
  const dayDone = dayItems.filter(done).length;
  async function approveDay(format: PublicationFormat, action: 'approve' | 'unapprove') {
    setError('');
    try { await store.approveDay(view.date, format, action); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось утвердить серию.'); }
  }
  function approvalControls(format: PublicationFormat) {
    if(['YouTube','Пост Инста','Статья','ВК'].includes(format))return <p className="ed-note">Подготовь материал и отметь публикацию после выхода.</p>;
    const parts = dayItems.filter(i => i.format === format).flatMap(i => i.parts).filter(p => !p.published);
    const approved = parts.length > 0 && parts.every(p => p.approvalStatus === 'approved');
    const count = dayItems.filter(i => i.format === format).reduce((n, i) => n + i.parts.length, 0);
    return <div className="pub-series-approval" aria-label={`Утверждение серии: ${format}`}>
      <div className="pub-series-heading"><strong>{format}</strong><span>{count} блоков · {parts.length ? approved ? 'Утверждено' : 'Ждёт утверждения' : 'Выложено'}</span></div>
      {parts.length > 0 && <>
        <button className={approved ? 'pub-series-cancel' : 'pub-series-submit'} disabled={store.approving || store.status !== 'saved'} onClick={() => void approveDay(format, approved ? 'unapprove' : 'approve')}>
          {store.approving ? 'Сохраняем…' : approved ? 'Снять утверждение' : 'Утвердить серию на день'}
        </button>
        <p>{format === 'Threads' ? approved ? 'Оставшиеся посты стоят в очереди по расписанию. Время — по Калининграду.' : 'После утверждения все посты Threads на этот день выйдут по расписанию.' : 'Утверждение сохраняется для всей серии. Автопостинг этого формата ещё не подключён.'}</p>
      </>}
    </div>;
  }
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      fetch('/api/threads/status', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => { if (active && data) setThreadsStatus(data); }).catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  // Navigation targets from Home; the calendar's UI and edit/save logic are unchanged.
  useEffect(() => {
    const date = entryParams.get('date');
    const itemId = entryParams.get('item');
    const add = entryParams.get('action') === 'add';
    if (!date && !itemId && !add) return;
    if (!store.ready) return;
    const target = itemId ? store.data.items.find(item => item.id === itemId) : undefined;
    const targetDate = target?.date || (date && validDate(date) ? date : dayKey(new Date()));
    setView(current => ({ ...current, date: targetDate, month: targetDate.slice(0, 7), item: target?.id || '', screen: target ? 'publication' : 'day', scroll: 0 }));
    setTargetDate(targetDate);
    if (add) { setError(''); setDialog('add'); }
    const next = new URLSearchParams(entryParams); next.delete('date'); next.delete('item'); next.delete('action');
    setEntryParams(next, { replace: true });
  }, [entryParams, setEntryParams, store.ready, store.data.items]);

  useEffect(() => {
    const persist = () => { try { localStorage.setItem(key, JSON.stringify({ ...viewRef.current, scroll: window.scrollY })); } catch { /* View memory must not block editing. */ } };
    const restore = requestAnimationFrame(() => window.scrollTo(0, viewRef.current.scroll));
    window.addEventListener('scroll', persist, { passive: true }); window.addEventListener('pagehide', persist);
    return () => { cancelAnimationFrame(restore); persist(); window.removeEventListener('scroll', persist); window.removeEventListener('pagehide', persist); };
  }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ ...view, scroll: window.scrollY })); } catch { /* Optional preferences. */ } }, [key, view]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (store.ready) requestAnimationFrame(() => window.scrollTo(0, viewRef.current.scroll)); }, [store.ready]);

  function navigate(next: Partial<View>) { setEditing(''); setView(v => ({ ...v, ...next, scroll: 0 })); window.scrollTo(0, 0); }
  function update(next: PublicationState) { try { store.change(next); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Проверьте публикацию.'); return false; } }
  function patchPart(id: string, patch: Partial<PublicationPart>) {
    if (!item) return;
    update({ ...store.data, items: store.data.items.map(i => i.id === item.id ? { ...i, parts: i.parts.map(p => p.id === id ? { ...p, ...patch, approvalStatus: patch.text !== undefined || patch.scheduledAt !== undefined ? 'draft' : p.approvalStatus } : p) } : i) });
  }
  function togglePart(part: PublicationPart) { patchPart(part.id, { published: !part.published }); setNotice(part.published ? 'Отметка снята' : 'Отмечено как выложено'); }
  function tapPart(part: PublicationPart) {
    const id = `${item?.id}:${part.id}`; const now = Date.now();
    if (lastTap.current.id === id && now - lastTap.current.time < 350) { togglePart(part); lastTap.current = { id: '', time: 0 }; return; }
    lastTap.current = { id, time: now };
    setView(v => ({ ...v, open: v.open.includes(id) ? v.open.filter(x => x !== id) : [...v.open, id] }));
  }
  async function copy(part: PublicationPart) {
    try { await navigator.clipboard.writeText(part.text); setView(v => ({ ...v, lastCopied: `${item?.id}:${part.id}` })); setNotice('Текст скопирован'); }
    catch { setNotice('Не удалось скопировать. Раскройте и выделите текст.'); }
  }
  function openMove(ids: string[],whole=false) { setMoveWholeDay(whole);setError(''); setTargetDate(view.date); setMoveIds(ids); setDialog('move'); }
  function addPublication() {
    if (!title.trim()) { setError('Напишите название публикации.'); return; }
    const existing = store.data.items.find(i => i.date === view.date && i.format === 'Сторис');
    if (format === 'Сторис' && existing) { setDialog(null); navigate({ item: existing.id, screen: 'publication' }); return; }
    const next: Publication = { id: uid(), date: view.date, format, title: title.trim(), parts: [{ id: uid(), text: '', published: false }] };
    if (update({ ...store.data, items: [...store.data.items, next] })) { setDialog(null); setTitle(''); navigate({ item: next.id, screen: 'publication', open: [`${next.id}:${next.parts[0].id}`] }); }
  }
  function importCalendar() {
    try { const incoming = parsePublications(JSON.parse(importText)); store.change(mergePublications(store.data, incoming)); setDialog(null); setImportText(''); setNotice('Материалы добавлены. Ваши правки сохранены.'); if (incoming.items[0]) navigate({ date: incoming.items[0].date, month: incoming.items[0].date.slice(0, 7), screen: 'day' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось прочитать файл.'); }
  }
  const [year, month] = view.month.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const rows = Math.ceil((offset + new Date(year, month, 0).getDate()) / 7);
  const previewLimit = rows === 6 ? 2 : 3;
  const cells = Array.from({ length: rows * 7 }, (_, i) => new Date(year, month - 1, i - offset + 1));
  const savedLabel = { loading: 'Загрузка…', saved: 'Сохранено', pending: 'Сохраняем…', saving: 'Сохраняем…', error: 'Не сохранено', conflict: 'Есть новая версия' }[store.status];

  return <SidebarProvider><div className="pub-app min-h-screen flex w-full bg-background" data-save-state={store.status}>
    <div className="hidden md:block"><AppSidebar /></div>
    <div className="pub-workspace">
      <header className="pub-header surface-glass">
        <div className="pub-heading"><div className="flex items-center gap-2"><AppBackButton onBack={view.screen !== 'month' ? () => navigate({ screen: view.screen === 'publication' ? 'day' : 'month' }) : undefined}/><div><h1>Календарь</h1>{store.status !== 'saved' && <span className="pub-save" role="status">{savedLabel}</span>}</div></div>
          <div className="pub-tools"><button className="pub-primary" aria-label="Новая публикация" onClick={() => { setError(''); setDialog('add'); }} disabled={!store.ready || store.approving}><Plus /></button></div>
        </div>
        <div className="pub-tabs"><span aria-current="page">Публикации</span><Link to="/calendar?view=legacy">Общий календарь</Link></div>
      </header>
      <main className="pub-main" aria-busy={store.approving}><fieldset className="pub-edit-lock" disabled={store.approving}>
        {store.message && <div className="pub-warning" role="alert">{store.message}<div>{store.status === 'conflict' ? <><button onClick={() => download(store.data)}>Скачать мои правки</button><button onClick={() => setDialog('server')}>Загрузить с сервера</button></> : <button onClick={() => void store.retry()}>Повторить</button>}</div></div>}
        {error && !dialog && <p role="alert" className="pub-warning">{error}</p>}
        {store.ready && <>
          {view.screen === 'month' ? <>
            <div className="pub-month-title"><h2>{first.toLocaleDateString('ru', { month: 'long', year: 'numeric' }).replace(' г.', '')}</h2><div className="pub-tools"><button onClick={() => navigate({ month: dayKey(new Date()).slice(0, 7), date: dayKey(new Date()) })}>Сегодня</button><button aria-label="Предыдущий месяц" onClick={() => navigate({ month: dayKey(new Date(year, month - 2, 1)).slice(0, 7) })}><ChevronLeft /></button><button aria-label="Следующий месяц" onClick={() => navigate({ month: dayKey(new Date(year, month, 1)).slice(0, 7) })}><ChevronRight /></button></div></div>
            <div className="pub-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="pub-grid" data-rows={rows} style={{ '--month-rows': rows } as CSSProperties}>{cells.map(date => { const key = dayKey(date); const list = store.data.items.filter(i => i.date === key); return <button key={key} className={`pub-cell ${date.getMonth() !== month - 1 ? 'pub-outside' : ''} ${key === dayKey(new Date()) ? 'pub-today' : ''}`} aria-label={`${dateLabel(key)}, публикаций и мест для выбора: ${list.length+pendingSlots.filter(s=>s.date===key).length}`} onClick={() => navigate({ date: key, screen: 'day' })}><span className="pub-day-number">{date.getDate()}</span><span className="pub-cell-items">{list.slice(0, previewLimit).map(i => <span key={i.id} className={`pub-chip pub-type-${publicationFormats.indexOf(i.format)} ${done(i) ? 'pub-done-chip' : ''}`}>{done(i) ? '✓ ' : ''}{i.format}</span>)}{pendingSlots.filter(s=>s.date===key).map(s=><span key={s.id} className="pub-chip">Выбрать сценарий</span>)}{list.length > previewLimit && <span className="pub-more">ещё {list.length - previewLimit}</span>}</span></button>; })}</div>
            <div className="pub-month-summary"><CalendarDays size={15} /><span>{store.data.items.filter(i => i.date.startsWith(view.month)).length} публикаций в этом месяце</span></div>
            <details className="text-xs text-muted-foreground mb-3"><summary className="cursor-pointer py-2">Работа с файлами</summary><div className="flex flex-wrap gap-4 py-2"><button className="inline-flex items-center gap-1 min-h-9" onClick={() => download(store.data)}><Download size={14}/>Скачать календарь</button><button className="inline-flex items-center gap-1 min-h-9" onClick={() => { setError(''); setDialog('import'); }}><Upload size={14}/>Загрузить контент</button></div></details>
            {!store.data.items.length && <div className="pub-empty"><h3>Здесь будет твой контент</h3><p>Выбери день и добавь публикацию или загрузи подготовленные тексты.</p><button onClick={() => { setError(''); setDialog('import'); }}>Загрузить контент <Upload size={14} /></button></div>}
          </> : <>
            <div className="pub-breadcrumb"><button onClick={() => navigate({ screen: view.screen === 'publication' ? 'day' : 'month' })}><ArrowLeft />{view.screen === 'publication' ? dateLabel(view.date) : 'Месяц'}</button>{view.screen === 'day' && (dayItems.length > 0||pendingSlots.some(s=>s.date===view.date)) && <button onClick={() => openMove(dayItems.map(i => i.id),true)}>Перенести день</button>}</div>
            {view.screen === 'day' ? <>
              <WeeklyFocus date={view.date}/>
              {pendingSlots.filter(s=>s.date===view.date).map(s=><button key={s.id} className="ed-row bg-card border rounded-xl mb-2" onClick={()=>{const n=new URLSearchParams(entryParams);n.set('slot',s.id);n.set('material',String(s.recommendedId||s.variantIds[0]));setEntryParams(n);}}><span>{s.title}<small>Нужно выбрать сценарий · {s.variantIds.length} варианта</small></span></button>)}
              <div className="pub-day-title"><h2>{dateLabel(view.date)}</h2><span>{dayDone} из {dayItems.length+pendingSlots.filter(s=>s.date===view.date).length} выложено</span></div>
              <div className="pub-day-series">{publicationFormats.filter(f => dayItems.some(i => i.format === f)).map(f => <section className="pub-series" key={f}>
                {approvalControls(f)}
                <div className="pub-list">{dayItems.filter(i => i.format === f).map(i => <button key={i.id} className={`pub-publication ${done(i) ? 'pub-completed' : ''}`} onClick={() => i.contentItemId ? openMaterial(i.contentItemId) : navigate({ screen: 'publication', item: i.id })}><span className={`pub-format-mark pub-type-${publicationFormats.indexOf(i.format)}`}>{publicationFormats.indexOf(i.format) === 0 ? '▶' : i.format.slice(0, 1)}</span><span className="pub-publication-copy"><strong>{i.title}</strong><small>{i.parts.length} блоков · {i.parts.filter(p => p.published).length} выложено</small></span><ChevronRight size={16} /></button>)}</div>
              </section>)}</div>
              {!dayItems.length && !pendingSlots.some(s=>s.date===view.date) && <div className="pub-empty"><h3>День свободен</h3><p>Добавь первый материал на эту дату.</p></div>}
              <button className="pub-add-row" onClick={() => { setError(''); setDialog('add'); }}><Plus />Добавить публикацию</button>
            </> : item ? <>
              <div className="pub-detail-title"><div><span className={`pub-chip pub-type-${publicationFormats.indexOf(item.format)}`}>{item.format}</span><h2>{item.title}</h2></div><button onClick={() => openMove([item.id])} title="Перенести публикацию"><CalendarDays size={16} /></button></div>
              {item.contentItemId&&<button className="pub-add-row" onClick={()=>openMaterial(item.contentItemId!)}>Открыть сценарий и графику →</button>}
              <div className="pub-progress"><span>{item.parts.filter(p => p.published).length} из {item.parts.length} выложено</span><span>Двойной тап — «Выложено»</span></div>
              {approvalControls(item.format)}
              {item.format === 'Threads' && <div className="pub-schedule-note"><p>Время по Калининграду. Изменение текста или времени снимает утверждение этого поста: после правок утвердите серию заново.</p>{threadsStatus && <p>{threadsStatus.connected ? `Аккаунт подключён: @${threadsStatus.username}` : threadsStatus.available ? <a href="/api/threads/connect">Подключить аккаунт Threads</a> : 'Подключение Threads API ещё настраивается.'}</p>}</div>}
              <div className="pub-parts">{item.parts.map((part, index) => {
                const id = `${item.id}:${part.id}`; const expanded = view.open.includes(id); const edit = editing === part.id;
                const label = item.format === 'Сторис' ? `Сторис ${index + 1}` : item.format === 'Карусель' ? `Слайд ${index + 1}` : item.format === 'Threads' ? `Пост ${index + 1}` : `Блок ${index + 1}`;
                return <section key={part.id} className={`pub-part ${part.published ? 'pub-part-done' : ''} ${expanded ? 'pub-part-open' : ''}`}>
                  <div className="pub-part-top"><button className="pub-part-toggle" aria-expanded={expanded} aria-label={`${label}: ${expanded ? 'свернуть' : 'раскрыть'}`} onClick={() => tapPart(part)}><span>{label}</span>{item.format === 'Threads' && part.scheduledAt && <span className="pub-part-time">{kaliningradTime(part.scheduledAt)}</span>}<ChevronDown className={expanded ? 'pub-rotated' : ''} size={14} /><span className="pub-part-labels">{view.lastCopied === id && <small>Скопировано</small>}{part.published && <small><Check size={11} /> Выложено</small>}</span></button><button className="pub-copy" aria-label={`Скопировать ${label.toLowerCase()}`} onClick={() => void copy(part)}><Copy size={15} /></button></div>
                  {item.format === 'Threads' && <div className="pub-part-schedule"><label>Время публикации <input type="time" aria-label={`Время публикации: ${label}`} value={kaliningradTime(part.scheduledAt)} onChange={e => patchPart(part.id, { scheduledAt: e.target.value ? scheduleInKaliningrad(item.date, e.target.value) : undefined })} /></label><small>{(() => { const status = threadsStatus?.queue.find(q => q.publication_id === item.id && q.part_id === part.id)?.status; return status === 'published' ? 'Опубликовано' : status === 'missed' ? 'Время прошло' : status === 'uncertain' ? 'Проверьте отправку' : status === 'stale' ? 'Изменено после утверждения' : status === 'blocked' ? 'Нет подключения' : part.approvalStatus === 'approved' ? 'Утверждено' : 'Ожидает утверждения'; })()}</small></div>}
                  {edit ? <textarea className="pub-editor" aria-label={`Текст: ${label}`} autoFocus value={part.text} onChange={e => patchPart(part.id, { text: e.target.value, previousText: originals.current[id] })} /> : <div className={`pub-text ${expanded ? '' : 'pub-text-preview'}`} onDoubleClick={() => { if (!window.getSelection()?.toString()) togglePart(part); }}>{part.text || 'Нажми «Изменить», чтобы добавить текст.'}</div>}
                  <div className="pub-part-actions">{part.contentItemId&&<button onClick={()=>openMaterial(part.contentItemId!)}>Сценарий и графика</button>}<button onClick={() => { if(part.contentItemId){openMaterial(part.contentItemId);return;} if (edit) setEditing(''); else { originals.current[id] = part.text; setEditing(part.id); setView(v => ({ ...v, open: [...new Set([...v.open, id])] })); } }}>{edit ? 'Готово' : 'Изменить'}</button><button onClick={() => togglePart(part)}>{part.published ? 'Снять отметку' : 'Отметить как выложено'}</button>{part.previousText !== undefined && <button onClick={() => { patchPart(part.id, { text: part.previousText!, previousText: undefined }); setEditing(''); }}>Отменить правку</button>}</div>
                  {part.incomingText !== undefined && <div className="pub-version"><strong>Есть новый вариант текста</strong><p>{part.incomingText}</p><div><button onClick={() => patchPart(part.id, { incomingText: undefined, sourceText: part.incomingText })}>Оставить мой</button><button onClick={() => patchPart(part.id, { text: part.incomingText!, sourceText: part.incomingText, previousText: part.text, incomingText: undefined })}>Принять новый</button></div></div>}
                </section>;
              })}</div>
              {!item.parts.some(p=>p.contentItemId)&&<button className="pub-add-row" onClick={() => update({ ...store.data, items: store.data.items.map(i => i.id === item.id ? { ...i, parts: [...i.parts, { id: uid(), text: '', published: false }] } : i) })}><Plus />Добавить блок</button>}
            </> : <button className="pub-add-row" onClick={() => navigate({ screen: 'day' })}>Вернуться к дню</button>}
          </>}
        </>}
      </fieldset></main>
    </div><MobileNav />
    {notice && <div className="pub-toast" role="status">{notice}</div>}
    <Dialog open={Boolean(dialog)} onOpenChange={open => { if (!open) { setDialog(null); setError(''); } }}><DialogContent className="pub-dialog"><DialogTitle>{dialog === 'add' ? 'Новая публикация' : dialog === 'import' ? 'Загрузить контент' : dialog === 'server' ? 'Открыть серверную версию?' : 'Перенести'}</DialogTitle><DialogDescription>{dialog === 'add' ? dateLabel(view.date) : dialog === 'import' ? 'Файл или JSON из нашего чата. Текущие материалы останутся на месте.' : dialog === 'server' ? 'Несохранённые правки на устройстве будут заменены. Сначала скачайте свою копию.' : moveIds.length > 1 ? `Публикаций: ${moveIds.length}. Материалы на новой дате сохранятся.` : 'Выберите новую дату публикации.'}</DialogDescription>
      {dialog === 'add' && <><label>Формат<select value={format} onChange={e => setFormat(e.target.value as PublicationFormat)}>{publicationFormats.map(f => <option key={f}>{f}</option>)}</select></label><label>Название<input value={title} onChange={e => setTitle(e.target.value)} placeholder="О чём публикация?" /></label><button className="pub-submit" onClick={addPublication}>Добавить</button></>}
      {dialog === 'import' && <><input aria-label="Файл календаря" type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 3_000_000) { setError('Файл слишком большой: максимум 3 МБ.'); return; } setImportText(await file.text()); }} /><textarea aria-label="JSON календаря" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Или вставьте подготовленный JSON" /><button className="pub-submit" disabled={!importText.trim()} onClick={importCalendar}>Добавить в календарь</button></>}
      {dialog === 'move' && <><label>Новая дата<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label><button className="pub-submit" disabled={store.status!=='saved'||editorial.busy} onClick={async() => { try { if(moveWholeDay){await editorial.command('day.move',{from:view.date,date:targetDate});await store.loadServer();}else store.change(movePublications(store.data, moveIds, targetDate)); setDialog(null); navigate({ date: targetDate, month: targetDate.slice(0, 7) }); setNotice('Перенесено'); } catch(e) { setError((e as Error).message); } }}>Перенести</button></>}
      {dialog === 'server' && <><button onClick={() => download(store.data)}>Скачать мои правки</button><button className="pub-submit" onClick={() => { setDialog(null); void store.loadServer(); }}>Загрузить версию с сервера</button></>}
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
    </DialogContent></Dialog>
  </div></SidebarProvider>;
}
