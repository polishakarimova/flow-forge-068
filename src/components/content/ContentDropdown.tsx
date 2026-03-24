import { useState, useRef, useEffect, type ReactNode } from "react";
import { PlatformIcon } from "./PlatformIcon";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  iconSrc?: string;
  iconNode?: ReactNode;
  platformId?: string;
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
        className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-[11px] font-normal cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm ${
          selected ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: "#4b5563" }}>
          {selected?.platformId ? <PlatformIcon platformId={selected.platformId} size={15} /> : selected?.iconNode ? selected.iconNode : selected?.iconSrc ? <img src={selected.iconSrc} alt="" width={15} height={15} className="shrink-0" /> : selected?.icon ? <span className="text-[15px]">{selected.icon}</span> : null}
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
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-card border border-border/60 rounded-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)]">
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className={`px-3 py-2 rounded-xl text-[12px] font-normal cursor-pointer transition-all duration-150 ${
              value === null ? "violet-surface text-primary" : "hover:bg-muted/50"
            }`}
            style={{ color: value === null ? undefined : "#4b5563" }}
          >
            Все
          </div>
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-normal cursor-pointer transition-all duration-150 ${
                value === o.value ? "violet-surface text-primary" : "hover:bg-muted/50"
              }`}
              style={{ color: value === o.value ? undefined : "#4b5563" }}
            >
              {o.platformId ? <PlatformIcon platformId={o.platformId} size={15} /> : o.iconNode ? o.iconNode : o.iconSrc ? <img src={o.iconSrc} alt="" width={15} height={15} className="shrink-0" /> : o.icon ? <span className="text-[15px]">{o.icon}</span> : null}
              {o.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />}
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="text-[12px] text-muted-foreground">{o.count}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
