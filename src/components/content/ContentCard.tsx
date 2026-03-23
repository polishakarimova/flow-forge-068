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
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200"
      onClick={() => onOpen(item)}
    >
      <div className="w-[2px] h-[20px] rounded-sm shrink-0" style={{ background: platform?.color || "hsl(var(--border))" }} />
      <span className="text-[13px] shrink-0">{platform?.icon}</span>
      <span className="text-[11px] font-semibold min-w-[60px] shrink-0 text-muted-foreground">
        {platform?.label}
      </span>
      <div className="flex-1 text-[12px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
        {item.title || "Не заполнено"}
      </div>
      <span
        className="text-[10px] px-2 py-0.5 rounded-lg font-semibold shrink-0 whitespace-nowrap"
        style={{ background: status.bg, color: status.color }}
      >
        {status.label}
      </span>
    </div>
  );
}
