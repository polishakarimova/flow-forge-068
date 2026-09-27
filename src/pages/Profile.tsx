import { useState } from 'react';
import { UserRound, LogOut, Package, FileText, Network, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { AppBackButton } from '@/components/AppBackButton';
import { resetTour } from '@/components/OnboardingTour';
import { useTour } from '@/App';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';
import { useDataStore } from '@/lib/dataStore';

export default function Profile() {
  const { startTour } = useTour();
  const { user, logout } = useAuth();
  const { products, allContentItems, funnels } = useDataStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); navigate('/', { replace: true }); }
    catch { setError('Не удалось выйти. Проверьте интернет и попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }
  return <SidebarProvider><div className="min-h-screen flex w-full bg-background">
    <div className="hidden md:block"><AppSidebar /></div>
    <main className="flex-1 min-w-0 px-5 pt-1 md:pt-6 pb-24"><div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-5"><AppBackButton /><h1 className="kk-page-title text-lg font-semibold">Профиль</h1></div>
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><UserRound size={24}/></div>
        <div className="min-w-0"><h2 className="font-semibold break-words">{user?.name}</h2><p className="text-sm text-muted-foreground">Вход через Telegram</p></div>
      </div>
      <div className="divide-y divide-border mb-5">
        {[{label:'Продукты',value:products.length,icon:Package},{label:'Материалы в разделе «Контент»',value:allContentItems.length,icon:FileText},{label:'Активные воронки',value:funnels.filter(f=>f.active).length,icon:Network}].map(item=><div key={item.label} className="flex items-center gap-3 py-3 text-sm"><item.icon size={17} className="text-muted-foreground"/><span className="flex-1">{item.label}</span><span className="font-medium">{item.value}</span></div>)}
      </div>
      <button className="flex items-center gap-2 min-h-11 mb-3 text-sm text-muted-foreground" onClick={() => { resetTour(); startTour(); }}><GraduationCap size={17}/>Обучение</button>
      <Button variant="outline" className="rounded-xl" disabled={busy} onClick={signOut}><LogOut size={16}/>{busy?'Выходим…':'Выйти из аккаунта'}</Button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div></main><MobileNav/>
  </div></SidebarProvider>;
}
