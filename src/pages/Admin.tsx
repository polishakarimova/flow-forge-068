import { useState, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import {
  Users,
  TrendingUp,
  GitBranch,
  Package,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Eye,
  ShieldCheck,
  Activity,
  Crown,
} from "lucide-react";

/* ── simulated users ───────────────────────────────── */

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google";
  plan: "free" | "pro" | "business";
  registeredAt: string;
  lastActive: string;
  emailVerified: boolean;
  funnels: number;
  products: number;
  contentItems: number;
  leads: number;
  sales: number;
  conversionRate: number;
  isOnline: boolean;
}

const MOCK_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Полина Каримова",
    email: "polina@example.com",
    provider: "email",
    plan: "pro",
    registeredAt: "2025-11-02",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 4,
    products: 10,
    contentItems: 13,
    leads: 28,
    sales: 4,
    conversionRate: 14.3,
    isOnline: true,
  },
  {
    id: "u2",
    name: "Анна Смирнова",
    email: "anna.smirnova@gmail.com",
    provider: "google",
    plan: "pro",
    registeredAt: "2025-12-15",
    lastActive: "2026-04-07",
    emailVerified: true,
    funnels: 7,
    products: 15,
    contentItems: 34,
    leads: 89,
    sales: 12,
    conversionRate: 13.5,
    isOnline: false,
  },
  {
    id: "u3",
    name: "Дмитрий Волков",
    email: "d.volkov@yandex.ru",
    provider: "email",
    plan: "business",
    registeredAt: "2025-10-20",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 12,
    products: 22,
    contentItems: 67,
    leads: 245,
    sales: 38,
    conversionRate: 15.5,
    isOnline: true,
  },
  {
    id: "u4",
    name: "Мария Козлова",
    email: "maria.k@mail.ru",
    provider: "email",
    plan: "free",
    registeredAt: "2026-01-10",
    lastActive: "2026-04-06",
    emailVerified: true,
    funnels: 2,
    products: 3,
    contentItems: 5,
    leads: 4,
    sales: 0,
    conversionRate: 0,
    isOnline: false,
  },
  {
    id: "u5",
    name: "Екатерина Новикова",
    email: "e.novikova@gmail.com",
    provider: "google",
    plan: "pro",
    registeredAt: "2026-02-01",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 5,
    products: 9,
    contentItems: 21,
    leads: 52,
    sales: 7,
    conversionRate: 13.5,
    isOnline: true,
  },
  {
    id: "u6",
    name: "Алексей Петров",
    email: "a.petrov@inbox.ru",
    provider: "email",
    plan: "free",
    registeredAt: "2026-03-05",
    lastActive: "2026-04-04",
    emailVerified: false,
    funnels: 1,
    products: 1,
    contentItems: 2,
    leads: 0,
    sales: 0,
    conversionRate: 0,
    isOnline: false,
  },
  {
    id: "u7",
    name: "Ольга Федорова",
    email: "olga.fed@gmail.com",
    provider: "google",
    plan: "pro",
    registeredAt: "2025-12-28",
    lastActive: "2026-04-07",
    emailVerified: true,
    funnels: 6,
    products: 11,
    contentItems: 28,
    leads: 67,
    sales: 9,
    conversionRate: 13.4,
    isOnline: false,
  },
  {
    id: "u8",
    name: "Иван Кузнецов",
    email: "ivan.k@yandex.ru",
    provider: "email",
    plan: "business",
    registeredAt: "2025-09-15",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 15,
    products: 30,
    contentItems: 84,
    leads: 312,
    sales: 51,
    conversionRate: 16.3,
    isOnline: true,
  },
  {
    id: "u9",
    name: "Наталья Морозова",
    email: "n.morozova@mail.ru",
    provider: "email",
    plan: "free",
    registeredAt: "2026-03-20",
    lastActive: "2026-04-03",
    emailVerified: true,
    funnels: 1,
    products: 2,
    contentItems: 3,
    leads: 1,
    sales: 0,
    conversionRate: 0,
    isOnline: false,
  },
  {
    id: "u10",
    name: "Сергей Лебедев",
    email: "s.lebedev@gmail.com",
    provider: "google",
    plan: "pro",
    registeredAt: "2026-01-25",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 8,
    products: 14,
    contentItems: 41,
    leads: 103,
    sales: 15,
    conversionRate: 14.6,
    isOnline: true,
  },
  {
    id: "u11",
    name: "Виктория Соколова",
    email: "vika.sok@inbox.ru",
    provider: "email",
    plan: "free",
    registeredAt: "2026-04-01",
    lastActive: "2026-04-07",
    emailVerified: false,
    funnels: 0,
    products: 0,
    contentItems: 0,
    leads: 0,
    sales: 0,
    conversionRate: 0,
    isOnline: false,
  },
  {
    id: "u12",
    name: "Артём Попов",
    email: "artem.popov@gmail.com",
    provider: "google",
    plan: "pro",
    registeredAt: "2026-02-14",
    lastActive: "2026-04-08",
    emailVerified: true,
    funnels: 3,
    products: 7,
    contentItems: 16,
    leads: 31,
    sales: 4,
    conversionRate: 12.9,
    isOnline: true,
  },
];

/* ── helpers ───────────────────────────────────────── */

const PLAN_CONFIG = {
  free: { label: "Free", color: "bg-gray-100 text-gray-600" },
  pro: { label: "Pro", color: "bg-purple-100 text-purple-700" },
  business: { label: "Business", color: "bg-amber-100 text-amber-700" },
} as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

type SortKey = "name" | "registeredAt" | "lastActive" | "funnels" | "products" | "contentItems" | "leads" | "sales" | "conversionRate";

/* ── component ─────────────────────────────────────── */

export default function Admin() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro" | "business">("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = MOCK_USERS;
    if (planFilter !== "all") list = list.filter((u) => u.plan === planFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [search, planFilter, sortKey, sortDir]);

  /* aggregate stats */
  const totals = useMemo(() => {
    const all = MOCK_USERS;
    return {
      users: all.length,
      online: all.filter((u) => u.isOnline).length,
      funnels: all.reduce((s, u) => s + u.funnels, 0),
      products: all.reduce((s, u) => s + u.products, 0),
      content: all.reduce((s, u) => s + u.contentItems, 0),
      leads: all.reduce((s, u) => s + u.leads, 0),
      sales: all.reduce((s, u) => s + u.sales, 0),
      proUsers: all.filter((u) => u.plan === "pro").length,
      bizUsers: all.filter((u) => u.plan === "business").length,
      freeUsers: all.filter((u) => u.plan === "free").length,
    };
  }, []);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 sm:px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between h-14 sm:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                      Админ-панель
                    </h1>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {totals.online} онлайн
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-1.5 animate-pulse" />
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full mx-auto py-4 sm:py-6 px-4 sm:px-6 pb-20 md:pb-6 max-w-[1400px]">
            {/* ── stat cards ─────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: "Пользователей", value: totals.users, icon: Users, color: "text-purple-600 bg-purple-100" },
                { label: "Воронок", value: totals.funnels, icon: GitBranch, color: "text-indigo-600 bg-indigo-100" },
                { label: "Продуктов", value: totals.products, icon: Package, color: "text-amber-600 bg-amber-100" },
                { label: "Контента", value: totals.content, icon: FileText, color: "text-blue-600 bg-blue-100" },
                { label: "Лиды", value: totals.leads, icon: TrendingUp, color: "text-green-600 bg-green-100" },
                { label: "Продажи", value: totals.sales, icon: Activity, color: "text-red-500 bg-red-100" },
              ].map((s) => (
                <div key={s.label} className="bg-card p-3 sm:p-4 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── plan breakdown ──────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { plan: "free" as const, count: totals.freeUsers, icon: Users },
                { plan: "pro" as const, count: totals.proUsers, icon: Crown },
                { plan: "business" as const, count: totals.bizUsers, icon: ShieldCheck },
              ].map((p) => (
                <div key={p.plan} className="bg-card p-4 rounded-xl border flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PLAN_CONFIG[p.plan].color}`}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">{p.count}</div>
                    <div className="text-xs text-muted-foreground">{PLAN_CONFIG[p.plan].label}</div>
                  </div>
                  <div className="ml-auto text-xs font-semibold text-muted-foreground">
                    {Math.round((p.count / totals.users) * 100)}%
                  </div>
                </div>
              ))}
            </div>

            {/* ── filters ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по имени или email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {(["all", "free", "pro", "business"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlanFilter(p)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      planFilter === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "all" ? "Все" : PLAN_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── users table ─────────────────────────── */}
            <div className="bg-card rounded-xl border overflow-hidden">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Пользователь <SortIcon k="name" />
                </button>
                <button onClick={() => toggleSort("funnels")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Воронки <SortIcon k="funnels" />
                </button>
                <button onClick={() => toggleSort("products")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Продукты <SortIcon k="products" />
                </button>
                <button onClick={() => toggleSort("contentItems")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Контент <SortIcon k="contentItems" />
                </button>
                <button onClick={() => toggleSort("leads")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Лиды <SortIcon k="leads" />
                </button>
                <button onClick={() => toggleSort("sales")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Продажи <SortIcon k="sales" />
                </button>
                <button onClick={() => toggleSort("conversionRate")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  CR% <SortIcon k="conversionRate" />
                </button>
                <button onClick={() => toggleSort("lastActive")} className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-[11px] font-semibold uppercase tracking-wider p-0">
                  Активность <SortIcon k="lastActive" />
                </button>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Пользователи не найдены
                </div>
              ) : (
                filtered.map((u) => {
                  const expanded = expandedUser === u.id;
                  return (
                    <div key={u.id} className="border-b border-border last:border-0">
                      {/* Desktop row */}
                      <div
                        className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedUser(expanded ? null : u.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                            </div>
                            {u.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                              {u.name}
                              {!u.emailVerified && (
                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                                  не верифицирован
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                              {u.email}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${PLAN_CONFIG[u.plan].color}`}>
                                {PLAN_CONFIG[u.plan].label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-foreground">{u.funnels}</div>
                        <div className="text-sm font-semibold text-foreground">{u.products}</div>
                        <div className="text-sm font-semibold text-foreground">{u.contentItems}</div>
                        <div className="text-sm font-semibold text-green-600">{u.leads}</div>
                        <div className="text-sm font-semibold text-foreground">{u.sales}</div>
                        <div className="text-sm font-semibold text-foreground">
                          {u.conversionRate > 0 ? `${u.conversionRate}%` : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{daysAgo(u.lastActive)}</div>
                      </div>

                      {/* Mobile card */}
                      <div
                        className="lg:hidden px-4 py-3 cursor-pointer"
                        onClick={() => setExpandedUser(expanded ? null : u.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                            </div>
                            {u.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                              {u.email}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${PLAN_CONFIG[u.plan].color}`}>
                                {PLAN_CONFIG[u.plan].label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-foreground">{u.funnels} воронок</div>
                            <div className="text-[11px] text-muted-foreground">{daysAgo(u.lastActive)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                            {[
                              { label: "Воронки", value: u.funnels, icon: GitBranch, color: "text-indigo-600" },
                              { label: "Продукты", value: u.products, icon: Package, color: "text-amber-600" },
                              { label: "Контент", value: u.contentItems, icon: FileText, color: "text-blue-600" },
                              { label: "Лиды", value: u.leads, icon: TrendingUp, color: "text-green-600" },
                              { label: "Продажи", value: u.sales, icon: Activity, color: "text-red-500" },
                              { label: "Конверсия", value: u.conversionRate > 0 ? `${u.conversionRate}%` : "—", icon: Eye, color: "text-purple-600" },
                            ].map((s) => (
                              <div key={s.label} className="bg-card px-3 py-2 rounded-lg border">
                                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-[10px] text-muted-foreground">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                            <span>Регистрация: <b className="text-foreground">{formatDate(u.registeredAt)}</b></span>
                            <span>Провайдер: <b className="text-foreground">{u.provider === "google" ? "Google" : "Email"}</b></span>
                            <span>Email: <b className={u.emailVerified ? "text-green-600" : "text-red-500"}>{u.emailVerified ? "подтверждён" : "не подтверждён"}</b></span>
                            <span>Последняя активность: <b className="text-foreground">{formatDate(u.lastActive)}</b></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-xs text-muted-foreground text-center">
              Показано {filtered.length} из {MOCK_USERS.length} пользователей
            </div>
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
