import { FileText, GitBranch, Package, Map, CalendarDays } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const mainTabs = [
  { title: "Продукты", url: "/products", icon: Package },
  { title: "Контент", url: "/content", icon: FileText },
  { title: "Воронки", url: "/", icon: GitBranch },
  { title: "Карта", url: "/map", icon: Map },
  { title: "Календарь", url: "/calendar", icon: CalendarDays },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {mainTabs.map((tab) => (
          <NavLink
            key={tab.url}
            to={tab.url}
            end
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
