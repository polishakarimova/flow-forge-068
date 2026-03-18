import { ExternalLink, GitBranch } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { FunnelProduct } from "@/lib/funnelData";
import { funnelsData } from "@/lib/funnelData";

const tierLabels: Record<string, string> = {
  "lead-magnet": "Лид-магнит",
  "mid-ticket": "Средний чек",
  "flagship": "Флагман",
};

interface ProductDrawerProps {
  product: FunnelProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDrawer({ product, open, onOpenChange }: ProductDrawerProps) {
  if (!product) return null;

  const usedInFunnels = funnelsData.filter((f) =>
    product.funnelIds?.includes(f.id)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:w-[420px] p-0 border-l border-border">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 pr-4">
                <SheetTitle className="text-[15px] font-semibold text-foreground leading-snug">
                  {product.name}
                </SheetTitle>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
                  {tierLabels[product.tier] || product.tier}
                </span>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Тип
              </label>
              <p className="mt-1 text-[13px] text-foreground">{product.type}</p>
            </div>

            {product.description && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Описание
                </label>
                <p className="mt-1.5 text-[13px] text-foreground/80 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {product.offerUrl && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Ссылка на оффер
                </label>
                <a
                  href={product.offerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {product.offerUrl}
                </a>
              </div>
            )}

            {usedInFunnels.length > 0 && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Используется в воронках
                </label>
                <div className="mt-2 space-y-2">
                  {usedInFunnels.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/50 border border-border"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                      <span
                        className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white"
                        style={
                          f.badgeColor === "violet"
                            ? { background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }
                            : { background: "linear-gradient(135deg, #D4A056, #C08B3F)" }
                        }
                      >
                        {f.keyword}
                      </span>
                      <span className="text-[12px] text-foreground/70 truncate">
                        {f.product}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border">
            <button className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors">
              Открыть в Продуктах
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
