import { useState } from "react";
import { ChevronRight, Plus, MoreHorizontal, ArrowUpRight } from "lucide-react";

interface ContentUnit {
  id: string;
  title: string;
  type: string;
  metric?: string;
}

interface Funnel {
  id: string;
  keyword: string;
  product: string;
  productType: string;
  active: boolean;
  children: ContentUnit[];
}

const funnelsData: Funnel[] = [
  {
    id: "1",
    keyword: "кейс",
    product: "Статья про кейс на 1.4 млн",
    productType: "Лид-магнит",
    active: true,
    children: [
      { id: "1a", title: "Reels: результат клиента", type: "reels", metric: "12.4K" },
      { id: "1b", title: "Stories: до/после", type: "stories", metric: "8.1K" },
      { id: "1c", title: "Пост-карусель: разбор", type: "post", metric: "3.2K" },
    ],
  },
  {
    id: "2",
    keyword: "образ",
    product: "Туториал как примерить любую причёску",
    productType: "Лид-магнит",
    active: true,
    children: [
      { id: "2a", title: "Reels: трансформация образа", type: "reels", metric: "24.7K" },
      { id: "2b", title: "Stories: опрос по стилю", type: "stories", metric: "5.3K" },
    ],
  },
  {
    id: "3",
    keyword: "макс",
    product: "Инструкция по переносу ТГ-канала в MAX",
    productType: "Лид-магнит",
    active: true,
    children: [
      { id: "3a", title: "Пост: почему MAX", type: "post", metric: "6.8K" },
      { id: "3b", title: "Stories: пошаговый гайд", type: "stories", metric: "4.1K" },
      { id: "3c", title: "Reels: сравнение платформ", type: "reels", metric: "15.9K" },
    ],
  },
  {
    id: "4",
    keyword: "система",
    product: "AI-команда под ключ",
    productType: "Трипваер",
    active: true,
    children: [
      { id: "4a", title: "Reels: как Claude пишет за тебя", type: "reels", metric: "31.2K" },
      { id: "4b", title: "Пост: 5 промптов для эксперта", type: "post", metric: "9.4K" },
    ],
  },
  {
    id: "5",
    keyword: "запуск",
    product: "Чек-лист запуска продукта",
    productType: "Лид-магнит",
    active: false,
    children: [
      { id: "5a", title: "Stories: тизер", type: "stories" },
    ],
  },
  {
    id: "6",
    keyword: "воронка",
    product: "Мини-курс по автоворонкам",
    productType: "Лид-магнит",
    active: false,
    children: [
      { id: "6a", title: "Reels: что такое воронка", type: "reels" },
    ],
  },
];

type FilterType = "all" | "keyword" | "type" | "product";

const PathRow = ({ funnel }: { funnel: Funnel }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${!funnel.active ? "opacity-40 grayscale" : ""}`}>
      {/* Main row */}
      <div className="group flex items-center h-14 md:h-16 px-4 md:px-6 relative">
        {/* Trigger button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="relative z-10 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full border border-border bg-secondary/50 hover:bg-secondary transition-colors shrink-0"
          aria-label="Раскрыть воронку"
        >
          <div className="flex gap-[3px]">
            <span className="w-[5px] h-[5px] rounded-full bg-primary" />
            <span className="w-[5px] h-[5px] rounded-full bg-primary" />
            <span className="w-[5px] h-[5px] rounded-full bg-primary" />
          </div>
        </button>

        {/* Circuit line */}
        <div className="circuit-line flex-1 mx-3 md:mx-5" />

        {/* Keyword badge */}
        <span className="relative z-10 shrink-0 inline-flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wider">
          {funnel.keyword}
        </span>

        {/* Circuit line */}
        <div className="circuit-line flex-1 mx-3 md:mx-5 hidden md:block" />

        {/* Product */}
        <div className="hidden md:flex items-center gap-2 shrink-0 max-w-[340px]">
          <span className="text-[13px] text-foreground/80 truncate">
            <span className="text-muted-foreground text-[11px] mr-2">{funnel.productType}:</span>
            {funnel.product}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
      </div>

      {/* Mobile product line */}
      <div className="flex md:hidden items-center gap-2 px-4 pb-2 -mt-1 pl-[60px]">
        <span className="text-[12px] text-foreground/60 truncate">
          <span className="text-muted-foreground text-[10px] mr-1.5">{funnel.productType}:</span>
          {funnel.product}
        </span>
        <ArrowUpRight className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>

      {/* Expanded children */}
      {expanded && (
        <div className="relative ml-[18px] md:ml-[24px] pl-6 md:pl-8 pb-3">
          {/* Vertical connector line */}
          <div className="absolute left-[18px] md:left-[24px] top-0 bottom-3 circuit-line-vertical" />

          {funnel.children.map((child, i) => (
            <div
              key={child.id}
              className="flex items-center h-10 md:h-12 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              {/* Node dot */}
              <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0 -ml-[7px] md:-ml-[7px] mr-3 md:mr-4 relative z-10" />

              {/* Horizontal line */}
              <div className="circuit-line w-6 md:w-10 shrink-0" />

              {/* Content type badge */}
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] font-medium uppercase tracking-wide mx-2 md:mx-3">
                {child.type}
              </span>

              {/* Title */}
              <span className="text-[12px] md:text-[13px] text-foreground/60 truncate">
                {child.title}
              </span>

              {/* Metric */}
              {child.metric && (
                <span className="ml-auto font-mono text-[11px] text-primary/70 shrink-0 pl-3">
                  {child.metric}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Index = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const activeFunnels = funnelsData.filter((f) => f.active);
  const inactiveFunnels = funnelsData.filter((f) => !f.active);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "keyword", label: "Кодовое слово" },
    { key: "type", label: "Тип контента" },
    { key: "product", label: "Продукт" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 surface-glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Title row */}
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                Paths
              </h1>
              <span className="text-[13px] text-muted-foreground">
                / Active ({activeFunnels.length})
              </span>
            </div>

            <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Path</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 pb-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto py-4 md:py-6">
        {/* Active funnels */}
        <div className="space-y-1">
          {activeFunnels.map((funnel) => (
            <PathRow key={funnel.id} funnel={funnel} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-6 md:my-8 mx-4 md:mx-6 circuit-line" />

        {/* Inactive funnels */}
        <div className="space-y-1">
          {inactiveFunnels.map((funnel) => (
            <PathRow key={funnel.id} funnel={funnel} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
