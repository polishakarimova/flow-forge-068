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
      className="flex items-center gap-2 bg-white rounded-lg px-3 py-[7px] border border-[#eef0f4] cursor-pointer transition-all duration-100"
      onClick={() => onOpen(item)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = platform?.color || "#ccc";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 6px rgba(0,0,0,.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#eef0f4";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="w-[3px] h-[22px] rounded-sm shrink-0" style={{ background: platform?.color || "#ccc" }} />
      <span className="text-xs shrink-0">{platform?.icon}</span>
      <span className="text-[11px] font-bold min-w-[56px] shrink-0" style={{ color: platform?.color }}>
        {platform?.label}
      </span>
      <div
        className="flex-1 text-xs overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          color: item.title ? "#334155" : "#b0b8c4",
          fontWeight: item.title ? 500 : 400,
        }}
      >
        {item.title || "Не заполнено"}
      </div>
      {showTopic && topicTitle && (
        <span className="text-[10px] text-muted-foreground max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap shrink-0">
          {topicTitle}
        </span>
      )}
      <span
        className="text-[10px] px-[7px] py-[1px] rounded-[5px] font-semibold shrink-0 whitespace-nowrap"
        style={{ background: status.bg, color: status.color }}
      >
        {status.label}
      </span>
    </div>
  );
}
