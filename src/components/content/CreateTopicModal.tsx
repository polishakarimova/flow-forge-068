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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[88vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
        <div className="px-[22px] pt-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-foreground">Новая тема</h2>
            <button
              onClick={handleClose}
              className="bg-slate-100 border-none rounded-md w-[26px] h-[26px] cursor-pointer text-[13px] text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Название темы</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Кейс 1,4 ляма"
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none transition-colors focus:border-primary"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Тезисный план</label>
            <textarea
              value={thesisPlan}
              onChange={(e) => setThesisPlan(e.target.value)}
              placeholder={"— Что было до\n— Что сделали\n— Результат"}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none resize-y leading-relaxed transition-colors focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Куда постим?</label>
            <div className="flex flex-wrap gap-[5px]">
              {PLATFORMS.map((p) => {
                const isSelected = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="flex items-center gap-1 px-2.5 py-[5px] rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
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

        <div className="flex gap-2 px-[22px] py-3 border-t border-slate-100">
          <button
            onClick={() => handleCreate(false)}
            disabled={!hasTitle || selected.length === 0}
            className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:cursor-not-allowed"
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
            className="py-2.5 px-3.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors disabled:cursor-not-allowed"
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
          <div className="px-[22px] pb-3 text-[10px] text-muted-foreground text-center">
            Если закроешь — тема сохранится в банк идей
          </div>
        )}
      </div>
    </div>
  );
}
