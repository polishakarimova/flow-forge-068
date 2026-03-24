const ICON_MAP: Record<string, string> = {
  lead_magnet: "/icons/magnet.svg",
  tripwire: "/icons/lightning.svg",
  mid_ticket: "/icons/coin.svg",
  flagship: "/icons/diamond.svg",
  consultation: "/icons/chat.svg",
  private: "/icons/crown.svg",
};

interface ProductTypeIconProps {
  typeId: string;
  size?: number;
  className?: string;
}

export function ProductTypeIcon({ typeId, size = 18, className = "" }: ProductTypeIconProps) {
  const src = ICON_MAP[typeId];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
