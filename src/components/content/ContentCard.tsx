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
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-[#eef0f4] cursor-pointer transition-all duration-200"
      onClick={() => onOpen(item)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = platform?.color || "#ccc";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#eef0f4";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="w-[3px] h-[26px] rounded-sm shrink-0" style={{ background: platform?.color || "#ccc" }} />
      <span className="text-[15px] shrink-0">{platform?.icon}</span>
      <span className="text-[13px] font-bold min-w-[70px] shrink-0" style={{ color: platform?.color }}>
        {platform?.label}
      </span>
      <div
        className="flex-1 text-[14px] overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          color: item.title ? "#334155" : "#b0b8c4",
          fontWeight: item.title ? 500 : 400,
        }}
      >
        {item.title || "Не заполнено"}
      </div>
      {showTopic && topicTitle && (
        <span className="text-[12px] text-muted-foreground max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap shrink-0">
          {topicTitle}
        </span>
      )}
      <span
        className="text-[12px] px-2.5 py-0.5 rounded-lg font-semibold shrink-0 whitespace-nowrap"
        style={{ background: status.bg, color: status.color }}
      >
        {status.label}
      </span>
    </div>
  );
}
