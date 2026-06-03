import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { PLATFORMS, formatDateLabel, type ContentItemData, type ContentStatusKey, type Platform } from "@/lib/contentData";
import { StatusSelect } from "./StatusSelect";
import { PlatformIcon } from "./PlatformIcon";

interface ContentDetailModalProps {
  item: ContentItemData;
  topicTitle: string;
  onClose: () => void;
  onSave: (updated: ContentItemData) => void;
  onTopicRename?: (newTitle: string) => void;
  platforms?: Platform[];
}

export function ContentDetailModal({ item, topicTitle, onClose, onSave, onTopicRename, platforms = PLATFORMS }: ContentDetailModalProps) {
  const platform = platforms.find((p) => p.id === item.platformId) || PLATFORMS.find((p) => p.id === item.platformId);
  const [title, setTitle] = useState(item.title || "");
  const [body, setBody] = useState(item.body || "");
  const [status, setStatus] = useState<ContentStatusKey>(item.status);
  const [publishDate, setPublishDate] = useState(item.publishDate || "");

  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState(topicTitle);
  const topicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTopic && topicInputRef.current) {
      topicInputRef.current.focus();
    }
  }, [editingTopic]);

  const commitTopicEdit = () => {
    setEditingTopic(false);
    const trimmed = topicDraft.trim();
    if (trimmed && trimmed !== topicTitle && onTopicRename) {
      onTopicRename(trimmed);
    } else {
      setTopicDraft(topicTitle);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-t-[24px] sm:rounded-3xl w-full max-w-[520px] max-h-[calc(100svh-72px)] sm:max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="h-[4px] rounded-t-3xl bg-primary" />
        <div className="px-4 py-4 sm:px-7 sm:py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-3 sm:mb-5">
            <div className="flex items-center gap-2">
              <PlatformIcon platformId={item.platformId} size={20} />
              <span className="text-[16px] font-bold text-foreground uppercase">{platform?.label}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <StatusSelect value={status} onChange={setStatus} />
              <button
                onClick={onClose}
                className="bg-muted border-none rounded-lg w-8 h-8 sm:w-[30px] sm:h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Topic title — bordered block, non-editable by default */}
          {topicTitle && (
            <div className="flex items-center gap-2 mb-2.5 sm:mb-3 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-border/60 bg-muted/20">
              {editingTopic ? (
                <input
                  ref={topicInputRef}
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  onBlur={commitTopicEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTopicEdit();
                    if (e.key === "Escape") { setTopicDraft(topicTitle); setEditingTopic(false); }
                  }}
                  className="flex-1 min-w-0 text-[12px] font-light tracking-wide text-muted-foreground bg-transparent border-none outline-none py-0"
                />
              ) : (
                <span className="flex-1 min-w-0 text-[12px] font-light tracking-wide text-muted-foreground/60 truncate select-none">
                  {topicTitle}
                </span>
              )}
              {onTopicRename && (
                <button
                  onClick={() => {
                    if (!editingTopic) { setTopicDraft(topicTitle); setEditingTopic(true); }
                  }}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="О чём этот контент"
              className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] leading-5 outline-none transition-all duration-200"
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--primary))";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Body */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Текст контента</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напиши текст поста, сценарий рилса, тезисы для сторис..."
              rows={6}
              className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[14px] outline-none resize-y leading-5 transition-all duration-200"
              style={{ minHeight: 120 }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--primary))";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Создано</label>
              <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 text-muted-foreground bg-muted/50">
                {formatDateLabel(item.createdDate) || "—"}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Дата публикации</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border-[1.5px] border-border text-[13px] leading-5 outline-none transition-all duration-200"
                style={{ color: publishDate ? "#334155" : "#94a3b8" }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--primary))";
                  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.08)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={() => { onSave({ ...item, title, body, status, publishDate }); onClose(); }}
            className="w-full py-2.5 rounded-xl sm:rounded-2xl text-[14px] font-bold cursor-pointer text-white border-none transition-all duration-200 hover:shadow-lg"
            style={{ background: "hsl(var(--primary))" }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

