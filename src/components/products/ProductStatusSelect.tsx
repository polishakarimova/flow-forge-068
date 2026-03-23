import { useState, useRef, useEffect } from "react";
import { PRODUCT_STATUSES, PRODUCT_STATUS_ORDER, type ProductStatusKey } from "@/lib/productData";

interface ProductStatusSelectProps {
  value: ProductStatusKey;
  onChange: (value: ProductStatusKey) => void;
}

export function ProductStatusSelect({ value, onChange }: ProductStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cur = PRODUCT_STATUSES[value];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-none text-[13px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 hover:shadow-sm"
        style={{ background: cur.bg, color: cur.color }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: cur.color }} />
        {cur.label}
        <span className="text-[9px] ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 min-w-[160px] bg-card border border-border/60 rounded-2xl z-[60] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)]">
          {PRODUCT_STATUS_ORDER.map((k) => {
            const s = PRODUCT_STATUSES[k];
            const active = value === k;
            return (
              <div
                key={k}
                onClick={() => { onChange(k); setOpen(false); }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-150"
                style={{
                  color: active ? s.color : "hsl(var(--muted-foreground))",
                  background: active ? s.bg : "transparent",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.5)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? s.bg : "transparent"; }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                {active && <span className="ml-auto text-[11px]">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
