type Insets = { top?: number; bottom?: number; left?: number; right?: number };
export interface TelegramViewport {
  initData?: string;
  platform?: string;
  isFullscreen?: boolean;
  viewportStableHeight?: number;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  isVersionAtLeast?: (version: string) => boolean;
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
}

// Presentation only: initData is never trusted here for authentication.
// Fullscreen is requested once; user exits and unsupported clients are respected.
export function setupTelegramViewport(app: TelegramViewport | undefined, root: HTMLElement) {
  if (!app || (!app.initData && (!app.platform || app.platform === 'unknown'))) return () => {};
  const attempt = (action: () => void) => { try { action(); } catch { /* Keep the app usable on older clients. */ } };
  root.dataset.telegramApp = 'true';
  const sync = () => {
    root.dataset.telegramFullscreen = String(Boolean(app.isFullscreen));
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      for (const [kind, values] of [['system', app.safeAreaInset], ['content', app.contentSafeAreaInset]] as const) {
        const value = values?.[side];
        root.style.setProperty(`--app-${kind}-${side}`, `${typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0}px`);
      }
    }
    const height = app.viewportStableHeight;
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) root.style.setProperty('--app-viewport-height', `${height}px`);
  };
  const events = ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'fullscreenFailed'];
  for (const event of events) attempt(() => app.onEvent?.(event, sync));
  sync();
  attempt(() => app.ready?.());
  attempt(() => app.setHeaderColor?.('#fafafb'));
  attempt(() => app.setBackgroundColor?.('#fafafb'));
  attempt(() => app.expand?.());
  attempt(() => { if (!app.isFullscreen && app.isVersionAtLeast?.('8.0')) app.requestFullscreen?.(); });
  sync();
  return () => {
    for (const event of events) attempt(() => app.offEvent?.(event, sync));
    delete root.dataset.telegramApp;
    delete root.dataset.telegramFullscreen;
  };
}
