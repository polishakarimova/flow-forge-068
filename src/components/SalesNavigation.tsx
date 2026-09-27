import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, GitBranch, Map, Waypoints, ChevronRight } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const salesLinks = [
  { to: '/products', label: 'Продукты', description: 'Предложения и продуктовая линейка', icon: Package },
  { to: '/dashboard', label: 'Воронки', description: 'Контент, кодовые слова и продукты', icon: GitBranch },
  { to: '/map', label: 'Карта', description: 'Все связи на одном экране', icon: Map },
];

// Only navigation is grouped. The existing pages and their editors stay intact.
export function SalesNavigation() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const active = salesLinks.some(link => link.to === pathname);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><button type="button" aria-label="Продажи" aria-current={active ? 'true' : undefined} className={`flex flex-1 min-w-0 flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors duration-200 ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
      <Waypoints className="w-5 h-5" /><span className="text-[10px] font-medium">Продажи</span>
    </button></SheetTrigger>
    <SheetContent side="bottom" className="z-[80] p-4 pb-[max(16px,env(safe-area-inset-bottom))] motion-reduce:animate-none [&>button]:h-8 [&>button]:w-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
      <SheetTitle className="text-base pr-10">Продажи через контент</SheetTitle>
      <SheetDescription className="sr-only">Откройте продукты, воронки или карту связей.</SheetDescription>
      <div className="mt-4 divide-y divide-border">
        {salesLinks.map(({ to, label, description, icon: Icon }) => <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={pathname === to ? 'page' : undefined} className={`flex items-center gap-3 min-h-14 px-2 py-3 rounded-lg ${pathname === to ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
          <Icon size={20} className="shrink-0" /><span className="flex-1 min-w-0"><strong className="block text-sm font-medium">{label}</strong><span className="block text-xs text-muted-foreground">{description}</span></span><ChevronRight size={16} />
        </Link>)}
      </div>
    </SheetContent>
  </Sheet>;
}
