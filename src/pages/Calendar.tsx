import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { useDataStore } from "@/lib/dataStore";
import { PLATFORMS, STATUSES, type ContentItemData } from "@/lib/contentData";
import { PRODUCT_TYPES, PRODUCT_STATUSES, type Product } from "@/lib/productData";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";

/* ── Types ── */

type ViewMode = "month" | "week" | "day";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: "content" | "product";
  color: string;
  statusColor: string;
  icon?: React.ReactNode;
  original: ContentItemData | Product;
}

/* ── Date helpers ── */

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_NAMES_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  const r = new Date(d);
  r.setDate(r.getDate() + diff);
  return r;
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const weeks: Date[][] = [];
  let current = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    // Stop if we've passed the month and completed the row
    if (current.getMonth() !== month && w >= 3) break;
  }
  return weeks;
}

function getWeekDays(refDate: Date): Date[] {
  const start = startOfWeek(refDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatShortDate(d: Date): string {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/* ── Main component ── */

const Calendar = () => {
  const { topics, products } = useDataStore();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayStr = toDateStr(new Date());

  /* Build events from content + products */
  const events = useMemo(() => {
    const list: CalendarEvent[] = [];

    // Content items with publishDate
    topics.forEach((topic) => {
      topic.contentItems.forEach((ci) => {
        if (ci.publishDate) {
          const platform = PLATFORMS.find((p) => p.id === ci.platformId);
          const status = STATUSES[ci.status];
          list.push({
            id: `c-${ci.id}`,
            title: ci.title || "Без названия",
            date: ci.publishDate,
            type: "content",
            color: platform?.color || "#8B5CF6",
            statusColor: status.color,
            icon: <PlatformIcon platformId={ci.platformId} size={12} />,
            original: ci,
          });
        }
      });
    });

    // Products with publishDate
    products.forEach((p) => {
      if (p.publishDate) {
        const type = PRODUCT_TYPES.find((t) => t.id === p.typeId);
        const status = PRODUCT_STATUSES[p.status];
        list.push({
          id: `p-${p.id}`,
          title: p.name,
          date: p.publishDate,
          type: "product",
          color: type?.color || "#6366f1",
          statusColor: status.color,
          icon: <ProductTypeIcon typeId={p.typeId} size={12} />,
          original: p,
        });
      }
    });

    return list;
  }, [topics, products]);

  /* Group events by date */
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  /* Navigation */
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  /* Header title */
  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const days = getWeekDays(currentDate);
      return `${formatShortDate(days[0])} — ${formatShortDate(days[6])}`;
    }
    const dayIdx = (currentDate.getDay() + 6) % 7;
    return `${DAY_NAMES_FULL[dayIdx]}, ${formatShortDate(currentDate)}`;
  }, [currentDate, viewMode]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                    Календарь
                  </h1>
                </div>

                {/* View mode tabs */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-0.5">
                  {(["month", "week", "day"] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 border-none cursor-pointer"
                      style={{
                        background: viewMode === m ? "hsl(var(--card))" : "transparent",
                        color: viewMode === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                        boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                      }}
                    >
                      {m === "month" ? "Месяц" : m === "week" ? "Неделя" : "День"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2 pb-3">
                <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors border-none bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate(1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors border-none bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-[14px] font-semibold text-foreground">{headerTitle}</span>
                <button
                  onClick={goToday}
                  className="ml-2 px-3 py-1 rounded-lg text-[12px] font-medium border border-border bg-transparent cursor-pointer text-muted-foreground hover:bg-muted transition-colors"
                >
                  Сегодня
                </button>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {events.length} запланировано
                </span>
              </div>
            </div>
          </header>

          {/* Calendar body */}
          <main className="flex-1 max-w-6xl w-full mx-auto py-3 md:py-4 px-4 md:px-6 pb-20 md:pb-6">
            {viewMode === "month" && (
              <MonthView
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                eventsByDate={eventsByDate}
                todayStr={todayStr}
                onSelectDate={(d) => { setCurrentDate(d); setViewMode("day"); }}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                refDate={currentDate}
                eventsByDate={eventsByDate}
                todayStr={todayStr}
                onSelectDate={(d) => { setCurrentDate(d); setViewMode("day"); }}
              />
            )}
            {viewMode === "day" && (
              <DayView
                date={currentDate}
                events={eventsByDate[toDateStr(currentDate)] || []}
                todayStr={todayStr}
              />
            )}
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
};

/* ── Month View ── */

function MonthView({
  year, month, eventsByDate, todayStr, onSelectDate,
}: {
  year: number;
  month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  todayStr: string;
  onSelectDate: (d: Date) => void;
}) {
  const weeks = getMonthGrid(year, month);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/60">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dateStr = toDateStr(day);
              const isCurrentMonth = day.getMonth() === month;
              const isToday = dateStr === todayStr;
              const dayEvents = eventsByDate[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDate(day)}
                  className="bg-card min-h-[80px] md:min-h-[100px] p-1.5 cursor-pointer transition-colors duration-150 hover:bg-primary/[0.02]"
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-0.5">
                    <span
                      className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground font-bold"
                          : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <EventPill key={ev.id} event={ev} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground text-center">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Week View ── */

function WeekView({
  refDate, eventsByDate, todayStr, onSelectDate,
}: {
  refDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  todayStr: string;
  onSelectDate: (d: Date) => void;
}) {
  const days = getWeekDays(refDate);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dateStr = toDateStr(day);
        const isToday = dateStr === todayStr;
        const dayEvents = eventsByDate[dateStr] || [];
        const dayIdx = (day.getDay() + 6) % 7;

        return (
          <div
            key={dateStr}
            className={`rounded-2xl border p-2 min-h-[200px] md:min-h-[320px] transition-all duration-200 ${
              isToday ? "border-primary/40 bg-primary/[0.02]" : "border-border bg-card"
            }`}
          >
            {/* Day header */}
            <div
              className="text-center mb-2 cursor-pointer"
              onClick={() => onSelectDate(day)}
            >
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                {DAY_NAMES_SHORT[dayIdx]}
              </div>
              <div
                className={`text-[16px] font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {day.getDate()}
              </div>
            </div>

            {/* Events */}
            <div className="flex flex-col gap-1">
              {dayEvents.map((ev) => (
                <EventPill key={ev.id} event={ev} />
              ))}
              {dayEvents.length === 0 && (
                <div className="text-[10px] text-muted-foreground/40 text-center mt-4">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Day View ── */

function DayView({
  date, events, todayStr,
}: {
  date: Date;
  events: CalendarEvent[];
  todayStr: string;
}) {
  const isToday = toDateStr(date) === todayStr;

  const contentEvents = events.filter((e) => e.type === "content");
  const productEvents = events.filter((e) => e.type === "product");

  return (
    <div className="max-w-2xl mx-auto">
      {isToday && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Сегодня
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[40px] mb-3 opacity-30">📅</div>
          <div className="text-[14px] text-muted-foreground">Нет запланированного контента на этот день</div>
        </div>
      ) : (
        <>
          {/* Content section */}
          {contentEvents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold text-muted-foreground mb-2">
                Контент ({contentEvents.length})
              </h3>
              <div className="flex flex-col gap-1.5">
                {contentEvents.map((ev) => (
                  <DayEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          )}

          {/* Product section */}
          {productEvents.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground mb-2">
                Продукты ({productEvents.length})
              </h3>
              <div className="flex flex-col gap-1.5">
                {productEvents.map((ev) => (
                  <DayEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Event Pill (compact for month/week) ── */

function EventPill({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate transition-all duration-150"
      style={{
        background: event.color + "15",
        color: event.color,
        borderLeft: `2px solid ${event.color}`,
      }}
      title={event.title}
    >
      {event.icon}
      <span className="truncate">{compact && event.title.length > 12 ? event.title.slice(0, 12) + "…" : event.title}</span>
    </div>
  );
}

/* ── Day Event Card (detailed for day view) ── */

function DayEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl card-elevated transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)]"
      style={{ borderLeft: `3px solid ${event.color}` }}
    >
      {/* Status dot */}
      <span className="relative shrink-0 w-2 h-2">
        {event.statusColor !== "#94a3b8" && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: event.statusColor }} />
        )}
        <span className="absolute inset-0 rounded-full" style={{ background: event.statusColor }} />
      </span>

      {/* Icon */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
        {event.icon}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-foreground truncate">{event.title}</div>
        <div className="text-[10px] text-muted-foreground capitalize">
          {event.type === "content" ? "контент" : "продукт"}
        </div>
      </div>

      {/* Color accent */}
      <span
        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
        style={{ background: event.color + "15", color: event.color }}
      >
        {event.type === "content" ? "контент" : "продукт"}
      </span>
    </div>
  );
}

export default Calendar;
