import { useState, useMemo } from "react";
import { Plus, Send, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import type { Funnel } from "@/lib/funnelData";
import { resolveFunnelContent, resolveFunnelProducts } from "@/lib/funnelData";
import { useDataStore } from "@/lib/dataStore";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { STATUSES, type ContentItemData } from "@/lib/contentData";
import { ContentDetailModal } from "@/components/content/ContentDetailModal";
import { EditProductModal } from "@/components/products/EditProductModal";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import type { Product } from "@/lib/productData";
import { PRODUCT_TYPES } from "@/lib/productData";
import { getBadgeStyle } from "@/lib/badgeStyles";

const TIER_LABEL: Record<string, string> = {
  lead_magnet: "Лид-магнит",
  tripwire: "Трипвайер",
  mid_ticket: "Среднечек",
  flagship: "Флагман",
  consultation: "Консультация",
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

const SvgConnector = ({ delay = 0 }: { delay?: number }) => (
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
        style={{ animation: `drawLine 0.5s ease-out ${delay + 200}ms forwards` }}
      />
      <polygon
        points="28,4 36,8 28,12"
        fill="#C4B5FD"
        className="transition-all duration-200"
        style={{ opacity: 0, animation: `fadeIn 0.3s ease-out ${delay + 500}ms forwards` }}
      />
    </svg>
  </div>
);

/* ── Gray plus button between blocks ── */
const AddProductButton = ({ delay = 0, onClick }: { delay?: number; onClick: () => void }) => (
  <div
    className="flex flex-col items-center justify-center shrink-0 px-0.5 mt-4"
    style={{ animation: `fadeSlideIn 0.3s ease-out ${delay}ms both` }}
  >
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center
        text-muted-foreground/40 hover:border-primary/50 hover:text-primary hover:bg-primary/5
        transition-all duration-200 cursor-pointer"
      title="Добавить продукт"
    >
      <Plus className="w-3 h-3" />
    </button>
  </div>
);

/* ── Content item row ── */
function ContentItemRow({
  item,
  onClick,
  onDelete,
}: {
  item: ContentItemData;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const status = STATUSES[item.status];

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)] group/row"
    >
      <span className="relative shrink-0 w-2 h-2">
        {status.color !== "#94a3b8" && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
        )}
        <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
      </span>
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
        <PlatformIcon platformId={item.platformId} size={14} />
      </span>
      <div className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate">
        {item.title || "Не заполнено"}
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover/row:opacity-100 shrink-0 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/* ── Expanded list modal overlay ── */
function ExpandedListModal({
  title,
  onClose,
  children,
  onAdd,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onAdd?: () => void;
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
        {onAdd && (
          <div className="px-6 py-3 border-t border-border">
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add product picker modal ── */
function AddProductPickerModal({
  existingProducts,
  onSelectExisting,
  onCreateNew,
  onClose,
}: {
  existingProducts: Product[];
  onSelectExisting: (product: Product) => void;
  onCreateNew: () => void;
  onClose: () => void;
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
          <h3 className="text-[14px] font-bold text-foreground">Добавить продукт</h3>
          <button
            onClick={onClose}
            className="bg-muted border-none rounded-lg w-[28px] h-[28px] cursor-pointer text-[13px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh] space-y-1">
          {existingProducts.length > 0 ? (
            <>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                Существующие продукты
              </p>
              {existingProducts.map((product) => {
                const typeInfo = PRODUCT_TYPES.find((t) => t.id === product.typeId);
                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectExisting(product)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)] border border-transparent hover:border-primary/20"
                  >
                    <ProductTypeIcon typeId={product.typeId} size={18} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-foreground truncate">{product.name}</div>
                      <div className="text-[10px] text-muted-foreground">{typeInfo?.label}</div>
                    </div>
                    {product.price && (
                      <span className="text-[10px] text-primary font-medium shrink-0">
                        {product.price} {product.currency}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-[12px] text-muted-foreground text-center py-4">Нет доступных продуктов</p>
          )}
        </div>
        <div className="px-6 py-3 border-t border-border">
          <button
            onClick={onCreateNew}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать новый продукт
          </button>
        </div>
      </div>
    </div>
  );
}

export function FunnelMap({ funnel }: { funnel: Funnel }) {
  const { allContentItems, products, topics, updateContentItem, updateProduct, addProduct, formats, addFormat, deleteFormat } = useDataStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItemData | null>(null);
  const [expandedContent, setExpandedContent] = useState(false);
  const [showAddProductPicker, setShowAddProductPicker] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  /* Resolve real content items from store */
  const contentItems = useMemo(
    () => resolveFunnelContent(funnel, allContentItems),
    [funnel, allContentItems],
  );

  /* Resolve real products from store as sequential chain */
  const productChain = useMemo(
    () => resolveFunnelProducts(funnel, products),
    [funnel, products],
  );

  /* Find topic title for a content item */
  const getTopicTitle = (ci: ContentItemData) => {
    const topic = topics.find((t) => t.contentItems.some((c) => c.id === ci.id));
    return topic?.title || "";
  };

  /* Products not already in this funnel (for picker) */
  const availableProducts = useMemo(() => {
    const usedIds = new Set(productChain.map(({ product }) => product.id));
    return products.filter((p) => !usedIds.has(p.id));
  }, [products, productChain]);

  const PREVIEW_COUNT = 2;
  const contentPreview = contentItems.slice(0, PREVIEW_COUNT);
  const hasMoreContent = contentItems.length > PREVIEW_COUNT;

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
        <NodeCard
          delay={0}
          onClick={hasMoreContent ? () => setExpandedContent(true) : undefined}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Контент
            </span>
            <span className="text-[10px] text-muted-foreground/60">({contentItems.length})</span>
          </div>
          <div className="space-y-1.5">
            {contentPreview.map((item) => (
              <ContentItemRow key={item.id} item={item} onClick={() => setEditingContent(item)} />
            ))}
            {hasMoreContent && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mt-1 transition-colors rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-muted/50 cursor-pointer">
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>ещё {contentItems.length - PREVIEW_COUNT}</span>
              </div>
            )}
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-2 transition-colors"
            >
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

        {/* === Sequential Product Chain — always each product separately === */}
        {productChain.map(({ product }, idx) => {
          const typeId = product.typeId;
          const label = TIER_LABEL[typeId] || typeId;
          const isFlagship = typeId === "flagship";

          return (
            <div key={product.id} className="flex items-start">
              <SvgConnector delay={300 + idx * 150} />
              <NodeCard
                delay={350 + idx * 150}
                flagship={isFlagship}
                onClick={() => setEditingProduct(product)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ProductTypeIcon typeId={typeId} size={22} />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                <p className="text-[12px] text-foreground/80 truncate max-w-[160px]">
                  {product.name}
                </p>
                {product.price && (
                  <p className="text-[11px] text-primary font-medium mt-1">
                    {product.price} {product.currency}
                  </p>
                )}
              </NodeCard>
            </div>
          );
        })}

        {/* Gray + button to add a product at the end */}
        <AddProductButton
          delay={300 + productChain.length * 150 + 100}
          onClick={() => setShowAddProductPicker(true)}
        />

        {/* If no products at all, also show a placeholder hint */}
        {productChain.length === 0 && (
          <div
            className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex items-center justify-center text-center
              hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] hover:border-primary/30
              transition-all duration-200 cursor-pointer ml-1 mt-0"
            style={{ animation: `fadeSlideIn 0.4s ease-out 400ms both` }}
            onClick={() => setShowAddProductPicker(true)}
          >
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
              <span>Продукт</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded content list */}
      {expandedContent && (
        <ExpandedListModal
          title={`Контент (${contentItems.length})`}
          onClose={() => setExpandedContent(false)}
          onAdd={() => {}}
        >
          {contentItems.map((item) => (
            <ContentItemRow
              key={item.id}
              item={item}
              onClick={() => { setExpandedContent(false); setEditingContent(item); }}
              onDelete={() => {}}
            />
          ))}
        </ExpandedListModal>
      )}

      {/* Add product picker */}
      {showAddProductPicker && (
        <AddProductPickerModal
          existingProducts={availableProducts}
          onSelectExisting={(product) => {
            setShowAddProductPicker(false);
            setEditingProduct(product);
          }}
          onCreateNew={() => {
            setShowAddProductPicker(false);
            setShowCreateProduct(true);
          }}
          onClose={() => setShowAddProductPicker(false)}
        />
      )}

      {/* Create new product modal */}
      {showCreateProduct && (
        <CreateProductModal
          onClose={() => setShowCreateProduct(false)}
          onCreate={(data) => {
            addProduct(data);
            setShowCreateProduct(false);
          }}
          formats={formats}
          onAddFormat={addFormat}
          onDeleteFormat={deleteFormat}
        />
      )}

      {/* Product Edit Modal — same style as Products page */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => { updateProduct(updated); setEditingProduct(null); }}
          formats={formats}
          onAddFormat={addFormat}
          onDeleteFormat={deleteFormat}
        />
      )}

      {/* Content Detail Modal */}
      {editingContent && (
        <ContentDetailModal
          item={editingContent}
          topicTitle={getTopicTitle(editingContent)}
          onClose={() => setEditingContent(null)}
          onSave={(updated) => { updateContentItem(updated); setEditingContent(null); }}
        />
      )}
    </div>
  );
}
