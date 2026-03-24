import { useState } from "react";
import { PLATFORMS, formatDateLabel, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { StatusSelect } from "./StatusSelect";
import { PlatformIcon } from "./PlatformIcon";

interface ContentDetailModalProps {
  item: ContentItemData;
  topicTitle: string;
  onClose: () => void;
  onSave: (updated: ContentItemData) => void;
}

export function ContentDetailModal({ item, topicTitle, onClose, onSave }: ContentDetailModalProps) {
  const platform = PLATFORMS.find((p) => p.id === item.platformId);
  const [title, setTitle] = useState(item.title || "");
  const [body, setBody] = useState(item.body || "");
  const [status, setStatus] = useState<ContentStatusKey>(item.status);
  const [publishDate, setPublishDate] = useState(item.publishDate || "");

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-3xl w-full max-w-[520px] max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-3 duration-300" style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}>
        <div className="h-[4px] rounded-t-3xl" style={{ background: platform?.color || "#ccc" }} />
        <div className="px-7 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              {platform && <PlatformIcon src={platform.icon} alt={platform.label} size={20} />}
              <span className="text-[16px] font-bold" style={{ color: platform?.color }}>{platform?.label}</span>
              {topicTitle && <span className="text-[12px] text-muted-foreground">· {topicTitle}</span>}
            </div>
            <div className="flex items-center gap-2.5">
              <StatusSelect value={status} onChange={setStatus} />
              <button
                onClick={onClose}
                className="bg-muted border-none rounded-lg w-[30px] h-[30px] cursor-pointer text-[14px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="О чём этот контент"
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200"
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1";
                (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(platform?.color || "#6366f1")}15`;
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Текст контента</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напиши текст поста, сценарий рилса, тезисы для сторис..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none resize-y leading-relaxed transition-all duration-200"
              style={{ minHeight: 120 }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1";
                (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(platform?.color || "#6366f1")}15`;
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Создано</label>
              <div className="px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] text-muted-foreground bg-muted/50">
                {formatDateLabel(item.createdDate) || "—"}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Дата публикации</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-[1.5px] border-border text-[15px] outline-none transition-all duration-200"
                style={{ color: publishDate ? "#334155" : "#94a3b8" }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1";
                  (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${(platform?.color || "#6366f1")}15`;
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
            className="w-full py-3 rounded-2xl text-[15px] font-bold cursor-pointer text-white border-none transition-all duration-200 hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${platform?.color || "#6366f1"}, ${platform?.color || "#6366f1"}dd)` }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
