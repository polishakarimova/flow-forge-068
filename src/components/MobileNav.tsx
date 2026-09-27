import { FileText, House, CalendarDays, type LucideIcon } from "lucide-react";
import { SalesNavigation } from '@/components/SalesNavigation';
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

/* ── Bottom tabs ─────────────────────────────────── */

export function MobileNav() {
  const location = useLocation();

  return (
    <nav aria-label="Основные разделы" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        <TabLink url="/home" icon={House} title="Главная" pathname={location.pathname} />
        <TabLink url="/content" icon={FileText} title="Контент" pathname={location.pathname} />
        <TabLink url="/calendar" icon={CalendarDays} title="Календарь" pathname={location.pathname} />
        <SalesNavigation />
      </div>
    </nav>
  );
}

function TabLink({ url, icon: Icon, title, pathname }: { url: string; icon: LucideIcon; title: string; pathname: string }) {
  const isActive = pathname === url;
  return (
    <NavLink
      to={url}
      aria-label={title}
      end
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
        isActive
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
      <span className="text-[10px] font-medium truncate">{title}</span>
    </NavLink>
  );
}
