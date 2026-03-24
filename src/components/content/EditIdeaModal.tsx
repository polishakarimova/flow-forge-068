import { useState } from "react";
import { PLATFORMS, type Topic } from "@/lib/contentData";
import { PlatformIcon } from "./PlatformIcon";

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[500px] max-h-[88vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="h-[4px] rounded-t-3xl" style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
        <div className="px-7 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <h2 className="text-lg font-bold text-amber-800">Идея</h2>
            </div>
            <button
              onClick={onClose}
              className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.1)]"
            />
          </div>

          {/* Plan */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Тезисный план</label>
            <textarea
              value={thesisPlan}
              onChange={(e) => setThesisPlan(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none resize-y leading-relaxed transition-all duration-200 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.1)]"
            />
          </div>

          {!showRealize ? (
            <div className="flex gap-3">
              <button
                onClick={() => { onSave({ ...topic, title: title.trim(), thesisPlan: thesisPlan.trim() }); onClose(); }}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 text-[14px] font-bold cursor-pointer hover:bg-amber-200 transition-all duration-200"
              >
                Сохранить
              </button>
              <button
                onClick={() => setShowRealize(true)}
                className="flex-1 py-3 px-4 rounded-2xl text-white border-none text-[14px] font-bold cursor-pointer transition-all duration-200 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                🚀 Реализовать
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[13px] font-semibold text-indigo-500 mb-2">Куда постим:</div>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200"
                        style={{
                          border: isSelected ? "2px solid hsl(var(--primary))" : "2px solid #e8ecf1",
                          background: isSelected ? "hsl(var(--primary) / 0.06)" : "#fff",
                          color: isSelected ? "hsl(var(--foreground))" : "#64748b",
                        }}
                      >
                        <PlatformIcon platformId={p.id} size={16} />
                        {p.label}
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRealize(false)}
                  className="py-3 px-4 rounded-2xl bg-muted text-muted-foreground border-none text-[14px] font-semibold cursor-pointer hover:bg-muted/80 transition-all duration-200"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => { onRealize(topic.id, title.trim(), thesisPlan.trim(), selected); onClose(); }}
                  disabled={selected.length === 0}
                  className="flex-1 py-3 px-4 rounded-2xl text-[14px] font-bold cursor-pointer border-none transition-all duration-200 disabled:cursor-not-allowed"
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
