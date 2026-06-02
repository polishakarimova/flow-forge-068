import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav, MobileHeader } from "@/components/MobileNav";
import { AlertCircle, Brain, ChevronDown, FileText, GitBranch, Loader2, Package, Search, ShieldCheck, UserRound, Users } from "lucide-react";

interface AdminStats {
  products: number;
  topics: number;
  ideas: number;
  contentItems: number;
  funnels: number;
  keywords: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  telegramId: string;
  telegramUsername: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  stateUpdatedAt: string;
  stats: AdminStats;
}

interface AdminOverview {
  totals: AdminStats & { users: number };
  users: AdminUser[];
}

const statCards = [
  { key: "users", label: "Пользователи", icon: Users },
  { key: "products", label: "Продукты", icon: Package },
  { key: "topics", label: "Темы", icon: FileText },
  { key: "contentItems", label: "Контент", icon: Brain },
  { key: "funnels", label: "Воронки", icon: GitBranch },
] as const;

function formatDate(value: string) {
  if (!value) return "нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "нет данных";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(value: string) {
  if (!value) return "нет активности";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "нет активности";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

function displayContact(user: AdminUser) {
  if (user.telegramUsername) return user.telegramUsername;
  if (user.telegramId) return `tg:${user.telegramId}`;
  if (user.email) return user.email;
  return "без контакта";
}

export default function Admin() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/admin/overview", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить админку");
        return data as AdminOverview;
      })
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить админку");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const users = overview?.users || [];
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      return [user.name, user.email, user.telegramUsername, user.telegramId].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [overview, search]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 pt-8 md:pt-0">
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 md:px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">Админ</h1>
                    <span className="text-[12px] text-muted-foreground">/ реальные данные</span>
                  </div>
                </div>
                {overview && <span className="text-[12px] text-muted-foreground">{overview.totals.users} аккаунтов</span>}
              </div>
            </div>
          </header>

          <main className="flex-1 w-full mx-auto py-5 md:py-6 px-4 md:px-6 pb-20 md:pb-6 max-w-[1400px]">
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Загружаю данные админки
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Админка недоступна</div>
                  <div>{error === "forbidden" ? "Ваш Telegram ID не указан в ADMIN_TELEGRAM_IDS." : error}</div>
                </div>
              </div>
            )}

            {!isLoading && overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.key} className="rounded-xl border border-border bg-card px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[11px] text-muted-foreground">{card.label}</span>
                        </div>
                        <div className="text-[20px] font-semibold leading-none text-foreground">{overview.totals[card.key]}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border bg-card">
                  <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-[14px] font-semibold text-foreground">Пользователи</h2>
                      <p className="text-[12px] text-muted-foreground">Кто вошёл в приложение и сколько данных создал.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Поиск по имени или Telegram"
                        className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="hidden md:grid grid-cols-[minmax(220px,2fr)_120px_90px_90px_90px_90px_130px] gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Пользователь</span>
                    <span>Вход</span>
                    <span>Продукты</span>
                    <span>Темы</span>
                    <span>Контент</span>
                    <span>Воронки</span>
                    <span>Активность</span>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="py-10 text-center text-[13px] text-muted-foreground">Пользователи не найдены</div>
                  ) : (
                    filteredUsers.map((user) => {
                      const expanded = expandedId === user.id;
                      return (
                        <div key={user.id} className="border-b border-border last:border-0">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : user.id)}
                            className="grid w-full grid-cols-1 gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/20 md:grid-cols-[minmax(220px,2fr)_120px_90px_90px_90px_90px_130px] md:items-center md:gap-3"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-foreground">{user.name}</div>
                                <div className="truncate text-[11px] text-muted-foreground">{displayContact(user)}</div>
                              </div>
                            </div>
                            <span className="text-[12px] text-muted-foreground">{user.provider === "telegram" ? "Telegram" : "Email"}</span>
                            <span className="text-[13px] font-medium text-foreground">{user.stats.products}</span>
                            <span className="text-[13px] font-medium text-foreground">{user.stats.topics}</span>
                            <span className="text-[13px] font-medium text-foreground">{user.stats.contentItems}</span>
                            <span className="text-[13px] font-medium text-foreground">{user.stats.funnels}</span>
                            <span className="flex items-center justify-between text-[12px] text-muted-foreground">
                              {formatRelative(user.stateUpdatedAt || user.updatedAt || user.createdAt)}
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </span>
                          </button>

                          {expanded && (
                            <div className="border-t border-border/60 bg-muted/10 px-3 py-3">
                              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                <div className="rounded-xl border border-border bg-card px-3 py-2">
                                  <div className="text-[11px] text-muted-foreground">Идей</div>
                                  <div className="text-[17px] font-semibold text-foreground">{user.stats.ideas}</div>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-3 py-2">
                                  <div className="text-[11px] text-muted-foreground">Кодовых слов</div>
                                  <div className="text-[17px] font-semibold text-foreground">{user.stats.keywords}</div>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-3 py-2">
                                  <div className="text-[11px] text-muted-foreground">Регистрация</div>
                                  <div className="text-[12px] font-medium text-foreground">{formatDate(user.createdAt)}</div>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-3 py-2">
                                  <div className="text-[11px] text-muted-foreground">Обновление данных</div>
                                  <div className="text-[12px] font-medium text-foreground">{formatDate(user.stateUpdatedAt)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        <MobileHeader />
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
