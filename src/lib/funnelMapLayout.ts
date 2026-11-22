type Point = { x: number; y: number };
type MapView = { pan: Point; zoom: number };

function isPoint(value: unknown): value is Point {
  return typeof value === "object" && value !== null
    && "x" in value && Number.isFinite(value.x)
    && "y" in value && Number.isFinite(value.y);
}

export function funnelMapLayout(accountId?: string) {
  const prefix = accountId ? "funnel-map:" + encodeURIComponent(accountId) + ":" : "";
  function read(key: string): unknown {
    try {
      const value = prefix && localStorage.getItem(prefix + key);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  }
  function write(key: string, value: unknown) {
    if (!prefix) return;
    try {
      if (value === null) localStorage.removeItem(prefix + key);
      else localStorage.setItem(prefix + key, JSON.stringify(value));
    } catch { /* The layout remains usable in memory when storage is unavailable. */ }
  }
  return {
    positions(): Record<string, Point> {
      const data = read("positions");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      return Object.fromEntries(Object.entries(data).filter(([, point]) => isPoint(point)));
    },
    view(): MapView | null {
      const value = read("view");
      if (!value || typeof value !== "object" || !("pan" in value) || !isPoint(value.pan)
        || !("zoom" in value) || typeof value.zoom !== "number" || !Number.isFinite(value.zoom)) return null;
      return { pan: value.pan, zoom: Math.max(0.2, Math.min(2.5, value.zoom)) };
    },
    savePositions(nodes: ReadonlyArray<Point & { id: string }>) {
      write("positions", Object.fromEntries(nodes.map(({ id, x, y }) => [id, { x, y }])));
    },
    saveView(view: MapView) { write("view", view); },
    reset() { write("positions", null); write("view", null); },
  };
}
