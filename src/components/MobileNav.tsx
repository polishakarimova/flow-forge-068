import { FileText, GitBranch, Package, Map, CalendarDays, User, GraduationCap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { resetTour } from "@/components/OnboardingTour";
import { useTour } from "@/App";

/* ── Bottom tabs ─────────────────────────────────── */

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        <TabLink url="/products" icon={Package} title="Продукты" pathname={location.pathname} />
        <TabLink url="/content" icon={FileText} title="Контент" pathname={location.pathname} />
        <TabLink url="/dashboard" icon={GitBranch} title="Воронки" pathname={location.pathname} />
        <TabLink url="/map" icon={Map} title="Карта" pathname={location.pathname} />
        <TabLink url="/calendar" icon={CalendarDays} title="Календарь" pathname={location.pathname} />
        <TabLink url="/profile" icon={User} title="Профиль" pathname={location.pathname} />
      </div>
    </nav>
  );
}

function TabLink({ url, icon: Icon, title, pathname }: { url: string; icon: any; title: string; pathname: string }) {
  const isActive = pathname === url;
  return (
    <NavLink
      to={url}
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

/* ── Top header (mobile only) ────────────────────── */

export function MobileHeader() {
  const navigate = useNavigate();
  const { startTour } = useTour();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-3 h-8 bg-card border-b border-border/60 z-[60]">
      <button
        onClick={() => navigate("/")}
        className="logo-gradient text-[14px] leading-none cursor-pointer bg-transparent border-none p-0"
      >
        Content Map
      </button>
      <button
        onClick={() => { resetTour(); startTour(); }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
      >
        <GraduationCap className="w-3 h-3" />
        Обучение
      </button>
    </div>
  );
}
