import { useState } from "react";
import { LayoutDashboard, Lightbulb, FileText, GitBranch, MoreHorizontal, Package, BarChart3, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainTabs = [
  { title: "Дашборд", url: "/dashboard", icon: LayoutDashboard },
  { title: "Темы", url: "/themes", icon: Lightbulb },
  { title: "Контент", url: "/content", icon: FileText },
  { title: "Воронки", url: "/", icon: GitBranch },
];

const moreTabs = [
  { title: "Продукты", url: "/products", icon: Package },
  { title: "Аналитика", url: "/analytics", icon: BarChart3 },
  { title: "Настройки", url: "/settings", icon: Settings },
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

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground transition-colors">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">Ещё</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            {moreTabs.map((tab) => (
              <DropdownMenuItem key={tab.url} asChild>
                <NavLink to={tab.url} className="flex items-center gap-2.5 w-full">
                  <tab.icon className="w-4 h-4" />
                  <span className="text-[13px]">{tab.title}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
