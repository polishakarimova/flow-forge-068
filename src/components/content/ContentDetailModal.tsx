import { useState } from "react";
import { PLATFORMS, STATUSES, formatDateLabel, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { StatusSelect } from "./StatusSelect";

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
        <div className="h-[3px] rounded-t-2xl" style={{ background: platform?.color || "#ccc" }} />
        <div className="p-[18px_22px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-[7px]">
              <span className="text-base">{platform?.icon}</span>
              <span className="text-[15px] font-bold" style={{ color: platform?.color }}>{platform?.label}</span>
              {topicTitle && <span className="text-[11px] text-muted-foreground">· {topicTitle}</span>}
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect value={status} onChange={setStatus} />
              <button
                onClick={onClose}
                className="bg-slate-100 border-none rounded-md w-[26px] h-[26px] cursor-pointer text-[13px] text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-[3px]">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="О чём этот контент"
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none transition-colors"
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1"; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
            />
          </div>

          {/* Body */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-[3px]">Текст контента</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напиши текст поста, сценарий рилса, тезисы для сторис..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none resize-y leading-relaxed transition-colors"
              style={{ minHeight: 120 }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1"; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-[3px]">Создано</label>
              <div className="px-3 py-2 rounded-lg border-[1.5px] border-slate-100 text-[13px] text-muted-foreground bg-slate-50">
                {formatDateLabel(item.createdDate) || "—"}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-[3px]">Дата публикации</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-[1.5px] border-border text-[13px] outline-none transition-colors"
                style={{ color: publishDate ? "#334155" : "#94a3b8" }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = platform?.color || "#6366f1"; }}
                onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={() => { onSave({ ...item, title, body, status, publishDate }); onClose(); }}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold cursor-pointer text-white border-none transition-colors"
            style={{ background: `linear-gradient(135deg, ${platform?.color || "#6366f1"}, ${platform?.color || "#6366f1"}dd)` }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
