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

export function ContentDropdown({ value, onChange, options, placeholder, width = 160 }: DropdownProps) {
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
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold cursor-pointer"
        style={{ color: selected ? "#334155" : "#94a3b8" }}
      >
        <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {selected?.icon && <span>{selected.icon}</span>}
          {selected?.dot && (
            <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: selected.dot }} />
          )}
          {selected ? selected.label : placeholder}
        </span>
        <span
          className="text-[9px] text-muted-foreground transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+3px)] left-0 right-0 bg-white border border-border rounded-xl shadow-lg z-50 p-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
              style={{
                color: value === o.value ? "#6366f1" : "#334155",
                background: value === o.value ? "#f0f0ff" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (value !== o.value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {o.icon && <span>{o.icon}</span>}
              {o.dot && <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: o.dot }} />}
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="text-[11px] text-muted-foreground">{o.count}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
