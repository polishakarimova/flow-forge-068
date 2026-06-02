import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ProductType } from "@/lib/productData";
import { ProductTypeIcon } from "./ProductTypeIcon";

interface ProductTypeSelectorProps {
  value: string;
  productTypes: ProductType[];
  onChange: (value: string) => void;
  onAddType: (label: string) => string | null;
  onDeleteType: (id: string) => void;
  showError?: boolean;
}

export function ProductTypeSelector({ value, productTypes, onChange, onAddType, onDeleteType, showError }: ProductTypeSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const submit = () => {
    const label = draft.trim();
    if (!label) return;
    const id = onAddType(label);
    if (id) onChange(id);
    setDraft("");
    setIsAdding(false);
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${
        showError ? "p-2 bg-gradient-to-br from-violet-50 via-white to-rose-50 ring-2 ring-primary/25" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="block text-[13px] font-semibold text-muted-foreground">Тип продукта</label>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {editing ? "Готово" : "Редактировать"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {productTypes.map((t) => {
          const selected = value === t.id;
          const isCustom = t.id.startsWith("custom_");
          return (
            <div key={t.id} className="relative">
              <button
                type="button"
                onClick={() => onChange(selected ? "" : t.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-normal cursor-pointer transition-all duration-200"
                style={{
                  border: selected ? "1.5px solid hsl(var(--primary))" : "1.5px solid hsl(var(--border))",
                  background: selected ? "hsl(var(--primary) / 0.08)" : "transparent",
                  color: selected ? "hsl(var(--primary))" : "#64748b",
                }}
              >
                <ProductTypeIcon typeId={t.id} size={14} />
                <span className="uppercase">{t.label}</span>
                {selected && <span>✓</span>}
              </button>
              {editing && isCustom && (
                <button
                  type="button"
                  onClick={() => onDeleteType(t.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm hover:bg-red-50"
                  title="Удалить тип"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {isAdding ? (
          <div className="flex items-center gap-1 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-2 py-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setIsAdding(false);
              }}
              placeholder="Новый тип"
              autoFocus
              className="w-28 bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button type="button" onClick={submit} className="text-primary">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-transparent px-2.5 py-1 text-[11px] font-normal text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить тип
          </button>
        )}
      </div>

      {showError && <p className="mt-2 text-[12px] font-medium text-primary">Выберите тип продукта, чтобы создать карточку.</p>}
    </div>
  );
}
