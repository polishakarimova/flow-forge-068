import { useState } from "react";
import type { Platform } from "@/lib/contentData";
import { PlatformSelector } from "./PlatformSelector";

interface CreateTopicModalProps {
  onClose: () => void;
  onCreate: (data: { title: string; thesisPlan: string; isIdeaBank: boolean; platforms: string[] }) => void;
  platforms: Platform[];
  onAddPlatform: (label: string) => string | null;
  onDeletePlatform: (id: string) => void;
}

export function CreateTopicModal({ onClose, onCreate, platforms, onAddPlatform, onDeletePlatform }: CreateTopicModalProps) {
  const [title, setTitle] = useState("");
  const [thesisPlan, setThesisPlan] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState<"topic" | "bank" | null>(null);

  const hasTitle = title.trim().length > 0;
  const canCreateTopic = hasTitle && selected.length > 0;
  const showTitleError = !!submitAttempted && !hasTitle;
  const showPlatformError = submitAttempted === "topic" && selected.length === 0;

  const handleCreate = (isBank: boolean) => {
    setSubmitAttempted(isBank ? "bank" : "topic");
    if (!hasTitle || (!isBank && selected.length === 0)) return;
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-card rounded-t-[24px] sm:rounded-3xl w-full max-w-[500px] max-h-[calc(100svh-72px)] sm:max-h-[88vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="px-4 pt-4 sm:px-7 sm:pt-6">
          <div className="flex justify-between items-center mb-3 sm:mb-5">
            <h2 className="text-lg font-bold text-foreground">Новая тема</h2>
            <button
              onClick={handleClose}
              className="bg-muted border-none rounded-lg w-8 h-8 sm:w-[30px] sm:h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
            >
              ✕
            </button>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Название темы</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Кейс 1,4 ляма"
              className={`w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] text-[14px] leading-5 outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] ${
                showTitleError ? "border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]" : "border-border"
              }`}
              autoFocus
            />
            {showTitleError && <p className="mt-1.5 text-[12px] font-medium text-primary">Добавьте название темы.</p>}
          </div>

          <div className="mb-4 sm:mb-5">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Тезисный план</label>
            <textarea
              value={thesisPlan}
              onChange={(e) => setThesisPlan(e.target.value)}
              placeholder={"— Что было до\n— Что сделали\n— Результат"}
              rows={3}
              className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] outline-none resize-y leading-5 transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="mb-4 sm:mb-5">
            <PlatformSelector
              platforms={platforms}
              values={selected}
              onChange={setSelected}
              onAddPlatform={onAddPlatform}
              onDeletePlatform={onDeletePlatform}
              showError={showPlatformError}
            />
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 px-4 py-3 sm:px-7 sm:py-4 border-t border-border">
          <button
            onClick={() => handleCreate(false)}
            className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] font-bold cursor-pointer transition-all duration-200"
            style={{
              background: !canCreateTopic ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: !canCreateTopic ? "#94a3b8" : "#fff",
              border: "none",
            }}
          >
            Создать тему →
          </button>
          <button
            onClick={() => handleCreate(true)}
            className="py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200"
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
          <div className="px-4 sm:px-7 pb-3 sm:pb-4 text-[11px] text-muted-foreground text-center">
            Если закроешь — тема сохранится в банк идей
          </div>
        )}
      </div>
    </div>
  );
}

