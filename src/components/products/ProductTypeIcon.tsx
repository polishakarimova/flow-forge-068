interface ProductTypeIconProps {
  typeId: string;
  size?: number;
  className?: string;
}

const ICONS: Record<string, (s: number) => JSX.Element> = {
  // Корона — личная работа
  private: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="cr-g" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M8 34L4 14l10 8 10-12 10 12 10-8-4 20H8z" fill="url(#cr-g)" />
      <path d="M8 34L4 14l10 8 10-12 10 12 10-8-4 20H8z" fill="white" fillOpacity="0.15" />
      <rect x="7" y="33" width="34" height="5" rx="2.5" fill="#7c3aed" fillOpacity="0.5" />
      <circle cx="14" cy="14" r="2" fill="#ede9fe" />
      <circle cx="24" cy="10" r="2.5" fill="#ede9fe" />
      <circle cx="34" cy="14" r="2" fill="#ede9fe" />
    </svg>
  ),

  // Магнит — лидмагнит
  lead_magnet: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="mg-g" x1="10" y1="6" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M12 8h8v14a4 4 0 008 0V8h8v14c0 8.8-5.4 16-12 16s-12-7.2-12-16V8z" fill="url(#mg-g)" />
      <rect x="12" y="8" width="8" height="7" rx="1" fill="#ede9fe" fillOpacity="0.7" />
      <rect x="28" y="8" width="8" height="7" rx="1" fill="#ede9fe" fillOpacity="0.7" />
      <path d="M20 22a4 4 0 008 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),

  // Чат — консультация
  consultation: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="ch-g" x1="6" y1="6" x2="42" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M6 12c0-3.3 2.7-6 6-6h24c3.3 0 6 2.7 6 6v16c0 3.3-2.7 6-6 6H20l-8 8v-8c-3.3 0-6-2.7-6-6V12z" fill="url(#ch-g)" />
      <path d="M6 12c0-3.3 2.7-6 6-6h24c3.3 0 6 2.7 6 6v16c0 3.3-2.7 6-6 6H20l-8 8v-8c-3.3 0-6-2.7-6-6V12z" fill="white" fillOpacity="0.12" />
      <circle cx="16" cy="20" r="2.5" fill="#ede9fe" />
      <circle cx="24" cy="20" r="2.5" fill="#ede9fe" />
      <circle cx="32" cy="20" r="2.5" fill="#ede9fe" />
    </svg>
  ),

  // Бриллиант — флагман
  flagship: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="di-g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="40%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <polygon points="24,4 44,18 24,44 4,18" fill="url(#di-g)" />
      <polygon points="15,18 24,6 33,18" fill="white" fillOpacity="0.25" />
      <line x1="4" y1="18" x2="44" y2="18" stroke="#7c3aed" strokeWidth="0.8" opacity="0.4" />
      <line x1="24" y1="18" x2="24" y2="44" stroke="#7c3aed" strokeWidth="0.6" opacity="0.25" />
      <line x1="4" y1="18" x2="24" y2="44" stroke="#7c3aed" strokeWidth="0.5" opacity="0.15" />
      <line x1="44" y1="18" x2="24" y2="44" stroke="#7c3aed" strokeWidth="0.5" opacity="0.15" />
    </svg>
  ),

  // Монета — среднечек
  mid_ticket: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="co-g" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#co-g)" />
      <circle cx="24" cy="24" r="18" fill="white" fillOpacity="0.1" />
      <circle cx="24" cy="24" r="13.5" stroke="#ede9fe" strokeWidth="1.2" opacity="0.35" />
      <text x="24" y="30.5" textAnchor="middle" fill="#ede9fe" fontSize="19" fontWeight="bold" fontFamily="Arial, sans-serif">$</text>
    </svg>
  ),

  // Молния — трипваер
  tripwire: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="lt-g" x1="14" y1="2" x2="34" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <polygon points="28,2 12,26 22,26 18,46 38,20 27,20 34,2" fill="url(#lt-g)" />
      <polygon points="28,2 12,26 22,26 18,46 38,20 27,20 34,2" fill="white" fillOpacity="0.15" />
      <polygon points="28,2 26,14 34,2" fill="white" fillOpacity="0.2" />
    </svg>
  ),
};

export function ProductTypeIcon({ typeId, size = 18, className = "" }: ProductTypeIconProps) {
  const render = ICONS[typeId];
  if (!render) return null;
  return <span className={`inline-flex shrink-0 ${className}`}>{render(size)}</span>;
}
