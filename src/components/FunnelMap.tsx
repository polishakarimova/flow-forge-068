import { useState } from "react";
import { Plus, Send, FileText, Gift, DollarSign, Crown, ArrowRight } from "lucide-react";
import type { Funnel, ContentStatus, FunnelProduct } from "@/lib/funnelData";
import { ProductDrawer } from "@/components/ProductDrawer";

const statusColor: Record<ContentStatus, string> = {
  published: "bg-emerald-400",
  ready: "bg-amber-400",
  draft: "bg-muted-foreground/40",
};

const statusLabel: Record<ContentStatus, string> = {
  published: "Опубликован",
  ready: "Готов",
  draft: "Черновик",
};

const NodeCard = ({
  children,
  className = "",
  accent = false,
  flagship = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  flagship?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border border-border bg-card p-4 shadow-sm min-w-[180px] transition-all duration-200
      hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30
      ${accent ? "ring-2 ring-primary/20 border-primary/30" : ""}
      ${flagship ? "ring-2 ring-primary/30 border-primary/40 bg-gradient-to-br from-card to-[hsl(var(--violet-soft))] min-w-[200px] hover:-translate-y-1 hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:ring-primary/50" : ""}
      ${onClick ? "cursor-pointer" : ""}
      ${className}`}
  >
    {children}
  </div>
);

const Connector = () => (
  <div className="flex items-center shrink-0 px-1 group/connector">
    <div className="w-8 h-px bg-border transition-all duration-200 group-hover/connector:bg-primary group-hover/connector:h-[2px]" />
    <ArrowRight className="w-4 h-4 text-muted-foreground/50 -ml-1 transition-colors duration-200 group-hover/connector:text-primary" />
  </div>
);

export function FunnelMap({ funnel }: { funnel: Funnel }) {
  const [drawerProduct, setDrawerProduct] = useState<FunnelProduct | null>(null);

  return (
    <div className="py-5 px-4 md:px-6 border-t border-border bg-muted/30">
      <div className="flex items-start gap-0 overflow-x-auto pb-3 scrollbar-thin">
        {/* === Content Node === */}
        <NodeCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Контент
            </span>
          </div>
          <div className="space-y-2">
            {funnel.contentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-[12px] group"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor[item.status]}`} title={statusLabel[item.status]} />
                <span className="text-muted-foreground font-medium shrink-0">
                  {item.platform}
                </span>
                <span className="text-foreground/60 truncate">
                  {item.format}
                </span>
              </div>
            ))}
            <button className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-2 transition-colors">
              <Plus className="w-3 h-3" />
              Добавить
            </button>
          </div>
        </NodeCard>

        <Connector />

        {/* === CTA Node === */}
        <NodeCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              CTA
            </span>
          </div>
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider mb-2 transition-transform duration-200 hover:scale-105 ${
              funnel.badgeColor === "violet"
                ? "bg-primary text-primary-foreground hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                : "bg-[hsl(var(--amber))] text-[hsl(var(--amber-foreground))] hover:shadow-[0_0_12px_hsl(var(--amber)/0.4)]"
            }`}
          >
            {funnel.keyword}
          </div>
          <p className="text-[12px] text-muted-foreground">{funnel.cta}</p>
        </NodeCard>

        <Connector />

        {/* === Lead Magnet Node === */}
        {funnel.leadMagnet ? (
          <NodeCard onClick={() => setDrawerProduct(funnel.leadMagnet!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Лид-магнит
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 mb-1.5">{funnel.leadMagnet.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
              Бесплатно
            </span>
          </NodeCard>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex flex-col items-center justify-center text-center hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:border-primary/30">
              <Plus className="w-5 h-5 text-muted-foreground/50 mb-2" />
              <span className="text-[12px] text-muted-foreground">
                Добавить лид-магнит
              </span>
            </div>
          </>
        )}

        <Connector />

        {/* === Mid-Ticket Node === */}
        {funnel.midTicket ? (
          <NodeCard onClick={() => setDrawerProduct(funnel.midTicket!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Средний чек
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 mb-1.5">{funnel.midTicket.name}</p>
            <span className="text-[14px] font-bold text-primary">{funnel.midTicket.price}</span>
          </NodeCard>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex flex-col items-center justify-center text-center hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:border-primary/30">
            <Plus className="w-5 h-5 text-muted-foreground/50 mb-2" />
            <span className="text-[12px] text-muted-foreground">
              + Добавить
            </span>
          </div>
        )}

        <Connector />

        {/* === Flagship Node === */}
        {funnel.flagship ? (
          <NodeCard flagship onClick={() => setDrawerProduct(funnel.flagship!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Флагман
              </span>
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">
              {funnel.flagship.name}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-primary">
                {funnel.flagship.price}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted">
                {funnel.flagship.type}
              </span>
            </div>
          </NodeCard>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex flex-col items-center justify-center text-center hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:border-primary/30">
              <Plus className="w-5 h-5 text-muted-foreground/50 mb-2" />
              <span className="text-[12px] text-muted-foreground">
                Добавить флагман
              </span>
            </div>
          </>
        )}
      </div>

      {/* Product Drawer */}
      <ProductDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onOpenChange={(open) => !open && setDrawerProduct(null)}
      />
    </div>
  );
}
