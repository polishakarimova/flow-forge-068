import { useState, useRef, useEffect } from "react";
import { PlatformIcon } from "./PlatformIcon";

export interface MultiDropdownOption {
  value: string;
  label: string;
  icon?: string;
  platformId?: string;
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
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-[12px] font-medium cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm ${
          has ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          {has ? (
            selected.length <= 2 ? (
              selected.map((o, i) => (
                <span key={o.value} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/40">,</span>}
                  {o.platformId ? <PlatformIcon platformId={o.platformId} size={14} /> : o.icon ? <span>{o.icon}</span> : null}
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
          className="absolute top-[calc(100%+6px)] left-0 bg-card border border-border/60 rounded-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)]"
          style={{ width: Math.max(width, 220) }}
        >
          {has && (
            <div
              onClick={() => onChange([])}
              className="px-3.5 py-2.5 rounded-xl text-[12px] font-medium cursor-pointer text-muted-foreground border-b border-border mb-1 hover:bg-muted/50 transition-all duration-150"
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                  checked ? "violet-surface" : "hover:bg-muted/50"
                }`}
              >
                <span
                  className="w-[18px] h-[18px] rounded-md shrink-0 flex items-center justify-center text-[10px] text-white transition-all duration-150"
                  style={{
                    border: checked ? "none" : "1.5px solid hsl(var(--border))",
                    background: checked ? "hsl(var(--primary))" : "hsl(var(--card))",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {o.platformId ? <PlatformIcon platformId={o.platformId} size={15} /> : o.icon ? <span className="text-[15px]">{o.icon}</span> : null}
                <span className="flex-1 text-foreground">{o.label}</span>
                {o.count != null && <span className="text-[12px] text-muted-foreground">{o.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
