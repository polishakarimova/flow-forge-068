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

export function ContentMultiDropdown({ values, onChange, options, placeholder, width = 200 }: MultiDropdownProps) {
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
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold cursor-pointer"
        style={{ color: has ? "#334155" : "#94a3b8" }}
      >
        <span className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
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
          className="text-[9px] text-muted-foreground transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+3px)] left-0 bg-white border border-border rounded-xl shadow-lg z-50 p-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
          style={{ width: Math.max(width, 200) }}
        >
          {has && (
            <div
              onClick={() => onChange([])}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer text-muted-foreground border-b border-slate-100 mb-0.5 hover:bg-slate-50 transition-colors"
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
                style={{ background: checked ? "#f8f9ff" : "transparent" }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span
                  className="w-[15px] h-[15px] rounded shrink-0 flex items-center justify-center text-[9px] text-white"
                  style={{
                    border: checked ? "none" : "1.5px solid #d1d5db",
                    background: checked ? "#6366f1" : "#fff",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {o.icon && <span>{o.icon}</span>}
                <span className="flex-1">{o.label}</span>
                {o.count != null && <span className="text-[11px] text-muted-foreground">{o.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
