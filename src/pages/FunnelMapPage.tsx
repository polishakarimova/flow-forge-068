import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { type BadgeColor, type ContentItem, type FunnelProduct } from "@/lib/funnelData";
import { useDataStore } from "@/lib/dataStore";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ContentDrawer } from "@/components/ContentDrawer";

/* ── inline SVG icons (Lucide-style, stroke, 14×14) ─── */

const ICON_COLOR = "#6366f1";

function SvgIconFileText({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={ICON_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" />
      <path d="M9 1v4h4" />
      <line x1="5" y1="7" x2="9" y2="7" />
      <line x1="5" y1="10" x2="9" y2="10" />
    </g>
  );
}

function SvgIconKey({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={ICON_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <line x1="8" y1="8" x2="8" y2="14" />
      <line x1="6" y1="11" x2="10" y2="11" />
    </g>
  );
}

function SvgIconMagnet({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={ICON_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 1v5a4 4 0 008 0V1" />
      <line x1="2" y1="1" x2="6" y2="1" />
      <line x1="10" y1="1" x2="14" y2="1" />
    </g>
  );
}

function SvgIconCoin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={ICON_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="6" />
      <path d="M5 5.5C5.3 4.6 6 4 7 4s2 .8 2 1.8c0 1.4-2 1.4-2 2.7" />
      <circle cx="7" cy="10.5" r="0.3" fill={ICON_COLOR} />
    </g>
  );
}

const COL_SVG_ICON: ((props: { x: number; y: number }) => JSX.Element)[] = [
  SvgIconFileText,
  SvgIconKey,
  SvgIconMagnet,
  SvgIconCoin,
];

/* ── colour helpers ─────────────────────────────────── */

const BADGE_HEX: Record<BadgeColor, string> = {
  violet: "#8B5CF6",
  honey: "#E8B66D",
  lilac: "#A78BFA",
  amber: "#D4A056",
};

const TIER_LABEL: Record<string, string> = {
  "lead-magnet": "ЛИД-МАГНИТ",
  "mid-ticket": "СРЕДНИЙ ЧЕК",
  flagship: "ФЛАГМАН",
};

const TIER_COLOR: Record<string, string> = {
  "lead-magnet": "#8b5cf6",
  "mid-ticket": "#6366f1",
  flagship: "#ef4444",
};

/* ── node / edge types ──────────────────────────────── */

interface MapNode {
  id: string;
  type: "content" | "keyword" | "leadmagnet" | "product";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  tier?: string;
  tierLabel?: string;
  platformId?: string;
  contentItem?: ContentItem;
  funnelProduct?: FunnelProduct;
  funnelId?: string;
}

interface MapEdge {
  from: string;
  to: string;
  color: string;
}

/* ── column layout constants ────────────────────────── */

const COL_X = { content: 60, keyword: 380, leadmagnet: 650, product: 960 };

const COL_HEADERS = [
  { x: 60, label: "КОНТЕНТ", w: 240 },
  { x: 380, label: "КОДОВОЕ СЛОВО", w: 160 },
  { x: 650, label: "ЛИД-МАГНИТ", w: 220 },
  { x: 960, label: "ПРОДУКТ", w: 230 },
];

/* ── build graph from funnelsList ───────────────────── */

function buildGraph(funnelsList: typeof import("@/lib/funnelData").funnelsData) {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const seenProducts = new Set<string>();

  const FUNNEL_PLATFORM_ID: Record<string, string> = {
    "Telegram|Пост": "tg_post",
    "Instagram|Stories": "stories",
    "Instagram|Пост": "ig_post",
    "Instagram|Reels": "reels",
    "Instagram|Карусель": "carousel",
    "Blog|Статья": "article",
    "Threads|Тред": "threads",
    "YouTube|Видео": "youtube",
    "VK|Пост": "vk",
  };

  // collect all content items across funnels
  const contentItems: { cId: string; label: string; platform: string; funnelId: string; platformId: string; ci: ContentItem }[] = [];
  funnelsList.forEach((f) => {
    f.contentItems.forEach((ci) => {
      const platformId = FUNNEL_PLATFORM_ID[`${ci.platform}|${ci.format}`] || "";
      contentItems.push({ cId: ci.id, label: ci.title, platform: ci.platform, funnelId: f.id, platformId, ci });
    });
  });

  // content nodes
  const NH = 40, NG = 8;
  let y = 70;
  contentItems.forEach(({ cId, label, platformId, ci, funnelId }) => {
    nodes.push({
      id: cId,
      type: "content",
      label,
      x: COL_X.content,
      y,
      w: 240,
      h: NH,
      color: "#C4B5FD",
      platformId,
      contentItem: ci,
      funnelId,
    });
    y += NH + NG;
  });
  const totalContentH = contentItems.length * (NH + NG);

  // keyword nodes
  const kwStartY = 70 + Math.max(0, (totalContentH - funnelsList.length * 60) / 2);
  let ky = kwStartY;
  funnelsList.forEach((f) => {
    const kwId = `kw-${f.id}`;
    nodes.push({
      id: kwId,
      type: "keyword",
      label: f.keyword,
      x: COL_X.keyword,
      y: ky,
      w: 160,
      h: 48,
      color: BADGE_HEX[f.badgeColor],
    });
    ky += 60;

    // edges: content → keyword
    f.contentItems.forEach((ci) => {
      edges.push({ from: ci.id, to: kwId, color: "#C4B5FD" });
    });
  });

  // lead-magnet nodes
  const lmList = funnelsList.filter((f) => f.leadMagnet);
  const lmStartY = 70 + Math.max(0, (totalContentH - lmList.length * 56) / 2);
  let ly = lmStartY;
  lmList.forEach((f) => {
    const lm = f.leadMagnet!;
    const lmId = `lm-${lm.id}`;
    if (!nodes.find((n) => n.id === lmId)) {
      nodes.push({
        id: lmId,
        type: "leadmagnet",
        label: lm.name,
        x: COL_X.leadmagnet,
        y: ly,
        w: 220,
        h: 46,
        color: "#8b5cf6",
        funnelProduct: lm,
      });
      ly += 56;
    }
    // edge: keyword → lead-magnet
    edges.push({ from: `kw-${f.id}`, to: lmId, color: "#C4B5FD" });
  });

  // product nodes (midTicket + flagship, deduplicated)
  const productEntries: { product: typeof funnelsList[0]["midTicket"]; fromLmId: string }[] = [];
  funnelsList.forEach((f) => {
    if (f.midTicket && f.leadMagnet) {
      productEntries.push({ product: f.midTicket, fromLmId: `lm-${f.leadMagnet.id}` });
    }
    if (f.flagship && f.leadMagnet) {
      productEntries.push({ product: f.flagship, fromLmId: `lm-${f.leadMagnet.id}` });
    }
  });

  const uniqueProducts = productEntries.filter((pe) => {
    if (!pe.product || seenProducts.has(pe.product.id)) return false;
    seenProducts.add(pe.product.id);
    return true;
  });

  const pStartY = 70 + Math.max(0, (totalContentH - uniqueProducts.length * 64) / 2);
  let py = pStartY;
  uniqueProducts.forEach(({ product }) => {
    if (!product) return;
    const pId = `pr-${product.id}`;
    nodes.push({
      id: pId,
      type: "product",
      label: product.name,
      x: COL_X.product,
      y: py,
      w: 230,
      h: 52,
      color: TIER_COLOR[product.tier] || "#6366f1",
      tier: product.tier,
      tierLabel: TIER_LABEL[product.tier] || product.type,
      funnelProduct: product,
    });
    py += 64;
  });

  // edges: lead-magnet → product
  productEntries.forEach(({ product, fromLmId }) => {
    if (!product) return;
    const pId = `pr-${product.id}`;
    if (!edges.find((e) => e.from === fromLmId && e.to === pId)) {
      edges.push({ from: fromLmId, to: pId, color: "#C4B5FD" });
    }
  });

  return { nodes, edges };
}

/* ── graph traversal for highlight ──────────────────── */

function getConnected(nodeId: string, edges: MapEdge[]) {
  const connNodes = new Set([nodeId]);
  const connEdges = new Set<string>();

  // forward
  let frontier = [nodeId];
  while (frontier.length) {
    const next: string[] = [];
    edges.forEach((e) => {
      if (frontier.includes(e.from) && !connNodes.has(e.to)) {
        connNodes.add(e.to);
        next.push(e.to);
        connEdges.add(`${e.from}->${e.to}`);
      }
    });
    frontier = next;
  }

  // backward
  frontier = [nodeId];
  while (frontier.length) {
    const next: string[] = [];
    edges.forEach((e) => {
      if (frontier.includes(e.to) && !connNodes.has(e.from)) {
        connNodes.add(e.from);
        next.push(e.from);
        connEdges.add(`${e.from}->${e.to}`);
      }
    });
    frontier = next;
  }

  // all edges between connected nodes
  edges.forEach((e) => {
    if (connNodes.has(e.from) && connNodes.has(e.to)) {
      connEdges.add(`${e.from}->${e.to}`);
    }
  });

  return { nodes: connNodes, edges: connEdges };
}

/* ── SVG node renderers ─────────────────────────────── */

function ContentNode({ node }: { node: MapNode }) {
  const label = node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label;
  return (
    <g>
      <rect x={0} y={0} width={node.w} height={node.h} rx={8} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} />
      {node.platformId && (
        <foreignObject x={8} y={(node.h - 18) / 2} width={18} height={18}>
          <PlatformIcon platformId={node.platformId} size={18} />
        </foreignObject>
      )}
      <text x={32} y={node.h / 2 + 1} fontSize={11} fontWeight={500} fill="hsl(var(--foreground))" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

function KeywordNode({ node }: { node: MapNode }) {
  return (
    <g>
      <rect x={0} y={0} width={node.w} height={node.h} rx={12} fill={node.color} />
      <text x={node.w / 2} y={node.h / 2 + 1} fontSize={14} fontWeight={800} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.05em">
        {node.label}
      </text>
    </g>
  );
}

function LeadMagnetNode({ node }: { node: MapNode }) {
  const label = node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label;
  return (
    <g>
      <rect x={0} y={0} width={node.w} height={node.h} rx={8} fill="#faf5ff" stroke="#d8b4fe" strokeWidth={1.5} strokeDasharray="4 2" />
      <foreignObject x={8} y={2} width={18} height={18}>
        <ProductTypeIcon typeId="lead_magnet" size={18} />
      </foreignObject>
      <text x={28} y={12} fontSize={9} fontWeight={700} fill="#8b5cf6" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.05em">
        ЛИД-МАГНИТ
      </text>
      <text x={12} y={node.h / 2 + 8} fontSize={11} fontWeight={500} fill="hsl(var(--muted-foreground))" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

const TIER_TYPE_ID: Record<string, string> = {
  "lead-magnet": "lead_magnet",
  "mid-ticket": "mid_ticket",
  flagship: "flagship",
};

function ProductNode({ node }: { node: MapNode }) {
  const label = node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label;
  const typeId = node.tier ? TIER_TYPE_ID[node.tier] : null;
  return (
    <g>
      <rect x={0} y={0} width={node.w} height={node.h} rx={10} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} />
      {typeId && (
        <foreignObject x={8} y={2} width={18} height={18}>
          <ProductTypeIcon typeId={typeId} size={18} />
        </foreignObject>
      )}
      <text x={28} y={16} fontSize={9} fontWeight={700} fill={node.color} fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.04em">
        {node.tierLabel}
      </text>
      <text x={14} y={38} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))" fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

/* ── bezier edge ────────────────────────────────────── */

function EdgePath({ from, to, color, nodes }: { from: string; to: string; color: string; nodes: MapNode[] }) {
  const a = nodes.find((n) => n.id === from);
  const b = nodes.find((n) => n.id === to);
  if (!a || !b) return null;
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const cx = (x1 + x2) / 2;
  return <path d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`} fill="none" stroke={color} strokeWidth={2} />;
}

/* ── touch helpers ──────────────────────────────────── */

interface TouchState {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  dist: number;
  zoom: number;
  nodeId: string | null;
  orig: MapNode[];
  moved: boolean;
}

function getDist(e: TouchEvent | React.TouchEvent) {
  if (e.touches.length < 2) return 0;
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ── main component ─────────────────────────────────── */

const FunnelMapPage = () => {
  const { funnels } = useDataStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 20, y: 10 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{ type: "pan" | "node"; startX: number; startY: number; nodeId?: string; orig?: MapNode[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);

  const { nodes: initialNodes, edges } = useMemo(() => buildGraph(funnels), [funnels]);
  const [nodes, setNodes] = useState<MapNode[]>(initialNodes);
  const [drawerProduct, setDrawerProduct] = useState<FunnelProduct | null>(null);
  const [drawerContent, setDrawerContent] = useState<ContentItem | null>(null);
  const [drawerFunnel, setDrawerFunnel] = useState<typeof funnels[0] | null>(null);
  const dragMovedRef = useRef(false);

  const touchRef = useRef<TouchState>({ startX: 0, startY: 0, panX: 0, panY: 0, dist: 0, zoom: 1, nodeId: null, orig: [], moved: false });
  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const highlighted = selected ? getConnected(selected, edges) : null;

  /* wheel zoom */
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.2, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  }, []);

  const handleNodeClick = useCallback((node: MapNode) => {
    if (node.type === "keyword") return;
    if (node.type === "content" && node.contentItem) {
      const f = funnels.find((fun) => fun.id === node.funnelId);
      setDrawerFunnel(f || null);
      setDrawerContent(node.contentItem);
    } else if ((node.type === "leadmagnet" || node.type === "product") && node.funnelProduct) {
      setDrawerProduct(node.funnelProduct);
    }
  }, [funnels]);

  /* mouse desktop */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId?: string) => {
      dragMovedRef.current = false;
      if (nodeId) {
        e.stopPropagation();
        setDragging({ type: "node", startX: e.clientX, startY: e.clientY, nodeId, orig: nodes });
      } else {
        setDragging({ type: "pan", startX: e.clientX - pan.x, startY: e.clientY - pan.y });
      }
    },
    [nodes, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      dragMovedRef.current = true;
      if (dragging.type === "pan") {
        setPan({ x: e.clientX - dragging.startX, y: e.clientY - dragging.startY });
      } else if (dragging.orig && dragging.nodeId) {
        const dx = (e.clientX - dragging.startX) / zoom;
        const dy = (e.clientY - dragging.startY) / zoom;
        setNodes(dragging.orig.map((n) => (n.id === dragging.nodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
      }
    },
    [dragging, zoom],
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  /* touch mobile */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, nodeId?: string) => {
      const t = touchRef.current;
      t.moved = false;
      if (nodeId) {
        e.stopPropagation();
        t.nodeId = nodeId;
        t.startX = e.touches[0].clientX;
        t.startY = e.touches[0].clientY;
        t.orig = nodes;
      } else if (e.touches.length === 2) {
        t.nodeId = null;
        t.dist = getDist(e);
        t.zoom = zoom;
      } else {
        t.nodeId = null;
        t.startX = e.touches[0].clientX;
        t.startY = e.touches[0].clientY;
        t.panX = pan.x;
        t.panY = pan.y;
      }
    },
    [nodes, zoom, pan],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const t = touchRef.current;
      t.moved = true;
      if (t.nodeId) {
        const dx = (e.touches[0].clientX - t.startX) / zoom;
        const dy = (e.touches[0].clientY - t.startY) / zoom;
        setNodes(t.orig.map((n) => (n.id === t.nodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
      } else if (e.touches.length === 2 && t.dist > 0) {
        setZoom(Math.min(2.5, Math.max(0.2, t.zoom * (getDist(e) / t.dist))));
      } else if (e.touches.length === 1) {
        setPan({ x: t.panX + e.touches[0].clientX - t.startX, y: t.panY + e.touches[0].clientY - t.startY });
      }
    },
    [zoom],
  );

  const handleTouchEnd = useCallback(() => {
    touchRef.current.nodeId = null;
  }, []);

  const handleTap = useCallback((nodeId: string) => {
    if (!touchRef.current.moved) setSelected((s) => (s === nodeId ? null : nodeId));
  }, []);

  /* attach non-passive listeners */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleWheel, handleTouchMove]);

  /* render a single node */
  const renderNode = (node: MapNode) => {
    const dimmed = highlighted && !highlighted.nodes.has(node.id);
    const isClickable = node.type !== "keyword";
    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        style={{ cursor: isClickable ? "pointer" : "grab", opacity: dimmed ? 0.12 : 1, transition: "opacity .2s" }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onMouseUp={() => {
          if (!dragMovedRef.current && isClickable) handleNodeClick(node);
        }}
        onMouseEnter={() => !isMobile && setSelected(node.id)}
        onMouseLeave={() => !isMobile && setSelected(null)}
        onTouchStart={(e) => {
          handleTouchStart(e, node.id);
          handleTap(node.id);
        }}
        onTouchEnd={() => {
          if (!touchRef.current.moved && isClickable) handleNodeClick(node);
        }}
      >
        {isMobile && <rect x={-6} y={-6} width={node.w + 12} height={node.h + 12} fill="transparent" />}
        {node.type === "content" && <ContentNode node={node} />}
        {node.type === "keyword" && <KeywordNode node={node} />}
        {node.type === "leadmagnet" && <LeadMagnetNode node={node} />}
        {node.type === "product" && <ProductNode node={node} />}
      </g>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0" style={{ touchAction: "none" }}>
          {/* ─── Header ─── */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="max-w-full mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-[44px]">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <span className="text-[12px] font-extrabold text-foreground tracking-[0.08em]">
                    КАРТА ВОРОНОК
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="bg-muted px-2 py-0.5 rounded-md text-[11px] font-semibold text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))}
                    className="w-7 h-7 rounded-md bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))}
                    className="w-7 h-7 rounded-md bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 transition-colors"
                  >
                    −
                  </button>
                  <button
                    onClick={() => {
                      setPan({ x: 20, y: 10 });
                      setZoom(1);
                    }}
                    className="px-2 py-1 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Сброс
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ─── Hint toast ─── */}
          {showHint && (
            <div
              className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-3.5 py-2 rounded-lg text-[11px] font-medium z-[200] whitespace-nowrap animate-fade-in shadow-lg cursor-pointer"
              onClick={() => setShowHint(false)}
            >
              {isMobile
                ? "👆 двигай · щипком зумь · тап = цепочка"
                : "scroll = zoom · drag = двигать · hover = цепочка"}
            </div>
          )}

          {/* ─── SVG Canvas ─── */}
          <svg
            ref={svgRef}
            className="flex-1 w-full"
            style={{ cursor: dragging?.type === "pan" ? "grabbing" : "grab", minHeight: "calc(100vh - 44px)" }}
            onMouseDown={(e) => handleMouseDown(e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => handleTouchStart(e)}
            onTouchEnd={handleTouchEnd}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Column headers */}
              {COL_HEADERS.map((h, i) => {
                const Icon = COL_SVG_ICON[i];
                return (
                  <g key={h.label}>
                    {Icon && <Icon x={h.x + 8} y={22} />}
                    <text
                      x={h.x + 26}
                      y={36}
                      fontSize={10}
                      fontWeight={800}
                      fill="hsl(var(--muted-foreground))"
                      letterSpacing="0.08em"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {h.label}
                    </text>
                    <line x1={h.x} y1={52} x2={h.x + h.w} y2={52} stroke="hsl(var(--border))" strokeWidth={1} />
                  </g>
                );
              })}

              {/* Edges */}
              {edges.map((e, i) => {
                const dimmed = highlighted && !highlighted.edges.has(`${e.from}->${e.to}`);
                return (
                  <g key={i} style={{ opacity: dimmed ? 0.05 : 1, transition: "opacity .2s" }}>
                    <EdgePath
                      from={e.from}
                      to={e.to}
                      color={e.color}
                      nodes={nodes}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(renderNode)}
            </g>
          </svg>
        </div>

        <MobileNav />
      </div>

      <ProductDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onOpenChange={(open) => !open && setDrawerProduct(null)}
      />
      <ContentDrawer
        content={drawerContent}
        funnel={drawerFunnel}
        open={!!drawerContent}
        onOpenChange={(open) => { if (!open) { setDrawerContent(null); setDrawerFunnel(null); } }}
      />
    </SidebarProvider>
  );
};

export default FunnelMapPage;
