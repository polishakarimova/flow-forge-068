import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Bot, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, GitBranch, Loader2, Package, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBackButton } from '@/components/AppBackButton';
import { MobileNav } from '@/components/MobileNav';
import { useAuth } from '@/lib/authContext';
import { adminDate, adminNumber as num, adminPercent as percent, type AdminOverview } from '@/lib/admin';

const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';
const panel = 'rounded-2xl border border-border bg-card p-4 md:p-5 min-w-0';
const errorMessages: Record<string, string> = { unauthorized: 'Войдите через Telegram под аккаунтом администратора.', forbidden: 'Для этого Telegram-аккаунта доступ администратора не выдан.', admin_reauthentication_required: 'Подтвердите вход ещё раз. Административный доступ действует 15 минут и закрывается после 5 минут бездействия.', server_error: 'Не удалось прочитать показатели. Повторите загрузку чуть позже.' };
function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className={panel}><h2 className="text-sm font-semibold">{title}</h2>{note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>}<div className="mt-4">{children}</div></section>;
}
function Meter({ label, value, total }: { label: string; value: number; total: number }) {
  return <div><div className="flex items-start justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className="shrink-0 font-medium tabular-nums">{num(value)} <span className="text-muted-foreground font-normal">/ {num(total)}</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={Math.max(total, 1)}><div className="h-full rounded-full bg-primary/65" style={{ width: `${Math.min(100, percent(value, total))}%` }} /></div></div>;
}
function Pair({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0 text-xs"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium tabular-nums">{value}</span></div>;
}
function Overview({ data }: { data: AdminOverview }) {
  const { totals: t, audience: a } = data;
  const cards = [
    { label: 'Всего пользователей', value: t.users, note: `+${num(a.newUsers)} за ${data.period.days} дней`, icon: Users },
    { label: 'Активны за период', value: a.activeUsers, note: 'Вход или сохранение материалов', icon: Activity },
    { label: 'Собрали рабочую карту', value: a.adoption.complete, note: 'Есть продукт, контент и воронка', icon: GitBranch },
    { label: 'Подключено агентов', value: data.agents.connected, note: `У ${num(data.agents.owners)} пользователей`, icon: Bot },
  ];
  const totals = [{ label: 'Продукты', value: t.products, icon: Package }, { label: 'Идеи', value: t.ideas, icon: FileText }, { label: 'Материалы', value: t.contentItems, icon: FileText }, { label: 'Воронки', value: t.funnels, icon: GitBranch }, { label: 'Кодовые слова', value: t.keywords, icon: FileText }, { label: 'В календаре', value: t.calendarItems, icon: CalendarDays }];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">{cards.map(({ label, value, note, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-3.5 md:p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" /><span>{label}</span></div><div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{num(value)}</div><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{note}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Section title="Регистрации и входы" note="Входы — уникальные пользователи за день. Время — Калининград."><div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" />Новые пользователи</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary/30" />Входили в приложение</span></div>
        <div className="h-44 w-full" data-testid="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={a.daily} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={v => String(v).slice(8) + '.' + String(v).slice(5, 7)} tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip labelFormatter={v => adminDate(String(v))} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} /><Bar dataKey="registrations" name="Новые пользователи" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} /><Bar dataKey="signIns" name="Входили" fill="hsl(var(--primary) / 0.3)" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        <p className="mt-3 text-[11px] text-muted-foreground">История входов собирается с {adminDate(data.system.loginHistorySince)}. Более ранние входы не восстановлены.</p>
      </Section>
      <Section title="Как осваивают Карту" note="Пользователи каждого раздела. Состояние на сейчас."><div className="space-y-4"><Meter label="Создали продукт" value={a.adoption.withProducts} total={t.users} /><Meter label="Добавили контент" value={a.adoption.withContent} total={t.users} /><Meter label="Собрали воронку" value={a.adoption.withFunnels} total={t.users} /><Meter label="Есть все три раздела" value={a.adoption.complete} total={t.users} /><p className="text-[11px] text-muted-foreground">Пока не начали: {num(a.adoption.empty)} · Вернулись за период: {num(a.returningUsers)}</p></div></Section>
    </div>
    <section className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Использование функций</h2><span className="text-[11px] text-muted-foreground">Суммарные счётчики по всем пользователям</span></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">{totals.map(({ label, value, icon: Icon }) => <div key={label}><p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 text-xl font-semibold tabular-nums">{num(value)}</p></div>)}</div></section>

  </div>;
}
function UserList({ data }: { data: AdminOverview }) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [page, setPage] = useState(0), [expanded, setExpanded] = useState('');
  const users = useMemo(() => data.users.filter(u => {
    const match = [u.name, u.telegramUsername, u.telegramId].some(v => v.toLowerCase().includes(search.trim().toLowerCase()));
    const empty = !u.stats.products && !u.stats.contentItems && !u.stats.ideas && !u.stats.topics && !u.stats.funnels && !u.stats.calendarItems;
    return match && (filter === 'all' || (filter === 'active' ? u.active : filter === 'agents' ? u.connectedAgents > 0 : empty));
  }), [data.users, search, filter]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(users.length / 20) - 1));
  return <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="p-4"><h2 className="text-sm font-semibold">Пользователи <span className="ml-1 text-muted-foreground font-normal">{num(users.length)}</span></h2><div className="mt-3 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Поиск пользователей" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Имя, @username или Telegram ID" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary" />{search && <button className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center" aria-label="Очистить поиск" onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}</div><select aria-label="Фильтр пользователей" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} className="h-10 rounded-xl border border-border bg-background px-3 text-xs"><option value="all">Все пользователи</option><option value="active">Активны за период</option><option value="empty">Пока не начали</option><option value="agents">С агентами</option></select></div></div>
    <div className="hidden grid-cols-[minmax(160px,1.5fr)_repeat(3,80px)_150px_20px] gap-3 border-y border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground lg:grid"><span>Пользователь</span><span>Продукты</span><span>Контент</span><span>Воронки</span><span>Последняя активность</span><span /></div>
    {!users.length ? <p className="p-8 text-center text-sm text-muted-foreground">{search || filter !== 'all' ? 'Нет пользователей по этому запросу.' : 'Пользователи ещё не зарегистрировались.'}</p> : users.slice(currentPage * 20, currentPage * 20 + 20).map(u => <div key={u.id} className="border-b border-border last:border-0"><button type="button" aria-expanded={expanded === u.id} onClick={() => setExpanded(expanded === u.id ? '' : u.id)} className="grid w-full grid-cols-[1fr_20px] items-center gap-2 p-4 text-left hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:grid-cols-[minmax(160px,1.5fr)_repeat(3,80px)_150px_20px] lg:gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{u.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u.telegramUsername || 'Telegram · ' + (u.telegramId || 'Нет контакта')}</p></div><ChevronDown className={`h-4 w-4 text-muted-foreground lg:order-last ${expanded === u.id ? 'rotate-180' : ''}`} /><span className="hidden text-xs lg:block">{num(u.stats.products)}</span><span className="hidden text-xs lg:block">{num(u.stats.contentItems)}</span><span className="hidden text-xs lg:block">{num(u.stats.funnels)}</span><span className="col-span-2 text-[11px] text-muted-foreground lg:col-span-1">{adminDate(u.lastActivityAt, true)}{u.active && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" aria-label="Активен за период" />}</span><span className="col-span-2 text-[11px] text-muted-foreground lg:hidden">Продукты {num(u.stats.products)} · Контент {num(u.stats.contentItems)} · Воронки {num(u.stats.funnels)}</span></button>{expanded === u.id && <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border bg-muted/20 p-4 text-xs md:grid-cols-4">{[{ label: 'Регистрация', value: adminDate(u.createdAt) }, { label: 'Последнее сохранение', value: adminDate(u.stateUpdatedAt, true) }, { label: 'Идеи / кодовые слова', value: `${num(u.stats.ideas)} / ${num(u.stats.keywords)}` }, { label: 'Календарь / агенты', value: `${num(u.stats.calendarItems)} / ${num(u.connectedAgents)}` }].map(row => <div key={row.label}><p className="text-muted-foreground">{row.label}</p><p className="mt-1">{row.value}</p></div>)}<div className="col-span-2 break-all text-muted-foreground">Telegram ID: {u.telegramId || 'Не привязан'}</div></div>}</div>)}
    {users.length > 20 && <div className="flex items-center justify-between gap-2 p-3"><span className="text-xs text-muted-foreground">Страница {currentPage + 1} из {Math.ceil(users.length / 20)}</span><div className="flex gap-2"><button className={button} disabled={!currentPage} onClick={() => setPage(currentPage - 1)} aria-label="Предыдущая страница"><ChevronLeft className="h-4 w-4" /></button><button className={button} disabled={(currentPage + 1) * 20 >= users.length} onClick={() => setPage(currentPage + 1)} aria-label="Следующая страница"><ChevronRight className="h-4 w-4" /></button></div></div>}
  </section>;
}
function System({ data }: { data: AdminOverview }) {
  const { system: s, publishing: p, agents: a } = data;
  const queueLabels: Record<string, string> = { ready: 'Ожидают отправки', sending: 'Отправляются', published: 'Отправлены', uncertain: 'Нужно проверить отправку', missed: 'Пропущено время', stale: 'Изменены после утверждения', blocked: 'Заблокированы', failed: 'Ошибка' };
  return <div className="grid gap-4 lg:grid-cols-2"><Section title="Состояние сервиса" note="Показатели на момент обновления панели."><Pair label="Сервер и база данных" value={<span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" />Работают</span>} /><Pair label="Чтение показателей" value={`${num(s.databaseMs)} мс`} /><Pair label="Сервер после перезапуска" value={`${num(Math.floor(s.uptimeSeconds / 3600))} ч ${Math.floor(s.uptimeSeconds / 60) % 60} мин`} /><Pair label="Приём сообщений Telegram" value={s.telegramMode === 'polling' ? 'Опрос Telegram' : 'Входящие события'} /><Pair label="Отправка Threads по расписанию" value={s.autopublishEnabled ? 'Включена' : 'Выключена'} /><Pair label="Зарубежный отправщик" value={s.remotePublisherEnabled ? 'Включён' : 'Выключен'} /><Pair label="Работающие отправщики" value={num(p.healthyWorkers)} /><Pair label="Подключено аккаунтов Threads" value={num(p.threadsConnected)} /><p className="mt-3 text-[11px] text-muted-foreground">Доступность сети Telegram и резервные копии этой панелью отдельно не проверяются.</p></Section>
    <Section title="Очередь публикаций" note="Фактические задания отправки. Дата в календаре сама по себе не создаёт отправку.">{Object.keys(p.queue).length ? Object.entries(p.queue).map(([key, count]) => <Pair key={key} label={queueLabels[key] || 'Другой статус'} value={num(count)} />) : <p className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">Очередь пуста. Заданий на автоматическую отправку нет.</p>}</Section>
    <Section title="Действия агентов" note={`За ${data.period.days} дней: ${num(a.actions)} сохранений. Показаны последние 12.`}><Pair label="Активные подключения" value={num(a.connected)} />{a.recent.length ? <ul className="mt-3 divide-y divide-border">{a.recent.map((row, i) => <li key={i} className="py-2.5"><div className="flex items-start justify-between gap-3 text-xs"><span className="break-words font-medium">{row.name}</span><time className="shrink-0 text-[11px] text-muted-foreground">{adminDate(row.createdAt, true)}</time></div><p className="mt-1 text-[11px] text-muted-foreground">Сохранение в Карте</p></li>)}</ul> : <p className="mt-3 text-xs text-muted-foreground">За этот период агенты ещё не сохраняли изменения.</p>}</Section>
    <Section title="Подключения и доступ"><Pair label="Оплата сервиса" value="Не подключена" /><Pair label="Рассылки" value="Не подключены" /><Pair label="Вход администратора" value="Через Telegram" /><Pair label="Срок доступа" value="15 минут" /><Pair label="Закрытие при бездействии" value="Через 5 минут" /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Кнопка в боте открывает этот экран. Сервер проверяет доступ по разрешённому Telegram-аккаунту.</p></Section>
  </div>;
}
export default function Admin() {
  const { logout, loginWithTelegram } = useAuth(), navigate = useNavigate();
  const attemptedTelegram = useRef(false);
  const [data, setData] = useState<AdminOverview | null>(null), [days, setDays] = useState(30), [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState('overview'), [error, setError] = useState(''), [loading, setLoading] = useState(true), [authBusy, setAuthBusy] = useState(false);
  useEffect(() => {
    try { localStorage.removeItem('contentmap_admin_token'); } catch { /* optional storage */ }
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) { url.searchParams.delete('token'); window.history.replaceState(null, '', url.pathname + url.search + url.hash); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    const timeout = setTimeout(() => controller.abort('timeout'), 20000);
    const request = () => fetch(`/api/admin/overview?days=${days}`, { credentials: 'include', signal: controller.signal }).then(async response => {
      const next = await response.json().catch(() => ({})); if (!response.ok) throw new Error(next.error || 'server_error'); return next as AdminOverview;
    });
    const load = async () => {
      try { return await request(); } catch (err) {
        const app = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
        if (!controller.signal.aborted && err instanceof Error && ['unauthorized', 'admin_reauthentication_required'].includes(err.message) && app?.initData && !attemptedTelegram.current) {
          attemptedTelegram.current = true;
          const result = await loginWithTelegram('/admin');
          if (result.success && !controller.signal.aborted) return request();
        }
        throw err;
      }
    };
    load().then(next => { if (!controller.signal.aborted) setData(next); }).catch(err => {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setError(errorMessages[err.message] || 'Не удалось загрузить показатели. Проверьте интернет и повторите.');
    }).finally(() => { clearTimeout(timeout); if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [days, refresh, loginWithTelegram]);
  useEffect(() => {
    if (!data) return;
    let seen = Date.now();
    const deadline = Date.parse(data.system.adminExpiresAt || '') || Date.now() + 900000;
    const touch = () => { seen = Date.now(); };
    const check = () => {
      if (Date.now() >= deadline || Date.now() - seen >= 300000) {
        setData(null); setError(errorMessages.admin_reauthentication_required);
      }
    };
    const timer = setInterval(check, 1000);
    window.addEventListener('pointerdown', touch); window.addEventListener('keydown', touch);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); document.removeEventListener('visibilitychange', check); };
  }, [data]);
  const authenticate = async () => {
    setAuthBusy(true);
    try {
      const app = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
      if (app?.initData) { const result = await loginWithTelegram('/admin'); if (!result.success) throw new Error(result.message); setRefresh(v => v + 1); }
      else { await logout(); navigate('/?returnTo=%2Fadmin', { replace: true }); }
    } catch { setError('Не удалось подтвердить вход. Повторите попытку.'); } finally { setAuthBusy(false); }
  };
  const attention = data ? ['uncertain', 'blocked', 'missed', 'stale', 'failed'].reduce((n, key) => n + (data.publishing.queue[key] || 0), 0) : 0;
  return <SidebarProvider><div className="flex min-h-screen w-full bg-background"><div className="hidden md:block"><AppSidebar /></div><div className="flex min-w-0 flex-1 flex-col"><header className="surface-glass sticky top-0 z-40 border-b border-border"><div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-4 md:px-6"><div className="flex min-w-0 items-center gap-2"><SidebarTrigger className="hidden md:flex" /><AppBackButton /><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><h1 className="kk-page-title truncate text-[15px] font-semibold">Админ-панель</h1></div><button className={button} onClick={() => setRefresh(v => v + 1)} disabled={loading} aria-label="Обновить показатели"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Обновить</span></button></div></header>
    <main className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-5 pb-24 md:px-6 md:pb-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight">Как растёт Карта контента</h2><p className="mt-1 text-xs text-muted-foreground">{data ? `Обновлено ${adminDate(data.generatedAt, true)} · Калининград` : 'Пользователи, контент и состояние сервиса'}</p></div><select aria-label="Период показателей" className="h-10 rounded-xl border border-border bg-card px-3 text-xs" value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>Последние 7 дней</option><option value={30}>Последние 30 дней</option><option value={90}>Последние 90 дней</option></select></div>
      <nav aria-label="Разделы админ-панели" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:inline-flex">{[['overview', 'Обзор'], ['users', 'Пользователи'], ['system', 'Система']].map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} className={`min-h-10 rounded-lg px-2 text-xs font-medium transition-colors sm:px-5 ${tab === key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setTab(key)}>{label}</button>)}</nav>
      {loading && <div role="status" className="flex items-center justify-center py-20 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Загружаю показатели</div>}
      {!loading && error && <div role="alert" className={panel}><div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><h2 className="text-sm font-semibold">Показатели недоступны</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{error}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button className={button} onClick={() => void authenticate()} disabled={authBusy}>{authBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Подтвердить вход в Telegram</button><button className={button} onClick={() => setRefresh(v => v + 1)}>Повторить загрузку</button></div></div>}
      {!loading && data && <>{attention > 0 && <button onClick={() => setTab('system')} className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900"><AlertCircle className="h-4 w-4 shrink-0" /><span>Нужна проверка заданий отправки: {num(attention)}</span><ChevronRight className="ml-auto h-4 w-4 shrink-0" /></button>}{tab === 'overview' ? <Overview data={data} /> : tab === 'users' ? <UserList data={data} /> : <System data={data} />}</>}
    </main></div><MobileNav /></div></SidebarProvider>;
}
