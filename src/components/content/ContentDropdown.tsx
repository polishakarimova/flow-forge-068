import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
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
    <div ref={ref} className="relative shrink-0" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className={`kk-compact-control w-full h-5 min-h-0 py-0 flex items-center gap-0 pl-1.5 pr-1 rounded-[7px] border border-border/80 bg-card text-[11px] leading-none font-light tracking-wide cursor-pointer transition-all duration-200 hover:border-primary/40 ${
          selected ? "text-foreground" : "text-muted-foreground"
        }`}
        style={{ height: 20, minHeight: 0, paddingTop: 0, paddingBottom: 0, fontSize: 11, fontWeight: 300, lineHeight: "11px" }}
      >
        <span className="flex min-w-0 flex-1 h-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap leading-none">
          {selected?.platformId ? <PlatformIcon platformId={selected.platformId} size={12} /> : selected?.iconNode ? selected.iconNode : selected?.iconSrc ? <img src={selected.iconSrc} alt="" width={12} height={12} className="shrink-0" /> : selected?.icon ? <span className="text-[12px]">{selected.icon}</span> : null}
          {selected?.dot && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: selected.dot }} />
          )}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className="ml-0.5 h-3 w-3 shrink-0 text-muted-foreground/45 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          strokeWidth={1.6}
        />
        <span
          aria-hidden="true"
          className="hidden text-[13px] leading-none text-muted-foreground/45 transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border/60 rounded-lg z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)]">
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-light tracking-wide cursor-pointer transition-all duration-150 ${
              value === null ? "violet-surface text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Все
          </div>
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-light tracking-wide cursor-pointer transition-all duration-150 ${
                value === o.value ? "violet-surface text-primary" : "text-foreground hover:bg-muted/50"
              }`}
            >
              {o.platformId ? <PlatformIcon platformId={o.platformId} size={12} /> : o.iconNode ? o.iconNode : o.iconSrc ? <img src={o.iconSrc} alt="" width={12} height={12} className="shrink-0" /> : o.icon ? <span className="text-[12px]">{o.icon}</span> : null}
              {o.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />}
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="text-[10px] text-muted-foreground/60">{o.count}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
