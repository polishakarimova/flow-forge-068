import { useState } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PathRow } from "@/components/PathRow";
import { funnelsData, type Funnel } from "@/lib/funnelData";

type FilterType = "all" | "keyword" | "type" | "product";

const filters: { key: FilterType; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "keyword", label: "Кодовое слово" },
  { key: "type", label: "Тип контента" },
  { key: "product", label: "Продукт" },
];

const Index = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [funnels, setFunnels] = useState<Funnel[]>(funnelsData);

  const activeFunnels = funnels.filter((f) => f.active);
  const inactiveFunnels = funnels.filter((f) => !f.active);

  const handleToggleActive = (id: string) => {
    setFunnels((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="md:hidden" />
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                      Paths
                    </h1>
                    <span className="text-[13px] text-muted-foreground">
                      / Активные ({activeFunnels.length})
                    </span>
                  </div>
                </div>

                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Path</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      activeFilter === f.key
                        ? "violet-surface text-primary"
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
          <main className="flex-1 max-w-5xl w-full mx-auto py-5 md:py-6 px-4 md:px-6">
            {/* Active funnels */}
            <div>
              {activeFunnels.map((funnel) => (
                <PathRow
                  key={funnel.id}
                  funnel={funnel}
                  defaultExpanded={funnel.keyword === "КЕЙС"}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>

            {/* Divider */}
            {inactiveFunnels.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-5 md:my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Неактивные
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  {inactiveFunnels.map((funnel) => (
                    <PathRow
                      key={funnel.id}
                      funnel={funnel}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
