import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import {
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_ORDER,
  DEFAULT_FORMATS,
  formatProductDateLabel,
  initialProducts,
  type Product,
  type ProductStatusKey,
} from "@/lib/productData";
import { ProductCard } from "@/components/products/ProductCard";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import { EditProductModal } from "@/components/products/EditProductModal";
import { ContentDropdown } from "@/components/content/ContentDropdown";

const Products = () => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formats, setFormats] = useState<string[]>(DEFAULT_FORMATS);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let arr = products;
    if (typeFilter) arr = arr.filter((p) => p.typeId === typeFilter);
    if (formatFilter) arr = arr.filter((p) => p.format === formatFilter);
    if (statusFilter) arr = arr.filter((p) => p.status === statusFilter);
    arr.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    return arr;
  }, [products, typeFilter, formatFilter, statusFilter]);

  const grouped = useMemo(() => {
    const groups: { date: string; label: string; items: Product[] }[] = [];
    let currentDate: string | null = null;
    filtered.forEach((p) => {
      const d = p.createdDate || "";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, label: formatProductDateLabel(d), items: [] });
      }
      groups[groups.length - 1].items.push(p);
    });
    return groups;
  }, [filtered]);

  // Filter options
  const typeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { counts[p.typeId] = (counts[p.typeId] || 0) + 1; });
    return PRODUCT_TYPES.filter((t) => counts[t.id]).map((t) => ({
      value: t.id, label: t.label, icon: t.icon, count: counts[t.id],
    }));
  }, [products]);

  const formatOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { if (p.format) counts[p.format] = (counts[p.format] || 0) + 1; });
    return Object.entries(counts).map(([f, n]) => ({ value: f, label: f, count: n }));
  }, [products]);

  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return PRODUCT_STATUS_ORDER.filter((k) => counts[k]).map((k) => ({
      value: k, label: PRODUCT_STATUSES[k].label, dot: PRODUCT_STATUSES[k].color, count: counts[k],
    }));
  }, [products]);

  const handleCreate = (data: { name: string; typeId: string; format: string; price: string; currency: string; description: string; link: string }) => {
    const newProduct: Product = {
      id: Date.now(),
      ...data,
      status: "draft" as ProductStatusKey,
      createdDate: new Date().toISOString().slice(0, 10),
    };
    setProducts([newProduct, ...products]);
  };

  const handleSave = (updated: Product) => {
    setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAddFormat = (f: string) => {
    if (!formats.includes(f)) setFormats([...formats, f]);
  };

  const handleDeleteFormat = (f: string) => {
    setFormats(formats.filter((x) => x !== f));
    if (formatFilter === f) setFormatFilter(null);
  };

  const hasFilters = typeFilter || formatFilter || statusFilter;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                      Продукты
                    </h1>
                    <span className="text-[13px] text-muted-foreground">
                      / {products.length} продуктов
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Новый продукт</span>
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 max-w-5xl w-full mx-auto py-5 md:py-6 px-4 md:px-6 pb-20 md:pb-6">
            {/* Filters */}
            <div className="flex gap-2 mb-3 items-center flex-wrap">
              <ContentDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
                placeholder="Все типы"
                width={160}
              />
              <ContentDropdown
                value={formatFilter}
                onChange={setFormatFilter}
                options={formatOptions}
                placeholder="Все форматы"
                width={160}
              />
              <ContentDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                placeholder="Все статусы"
                width={160}
              />
              {hasFilters && (
                <button
                  onClick={() => { setTypeFilter(null); setFormatFilter(null); setStatusFilter(null); }}
                  className="text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer underline hover:text-foreground transition-colors"
                >
                  Сбросить
                </button>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {filtered.length} из {products.length}
              </span>
            </div>

            {/* Product list */}
            {grouped.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-[28px] mb-1.5">📦</div>
                <div className="text-[13px]">Пока нет продуктов</div>
              </div>
            ) : (
              grouped.map((g) => (
                <div key={g.date}>
                  <div className="flex items-center gap-3 pt-3 pb-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{g.label}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[12px] text-muted-foreground">{g.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mb-0.5">
                    {g.items.map((p) => (
                      <ProductCard key={p.id} product={p} onOpen={setEditing} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </main>
        </div>

        <MobileNav />
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateProductModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          formats={formats}
          onAddFormat={handleAddFormat}
          onDeleteFormat={handleDeleteFormat}
        />
      )}
      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          formats={formats}
          onAddFormat={handleAddFormat}
          onDeleteFormat={handleDeleteFormat}
        />
      )}
    </SidebarProvider>
  );
};

export default Products;
