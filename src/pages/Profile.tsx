import { useCallback, useEffect, useState } from 'react';
import { UserRound, LogOut, Package, FileText, Network, GraduationCap, Bot, ChevronRight, Heart, UsersRound, Copy, Check, Share2, History, ChartNoAxesCombined } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { AppBackButton } from '@/components/AppBackButton';
import { resetTour } from '@/components/OnboardingTour';
import { useTour } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/authContext';
import { useDataStore } from '@/lib/dataStore';
import { likeWord } from '@/lib/referral';

type Wallet = { balance: number; invited: number; reward: number; url: string; transactions: { id: string; amount: number; createdAt: string }[] };
const number = (n: number) => n.toLocaleString('ru-RU');

export default function Profile() {
  const { user } = useAuth();
  return user ? <ProfileAccount key={user.id} /> : null;
}

function ProfileAccount() {
  const { startTour } = useTour();
  const { user, logout } = useAuth();
  const { products, allContentItems, funnels } = useDataStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null), [loading, setLoading] = useState(true), [walletError, setWalletError] = useState('');
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'invite' | 'history' | null>(null), [copied, setCopied] = useState(false), [shareError, setShareError] = useState('');

  const loadWallet = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setWalletError('');
    try {
      const response = await fetch('/api/account/referral', { credentials: 'include', signal: signal || AbortSignal.timeout(20000) });
      if (!response.ok) throw Error('unavailable');
      const data: Wallet = await response.json();
      if (!signal?.aborted) setWallet(data);
    } catch { if (!signal?.aborted) setWalletError('Не удалось загрузить лайки. Попробуйте ещё раз.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadWallet(controller.signal);
    fetch('/api/agent/connections', { credentials: 'include', signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (!controller.signal.aborted) setAgentCount(data.agents.filter((a: { connectedAt: string | null; revokedAt: string | null }) => a.connectedAt && !a.revokedAt).length);
    }).catch(() => { /* Management remains available. */ });
    const refresh = () => { if (document.visibilityState === 'visible') void loadWallet(controller.signal); };
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); document.removeEventListener('visibilitychange', refresh); };
  }, [loadWallet]);
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); navigate('/', { replace: true }); }
    catch { setError('Не удалось выйти. Проверьте интернет и попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }
  function openInvite() { setCopied(false); setShareError(''); setDialog('invite'); }
  async function copy() {
    if (!wallet) return;
    try { await navigator.clipboard.writeText(wallet.url); setCopied(true); setShareError(''); }
    catch { setShareError('Выделите ссылку и скопируйте вручную.'); }
  }
  async function share() {
    if (!wallet) return;
    const text = 'Собираю продукты, идеи и публикации в «Карте контента». Присоединяйся!';
    try {
      if (navigator.share) await navigator.share({ title: 'Карта контента', text, url: wallet.url });
      else window.open('https://t.me/share/url?' + new URLSearchParams({ url: wallet.url, text }), '_blank', 'noopener,noreferrer');
    } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setShareError('Не удалось поделиться. Скопируйте ссылку.'); }
  }

  return <SidebarProvider><div className="min-h-screen flex w-full bg-background">
    <div className="hidden md:block"><AppSidebar /></div>
    <main className="flex-1 min-w-0 px-4 pt-1 md:pt-6 pb-24"><div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-5"><AppBackButton /><h1 className="kk-page-title text-lg font-semibold">Профиль</h1></div>
      <section aria-label="Аккаунт" className="flex items-center gap-3 pb-5">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
          {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserRound size={27} />}
        </div>
        <div className="min-w-0"><h2 className="text-xl font-semibold break-words">{user?.name}</h2><p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1"><Check size={13} />Telegram подключён</p></div>
      </section>
      <Link to="/profile/dashboard" className="mb-4 flex min-h-20 items-center gap-3 rounded-2xl border border-primary/20 bg-card p-4 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ChartNoAxesCombined size={21} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">Мой дашборд</strong><span className="mt-1 block text-xs text-muted-foreground">Контент, публикации и результаты</span></span><ChevronRight size={17} className="shrink-0 text-muted-foreground" />
      </Link>
      <section aria-label="Лайки и приглашения" className="border border-border bg-card rounded-2xl overflow-hidden mb-6">
        <button type="button" className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors disabled:opacity-70" disabled={!wallet || loading} onClick={() => setDialog('history')}>
          <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Heart size={21} fill="currentColor" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground mb-0.5">Мои лайки</span><strong className="block text-xl font-semibold tabular-nums">{loading ? 'Загружаем…' : walletError ? 'Не загрузились' : wallet ? `${number(wallet.balance)} ${likeWord(wallet.balance)}` : '—'}</strong></span><ChevronRight size={17} className="text-muted-foreground shrink-0" />
        </button>
        {walletError && <div className="px-4 pb-3 text-xs" role="alert"><p>{walletError}</p><button className="text-primary min-h-11 underline" onClick={() => void loadWallet()}>Повторить</button></div>}
        <button type="button" className="w-full flex items-center gap-3 px-4 py-3 min-h-14 text-left border-t border-border hover:bg-muted/40 disabled:opacity-60" disabled={!wallet || loading} onClick={openInvite}>
          <UsersRound size={19} className="text-primary shrink-0" /><span className="flex-1 min-w-0"><strong className="block text-sm font-medium">Пригласить друзей</strong><span className="block text-xs text-muted-foreground mt-0.5">+{wallet?.reward ?? 50} лайков за нового пользователя</span></span><ChevronRight size={17} className="text-muted-foreground shrink-0" />
        </button>
      </section>
      <section aria-labelledby="profile-connections" className="mb-6">
        <h2 id="profile-connections" className="text-xs font-medium text-muted-foreground mb-2 px-1">Подключения</h2>
        <Link to="/profile/agents" className="flex items-center gap-3 px-4 py-3 min-h-16 bg-card border border-border rounded-2xl hover:bg-muted/40"><Bot size={20} className="text-primary shrink-0" /><span className="flex-1 min-w-0"><strong className="block text-sm font-medium">Мои агенты</strong><span className="block text-xs text-muted-foreground mt-0.5">{agentCount === null ? 'Подключение и права доступа' : agentCount ? `Подключено: ${agentCount} из 5` : 'Подключить первого агента'}</span></span><ChevronRight size={17} className="text-muted-foreground shrink-0" /></Link>
      </section>
      <section aria-labelledby="profile-workspace" className="mb-5">
        <h2 id="profile-workspace" className="text-xs font-medium text-muted-foreground mb-2 px-1">Моё пространство</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {[{ to: '/products', label: 'Продукты', value: products.length, icon: Package }, { to: '/content', label: 'Материалы', value: allContentItems.length, icon: FileText }, { to: '/dashboard', label: 'Активные воронки', value: funnels.filter(f => f.active).length, icon: Network }].map(({ to, label, value, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3 min-h-12 text-sm hover:bg-muted/40"><Icon size={17} className="text-muted-foreground shrink-0" /><span className="flex-1">{label}</span><span className="text-muted-foreground tabular-nums">{value}</span><ChevronRight size={15} className="text-muted-foreground" /></Link>)}
        </div>
      </section>
      <button type="button" className="flex items-center gap-3 min-h-12 w-full px-3 text-sm text-left hover:bg-muted/40 rounded-xl" onClick={() => { resetTour(); startTour(); }}><GraduationCap size={18} className="text-muted-foreground" /><span className="flex-1">Как пользоваться картой</span><ChevronRight size={15} className="text-muted-foreground" /></button>
      <Link to="/legal" className="flex items-center gap-3 min-h-12 w-full px-3 text-sm hover:bg-muted/40 rounded-xl"><FileText size={18} className="text-muted-foreground" /><span className="flex-1">Документы и согласия</span><ChevronRight size={15} className="text-muted-foreground" /></Link>
      <Button variant="ghost" className="rounded-xl mt-2 text-muted-foreground min-h-11" disabled={busy} onClick={signOut}><LogOut size={16} />{busy ? 'Выходим…' : 'Выйти из аккаунта'}</Button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div></main><MobileNav />
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}>
      <DialogContent className="max-w-md w-[calc(100%-32px)] rounded-2xl p-5 max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-lg">{dialog === 'invite' ? 'Приглашайте друзей' : 'Мои лайки'}</DialogTitle><DialogDescription>{dialog === 'invite' ? 'Ваша ссылка остаётся одной и той же.' : 'Баланс и история начислений.'}</DialogDescription></DialogHeader>
        {wallet && (dialog === 'invite' ? <div className="space-y-4">
          <p className="text-sm leading-relaxed">Получайте <strong className="font-semibold">{wallet.reward} лайков <Heart className="inline w-3.5 h-3.5 text-primary" fill="currentColor" /></strong> за каждого нового пользователя, который впервые войдёт в Карту по вашей ссылке.</p>
          <div><label htmlFor="referral-link" className="block text-xs text-muted-foreground mb-1.5">Ваша ссылка</label><input id="referral-link" readOnly value={wallet.url} onFocus={e => e.currentTarget.select()} className="w-full min-w-0 h-11 px-3 rounded-xl border border-border bg-background text-base sm:text-sm" /></div>
          <div className="flex flex-wrap gap-2"><Button className="rounded-xl min-h-11 flex-1" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Скопировано' : 'Копировать'}</Button><Button variant="outline" className="rounded-xl min-h-11 flex-1" onClick={share}><Share2 size={16} />Поделиться</Button></div>
          <p className="text-sm">Приглашено: <strong className="tabular-nums">{number(wallet.invited)}</strong></p>
          <p className="text-xs text-muted-foreground leading-relaxed">Лайки получает пригласивший. Повторный вход и самоприглашение не учитываются. Переход по ссылке сохраняется на 30 дней.</p>
          {shareError && <p role="alert" className="text-xs text-destructive">{shareError}</p>}
        </div> : <div>
          <div className="flex items-center gap-2 text-2xl font-semibold mb-3"><Heart size={25} className="text-primary" fill="currentColor" />{number(wallet.balance)} <span className="text-base font-normal text-muted-foreground">{likeWord(wallet.balance)}</span></div>
          <p className="text-xs text-muted-foreground mb-4">Лайки сохраняются на вашем аккаунте. Использовать их можно будет после запуска платных возможностей.</p>
          <div className="flex items-center gap-2 text-sm font-medium mb-2"><History size={16} />История начислений</div>
          {wallet.transactions.length ? <ul className="divide-y divide-border">{wallet.transactions.map(item => <li key={item.id} className="flex items-center gap-3 py-3 text-sm"><span className="flex-1 min-w-0">Приглашение друга<time className="block text-xs text-muted-foreground mt-0.5" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></span><span className="text-primary whitespace-nowrap tabular-nums">+{item.amount} <Heart size={14} className="inline" fill="currentColor" /></span></li>)}</ul> : <p className="text-sm text-muted-foreground py-3">Здесь появятся лайки за ваши приглашения.</p>}
          {wallet.transactions.length === 50 && <p className="text-xs text-muted-foreground mt-2">Последние 50 начислений</p>}
          <Button variant="outline" className="rounded-xl mt-3 min-h-11 w-full" onClick={openInvite}>Пригласить друзей</Button>
        </div>)}
      </DialogContent>
    </Dialog>
  </div></SidebarProvider>;
}
