import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Brain, CalendarDays, ChevronRight, FileText, Lightbulb, Package, Plus, UserRound } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { AppBackButton } from '@/components/AppBackButton';
import { useAuth } from '@/lib/authContext';
import { usePublicationOverview } from '@/hooks/usePublicationOverview';
import { dayKey, type Publication } from '@/lib/publications';

function publicationLink(item: Publication) {
  return `/calendar?${new URLSearchParams({ date: item.date, item: item.id })}`;
}

export default function Home() {
  const { user } = useAuth();
  return user ? <HomeWorkspace key={user.id} userId={user.id} name={user.name} /> : null;
}

function HomeWorkspace({ userId, name }: { userId: string; name: string }) {
  const overview = usePublicationOverview(userId);
  const today = dayKey(new Date());
  const todayItems = overview.data.items.filter(item => item.date === today);
  let resume: Publication | undefined;
  let partNumber = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(`karta-publications-view:${userId}`) || '{}');
    if (saved.screen === 'publication') {
      resume = overview.data.items.find(item => item.id === saved.item);
      if (resume) {
        const openIds = Array.isArray(saved.open) ? saved.open : [];
        const lastOpen = [...openIds].reverse().find(id => resume!.parts.some(part => id === `${resume!.id}:${part.id}`));
        partNumber = resume.parts.findIndex(part => `${resume!.id}:${part.id}` === lastOpen) + 1;
      }
    }
  } catch { /* Optional view memory. */ }
  const dayLink = `/calendar?date=${today}`;
  const firstName = name.trim().split(/\s+/)[0];
  return <SidebarProvider><div className="min-h-screen flex w-full bg-background">
    <div className="hidden md:block"><AppSidebar /></div>
    <main className="flex-1 min-w-0 pt-4 md:pt-6 px-4 pb-24 md:pb-8" data-home>
      <div className="max-w-lg mx-auto">
        <header className="flex items-center justify-between gap-3 mb-4">
          <AppBackButton />
          <div className="min-w-0"><p className="text-xs text-muted-foreground mb-1">{new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'long' })}</p><h1 className="text-xl font-semibold tracking-tight break-words">{firstName ? `${firstName}, привет` : 'Главная'}</h1></div>
          <Link to="/profile" aria-label="Мой профиль" className="shrink-0 w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><UserRound size={22} /></Link>
        </header>
        {overview.status === 'ready' && resume && <Link to="/calendar" className="flex items-center gap-3 p-3 mb-4 rounded-2xl bg-primary/10 text-foreground" aria-label={`Продолжить: ${resume.title}`}>
          <Bookmark size={18} className="text-primary shrink-0" /><span className="flex-1 min-w-0"><span className="block text-[11px] text-muted-foreground">Продолжить с места остановки</span><strong className="block text-sm font-medium break-words">{resume.format}{partNumber > 0 ? ` · часть ${partNumber} из ${resume.parts.length}` : ` · ${resume.title}`}</strong></span><ArrowRight size={16} className="shrink-0" />
        </Link>}
        <section aria-labelledby="home-today">
          <div className="flex items-center justify-between gap-2 mb-1"><h2 id="home-today" className="text-sm font-semibold">На сегодня</h2><Link to={dayLink} className="text-xs text-primary min-h-11 inline-flex items-center gap-1">{todayItems.length ? `Все ${todayItems.length}` : 'Календарь'}<ArrowRight size={14} /></Link></div>
          {overview.status === 'loading' && <p role="status" className="text-sm text-muted-foreground py-4">Загружаем публикации…</p>}
          {overview.status === 'error' && <p role="alert" className="text-sm text-muted-foreground py-3">Не удалось загрузить обзор. <Link to="/calendar" className="text-primary underline">Открыть календарь</Link></p>}
          {overview.status === 'ready' && <>
            {todayItems.length ? <div className="border border-border rounded-2xl bg-card divide-y divide-border overflow-hidden">{todayItems.slice(0, 3).map(item => <Link key={item.id} to={publicationLink(item)} className="flex gap-3 items-center px-3 py-3 min-h-14 hover:bg-muted/50 transition-colors">
              <FileText size={18} className="shrink-0 text-primary" /><span className="min-w-0 flex-1"><strong className="block text-sm font-medium">{item.format}</strong><span className="block text-xs text-muted-foreground break-words">{item.title}</span>{item.parts.every(part => part.published) && <span className="text-[11px] text-muted-foreground">Опубликовано</span>}</span><ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </Link>)}</div> : <div className="border border-border bg-card rounded-2xl px-4 py-4"><p className="text-sm">На сегодня публикаций нет</p><p className="text-xs text-muted-foreground mt-1">Выбери день в календаре или добавь публикацию.</p></div>}
            {overview.hasDraft && <p className="mt-2 text-xs text-muted-foreground">Есть правки на этом устройстве. Проверь сохранение в календаре.</p>}
          </>}
        </section>
        <div className="grid grid-cols-2 gap-2 mt-3 mb-5">
          <Link to="/content?action=idea" className="flex items-center justify-center gap-2 min-h-11 px-2 border border-border bg-card rounded-xl text-xs hover:bg-muted/50"><Lightbulb size={16} />Записать идею</Link>
          <Link to={`/calendar?date=${today}&action=add`} className="flex items-center justify-center gap-2 min-h-11 px-2 border border-border bg-card rounded-xl text-xs hover:bg-muted/50"><Plus size={16} />Публикация</Link>
        </div>
        <section aria-labelledby="home-foundation">
          <h2 id="home-foundation" className="text-sm font-semibold mb-3">Основа твоего блога</h2>
          <div className="border border-border bg-card rounded-2xl divide-y divide-border overflow-hidden">
            {[{to:'/context',title:'Мой контекст',text:'Распаковка, аудитория, референсы',icon:Brain},{to:'/products',title:'Мои продукты',text:'Предложения и продуктовая линейка',icon:Package}].map(({to,title,text,icon:Icon})=><Link key={to} to={to} className="flex items-center gap-3 px-3 py-3 min-h-14 hover:bg-muted/50"><Icon size={18} className="text-primary shrink-0"/><span className="flex-1 min-w-0"><strong className="block text-sm font-medium">{title}</strong><span className="block text-xs text-muted-foreground">{text}</span></span><ChevronRight size={16} className="shrink-0 text-muted-foreground"/></Link>)}
          </div>
        </section>
        <Link to={dayLink} className="mt-4 text-xs text-muted-foreground inline-flex min-h-11 items-center gap-2"><CalendarDays size={15} />Открыть план публикаций</Link>
      </div>
    </main><MobileNav/>
  </div></SidebarProvider>;
}
