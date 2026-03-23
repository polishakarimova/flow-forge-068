import { useState, useRef, useEffect } from "react";
import { STATUSES, STATUS_ORDER, type ContentStatusKey } from "@/lib/contentData";

interface StatusSelectProps {
  value: ContentStatusKey;
  onChange: (value: ContentStatusKey) => void;
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cur = STATUSES[value];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-none text-xs font-semibold cursor-pointer whitespace-nowrap"
        style={{ background: cur.bg, color: cur.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cur.color }} />
        {cur.label}
        <span className="text-[8px] ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+3px)] left-0 min-w-[150px] bg-white border border-border rounded-xl shadow-lg z-[60] p-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
          {STATUS_ORDER.map((k) => {
            const s = STATUSES[k];
            const active = value === k;
            return (
              <div
                key={k}
                onClick={() => { onChange(k); setOpen(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  color: active ? s.color : "#475569",
                  background: active ? s.bg : "transparent",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? s.bg : "transparent"; }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                {s.label}
                {active && <span className="ml-auto text-[10px]">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
