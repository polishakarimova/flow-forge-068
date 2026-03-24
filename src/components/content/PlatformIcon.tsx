interface PlatformIconProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ src, alt = "", size = 16, className = "" }: PlatformIconProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ objectFit: "contain" }}
    />
  );
}
