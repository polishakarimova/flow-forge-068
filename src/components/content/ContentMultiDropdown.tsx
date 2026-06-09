import { useState, useRef, useEffect, type ReactNode } from "react";
import { PlatformIcon } from "./PlatformIcon";

export interface MultiDropdownOption {
  value: string;
  label: string;
  icon?: string;
  iconNode?: ReactNode;
  platformId?: string;
  dot?: string;
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
    <div ref={ref} className="relative shrink-0" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full h-5 min-h-0 py-0 flex items-center justify-between gap-0.5 px-1.5 rounded-[7px] border border-border/80 bg-card text-[11px] leading-none font-light tracking-wide cursor-pointer transition-all duration-200 hover:border-primary/40 ${
          has ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="flex min-w-0 h-full items-center gap-1 overflow-hidden whitespace-nowrap leading-none">
          {has ? (
            selected.length <= 2 ? (
              selected.map((o, i) => (
                <span key={o.value} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/40">,</span>}
                  {o.platformId ? <PlatformIcon platformId={o.platformId} size={12} /> : o.iconNode ? o.iconNode : o.icon ? <span>{o.icon}</span> : null}
                  {o.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />}
                  <span className="truncate">{o.label}</span>
                </span>
              ))
            ) : (
              <span>{selected.length} выбрано</span>
            )
          ) : (
            placeholder
          )}
        </span>
        <span
          className="text-[13px] leading-none text-muted-foreground/45 transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 bg-card border border-border/60 rounded-lg sm:rounded-xl z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)] overflow-hidden"
          style={{ width: Math.max(width, 132), maxWidth: "calc(100vw - 2rem)" }}
        >
          {has && (
            <div
              onClick={() => onChange([])}
              className="px-2 py-0.5 rounded-md text-[10px] font-light tracking-wide cursor-pointer text-muted-foreground border-b border-border mb-0.5 hover:bg-muted/50 transition-all duration-150"
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
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-light tracking-wide cursor-pointer transition-all duration-150 ${
                  checked ? "violet-surface" : "hover:bg-muted/50"
                }`}
              >
                <span
                  className="w-3 h-3 rounded shrink-0 flex items-center justify-center text-[7px] text-white transition-all duration-150"
                  style={{
                    border: checked ? "none" : "1.5px solid hsl(var(--border))",
                    background: checked ? "hsl(var(--primary))" : "hsl(var(--card))",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {o.platformId ? <PlatformIcon platformId={o.platformId} size={12} /> : o.iconNode ? o.iconNode : o.icon ? <span className="text-[12px]">{o.icon}</span> : null}
                {o.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />}
                <span className="min-w-0 flex-1 truncate text-foreground">{o.label}</span>
                {o.count != null && <span className="text-[10px] text-muted-foreground/60">{o.count}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
