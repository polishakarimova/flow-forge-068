import { useState } from "react";
import { Plus, Send, FileText, Gift, DollarSign, Crown } from "lucide-react";
import type { Funnel, ContentStatus, FunnelProduct, ContentItem } from "@/lib/funnelData";
import { productsCatalog } from "@/lib/funnelData";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ContentDrawer } from "@/components/ContentDrawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const tierLabel: Record<string, string> = {
  "lead-magnet": "Лид-магнит",
  "mid-ticket": "Средний чек",
  "flagship": "Флагман",
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
      className="flex flex-col items-center justify-center shrink-0 px-1 group/connector"
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

export function FunnelMap({ funnel }: { funnel: Funnel }) {
  const [drawerProduct, setDrawerProduct] = useState<FunnelProduct | null>(null);
  const [drawerContent, setDrawerContent] = useState<ContentItem | null>(null);

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
          </div>
          <div className="space-y-1.5">
            {funnel.contentItems.map((item) => (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerContent(item);
                }}
                className="flex items-center gap-2 text-[12px] group/content cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5
                  transition-all duration-150 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20
                  active:scale-[0.98]"
                title="Нажми чтобы открыть"
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

        <SvgConnector delay={100} />

        {/* === CTA Node — keyword badge only === */}
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
            style={
              funnel.badgeColor === "violet"
                ? {
                    background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                    color: "white",
                    boxShadow: "0 2px 12px rgba(139, 92, 246, 0.4)",
                  }
                : {
                    background: "linear-gradient(135deg, #D4A056, #C08B3F)",
                    color: "white",
                    boxShadow: "0 2px 12px rgba(212, 160, 86, 0.4)",
                  }
            }
          >
            {funnel.keyword}
          </div>
        </NodeCard>

        <SvgConnector delay={300} />

        {/* === Lead Magnet Node === */}
        {funnel.leadMagnet ? (
          <NodeCard delay={400} onClick={() => setDrawerProduct(funnel.leadMagnet!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Лид-магнит
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">{funnel.leadMagnet.name}</p>
          </NodeCard>
        ) : (
          <PlaceholderCard label="Лид-магнит" tier="lead-magnet" delay={400} />
        )}

        <SvgConnector delay={500} />

        {/* === Mid-Ticket Node === */}
        {funnel.midTicket ? (
          <NodeCard delay={600} onClick={() => setDrawerProduct(funnel.midTicket!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Средний чек
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">{funnel.midTicket.name}</p>
          </NodeCard>
        ) : (
          <PlaceholderCard label="Средний чек" tier="mid-ticket" delay={600} />
        )}

        <SvgConnector delay={700} />

        {/* === Flagship Node === */}
        {funnel.flagship ? (
          <NodeCard flagship delay={800} onClick={() => setDrawerProduct(funnel.flagship!)}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Флагман
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">{funnel.flagship.name}</p>
          </NodeCard>
        ) : (
          <PlaceholderCard label="Флагман" tier="flagship" delay={800} />
        )}
      </div>

      {/* Product Drawer */}
      <ProductDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onOpenChange={(open) => !open && setDrawerProduct(null)}
      />

      {/* Content Drawer */}
      <ContentDrawer
        content={drawerContent}
        funnel={funnel}
        open={!!drawerContent}
        onOpenChange={(open) => !open && setDrawerContent(null)}
      />
    </div>
  );
}
