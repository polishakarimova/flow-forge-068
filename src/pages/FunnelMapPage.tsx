import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { type Funnel, type ContentItem, type FunnelProduct } from "@/lib/funnelData";
import { useDataStore } from "@/lib/dataStore";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ContentDrawer } from "@/components/ContentDrawer";
import { getBadgeStyle } from "@/lib/badgeStyles";
import { ChevronDown, MoreHorizontal } from "lucide-react";

/* ── helpers ──────────────────────────────────────────── */

const FUNNEL_PLATFORM_ID: Record<string, string> = {
  "Telegram|Пост": "tg_post",
  "Instagram|Stories": "stories",
  "Instagram|Пост": "ig_post",
  "Instagram|Reels": "reels",
  "Instagram|Карусель": "carousel",
  "Blog|Статья": "article",
  "Threads|Тред": "threads",
  "YouTube|Видео": "youtube",
  "VK|Пост": "vk",
};

function getPlatformId(item: ContentItem): string {
  return FUNNEL_PLATFORM_ID[`${item.platform}|${item.format}`] || "";
}

const TIER_TYPE_ID: Record<string, string> = {
  "lead-magnet": "lead_magnet",
  "mid-ticket": "mid_ticket",
  flagship: "flagship",
};

function getProducts(f: Funnel): { product: FunnelProduct; typeId: string }[] {
  const out: { product: FunnelProduct; typeId: string }[] = [];
  if (f.leadMagnet) out.push({ product: f.leadMagnet, typeId: "lead_magnet" });
  if (f.midTicket) out.push({ product: f.midTicket, typeId: "mid_ticket" });
  if (f.flagship) out.push({ product: f.flagship, typeId: "flagship" });
  return out;
}

/* ── Expanded list modal ────────────────────────────────── */

function ExpandedListModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card rounded-3xl w-full max-w-[420px] max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-3 duration-300"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="bg-muted border-none rounded-lg w-[28px] h-[28px] cursor-pointer text-[13px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[55vh] space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Single funnel row ──────────────────────────────────── */

function FunnelRow({
  funnel,
  onOpenContent,
  onOpenProduct,
}: {
  funnel: Funnel;
  onOpenContent: (item: ContentItem, funnel: Funnel) => void;
  onOpenProduct: (product: FunnelProduct) => void;
}) {
  const [contentExpanded, setContentExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [contentModal, setContentModal] = useState(false);
  const [productsModal, setProductsModal] = useState(false);

  const products = getProducts(funnel);
  const platformIds = [...new Set(funnel.contentItems.map(getPlatformId).filter(Boolean))];

  const PREVIEW = 2;
  const contentPreview = funnel.contentItems.slice(0, PREVIEW);
  const hasMoreContent = funnel.contentItems.length > PREVIEW;
  const productPreview = products.slice(0, PREVIEW);
  const hasMoreProducts = products.length > PREVIEW;

  return (
    <div className="card-elevated rounded-2xl border border-border overflow-hidden">
      {/* ─ Keyword row (always visible) ─ */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Keyword badge */}
        <div
          className="inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.05em] shrink-0"
          style={getBadgeStyle(funnel.badgeColor)}
        >
          {funnel.keyword}
        </div>

        {/* Content summary (collapsed) — icons + count */}
        <button
          onClick={() => setContentExpanded(!contentExpanded)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer border-none"
        >
          <div className="flex items-center -space-x-1">
            {platformIds.slice(0, 4).map((pid) => (
              <PlatformIcon key={pid} platformId={pid} size={14} />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{funnel.contentItems.length}</span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${contentExpanded ? "rotate-180" : ""}`} />
        </button>

        <div className="flex-1" />

        {/* Products summary (collapsed) — icons + count */}
        {products.length > 0 && (
          <button
            onClick={() => setProductsExpanded(!productsExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer border-none"
          >
            <div className="flex items-center -space-x-0.5">
              {products.slice(0, 3).map(({ typeId }, i) => (
                <ProductTypeIcon key={i} typeId={typeId} size={14} />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">{products.length}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${productsExpanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* ─ Content expanded section ─ */}
      {contentExpanded && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-1 duration-200">
          <div className="border-t border-border pt-2.5 space-y-1">
            {contentPreview.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenContent(item, funnel)}
                className="flex items-center gap-2 text-[12px] cursor-pointer rounded-lg px-2 py-1.5 transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
              >
                {getPlatformId(item) && <PlatformIcon platformId={getPlatformId(item)} size={14} />}
                <span className="text-foreground/70 truncate">{item.title}</span>
              </div>
            ))}
            {hasMoreContent && (
              <button
                onClick={() => setContentModal(true)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1.5 hover:bg-muted/50 border-none bg-transparent cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>ещё {funnel.contentItems.length - PREVIEW}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─ Products expanded section ─ */}
      {productsExpanded && products.length > 0 && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-1 duration-200">
          <div className="border-t border-border pt-2.5 space-y-1">
            {productPreview.map(({ product, typeId }) => (
              <div
                key={product.id}
                onClick={() => onOpenProduct(product)}
                className="flex items-center gap-2 text-[12px] cursor-pointer rounded-lg px-2 py-1.5 transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
              >
                <ProductTypeIcon typeId={typeId} size={16} />
                <span className="text-foreground/70 truncate">{product.name}</span>
              </div>
            ))}
            {hasMoreProducts && (
              <button
                onClick={() => setProductsModal(true)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1.5 hover:bg-muted/50 border-none bg-transparent cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>ещё {products.length - PREVIEW}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content modal */}
      {contentModal && (
        <ExpandedListModal title="Контент" onClose={() => setContentModal(false)}>
          {funnel.contentItems.map((item) => (
            <div
              key={item.id}
              onClick={() => { setContentModal(false); onOpenContent(item, funnel); }}
              className="flex items-center gap-2 text-[12px] cursor-pointer rounded-lg px-2 py-2 transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
            >
              {getPlatformId(item) && <PlatformIcon platformId={getPlatformId(item)} size={16} />}
              <span className="text-foreground/80 truncate">{item.title}</span>
            </div>
          ))}
        </ExpandedListModal>
      )}

      {/* Products modal */}
      {productsModal && (
        <ExpandedListModal title="Продукты" onClose={() => setProductsModal(false)}>
          {products.map(({ product, typeId }) => (
            <div
              key={product.id}
              onClick={() => { setProductsModal(false); onOpenProduct(product); }}
              className="flex items-center gap-2 text-[12px] cursor-pointer rounded-lg px-2 py-2 transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
            >
              <ProductTypeIcon typeId={typeId} size={18} />
              <span className="text-foreground/80 truncate">{product.name}</span>
            </div>
          ))}
        </ExpandedListModal>
      )}
    </div>
  );
}

/* ── Vertical connector ─────────────────────────────────── */

function VerticalConnector() {
  return (
    <div className="flex justify-center py-1">
      <svg width="16" height="24" viewBox="0 0 16 24">
        <line x1="8" y1="0" x2="8" y2="16" stroke="#C4B5FD" strokeWidth="1.5" />
        <polygon points="4,14 8,22 12,14" fill="#C4B5FD" />
      </svg>
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */

const FunnelMapPage = () => {
  const { funnels } = useDataStore();
  const [drawerProduct, setDrawerProduct] = useState<FunnelProduct | null>(null);
  const [drawerContent, setDrawerContent] = useState<ContentItem | null>(null);
  const [drawerFunnel, setDrawerFunnel] = useState<Funnel | null>(null);

  const handleOpenContent = (item: ContentItem, funnel: Funnel) => {
    setDrawerFunnel(funnel);
    setDrawerContent(item);
  };

  const handleOpenProduct = (product: FunnelProduct) => {
    setDrawerProduct(product);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* ─── Header ─── */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-full mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-[44px]">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <span className="text-[12px] font-extrabold text-foreground tracking-[0.08em]">
                    КАРТА ВОРОНОК
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* ─── Vertical funnel list ─── */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
            <div className="max-w-[520px] mx-auto space-y-0">
              {funnels.map((funnel, i) => (
                <div key={funnel.id}>
                  <FunnelRow
                    funnel={funnel}
                    onOpenContent={handleOpenContent}
                    onOpenProduct={handleOpenProduct}
                  />
                  {i < funnels.length - 1 && <VerticalConnector />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileNav />
      </div>

      <ProductDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onOpenChange={(open) => !open && setDrawerProduct(null)}
      />
      <ContentDrawer
        content={drawerContent}
        funnel={drawerFunnel}
        open={!!drawerContent}
        onOpenChange={(open) => { if (!open) { setDrawerContent(null); setDrawerFunnel(null); } }}
      />
    </SidebarProvider>
  );
};

export default FunnelMapPage;
