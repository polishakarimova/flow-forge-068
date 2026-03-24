import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { PLATFORMS, STATUSES, type ContentItemData } from "@/lib/contentData";
import { PlatformIcon } from "./PlatformIcon";

interface ContentCardProps {
  item: ContentItemData;
  topicTitle?: string;
  showTopic?: boolean;
  onOpen: (item: ContentItemData) => void;
  onTopicRename?: (newTitle: string) => void;
}

export function ContentCard({ item, topicTitle, showTopic, onOpen, onTopicRename }: ContentCardProps) {
  const platform = PLATFORMS.find((x) => x.id === item.platformId);
  const status = STATUSES[item.status];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topicTitle || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== topicTitle && onTopicRename) {
      onTopicRename(trimmed);
    } else {
      setDraft(topicTitle || "");
    }
  };

  return (
    <div className="card-elevated overflow-hidden transition-all duration-200">
      {/* Main row */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[hsl(var(--primary)/0.04)]"
        onClick={() => onOpen(item)}
      >
        {/* Status dot */}
        <span className="relative shrink-0 w-2 h-2">
          {status.color !== "#94a3b8" && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
          )}
          <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
        </span>

        {/* Platform badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
          {platform && <PlatformIcon platformId={item.platformId} size={16} />}
        </span>

        {/* Content title */}
        <div className="flex-1 min-w-0 text-[12px] md:text-[10px] text-muted-foreground truncate">
          {item.title || "Не заполнено"}
        </div>
      </div>

      {/* Topic title row — gray, non-editable by default */}
      {showTopic && topicTitle && (
        <div className="flex items-center gap-1.5 px-3 py-1 border-t border-border/40 bg-muted/20">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") { setDraft(topicTitle); setEditing(false); }
              }}
              className="flex-1 min-w-0 text-[10px] text-muted-foreground bg-transparent border-none outline-none py-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 min-w-0 text-[10px] text-muted-foreground/70 truncate select-none">
              {topicTitle}
            </span>
          )}
          {onTopicRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!editing) { setDraft(topicTitle); setEditing(true); }
              }}
              className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors border-none bg-transparent cursor-pointer"
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
