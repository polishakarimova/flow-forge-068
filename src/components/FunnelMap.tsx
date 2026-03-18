import { Plus, Send, FileText, Footprints, Star, ArrowRight } from "lucide-react";
import type { Funnel, ContentStatus } from "@/lib/funnelData";

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
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) => (
  <div
    className={`rounded-2xl border border-border bg-card p-4 shadow-sm min-w-[180px] ${
      accent ? "ring-2 ring-primary/20 border-primary/30" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const Connector = () => (
  <div className="flex items-center shrink-0 px-1">
    <div className="w-8 h-px bg-border" />
    <ArrowRight className="w-4 h-4 text-muted-foreground/50 -ml-1" />
  </div>
);

export function FunnelMap({ funnel }: { funnel: Funnel }) {
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
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider mb-2 ${
              funnel.badgeColor === "violet"
                ? "bg-primary text-primary-foreground"
                : "bg-[hsl(var(--amber))] text-[hsl(var(--amber-foreground))]"
            }`}
          >
            {funnel.keyword}
          </div>
          <p className="text-[12px] text-muted-foreground">{funnel.cta}</p>
        </NodeCard>

        <Connector />

        {/* === Delivery Node === */}
        <NodeCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Выдача
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground mb-2">
            {funnel.deliveryType}
          </span>
          <p className="text-[13px] text-foreground/80">{funnel.deliveryTitle}</p>
        </NodeCard>

        {/* === Steps === */}
        {funnel.steps.length > 0 && (
          <>
            <Connector />
            <NodeCard>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Footprints className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Шаги
                </span>
              </div>
              {funnel.steps.map((step) => (
                <div key={step.id} className="mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground mb-1">
                    {step.type}
                  </span>
                  <p className="text-[12px] text-foreground/80">{step.title}</p>
                </div>
              ))}
            </NodeCard>
          </>
        )}

        {/* === Product === */}
        {funnel.finalProduct ? (
          <>
            <Connector />
            <NodeCard accent>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Продукт
                </span>
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">
                {funnel.finalProduct.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-primary">
                  {funnel.finalProduct.price}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted">
                  {funnel.finalProduct.type}
                </span>
              </div>
            </NodeCard>
          </>
        ) : (
          <>
            <Connector />
            <div className="rounded-2xl border-2 border-dashed border-border p-4 min-w-[160px] flex flex-col items-center justify-center text-center">
              <Plus className="w-5 h-5 text-muted-foreground/50 mb-2" />
              <span className="text-[12px] text-muted-foreground">
                Добавить продукт
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
