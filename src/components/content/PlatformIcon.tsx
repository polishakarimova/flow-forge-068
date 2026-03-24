interface PlatformIconProps {
  platformId: string;
  size?: number;
  className?: string;
}

const ICONS: Record<string, (size: number) => JSX.Element> = {
  stories: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="st_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="st_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#st_g1)" />
      <circle cx="16" cy="16" r="14" fill="url(#st_g2)" />
      <circle cx="16" cy="16" r="6.5" stroke="white" strokeWidth="2" fill="none" />
      <polygon points="14,12.5 20,16 14,19.5" fill="white" />
    </svg>
  ),
  tg_post: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="tg_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="tg_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#tg_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#tg_g2)" />
      <path d="M7.5 15.2L23.5 9L20.5 23L15 18L7.5 15.2Z" fill="white" opacity="0.95" />
      <path d="M15 18L23.5 9" stroke="#8B5CF6" strokeWidth="0.8" opacity="0.4" />
      <path d="M15 18L16.8 22.5" stroke="#8B5CF6" strokeWidth="0.8" opacity="0.4" />
    </svg>
  ),
  ig_post: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ig_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="ig_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ig_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ig_g2)" />
      <rect x="7" y="7" width="18" height="18" rx="5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="16" cy="16" r="4.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="21.5" cy="10.5" r="1.3" fill="white" />
    </svg>
  ),
  carousel: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="cr_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="cr_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#cr_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#cr_g2)" />
      <rect x="5" y="9" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
      <rect x="9" y="7" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
      <rect x="13" y="9" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)" />
      <circle cx="17" cy="14" r="1.5" fill="white" opacity="0.8" />
      <path d="M13 20L16 17L18 19L21 16L25 20" stroke="white" strokeWidth="1" strokeLinejoin="round" opacity="0.7" />
    </svg>
  ),
  reels: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="rl_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="rl_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#rl_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#rl_g2)" />
      <rect x="7" y="7" width="18" height="18" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="12" x2="25" y2="12" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="14" y1="7" x2="18" y2="12" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <polygon points="13.5,15 21,19.5 13.5,24" fill="white" opacity="0.95" />
    </svg>
  ),
  threads: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="th_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="th_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#th_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#th_g2)" />
      <path d="M18.5 12.5C18.5 12.5 17.2 11 15.5 11C13.5 11 12 12.5 12 14C12 15.5 13.5 16.2 15.5 16.8C17.5 17.4 19 18.2 19 20C19 21.8 17.5 23 15.5 23C13.5 23 12 21.5 12 21.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M19.5 14.5C20.5 15.3 21 16.5 21 18C21 21.5 18.5 24 15.5 24C12.5 24 10 21.5 10 18C10 14 12.5 11 16 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  ),
  youtube: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="yt_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="yt_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#yt_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#yt_g2)" />
      <rect x="5" y="8" width="22" height="16" rx="4" stroke="white" strokeWidth="1.5" fill="none" />
      <polygon points="13,11.5 21,16 13,20.5" fill="white" opacity="0.95" />
    </svg>
  ),
  article: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ar_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="ar_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ar_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#ar_g2)" />
      <rect x="7" y="6" width="18" height="20" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
      <line x1="10" y1="11" x2="22" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <line x1="10" y1="15" x2="22" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="10" y1="19" x2="18" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  vk: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="vk_g1" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="vk_g2" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#vk_g1)" />
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#vk_g2)" />
      <path d="M8 12H10.5C10.5 12 10.8 16.5 12.8 18C14 16.5 15.5 12 15.5 12H18C18 12 15.8 17.5 14.5 19.5C16.2 21.5 18.5 23 18.5 23H15.5C15.5 23 13.8 21.5 12.8 19.8C11.5 21.5 9.5 23 9.5 23H7.5C7.5 23 10 21 11.8 19C10 17 8 12 8 12Z" fill="white" opacity="0.95" />
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
