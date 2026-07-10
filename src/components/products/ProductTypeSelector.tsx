import { Check, Plus, Settings, Trash2, X } from "lucide-react";
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const submit = () => {
    const label = draft.trim();
    if (!label) return;
    const id = onAddType(label);
    if (id) onChange(id);
    setDraft("");
    setIsAdding(false);
  };

  const confirmDelete = (id: string) => {
    onDeleteType(id);
    if (value === id) onChange("");
    setPendingDeleteId(null);
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${
        showError ? "p-2 bg-gradient-to-br from-violet-50 via-white to-rose-50 ring-2 ring-primary/25" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <label className="block text-[12px] font-semibold text-muted-foreground">Тип продукта</label>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setPendingDeleteId(null);
            setIsAdding(false);
          }}
          className={`kk-compact-icon flex h-4 w-4 min-h-0 items-center justify-center rounded-[5px] border p-0 leading-none transition-colors ${
            editing
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={editing ? "Завершить редактирование" : "Редактировать типы"}
        >
          {editing ? <Check className="h-2.5 w-2.5" /> : <Settings className="h-2.5 w-2.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {productTypes.map((t) => {
          const selected = value === t.id;
          const pendingDelete = pendingDeleteId === t.id;
          return (
            <div key={t.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setPendingDeleteId(null);
                    return;
                  }
                  onChange(selected ? "" : t.id);
                }}
                className="kk-compact-chip flex h-[20px] min-h-0 items-center gap-1 rounded-[8px] px-1.5 py-0 text-[10px] font-light leading-none tracking-[0.01em] cursor-pointer transition-all duration-200"
                style={{
                  border: pendingDelete ? "1px solid #fecaca" : selected ? "1px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                  background: pendingDelete ? "#fff1f2" : selected ? "hsl(var(--primary) / 0.08)" : "transparent",
                  color: pendingDelete ? "#e11d48" : selected ? "hsl(var(--primary))" : "#64748b",
                }}
              >
                <ProductTypeIcon typeId={t.id} size={10} />
                <span className="uppercase">{pendingDelete ? "Удалить?" : t.label}</span>
                {selected && !pendingDelete && <Check className="h-2.5 w-2.5" strokeWidth={1.8} />}
              </button>
              {editing && (
                pendingDelete ? (
                  <div className="absolute -right-1.5 -top-2 flex items-center gap-0.5 rounded-full border border-red-100 bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => confirmDelete(t.id)}
                    className="kk-compact-icon flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                      title="Подтвердить удаление"
                    >
                      <Check className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="kk-compact-icon flex h-[18px] w-[18px] items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                      title="Отмена"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(t.id)}
                    className="kk-compact-icon absolute -right-1 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm hover:bg-red-50"
                    title="Удалить тип"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )
              )}
            </div>
          );
        })}

        {editing && isAdding ? (
          <div className="kk-compact-chip flex h-[20px] min-h-0 items-center gap-1 rounded-[8px] border border-dashed border-primary/40 bg-primary/5 px-1.5 py-0">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setIsAdding(false);
              }}
              placeholder="Новый тип"
              autoFocus
              className="w-24 bg-transparent text-[10px] leading-none text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button type="button" onClick={submit} className="text-primary">
              <Plus className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="text-muted-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : editing ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="kk-compact-chip flex h-[20px] min-h-0 items-center gap-1 rounded-[8px] border border-dashed border-border bg-transparent px-1.5 py-0 text-[10px] font-normal leading-none text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Добавить тип
          </button>
        ) : null}
      </div>

      {showError && <p className="mt-2 text-[12px] font-medium text-primary">Выберите тип продукта, чтобы создать карточку.</p>}
    </div>
  );
}
