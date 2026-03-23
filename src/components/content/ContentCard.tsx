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
  const isActive = item.status === "in_progress";

  return (
    <div
      className="card-elevated flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-200"
      onClick={() => onOpen(item)}
    >
      {/* Status dot — animated for in_progress, static for others */}
      {isActive ? (
        <span className="relative shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
          <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
        </span>
      ) : (
        <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: status.color }} />
      )}

      {/* Platform abbreviation badge — like funnel ЛМ/СЧ/ФГ */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.05em] bg-foreground/[0.06] text-muted-foreground shrink-0">
        {platform?.icon}
      </span>

      {/* Content title */}
      <div className="flex-1 min-w-0 text-[10px] text-muted-foreground/60 truncate">
        {item.title || "Не заполнено"}
      </div>
    </div>
  );
}
