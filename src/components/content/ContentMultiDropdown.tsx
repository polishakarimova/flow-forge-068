import { useState, useRef, useEffect } from "react";

export interface MultiDropdownOption {
  value: string;
  label: string;
  icon?: string;
  count?: number;
}

interface MultiDropdownProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiDropdownOption[];
  placeholder: string;
  width?: number;
}

export function ContentMultiDropdown({ values, onChange, options, placeholder, width = 220 }: MultiDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };

  const has = values.length > 0;
  const selected = options.filter((o) => values.includes(o.value));

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-[14px] font-medium cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
        style={{ color: has ? "#334155" : "#94a3b8" }}
      >
        <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          {has ? (
            selected.length <= 2 ? (
              selected.map((o, i) => (
                <span key={o.value} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300">,</span>}
                  <span>{o.icon}</span>
                  <span>{o.label}</span>
                </span>
              ))
            ) : (
              <span>{selected.length} площадки</span>
            )
          ) : (
            placeholder
          )}
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
          className="absolute top-[calc(100%+6px)] left-0 bg-white border border-border/60 rounded-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ width: Math.max(width, 220), boxShadow: "0 12px 40px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.04)" }}
        >
          {has && (
            <div
              onClick={() => onChange([])}
              className="px-3.5 py-2.5 rounded-xl text-[13px] font-medium cursor-pointer text-muted-foreground border-b border-slate-100 mb-1 hover:bg-slate-50 transition-all duration-150"
            >
              Сбросить все
            </div>
          )}
          {options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <div
                key={o.value}
                onClick={() => toggle(o.value)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150"
                style={{ background: checked ? "#f8f9ff" : "transparent" }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = checked ? "#f8f9ff" : "transparent"; }}
              >
                <span
                  className="w-[18px] h-[18px] rounded-md shrink-0 flex items-center justify-center text-[10px] text-white transition-all duration-150"
                  style={{
                    border: checked ? "none" : "1.5px solid #d1d5db",
                    background: checked ? "#6366f1" : "#fff",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {o.icon && <span className="text-[15px]">{o.icon}</span>}
                <span className="flex-1">{o.label}</span>
                {o.count != null && <span className="text-[13px] text-muted-foreground">{o.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
