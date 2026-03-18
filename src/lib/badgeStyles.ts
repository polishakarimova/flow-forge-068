import type { BadgeColor } from "@/lib/funnelData";

export function getBadgeStyle(color: BadgeColor): React.CSSProperties {
  switch (color) {
    case "violet":
      return {
        background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
        color: "white",
        boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
      };
    case "honey":
      return {
        background: "linear-gradient(135deg, #E8B66D, #D4A056)",
        color: "white",
        boxShadow: "0 2px 8px rgba(232, 182, 109, 0.3)",
      };
    case "lilac":
      return {
        background: "linear-gradient(135deg, #A78BFA, #8B5CF6)",
        color: "white",
        boxShadow: "0 2px 8px rgba(167, 139, 250, 0.3)",
      };
    case "lilac":
      return {
        background: "linear-gradient(135deg, #A78BFA, #8B5CF6)",
        color: "white",
        boxShadow: "0 2px 8px rgba(167, 139, 250, 0.3)",
      };
    case "amber":
    default:
      return {
        background: "linear-gradient(135deg, #D4A056, #C08B3F)",
        color: "white",
        boxShadow: "0 2px 8px rgba(212, 160, 86, 0.3)",
      };
  }
}

export const badgeColorLabel: Record<BadgeColor, string> = {
  violet: "",
  amber: "",
  honey: "Вариант А: Мёд",
  peach: "Вариант Б: Персик",
  lilac: "Вариант В: Сирень",
};
