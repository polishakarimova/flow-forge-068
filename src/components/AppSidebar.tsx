import {
  FileText,
  GitBranch,
  Package,
  Map,
  CalendarDays,
  User,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
  { title: "Воронки", url: "/dashboard", icon: GitBranch },
  { title: "Карта", url: "/map", icon: Map },
  { title: "Календарь", url: "/calendar", icon: CalendarDays },
  { title: "Профиль", url: "/profile", icon: User },
  { title: "Админ", url: "/admin", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-3 sm:pt-4">
        {!collapsed && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <button
              onClick={() => navigate("/")}
              className="logo-gradient text-[20px] sm:text-[22px] leading-none cursor-pointer bg-transparent border-none p-0"
              title="На главную"
            >
              Content Map
            </button>
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
                        className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-[14px] font-medium transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        activeClassName="bg-primary/10 text-primary"
                      >
                        <item.icon className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
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
