import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { PathRow } from "@/components/PathRow";
import { ContentDropdown } from "@/components/content/ContentDropdown";
import { CreateFunnelModal } from "@/components/funnels/CreateFunnelModal";
import { useDataStore } from "@/lib/dataStore";
import type { Funnel } from "@/lib/funnelData";

const Index = () => {
  const { funnels, toggleFunnelActive } = useDataStore();
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);

  const keywordOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    funnels.forEach((f) => { counts[f.keyword] = (counts[f.keyword] || 0) + 1; });
    return Object.entries(counts).map(([kw, n]) => ({
      value: kw, label: kw, count: n,
    }));
  }, [funnels]);

  const productOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    funnels.forEach((f) => { counts[f.product] = (counts[f.product] || 0) + 1; });
    return Object.entries(counts).map(([p, n]) => ({
      value: p, label: p, count: n,
    }));
  }, [funnels]);

  const filtered = funnels.filter((f) => {
    if (selectedKeyword && f.keyword !== selectedKeyword) return false;
    if (selectedProduct && f.product !== selectedProduct) return false;
    return true;
  });

  const activeFunnels = filtered.filter((f) => f.active);
  const inactiveFunnels = filtered.filter((f) => !f.active);

  const hasFilters = selectedKeyword || selectedProduct;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                      Воронки
                    </h1>
                    <span className="text-[13px] text-muted-foreground">
                      / Активные ({activeFunnels.length})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Новая воронка</span>
                </button>
              </div>

              {/* Dropdown filters */}
              <div className="flex items-center gap-2 pb-3">
                <ContentDropdown
                  value={selectedKeyword}
                  onChange={setSelectedKeyword}
                  options={keywordOptions}
                  placeholder="Все слова"
                  width={160}
                />
                <ContentDropdown
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  options={productOptions}
                  placeholder="Все продукты"
                  width={220}
                />
                {hasFilters && (
                  <button
                    onClick={() => { setSelectedKeyword(null); setSelectedProduct(null); }}
                    className="text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer underline hover:text-foreground transition-colors"
                  >
                    Сбросить
                  </button>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {filtered.length} из {funnels.length}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-5xl w-full mx-auto py-5 md:py-6 px-4 md:px-6 pb-20 md:pb-6">
            <div>
              {activeFunnels.map((funnel) => (
                <PathRow
                  key={funnel.id}
                  funnel={funnel}
                  defaultExpanded={funnel.keyword === "КЕЙС"}
                  onToggleActive={toggleFunnelActive}
                  onEdit={setEditingFunnel}
                />
              ))}
            </div>

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
                      onToggleActive={toggleFunnelActive}
                      onEdit={setEditingFunnel}
                    />
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-[13px]">Нет воронок по выбранным фильтрам</div>
              </div>
            )}
          </main>
        </div>

        <MobileNav />
      </div>
      {showCreate && <CreateFunnelModal onClose={() => setShowCreate(false)} />}
      {editingFunnel && (
        <CreateFunnelModal
          editFunnel={editingFunnel}
          onClose={() => setEditingFunnel(null)}
        />
      )}
    </SidebarProvider>
  );
};

export default Index;
