import { PLATFORMS, STATUSES, type Topic, type ContentItemData } from "@/lib/contentData";
import { ContentCard } from "./ContentCard";

interface TopicRowProps {
  topic: Topic;
  expanded: boolean;
  onToggle: () => void;
  onOpenContent: (item: ContentItemData) => void;
}

export function TopicRow({ topic, expanded, onToggle, onOpenContent }: TopicRowProps) {
  const platformIds = [...new Set(topic.contentItems.map((c) => c.platformId))];
  const hottest = topic.contentItems.reduce(
    (h, c) => Math.max(h, STATUSES[c.status]?.priority || 0),
    0
  );
  const hottestColor = Object.values(STATUSES).find((s) => s.priority === hottest)?.color || "#e2e8f0";

  return (
    <div className="mb-px">
      <div
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-[6px] cursor-pointer transition-all duration-100"
        style={{
          background: topic.isIdeaBank ? "#fffdf5" : "#fff",
          borderRadius: expanded ? "8px 8px 0 0" : "8px",
          border: topic.isIdeaBank ? "1px solid #fde68a" : "1px solid #eef0f4",
          borderBottom: expanded && !topic.isIdeaBank ? "1px dashed #e8ecf1" : undefined,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = topic.isIdeaBank ? "#fefce8" : "#f8fafc";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = topic.isIdeaBank ? "#fffdf5" : "#fff";
        }}
      >
        {!topic.isIdeaBank && (
          <div className="w-[3px] h-4 rounded-sm shrink-0" style={{ background: hottestColor }} />
        )}
        <span
          className="text-[13px] text-muted-foreground shrink-0 transition-transform duration-100"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        >
          ›
        </span>
        {topic.isIdeaBank && (
          <span className="text-[9px] bg-amber-200 px-1.5 py-px rounded-[5px] font-bold text-amber-800 shrink-0">
            💡
          </span>
        )}
        <span className="text-xs font-semibold text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {topic.title}
        </span>
        {!topic.isIdeaBank && (
          <div className="flex gap-0.5 shrink-0">
            {platformIds.map((pid) => {
              const pl = PLATFORMS.find((x) => x.id === pid);
              if (!pl) return null;
              return (
                <span
                  key={pid}
                  className="text-[10px] w-[18px] h-[18px] rounded flex items-center justify-center"
                  style={{ background: pl.color + "12", color: pl.color }}
                  title={pl.label}
                >
                  {pl.icon}
                </span>
              );
            })}
          </div>
        )}
        {!topic.isIdeaBank && (
          <span className="text-[10px] text-muted-foreground shrink-0">{topic.contentItems.length}</span>
        )}
      </div>

      {expanded && !topic.isIdeaBank && topic.contentItems.length > 0 && (
        <div className="bg-[#fafbfc] border border-[#eef0f4] border-t-0 rounded-b-lg p-1 pl-5 flex flex-col gap-0.5">
          {topic.contentItems.map((ci) => (
            <ContentCard key={ci.id} item={ci} onOpen={onOpenContent} showTopic={false} />
          ))}
        </div>
      )}

      {expanded && topic.isIdeaBank && (
        <div className="bg-[#fffdf5] border border-amber-200 border-t-0 rounded-b-lg px-3 py-1.5 pl-[30px] text-[11px] text-stone-500 whitespace-pre-line leading-relaxed">
          {topic.thesisPlan}
        </div>
      )}
    </div>
  );
}
