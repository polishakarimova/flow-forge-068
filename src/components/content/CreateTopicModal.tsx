import { useState } from "react";
import { PLATFORMS } from "@/lib/contentData";

interface CreateTopicModalProps {
  onClose: () => void;
  onCreate: (data: { title: string; thesisPlan: string; isIdeaBank: boolean; platforms: string[] }) => void;
}

export function CreateTopicModal({ onClose, onCreate }: CreateTopicModalProps) {
  const [title, setTitle] = useState("");
  const [thesisPlan, setThesisPlan] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const hasTitle = title.trim().length > 0;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCreate = (isBank: boolean) => {
    if (!hasTitle) return;
    onCreate({ title: title.trim(), thesisPlan: thesisPlan.trim(), isIdeaBank: isBank, platforms: isBank ? [] : selected });
    onClose();
  };

  const handleClose = () => {
    if (hasTitle && selected.length === 0) {
      onCreate({ title: title.trim(), thesisPlan: thesisPlan.trim(), isIdeaBank: true, platforms: [] });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[500px] max-h-[88vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="px-7 pt-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-foreground">Новая тема</h2>
            <button
              onClick={handleClose}
              className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название темы</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Кейс 1,4 ляма"
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Тезисный план</label>
            <textarea
              value={thesisPlan}
              onChange={(e) => setThesisPlan(e.target.value)}
              placeholder={"— Что было до\n— Что сделали\n— Результат"}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none resize-y leading-relaxed transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-2">Куда постим?</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const isSelected = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      border: isSelected ? `2px solid ${p.color}` : "2px solid #e8ecf1",
                      background: isSelected ? p.color + "10" : "#fff",
                      color: isSelected ? p.color : "#64748b",
                    }}
                  >
                    <span>{p.icon}</span>
                    {p.label}
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-7 py-4 border-t border-border">
          <button
            onClick={() => handleCreate(false)}
            disabled={!hasTitle || selected.length === 0}
            className="flex-1 py-3 px-4 rounded-2xl text-[14px] font-bold cursor-pointer transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              background: !hasTitle || selected.length === 0 ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: !hasTitle || selected.length === 0 ? "#94a3b8" : "#fff",
              border: "none",
            }}
          >
            Создать тему →
          </button>
          <button
            onClick={() => handleCreate(true)}
            disabled={!hasTitle}
            className="py-3 px-4 rounded-2xl text-[14px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              background: !hasTitle ? "#f1f5f9" : "#fef9c3",
              color: !hasTitle ? "#94a3b8" : "#92400e",
              border: !hasTitle ? "1px solid #e2e8f0" : "1px solid #fde68a",
            }}
          >
            💡 В банк идей
          </button>
        </div>

        {hasTitle && selected.length === 0 && (
          <div className="px-7 pb-4 text-[11px] text-muted-foreground text-center">
            Если закроешь — тема сохранится в банк идей
          </div>
        )}
      </div>
    </div>
  );
}
