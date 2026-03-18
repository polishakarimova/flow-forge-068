import { ExternalLink, Eye, MessageSquare, Users, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ContentItem, Funnel } from "@/lib/funnelData";

const statusLabel: Record<string, string> = {
  published: "Опубликован",
  ready: "Готов",
  draft: "Черновик",
};

const statusBadge: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-600",
  ready: "bg-amber-50 text-amber-600",
  draft: "bg-muted text-muted-foreground",
};

interface ContentDrawerProps {
  content: ContentItem | null;
  funnel: Funnel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentDrawer({ content, funnel, open, onOpenChange }: ContentDrawerProps) {
  if (!content || !funnel) return null;

  const metrics = [
    { icon: Eye, label: "Просмотры", value: content.views },
    { icon: MessageSquare, label: "Сообщения", value: content.messages },
    { icon: Users, label: "Заявки", value: content.leads },
    { icon: ShoppingCart, label: "Продажи", value: content.sales },
  ].filter((m) => m.value !== undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:w-[420px] p-0 border-l border-border">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="space-y-1.5">
              <SheetTitle className="text-[15px] font-semibold text-foreground leading-snug">
                {content.title}
              </SheetTitle>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusBadge[content.status]}`}>
                {statusLabel[content.status]}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Платформа</label>
              <p className="mt-1 text-[13px] text-foreground">{content.platform}</p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Формат</label>
              <p className="mt-1 text-[13px] text-foreground">{content.format}</p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">CTA / Кодовое слово</label>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                  style={
                    funnel.badgeColor === "violet"
                      ? { background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "white" }
                      : { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }
                  }
                >
                  {funnel.keyword}
                </span>
                <span className="text-[12px] text-muted-foreground">{funnel.cta}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Воронка</label>
              <p className="mt-1 text-[13px] text-foreground">{funnel.product}</p>
            </div>

            {metrics.length > 0 && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Метрики</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {metrics.map((m) => (
                    <div key={m.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
                      <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="text-[14px] font-semibold text-foreground">{m.value?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border">
            <button className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors">
              Редактировать
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
