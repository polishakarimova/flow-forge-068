import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface FormatSelectorProps {
  value: string;
  onChange: (value: string) => void;
  formats: string[];
  onAddFormat: (format: string) => void;
  onDeleteFormat: (format: string) => void;
}

export function FormatSelector({ value, onChange, formats, onAddFormat, onDeleteFormat }: FormatSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newFormat, setNewFormat] = useState("");
  const [hoverDelete, setHoverDelete] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = () => {
    const t = newFormat.trim();
    if (t && !formats.includes(t)) {
      onAddFormat(t);
      onChange(t);
      setNewFormat("");
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`kk-compact-field w-full px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 font-light cursor-pointer flex items-center justify-between transition-all duration-200 bg-transparent ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value || "Выбери формат"}
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55 transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          strokeWidth={1.6}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 min-w-0 bg-card border border-border/60 rounded-xl sm:rounded-2xl z-[60] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)] max-h-[240px] sm:max-h-[280px] overflow-y-auto overflow-x-hidden">
          {formats.map((f) => (
            <div
              key={f}
              className="flex items-center rounded-lg transition-colors duration-100"
              onMouseEnter={() => setHoverDelete(f)}
              onMouseLeave={() => setHoverDelete(null)}
            >
              <div
                onClick={() => { onChange(f); setOpen(false); }}
                className={`kk-compact-row min-w-0 flex-1 px-2.5 sm:px-3 py-1 rounded-lg text-[12px] font-normal cursor-pointer leading-5 flex items-center gap-2 ${
                  value === f ? "violet-surface text-primary" : "text-slate-600 hover:bg-muted/50"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{f}</span>
                {value === f && <Check className="h-3 w-3 shrink-0" strokeWidth={1.8} />}
              </div>
              {hoverDelete === f && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFormat(f); if (value === f) onChange(""); }}
                  className="kk-compact-icon w-5 h-5 rounded-md flex items-center justify-center shrink-0 mr-1 cursor-pointer bg-red-50 text-red-500 border-none hover:bg-red-100 transition-colors"
                  title="Удалить формат"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-border/70 mt-1.5 pt-1.5 flex gap-1.5 px-1 pb-1 overflow-hidden">
            <input
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              placeholder="Свой формат..."
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="kk-compact-field min-w-0 flex-1 px-2.5 py-1.5 rounded-lg border border-border text-[12px] font-normal text-slate-600 outline-none transition-all duration-200 focus:border-primary bg-transparent placeholder:text-slate-400"
            />
            <button
              onClick={handleAdd}
              disabled={!newFormat.trim()}
              className="kk-compact-field w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer border border-dashed transition-colors disabled:cursor-not-allowed"
              style={{
                background: newFormat.trim() ? "hsl(var(--primary) / 0.08)" : "transparent",
                borderColor: newFormat.trim() ? "hsl(var(--primary) / 0.45)" : "hsl(var(--border))",
                color: newFormat.trim() ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              }}
              title="Создать формат"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

