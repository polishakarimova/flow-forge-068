import { PLATFORMS, STATUSES, type ContentItemData } from "@/lib/contentData";
import { PlatformIcon } from "./PlatformIcon";

interface ContentCardProps {
  item: ContentItemData;
  topicTitle?: string;
  showTopic?: boolean;
  onOpen: (item: ContentItemData) => void;
}

export function ContentCard({ item, topicTitle, showTopic, onOpen }: ContentCardProps) {
  const platform = PLATFORMS.find((x) => x.id === item.platformId);
  const status = STATUSES[item.status];

  return (
    <div
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)]"
      onClick={() => onOpen(item)}
    >
      {/* Status dot — gray is static, others pulse */}
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

      {/* Content title — dark gray like funnel keywords */}
      <div className="flex-1 min-w-0 text-[12px] md:text-[10px] text-muted-foreground truncate">
        {item.title || "Не заполнено"}
      </div>
    </div>
  );
}
