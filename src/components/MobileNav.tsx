import { FileText, GitBranch, Package, Map, CalendarDays, User, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const mainTabs = [
  { title: "Главная", url: "/", icon: Home },
  { title: "Продукты", url: "/products", icon: Package },
  { title: "Контент", url: "/content", icon: FileText },
  { title: "Воронки", url: "/dashboard", icon: GitBranch },
  { title: "Карта", url: "/map", icon: Map },
  { title: "Профиль", url: "/profile", icon: User },
];

export function MobileNav() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {mainTabs.map((tab) => {
          const isActive = location.pathname === tab.url;
          return (
            <NavLink
              key={tab.url}
              to={tab.url}
              end
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${
                isActive ? "scale-110" : ""
              } transition-transform`} />
              <span className="text-[10px] font-medium truncate">{tab.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
