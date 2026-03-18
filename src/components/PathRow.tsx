import { useState } from "react";
import {
  ChevronDown,
  MoreHorizontal,
  Pause,
  Play,
  Copy,
  Archive,
  Trash2,
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
import { getBadgeStyle, badgeColorLabel } from "@/lib/badgeStyles";

interface PathRowProps {
  funnel: Funnel;
  defaultExpanded?: boolean;
  onToggleActive?: (id: string) => void;
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function buildPathString(funnel: Funnel) {
  const steps: { short: string; name?: string }[] = [];

  if (funnel.leadMagnet) {
    steps.push({ short: "ЛМ", name: funnel.leadMagnet.name });
  }
  if (funnel.midTicket) {
    steps.push({ short: "СЧ", name: funnel.midTicket.name });
  }
  if (funnel.flagship) {
    steps.push({ short: "ФГ", name: funnel.flagship.name });
  }

  if (steps.length === 0) {
    const short = productTypeShort[funnel.productType] || funnel.productType;
    steps.push({ short });
  }

  return steps;
}

export function PathRow({ funnel, defaultExpanded = false, onToggleActive }: PathRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const inactive = !funnel.active;
  const pathSteps = buildPathString(funnel);
  const variantLabel = badgeColorLabel[funnel.badgeColor];

  return (
    <div
      className={`card-elevated mb-3 overflow-hidden transition-all duration-200 ${
        inactive ? "opacity-50 grayscale" : ""
      } ${expanded ? "border-l-[3px] border-l-primary" : ""}`}
    >
      {/* Variant label for color comparison */}
      {variantLabel && (
        <div className="px-4 pt-2 pb-0 md:px-5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {variantLabel}
          </span>
        </div>
      )}

      {/* Main row */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 md:px-5 cursor-pointer group transition-colors duration-200 ${
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
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
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

        {/* Status dot: green pulsing (active) or red static (inactive) */}
        {funnel.active ? (
          <span className="relative shrink-0 w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute inset-0 rounded-full bg-emerald-400" />
          </span>
        ) : (
          <span className="shrink-0 w-2 h-2 rounded-full bg-red-400" />
        )}

        {/* Keyword badge with gradient */}
        <span
          className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.05em] ${
            inactive ? "bg-muted text-muted-foreground" : ""
          }`}
          style={!inactive ? getBadgeStyle(funnel.badgeColor) : undefined}
        >
          {funnel.keyword}
        </span>

        {/* Path: ЛМ "PDF-раз..." → СЧ → ФГ */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {pathSteps.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <span className="text-[11px] text-muted-foreground mx-0.5">→</span>}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.05em] bg-foreground/[0.06] text-muted-foreground">
                {step.short}
              </span>
              {i === 0 && step.name && (
                <span className="text-[11px] text-[#9CA3AF] truncate max-w-[80px]">
                  "{truncate(step.name, 7)}"
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
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
