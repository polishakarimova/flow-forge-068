import { PLATFORMS, STATUSES, type ContentItemData } from "@/lib/contentData";

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
      className="card-elevated flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-200"
      onClick={() => onOpen(item)}
    >
      <div className="w-[3px] h-[26px] rounded-sm shrink-0" style={{ background: platform?.color || "hsl(var(--border))" }} />
      <span className="text-[15px] shrink-0">{platform?.icon}</span>
      <span className="text-[12px] font-bold min-w-[70px] shrink-0 text-muted-foreground">
        {platform?.label}
      </span>
      <div className={`flex-1 text-[13px] overflow-hidden text-ellipsis whitespace-nowrap ${
        item.title ? "text-foreground font-medium" : "text-muted-foreground/60"
      }`}>
        {item.title || "Не заполнено"}
      </div>
      {showTopic && topicTitle && (
        <span className="text-[11px] text-muted-foreground max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap shrink-0">
          {topicTitle}
        </span>
      )}
      <span
        className="text-[11px] px-2.5 py-0.5 rounded-lg font-semibold shrink-0 whitespace-nowrap"
        style={{ background: status.bg, color: status.color }}
      >
        {status.label}
      </span>
    </div>
  );
}
