import { PLATFORMS, STATUSES, type Topic, type ContentItemData } from "@/lib/contentData";
import { ContentCard } from "./ContentCard";
import { ChevronDown } from "lucide-react";

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
  const hottestColor = Object.values(STATUSES).find((s) => s.priority === hottest)?.color || "hsl(var(--border))";

  return (
    <div
      className={`card-elevated mb-3 overflow-hidden transition-all duration-200 ${
        expanded ? "border-l-[3px]" : ""
      }`}
      style={expanded ? { borderLeftColor: hottestColor } : undefined}
    >
      <div
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 md:px-4 md:gap-3 cursor-pointer group transition-colors duration-200 hover:bg-[hsl(var(--primary)/0.04)]"
      >
        {/* Status indicator */}
        <div className="w-[3px] h-5 rounded-sm shrink-0" style={{ background: hottestColor }} />

        {/* Title */}
        <span className="text-[13px] font-semibold text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {topic.title}
        </span>

        {/* Platform icons */}
        <div className="flex gap-1 shrink-0">
          {platformIds.map((pid) => {
            const pl = PLATFORMS.find((x) => x.id === pid);
            if (!pl) return null;
            return (
              <span
                key={pid}
                className="text-[11px] w-[22px] h-[22px] rounded-md flex items-center justify-center"
                style={{ background: pl.color + "12", color: pl.color }}
                title={pl.label}
              >
                {pl.icon}
              </span>
            );
          })}
        </div>

        {/* Count */}
        <span className="text-[11px] text-muted-foreground shrink-0">
          {topic.contentItems.length}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {expanded && topic.contentItems.length > 0 && (
        <div className="animate-fade-in border-t border-border bg-muted/30 p-1.5 pl-5 flex flex-col gap-0.5">
          {topic.contentItems.map((ci) => (
            <ContentCard key={ci.id} item={ci} onOpen={onOpenContent} showTopic={false} />
          ))}
        </div>
      )}
    </div>
  );
}
