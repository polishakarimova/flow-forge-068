import { Check, Plus, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Platform } from "@/lib/contentData";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformSelectorProps {
  platforms: Platform[];
  values: string[];
  onChange: (values: string[]) => void;
  onAddPlatform: (label: string) => string | null;
  onDeletePlatform: (id: string) => void;
  label?: string;
  showError?: boolean;
}

export function PlatformSelector({
  platforms,
  values,
  onChange,
  onAddPlatform,
  onDeletePlatform,
  label = "Куда постим?",
  showError,
}: PlatformSelectorProps) {
  const [editing, setEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const toggle = (id: string) => {
    onChange(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };

  const submit = () => {
    const platformLabel = draft.trim();
    if (!platformLabel) return;
    const id = onAddPlatform(platformLabel);
    if (id && !values.includes(id)) onChange([...values, id]);
    setDraft("");
    setIsAdding(false);
  };

  const confirmDelete = (id: string) => {
    onDeletePlatform(id);
    onChange(values.filter((value) => value !== id));
    setPendingDeleteId(null);
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${
        showError ? "p-2 bg-gradient-to-br from-violet-50 via-white to-rose-50 ring-2 ring-primary/25" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="block text-[12px] font-semibold text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => {
            setEditing((value) => !value);
            setPendingDeleteId(null);
            setIsAdding(false);
          }}
          className={`kk-compact-icon flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-colors ${
            editing
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
          title={editing ? "Завершить редактирование" : "Редактировать площадки"}
        >
          {editing ? <Check className="h-2.5 w-2.5" /> : <Settings className="h-2.5 w-2.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {platforms.map((platform) => {
          const selected = values.includes(platform.id);
          const pendingDelete = pendingDeleteId === platform.id;
          return (
            <div key={platform.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setPendingDeleteId(null);
                    return;
                  }
                  toggle(platform.id);
                }}
                className="kk-compact-chip flex items-center gap-1 px-1.5 py-0 rounded-lg text-[10px] font-light leading-none tracking-[0.01em] cursor-pointer transition-all duration-200"
                style={{
                  border: pendingDelete ? "1px solid #fecaca" : selected ? "1px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                  background: pendingDelete ? "#fff1f2" : selected ? "hsl(var(--primary) / 0.08)" : "transparent",
                  color: pendingDelete ? "#e11d48" : selected ? "hsl(var(--primary))" : "#64748b",
                }}
              >
                <PlatformIcon platformId={platform.id} size={11} />
                <span className="uppercase">{pendingDelete ? "Удалить?" : platform.label}</span>
                {selected && !pendingDelete && <span>✓</span>}
              </button>
              {editing && (
                pendingDelete ? (
                  <div className="absolute -right-1.5 -top-2 flex items-center gap-0.5 rounded-full border border-red-100 bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => confirmDelete(platform.id)}
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
                    onClick={() => setPendingDeleteId(platform.id)}
                    className="kk-compact-icon absolute -right-1 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm hover:bg-red-50"
                    title="Удалить площадку"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )
              )}
            </div>
          );
        })}

        {editing && isAdding ? (
          <div className="kk-compact-chip flex items-center gap-1 rounded-[8px] border border-dashed border-primary/40 bg-primary/5 px-1.5 py-0">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
                if (event.key === "Escape") setIsAdding(false);
              }}
              placeholder="Новая площадка"
              autoFocus
              className="w-28 bg-transparent text-[10px] leading-5 text-slate-700 outline-none placeholder:text-slate-400"
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
            className="kk-compact-chip flex items-center gap-1 rounded-[8px] border border-dashed border-border bg-transparent px-1.5 py-0 text-[10px] font-normal leading-none text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Добавить площадку
          </button>
        ) : null}
      </div>

      {showError && <p className="mt-2 text-[12px] font-medium text-primary">Выберите хотя бы одну площадку, чтобы создать тему.</p>}
    </div>
  );
}
