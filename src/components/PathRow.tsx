import { useState } from "react";
import {
  ChevronDown,
  MoreHorizontal,
  Pause,
  Play,
  Copy,
  Archive,
  Trash2,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FunnelMap } from "@/components/FunnelMap";
import type { Funnel } from "@/lib/funnelData";
import { productTypeShort } from "@/lib/funnelData";
import { getBadgeStyle } from "@/lib/badgeStyles";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { useDataStore } from "@/lib/dataStore";

const shortToTypeId: Record<string, string> = {
  "ЛМ": "lead_magnet",
  "ТВ": "tripwire",
  "СЧ": "mid_ticket",
  "ФГ": "flagship",
  "КС": "consultation",
  "ЛР": "private",
};

const TYPE_TO_SHORT: Record<string, string> = {
  lead_magnet: "ЛМ",
  tripwire: "ТВ",
  mid_ticket: "СЧ",
  flagship: "ФГ",
  consultation: "КС",
  private: "ЛР",
};

interface PathRowProps {
  funnel: Funnel;
  defaultExpanded?: boolean;
  onToggleActive?: (id: string) => void;
  onEdit?: (funnel: Funnel) => void;
}

function truncateKeyword(str: string, maxLen = 6) {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function PathRow({ funnel, defaultExpanded = false, onToggleActive, onEdit }: PathRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { products } = useDataStore();
  const inactive = !funnel.active;

  /* Build path steps from real product IDs */
  const pathSteps: { short: string; name?: string }[] = [];
  const idFields: { id?: number; short: string }[] = [
    { id: funnel.leadMagnetId, short: "ЛМ" },
    { id: funnel.tripwireId, short: "ТВ" },
    { id: funnel.midTicketId, short: "СЧ" },
    { id: funnel.flagshipId, short: "ФГ" },
    { id: funnel.consultationId, short: "КС" },
  ];
  for (const { id, short } of idFields) {
    if (id != null) {
      const p = products.find((pr) => pr.id === id);
      pathSteps.push({ short, name: p?.name });
    }
  }
  if (pathSteps.length === 0) {
    const short = productTypeShort[funnel.productType] || funnel.productType;
    pathSteps.push({ short });
  }

  return (
    <div
      className={`card-elevated mb-2 md:mb-3 overflow-hidden transition-all duration-200 ${
        inactive ? "opacity-50 grayscale" : ""
      } ${expanded ? "border-l-[3px] border-l-primary" : ""}`}
    >
      {/* Main row */}
      <div
        className={`flex items-center gap-1 px-2 py-2 md:px-5 md:py-3 md:gap-3 cursor-pointer group transition-colors duration-200 ${
          inactive
            ? "hover:bg-muted/40"
            : "hover:bg-[hsl(var(--primary)/0.04)]"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => onToggleActive?.(funnel.id)}
              className="gap-2"
            >
              {funnel.active ? (
                <>
                  <Pause className="w-4 h-4" /> Поставить на паузу
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Активировать
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit?.(funnel)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" /> Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Copy className="w-4 h-4" /> Дублировать
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Archive className="w-4 h-4" /> Архивировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status dot */}
        {funnel.active ? (
          <span className="relative shrink-0 w-1.5 h-1.5 md:w-2 md:h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute inset-0 rounded-full bg-emerald-400" />
          </span>
        ) : (
          <span className="shrink-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-400" />
        )}

        {/* Keyword badge */}
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-[0.05em] ${
            inactive ? "bg-muted text-muted-foreground" : ""
          }`}
          style={!inactive ? getBadgeStyle(funnel.badgeColor) : undefined}
        >
          {truncateKeyword(funnel.keyword)}
        </span>

        {/* Path steps as mini badges, no arrows */}
        <div className="flex-1 min-w-0 flex items-center gap-0.5 md:gap-1 overflow-hidden">
          {pathSteps.map((step, i) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              <span className="inline-flex items-center gap-0.5 px-1 py-px md:px-1.5 md:py-0.5 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-[0.05em] bg-foreground/[0.06] text-muted-foreground">
                {shortToTypeId[step.short] && <ProductTypeIcon typeId={shortToTypeId[step.short]} size={12} />}
                {step.short}
              </span>
              {i === 0 && step.name && (
                <span className="text-[9px] md:text-[10px] text-muted-foreground/60 truncate max-w-[50px] md:max-w-[60px]">
                  "{truncate(step.name, 6)}"
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expanded mini-map */}
      {expanded && (
        <div className="animate-fade-in">
          <FunnelMap funnel={funnel} />
        </div>
      )}
    </div>
  );
}
