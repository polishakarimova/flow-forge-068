import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  dot?: string;
  count?: number;
}

interface DropdownProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: DropdownOption[];
  placeholder: string;
  width?: number;
}

export function ContentDropdown({ value, onChange, options, placeholder, width = 180 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-[14px] font-medium cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
        style={{ color: selected ? "#334155" : "#94a3b8" }}
      >
        <span className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {selected?.icon && <span className="text-[15px]">{selected.icon}</span>}
          {selected?.dot && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.dot }} />
          )}
          {selected ? selected.label : placeholder}
        </span>
        <span
          className="text-[10px] text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-border/60 rounded-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.04)" }}
        >
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className="px-3.5 py-2.5 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150"
            style={{
              color: value === null ? "#6366f1" : "#64748b",
              background: value === null ? "#f0f0ff" : "transparent",
            }}
            onMouseEnter={(e) => { if (value !== null) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { if (value !== null) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Все
          </div>
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150"
              style={{
                color: value === o.value ? "#6366f1" : "#334155",
                background: value === o.value ? "#f0f0ff" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = value === o.value ? "#f0f0ff" : "transparent"; }}
            >
              {o.icon && <span className="text-[15px]">{o.icon}</span>}
              {o.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />}
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="text-[13px] text-muted-foreground">{o.count}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
