import {
  FileText,
  GitBranch,
  Package,
  Map,
  CalendarDays,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Продукты", url: "/products", icon: Package },
  { title: "Контент", url: "/content", icon: FileText },
  { title: "Воронки", url: "/", icon: GitBranch },
  { title: "Карта", url: "/map", icon: Map },
  { title: "Календарь", url: "/calendar", icon: CalendarDays },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border min-w-[240px] w-[240px]">
      <SidebarContent className="pt-4">
        {!collapsed && (
          <div className="px-4 pb-4">
            <span className="text-sm font-bold tracking-tight text-foreground">
              ContentMap
            </span>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        activeClassName="bg-primary/10 text-primary"
                      >
                        <item.icon className="h-[20px] w-[20px] shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
