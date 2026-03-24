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
      <path d="M19.2 14.8c-.2-.1-.4-.2-.6-.2-1.5-.7-3.2-.3-4 1.2-.6 1.2-.4 2.6.4 3.6.9 1.1 2.4 1.5 3.7 1 1.2-.5 2-1.7 2-3 0-2.8-1.8-5.2-4.5-5.8-2.4-.5-4.8.6-6 2.7-1 1.8-1 4.2.1 6 1.2 2 3.4 3 5.7 2.8 1.6-.1 3-.9 4-2.1" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
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
      <text x="16" y="20.5" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="-0.5">VK</text>
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
