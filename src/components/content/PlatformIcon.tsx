interface PlatformIconProps {
  platformId: string;
  size?: number;
  className?: string;
}

const ICONS: Record<string, (size: number) => JSX.Element> = {
  stories: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#8B5CF6" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="#8B5CF6" strokeWidth="1.5" />
      <polygon points="10.5,9 15,12 10.5,15" fill="#8B5CF6" />
    </svg>
  ),
  tg_post: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 11L21 4L17 21L11 15L3 11Z" fill="#2AABEE" />
      <path d="M11 15L21 4" stroke="white" strokeWidth="1" />
      <path d="M11 15L13 21" stroke="white" strokeWidth="1" />
    </svg>
  ),
  ig_post: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="#E1306C" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke="#E1306C" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#E1306C" />
    </svg>
  ),
  carousel: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="12" height="14" rx="2" stroke="#F77737" strokeWidth="1.8" />
      <rect x="8" y="3" width="12" height="14" rx="2" stroke="#F77737" strokeWidth="1.8" fill="white" />
      <circle cx="12" cy="9" r="1.5" fill="#F77737" />
      <path d="M8 14L11 11L13 13L16 10L20 14" stroke="#F77737" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  reels: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="#FF0069" strokeWidth="2" />
      <polygon points="10,8 17,12 10,16" fill="#FF0069" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="#FF0069" strokeWidth="1" />
    </svg>
  ),
  threads: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7 3 4 6.5 4 10.5C4 13.5 5.5 15.5 8 16.5L8 20L11 17H12C17 17 20 13.5 20 10C20 6.5 17 3 12 3Z" stroke="#666" strokeWidth="2" fill="none" />
      <path d="M14.5 9.5C14.5 9.5 13.5 8.5 12 8.5C10.5 8.5 9.5 9.5 9.5 10.5C9.5 11.5 10.5 12 12 12.5C13.5 13 14.5 13.5 14.5 14.5C14.5 15.5 13.5 16 12 16C10.5 16 9.5 15 9.5 15" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  youtube: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
      <polygon points="10,8.5 16,12 10,15.5" fill="white" />
    </svg>
  ),
  article: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="#34A853" strokeWidth="2" />
      <line x1="7" y1="8" x2="17" y2="8" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="12" x2="17" y2="12" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="16" x2="13" y2="16" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  vk: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#4680C2" />
      <path d="M6.5 8.5H8.5C8.5 8.5 8.5 12 10 13.5C11 12 12.5 8.5 12.5 8.5H14.5C14.5 8.5 12.5 13 11.5 14.5C13 16 15 17 15 17H12.5C12.5 17 11 16 10 14.5C9 16 7.5 17 7.5 17H6C6 17 8 15.5 9.5 14C8 12.5 6.5 8.5 6.5 8.5Z" fill="white" />
    </svg>
  ),
};

export function PlatformIcon({ platformId, size = 16, className = "" }: PlatformIconProps) {
  const render = ICONS[platformId];
  if (!render) return null;
  return <span className={`inline-flex shrink-0 ${className}`}>{render(size)}</span>;
}

// Helper to get icon by old-style src path (for backward compat)
const PATH_TO_ID: Record<string, string> = {
  "/icons/stories.svg": "stories",
  "/icons/telegram.svg": "tg_post",
  "/icons/instagram.svg": "ig_post",
  "/icons/carousel.svg": "carousel",
  "/icons/reels.svg": "reels",
  "/icons/threads.svg": "threads",
  "/icons/youtube.svg": "youtube",
  "/icons/article.svg": "article",
  "/icons/vk.svg": "vk",
};

export function PlatformIconByPath({ src, size = 16, className = "" }: { src: string; size?: number; className?: string }) {
  const id = PATH_TO_ID[src];
  if (!id) return null;
  return <PlatformIcon platformId={id} size={size} className={className} />;
}
