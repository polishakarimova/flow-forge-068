import { useState } from "react";
import { Plus, Send, FileText, MoreHorizontal } from "lucide-react";
import type { Funnel, ContentStatus, FunnelProduct, ContentItem } from "@/lib/funnelData";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { STATUSES, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { ContentDetailModal } from "@/components/content/ContentDetailModal";

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

function getFunnelPlatformId(item: ContentItem): string | null {
  return FUNNEL_PLATFORM_ID[`${item.platform}|${item.format}`] || null;
}
import { productsCatalog } from "@/lib/funnelData";
import { ProductDrawer } from "@/components/ProductDrawer";
import { getBadgeStyle } from "@/lib/badgeStyles";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* Map funnel ContentStatus → contentData ContentStatusKey */
const FUNNEL_STATUS_MAP: Record<ContentStatus, ContentStatusKey> = {
  published: "published",
  ready: "ready",
  draft: "in_progress",
};

/* Convert funnel ContentItem → ContentItemData for the detail modal */
function toContentItemData(item: ContentItem): ContentItemData {
  const platformId = FUNNEL_PLATFORM_ID[`${item.platform}|${item.format}`] || "";
  return {
    id: parseInt(item.id.replace(/\D/g, "")) || 0,
    platformId,
    status: FUNNEL_STATUS_MAP[item.status] || "in_progress",
    title: item.title,
    body: "",
    createdDate: "",
    publishDate: "",
  };
}

const tierLabel: Record<string, string> = {
  "lead-magnet": "Лид-магнит",
  "mid-ticket": "Средний чек",
  "flagship": "Флагман",
};

const TIER_TYPE_ID: Record<string, string> = {
  "lead-magnet": "lead_magnet",
  "mid-ticket": "mid_ticket",
  flagship: "flagship",
};

const NodeCard = ({
  children,
  className = "",
  flagship = false,
  onClick,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  flagship?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  delay?: number;
}) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border border-border bg-card p-4 shadow-sm min-w-[180px] transition-all duration-200
      hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] hover:border-primary/30
      ${flagship ? "ring-2 ring-primary/30 border-primary/40 bg-gradient-to-br from-card to-[hsl(var(--violet-soft))] min-w-[200px] hover:-translate-y-1 hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:ring-primary/50" : ""}
      ${onClick ? "cursor-pointer" : ""}
      ${className}`}
    style={{
      animation: `fadeSlideIn 0.4s ease-out ${delay}ms both`,
      ...style,
    }}
  >
    {children}
  </div>
);

const SvgConnector = ({
  delay = 0,
}: {
  delay?: number;
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center shrink-0 px-1 group/connector mt-4"
      style={{ animation: `fadeSlideIn 0.3s ease-out ${delay}ms both` }}
    >
      <svg width="40" height="16" viewBox="0 0 40 16" className="transition-all duration-200">
        <line
          x1="0" y1="8" x2="30" y2="8"
          stroke="#C4B5FD"
          strokeWidth="1.5"
          className="transition-all duration-200 group-hover/connector:[stroke-width:2.5]"
          strokeDasharray="40"
          strokeDashoffset="40"
          style={{
            animation: `drawLine 0.5s ease-out ${delay + 200}ms forwards`,
          }}
        />
        <polygon
          points="28,4 36,8 28,12"
          fill="#C4B5FD"
          className="transition-all duration-200"
          style={{
            opacity: 0,
            animation: `fadeIn 0.3s ease-out ${delay + 500}ms forwards`,
          }}
        />
      </svg>
    </div>
  );
};

const PlaceholderCard = ({
  label,
  tier,
  delay = 0,
}: {
  label: string;
  tier: string;
  delay?: number;
}) => {
  const matchingProducts = productsCatalog.filter((p) => p.tier === tier);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex items-center justify-center text-center
            hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] hover:border-primary/30
            transition-all duration-200 cursor-pointer"
          style={{ animation: `fadeSlideIn 0.4s ease-out ${delay}ms both` }}
        >
          <div className="flex items-center gap-0 text-[12px] text-muted-foreground">
            <span>+{label}</span>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
            Выберите продукт
          </p>
          {matchingProducts.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              {p.name}
            </button>
          ))}
          {matchingProducts.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-2 py-1">Нет продуктов</p>
          )}
          <button className="w-full text-left px-2 py-1.5 rounded-lg text-[12px] text-primary font-medium hover:bg-primary/5 transition-colors">
            + Создать новый
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ── Content item row — matches ContentCard from Content screen ── */
function ContentItemRow({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const platformId = getFunnelPlatformId(item);
  const statusKey = FUNNEL_STATUS_MAP[item.status] || "in_progress";
  const status = STATUSES[statusKey];

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)]"
    >
      {/* Status dot — gray is static, others pulse */}
      <span className="relative shrink-0 w-2 h-2">
        {status.color !== "#94a3b8" && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
        )}
        <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
      </span>

      {/* Platform badge */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
        {platformId && <PlatformIcon platformId={platformId} size={14} />}
      </span>

      {/* Content title */}
      <div className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate">
        {item.title || "Не заполнено"}
      </div>
    </div>
  );
}

/* ── Product row (icon + name) ── */
function ProductItemRow({
  product,
  typeId,
  onClick,
}: {
  product: FunnelProduct;
  typeId: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-2 text-[12px] cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5
        transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
    >
      <ProductTypeIcon typeId={typeId} size={16} />
      <span className="text-foreground/80 truncate">
        {product.name.length > 22 ? product.name.slice(0, 22) + "…" : product.name}
      </span>
    </div>
  );
}

/* ── Expanded list modal overlay ── */
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

export function FunnelMap({ funnel }: { funnel: Funnel }) {
  const [drawerProduct, setDrawerProduct] = useState<FunnelProduct | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [expandedContent, setExpandedContent] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState(false);

  const allProducts: { product: FunnelProduct; typeId: string }[] = [];
  if (funnel.leadMagnet) allProducts.push({ product: funnel.leadMagnet, typeId: "lead_magnet" });
  if (funnel.midTicket) allProducts.push({ product: funnel.midTicket, typeId: "mid_ticket" });
  if (funnel.flagship) allProducts.push({ product: funnel.flagship, typeId: "flagship" });

  const PREVIEW_COUNT = 2;
  const contentPreview = funnel.contentItems.slice(0, PREVIEW_COUNT);
  const hasMoreContent = funnel.contentItems.length > PREVIEW_COUNT;
  const productPreview = allProducts.slice(0, PREVIEW_COUNT);
  const hasMoreProducts = allProducts.length > PREVIEW_COUNT;

  return (
    <div className="py-5 px-4 md:px-6 border-t border-border bg-muted/30">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>

      <div className="flex items-start gap-0 overflow-x-auto pb-3 scrollbar-thin">
        {/* === Content Node === */}
        <NodeCard delay={0}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Контент
            </span>
            <span className="text-[10px] text-muted-foreground/60">({funnel.contentItems.length})</span>
          </div>
          <div className="space-y-1.5">
            {contentPreview.map((item) => (
              <ContentItemRow key={item.id} item={item} onClick={() => setEditingContent(item)} />
            ))}
            {hasMoreContent && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedContent(true); }}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mt-1 transition-colors rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-muted/50"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>ещё {funnel.contentItems.length - PREVIEW_COUNT}</span>
              </button>
            )}
            <button className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-2 transition-colors">
              <Plus className="w-3 h-3" />
              Добавить
            </button>
          </div>
        </NodeCard>

        <SvgConnector delay={100} />

        {/* === CTA Node === */}
        <NodeCard delay={200}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              CTA
            </span>
          </div>
          <div
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-[0.05em] transition-transform duration-200 hover:scale-105"
            style={getBadgeStyle(funnel.badgeColor)}
          >
            {funnel.keyword}
          </div>
        </NodeCard>

        <SvgConnector delay={300} />

        {/* === Products Node (combined) === */}
        {allProducts.length > 0 ? (
          <NodeCard delay={400}>
            <div className="flex items-center gap-2 mb-3">
              <ProductTypeIcon typeId={allProducts[0].typeId} size={24} />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Продукты
              </span>
              <span className="text-[10px] text-muted-foreground/60">({allProducts.length})</span>
            </div>
            <div className="space-y-1.5">
              {productPreview.map(({ product, typeId }) => (
                <ProductItemRow
                  key={product.id}
                  product={product}
                  typeId={typeId}
                  onClick={() => setDrawerProduct(product)}
                />
              ))}
              {hasMoreProducts && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedProducts(true); }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mt-1 transition-colors rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-muted/50"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span>ещё {allProducts.length - PREVIEW_COUNT}</span>
                </button>
              )}
            </div>
          </NodeCard>
        ) : (
          <PlaceholderCard label="Продукт" tier="lead-magnet" delay={400} />
        )}
      </div>

      {/* Expanded content list */}
      {expandedContent && (
        <ExpandedListModal title="Контент" onClose={() => setExpandedContent(false)}>
          {funnel.contentItems.map((item) => (
            <ContentItemRow key={item.id} item={item} onClick={() => { setExpandedContent(false); setEditingContent(item); }} />
          ))}
        </ExpandedListModal>
      )}

      {/* Expanded products list */}
      {expandedProducts && (
        <ExpandedListModal title="Продукты" onClose={() => setExpandedProducts(false)}>
          {allProducts.map(({ product, typeId }) => (
            <ProductItemRow
              key={product.id}
              product={product}
              typeId={typeId}
              onClick={() => { setExpandedProducts(false); setDrawerProduct(product); }}
            />
          ))}
        </ExpandedListModal>
      )}

      {/* Product Drawer */}
      <ProductDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onOpenChange={(open) => !open && setDrawerProduct(null)}
      />

      {/* Content Detail Modal — same as Content screen */}
      {editingContent && (
        <ContentDetailModal
          item={toContentItemData(editingContent)}
          topicTitle=""
          onClose={() => setEditingContent(null)}
          onSave={() => setEditingContent(null)}
        />
      )}
    </div>
  );
}
