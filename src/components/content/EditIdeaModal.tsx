import { useState } from "react";
import { PLATFORMS, type Topic } from "@/lib/contentData";

interface EditIdeaModalProps {
  topic: Topic;
  onClose: () => void;
  onSave: (updated: Topic) => void;
  onRealize: (topicId: number, title: string, plan: string, platforms: string[]) => void;
}

export function EditIdeaModal({ topic, onClose, onSave, onRealize }: EditIdeaModalProps) {
  const [title, setTitle] = useState(topic.title);
  const [thesisPlan, setThesisPlan] = useState(topic.thesisPlan);
  const [showRealize, setShowRealize] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[88vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
        <div className="h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
        <div className="p-[18px_22px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💡</span>
              <h2 className="text-base font-bold text-amber-800">Идея</h2>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-100 border-none rounded-md w-[26px] h-[26px] cursor-pointer text-[13px] text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none transition-colors focus:border-amber-400"
            />
          </div>

          {/* Plan */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Тезисный план</label>
            <textarea
              value={thesisPlan}
              onChange={(e) => setThesisPlan(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none resize-y leading-relaxed transition-colors focus:border-amber-400"
            />
          </div>

          {!showRealize ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onSave({ ...topic, title: title.trim(), thesisPlan: thesisPlan.trim() }); onClose(); }}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer hover:bg-amber-200 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setShowRealize(true)}
                className="flex-1 py-2.5 px-3.5 rounded-xl text-white border-none text-xs font-bold cursor-pointer transition-colors"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                🚀 Реализовать
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-[11px] font-semibold text-indigo-500 mb-1.5">Куда постим:</div>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRealize(false)}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 text-slate-500 border-none text-xs font-semibold cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => { onRealize(topic.id, title.trim(), thesisPlan.trim(), selected); onClose(); }}
                  disabled={selected.length === 0}
                  className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold cursor-pointer border-none transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: selected.length === 0 ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: selected.length === 0 ? "#94a3b8" : "#fff",
                  }}
                >
                  Создать тему →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
