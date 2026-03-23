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
        className={`w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] font-medium cursor-pointer flex items-center justify-between transition-all duration-200 bg-transparent ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value || "Выбери формат"}
        <span
          className="text-[9px] text-muted-foreground transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border/60 rounded-2xl z-[60] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_12px_40px_rgba(0,0,0,.08),0_2px_8px_rgba(0,0,0,.04)] max-h-[280px] overflow-y-auto">
          {formats.map((f) => (
            <div
              key={f}
              className="flex items-center rounded-lg transition-colors duration-100"
              onMouseEnter={() => setHoverDelete(f)}
              onMouseLeave={() => setHoverDelete(null)}
            >
              <div
                onClick={() => { onChange(f); setOpen(false); }}
                className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer ${
                  value === f ? "violet-surface text-primary" : "text-foreground hover:bg-muted/50"
                }`}
              >
                {f}
                {value === f && <span className="float-right text-[10px]">✓</span>}
              </div>
              {hoverDelete === f && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFormat(f); if (value === f) onChange(""); }}
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 mr-1 text-[11px] cursor-pointer bg-red-50 text-red-500 border-none hover:bg-red-100 transition-colors"
                  title="Удалить формат"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-border mt-1 pt-1 flex gap-1 px-1 pb-1">
            <input
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              placeholder="Свой формат..."
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="flex-1 px-2.5 py-1.5 rounded-lg border-[1.5px] border-border text-[12px] outline-none transition-all duration-200 focus:border-primary bg-transparent"
            />
            <button
              onClick={handleAdd}
              disabled={!newFormat.trim()}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border-none transition-colors disabled:cursor-not-allowed"
              style={{
                background: newFormat.trim() ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: newFormat.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
