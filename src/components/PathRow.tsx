import { useState } from "react";
import {
  ChevronDown,
  MoreHorizontal,
  FileText,
  Users,
  ShoppingCart,
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

interface PathRowProps {
  funnel: Funnel;
  defaultExpanded?: boolean;
  onToggleActive?: (id: string) => void;
}

export function PathRow({ funnel, defaultExpanded = false, onToggleActive }: PathRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const inactive = !funnel.active;

  const publishedCount = funnel.contentItems.filter((c) => c.status === "published").length;
  const totalCount = funnel.contentItems.length;
  const shortType = productTypeShort[funnel.productType] || funnel.productType;

  return (
    <div
      className={`card-elevated mb-3 overflow-hidden transition-all duration-200 ${
        inactive ? "opacity-50 grayscale" : ""
      } ${expanded ? "border-l-[3px] border-l-primary" : ""}`}
      style={!inactive ? { } : {}}
    >
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

        {/* Pulsing dot for new activity */}
        {funnel.hasNewActivity && funnel.active && (
          <span className="relative shrink-0 w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute inset-0 rounded-full bg-emerald-400" />
          </span>
        )}

        {/* Keyword badge with gradient */}
        <span
          className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.05em] ${
            inactive
              ? "bg-muted text-muted-foreground"
              : ""
          }`}
          style={
            !inactive
              ? funnel.badgeColor === "violet"
                ? {
                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                  }
                : {
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                  }
              : undefined
          }
        >
          {funnel.keyword}
        </span>

        {/* Type + Product */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted uppercase tracking-wider">
              {shortType}
            </span>
            <span className="text-[13px] text-foreground/80 truncate">
              {funnel.product}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground" title="Контент">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium">{publishedCount}/{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground" title="Заявки">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium">{funnel.leads}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground" title="Продажи">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-medium">{funnel.sales}</span>
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Mobile metrics */}
      <div className="flex md:hidden items-center gap-4 px-4 pb-3 pl-[52px]">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span>{publishedCount}/{totalCount}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{funnel.leads}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShoppingCart className="w-3 h-3" />
          <span>{funnel.sales}</span>
        </div>
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
