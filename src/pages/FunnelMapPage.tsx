import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav, MobileHeader } from "@/components/MobileNav";
import type { BadgeColor, Funnel } from "@/lib/funnelData";
import { resolveFunnelContent } from "@/lib/funnelData";
import { useDataStore } from "@/lib/dataStore";
import { PlatformIcon } from "@/components/content/PlatformIcon";
import { ProductTypeIcon } from "@/components/products/ProductTypeIcon";
import { EditProductModal } from "@/components/products/EditProductModal";
import { ContentDetailModal } from "@/components/content/ContentDetailModal";
import type { ContentItemData, Topic } from "@/lib/contentData";
import { STATUSES } from "@/lib/contentData";
import type { Product } from "@/lib/productData";

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

function SvgIconCta({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={ICON_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h10a2 2 0 012 2v4a2 2 0 01-2 2H8l-3 3V5z" />
    </g>
  );
}

/* ── colour helpers ─────────────────────────────────── */

const BADGE_HEX: Record<BadgeColor, string> = {
  violet: "#8B5CF6",
  honey: "#E8B66D",
  lilac: "#A78BFA",
  amber: "#D4A056",
};

const TIER_ORDER = ["lead_magnet", "tripwire", "mid_ticket", "flagship", "consultation"] as const;

const TIER_LABEL: Record<string, string> = {
  lead_magnet: "ЛИД-МАГНИТ",
  tripwire: "ТРИПВАЙЕР",
  mid_ticket: "СРЕДНИЙ ЧЕК",
  flagship: "ФЛАГМАН",
  consultation: "КОНСУЛЬТАЦИЯ",
};

const TIER_COLOR: Record<string, string> = {
  lead_magnet: "#8b5cf6",
  tripwire: "#f59e0b",
  mid_ticket: "#6366f1",
  flagship: "#ef4444",
  consultation: "#22c55e",
};

const TIER_FIELD: Record<string, keyof Funnel> = {
  lead_magnet: "leadMagnetId",
  tripwire: "tripwireId",
  mid_ticket: "midTicketId",
  flagship: "flagshipId",
  consultation: "consultationId",
};

/* ── node / edge types ──────────────────────────────── */

interface MapNode {
  id: string;
  type: "content" | "keyword" | "product" | "topic";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  tier?: string;
  tierLabel?: string;
  platformId?: string;
  contentItemData?: ContentItemData;
  productData?: Product;
  funnelId?: string;
  topicItems?: ContentItemData[]; // grouped content items for topic node
  itemCount?: number;
}

interface MapEdge {
  from: string;
  to: string;
  color: string;
}

interface ColHeader {
  x: number;
  label: string;
  w: number;
  icon: ((props: { x: number; y: number }) => JSX.Element) | null;
  tierTypeId?: string; // if set, use ProductTypeIcon instead of icon
}

/* ── build graph — full chain per funnel ───────────── */

function buildGraph(
  funnelsList: Funnel[],
  allContentItems: ContentItemData[],
  allProducts: Product[],
  allTopics: Topic[],
) {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  // Determine which tier columns are actually used across funnels
  const usedTiers = new Set<string>();
  funnelsList.forEach((f) => {
    TIER_ORDER.forEach((tier) => {
      const field = TIER_FIELD[tier];
      if (f[field] != null) usedTiers.add(tier);
    });
  });

  // Build dynamic column positions
  const COL_W = 200;
  const COL_GAP = 36;
  const CONTENT_W = 200;
  const contentX = 60;
  const keywordX = contentX + CONTENT_W + COL_GAP;
  const tierColumns: { tier: string; x: number }[] = [];
  // Calculate max keyword width for column sizing
  const maxKwLen = Math.max(...funnelsList.map((f) => f.keyword.length), 4);
  const kwColW = Math.max(80, maxKwLen * 10 + 28);
  let nextX = keywordX + kwColW + COL_GAP;
  TIER_ORDER.forEach((tier) => {
    if (usedTiers.has(tier)) {
      tierColumns.push({ tier, x: nextX });
      nextX += COL_W + COL_GAP;
    }
  });

  // Build column headers
  const headers: ColHeader[] = [
    { x: contentX, label: "КОНТЕНТ", w: CONTENT_W, icon: SvgIconFileText },
    { x: keywordX, label: "CTA", w: kwColW, icon: SvgIconCta },
  ];
  tierColumns.forEach(({ tier, x }) => {
    headers.push({
      x,
      label: TIER_LABEL[tier] || tier,
      w: COL_W,
      icon: null,
      tierTypeId: tier,
    });
  });

  // Group content items by topic per funnel
  // topicKey = "funnelId-topicId" to handle same topic across funnels
  const topicGroups: { topicId: number; topicTitle: string; items: ContentItemData[]; funnelId: string }[] = [];

  funnelsList.forEach((f) => {
    const items = resolveFunnelContent(f, allContentItems);
    // Group by parent topic
    const byTopic = new Map<number, { title: string; items: ContentItemData[] }>();
    items.forEach((ci) => {
      const topic = allTopics.find((t) => t.contentItems.some((c) => c.id === ci.id));
      const topicId = topic?.id ?? -ci.id; // fallback: treat as own group
      const topicTitle = topic?.title ?? ci.title;
      if (!byTopic.has(topicId)) {
        byTopic.set(topicId, { title: topicTitle, items: [] });
      }
      byTopic.get(topicId)!.items.push(ci);
    });
    byTopic.forEach(({ title, items: groupItems }, topicId) => {
      topicGroups.push({ topicId, topicTitle: title, items: groupItems, funnelId: f.id });
    });
  });

  // Content / topic nodes
  const NH_TOPIC = 48, NG = 8;
  const CONTENT_START_Y = 100;
  let y = CONTENT_START_Y;
  topicGroups.forEach(({ topicId, topicTitle, items, funnelId }) => {
    if (items.length === 1) {
      // Single item — show as regular content node
      const ci = items[0];
      nodes.push({
        id: `ci-${ci.id}`,
        type: "content",
        label: ci.title,
        x: contentX,
        y,
        w: CONTENT_W,
        h: 40,
        color: "#C4B5FD",
        platformId: ci.platformId,
        contentItemData: ci,
        funnelId,
      });
      y += 40 + NG;
    } else {
      // Multiple items — group into topic node
      const nodeId = `topic-${funnelId}-${topicId}`;
      nodes.push({
        id: nodeId,
        type: "topic",
        label: topicTitle,
        x: contentX,
        y,
        w: CONTENT_W,
        h: NH_TOPIC,
        color: "#C4B5FD",
        funnelId,
        topicItems: items,
        itemCount: items.length,
      });
      y += NH_TOPIC + NG;
    }
  });
  const totalContentH = y - CONTENT_START_Y;

  // Keyword nodes
  const kwStartY = CONTENT_START_Y + Math.max(0, (totalContentH - funnelsList.length * 60) / 2);
  let ky = kwStartY;
  funnelsList.forEach((f) => {
    const kwId = `kw-${f.id}`;
    const kwW = Math.max(80, f.keyword.length * 10 + 28);
    nodes.push({
      id: kwId,
      type: "keyword",
      label: f.keyword,
      x: keywordX,
      y: ky,
      w: kwW,
      h: 36,
      color: BADGE_HEX[f.badgeColor],
    });
    ky += 48;

    // Edges: content/topic → keyword
    const funnelNodes = nodes.filter((n) => n.funnelId === f.id && (n.type === "content" || n.type === "topic"));
    funnelNodes.forEach((n) => {
      edges.push({ from: n.id, to: kwId, color: "#C4B5FD" });
    });
  });

  // Build keyword Y lookup for funnel-aware placement
  const kwYMap: Record<string, number> = {};
  const kwNode = nodes.filter((n) => n.type === "keyword");
  kwNode.forEach((n) => { kwYMap[n.id] = n.y; });

  // First pass: collect product info per tier to compute Y positions
  // Position each product near its source keyword's Y, with staggering
  const seenProducts = new Set<string>();
  const productYSources: Record<string, number[]> = {}; // nodeId → array of source keyword Y positions

  funnelsList.forEach((f) => {
    tierColumns.forEach(({ tier }) => {
      const field = TIER_FIELD[tier];
      const productId = f[field] as number | undefined;
      if (productId == null) return;
      const nodeId = `${tier}-${productId}`;
      if (!productYSources[nodeId]) productYSources[nodeId] = [];
      const kwY = kwYMap[`kw-${f.id}`] ?? kwStartY;
      productYSources[nodeId].push(kwY);
    });
  });

  // Stagger offset: spread products in the same tier so they don't stack
  const STAGGER = 30; // vertical offset between products in same tier
  const tierIndex: Record<string, number> = {};
  tierColumns.forEach(({ tier }) => { tierIndex[tier] = 0; });

  // Create product nodes positioned near their keyword sources
  funnelsList.forEach((f) => {
    const funnelChain: string[] = [`kw-${f.id}`];

    tierColumns.forEach(({ tier, x }) => {
      const field = TIER_FIELD[tier];
      const productId = f[field] as number | undefined;
      if (productId == null) return;

      const product = allProducts.find((p) => p.id === productId);
      if (!product) return;

      const nodeId = `${tier}-${productId}`;

      if (!seenProducts.has(nodeId)) {
        seenProducts.add(nodeId);

        // Position: average of source keyword Ys + stagger offset per tier
        const sourceYs = productYSources[nodeId] || [];
        const avgY = sourceYs.length > 0
          ? sourceYs.reduce((a, b) => a + b, 0) / sourceYs.length
          : kwStartY;
        const idx = tierIndex[tier]++;
        const productY = avgY + idx * STAGGER;

        nodes.push({
          id: nodeId,
          type: "product",
          label: product.name,
          x,
          y: productY,
          w: COL_W,
          h: 52,
          color: TIER_COLOR[tier] || "#6366f1",
          tier,
          tierLabel: TIER_LABEL[tier] || tier,
          productData: product,
        });
      }

      // Add edge from previous element in chain to this product
      const prevId = funnelChain[funnelChain.length - 1];
      if (!edges.find((e) => e.from === prevId && e.to === nodeId)) {
        edges.push({ from: prevId, to: nodeId, color: TIER_COLOR[tier] || "#C4B5FD" });
      }

      funnelChain.push(nodeId);
    });
  });

  return { nodes, edges, headers };
}

/* ── graph traversal for highlight ──────────────────── */

function getConnected(nodeId: string, edges: MapEdge[]) {
  const connNodes = new Set([nodeId]);
  const connEdges = new Set<string>();

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

  edges.forEach((e) => {
    if (connNodes.has(e.from) && connNodes.has(e.to)) {
      connEdges.add(`${e.from}->${e.to}`);
    }
  });

  return { nodes: connNodes, edges: connEdges };
}

/* ── SVG node renderers ─────────────────────────────── */

function ContentNode({ node }: { node: MapNode }) {
  const maxChars = Math.floor((node.w - 40) / 6.5);
  const label = node.label.length > maxChars ? node.label.slice(0, maxChars) + "…" : node.label;
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
      <rect x={0} y={0} width={node.w} height={node.h} rx={node.h / 2} fill={node.color} />
      <text x={node.w / 2} y={node.h / 2 + 1} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.05em">
        {node.label}
      </text>
    </g>
  );
}

function TopicNode({ node }: { node: MapNode }) {
  const maxChars = Math.floor((node.w - 36) / 6.5);
  const label = node.label.length > maxChars ? node.label.slice(0, maxChars) + "…" : node.label;
  const count = node.itemCount || 0;
  return (
    <g>
      <rect x={0} y={0} width={node.w} height={node.h} rx={10} fill="hsl(var(--card))" stroke="#C4B5FD" strokeWidth={1.5} />
      {/* Folder icon */}
      <foreignObject x={8} y={6} width={16} height={16}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </foreignObject>
      <text x={28} y={16} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif">
        {label}
      </text>
      {/* Count badge + platform icons */}
      <rect x={8} y={node.h - 20} width={36} height={16} rx={8} fill="#C4B5FD" fillOpacity={0.15} />
      <text x={26} y={node.h - 12} fontSize={10} fontWeight={700} fill="#8b5cf6" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, system-ui, sans-serif">
        {count} ед.
      </text>
      {/* Platform icons preview */}
      {node.topicItems && (() => {
        const platforms = [...new Set(node.topicItems.map((ci) => ci.platformId))];
        return platforms.slice(0, 4).map((pid, i) => (
          <foreignObject key={pid} x={50 + i * 20} y={node.h - 21} width={18} height={18}>
            <PlatformIcon platformId={pid} size={16} />
          </foreignObject>
        ));
      })()}
    </g>
  );
}

function ProductNode({ node }: { node: MapNode }) {
  const label = node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label;
  const typeId = node.tier || null;
  const isLeadMagnet = typeId === "lead_magnet";
  return (
    <g>
      {isLeadMagnet ? (
        <rect x={0} y={0} width={node.w} height={node.h} rx={8} fill="#faf5ff" stroke="#d8b4fe" strokeWidth={1.5} strokeDasharray="4 2" />
      ) : (
        <rect x={0} y={0} width={node.w} height={node.h} rx={10} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} />
      )}
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

/* ── bezier edge with arrowhead ────────────────────── */

function EdgePath({ from, to, color, nodes }: { from: string; to: string; color: string; nodes: MapNode[] }) {
  const a = nodes.find((n) => n.id === from);
  const b = nodes.find((n) => n.id === to);
  if (!a || !b) return null;
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const cx = (x1 + x2) / 2;

  // Arrow tip
  const arrowSize = 5;
  const ax = x2 - 1;
  const ay1t = y2 - arrowSize;
  const ay2t = y2 + arrowSize;

  return (
    <g>
      <path d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`} fill="none" stroke={color} strokeWidth={2} />
      <polygon points={`${ax - arrowSize},${ay1t} ${ax},${y2} ${ax - arrowSize},${ay2t}`} fill={color} />
    </g>
  );
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

/* ── content picker modal for map page ──────────────── */

function ContentPickerModalMap({
  availableContent,
  allTopics,
  onSelect,
  onClose,
}: {
  availableContent: ContentItemData[];
  allTopics: Topic[];
  onSelect: (ciId: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return availableContent;
    const q = search.toLowerCase();
    return availableContent.filter((ci) => {
      const topic = allTopics.find((t) => t.contentItems.some((c) => c.id === ci.id));
      return ci.title.toLowerCase().includes(q) || (topic?.title || "").toLowerCase().includes(q);
    });
  }, [availableContent, search, allTopics]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card rounded-3xl w-full max-w-[440px] max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-3 duration-300"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-foreground">Добавить контент</h3>
          <button
            onClick={onClose}
            className="bg-muted border-none rounded-lg w-[28px] h-[28px] cursor-pointer text-[13px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или теме…"
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="px-6 py-3 overflow-y-auto max-h-[50vh] space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-6">Нет доступного контента</p>
          ) : (
            filtered.map((ci) => {
              const status = STATUSES[ci.status];
              return (
                <div
                  key={ci.id}
                  onClick={() => onSelect(ci.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)] border border-transparent hover:border-primary/20"
                >
                  <span className="relative shrink-0 w-2 h-2">
                    {status.color !== "#94a3b8" && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
                    )}
                    <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
                    <PlatformIcon platformId={ci.platformId} size={16} />
                  </span>
                  <div className="flex-1 min-w-0 text-[12px] text-muted-foreground truncate">
                    {ci.title || "Не заполнено"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────── */

const STORAGE_KEY_POSITIONS = "funnel-map-positions";
const STORAGE_KEY_VIEW = "funnel-map-view";

function loadSavedPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSITIONS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePositions(nodes: MapNode[]) {
  const map: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => { map[n.id] = { x: n.x, y: n.y }; });
  localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(map));
}

function loadSavedView(): { pan: { x: number; y: number }; zoom: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIEW);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function applyCustomPositions(nodes: MapNode[], saved: Record<string, { x: number; y: number }>): MapNode[] {
  if (Object.keys(saved).length === 0) return nodes;
  return nodes.map((n) => saved[n.id] ? { ...n, x: saved[n.id].x, y: saved[n.id].y } : n);
}

const FunnelMapPage = () => {
  const { funnels, allContentItems, products, topics, updateContentItem, updateProduct, updateTopic, formats, addFormat, deleteFormat, setFunnels } = useDataStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const savedView = useRef(loadSavedView());
  const [pan, setPan] = useState(savedView.current?.pan ?? { x: 20, y: 10 });
  const [zoom, setZoom] = useState(savedView.current?.zoom ?? 1);
  const [dragging, setDragging] = useState<{ type: "pan" | "node"; startX: number; startY: number; nodeId?: string; orig?: MapNode[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);

  const { nodes: initialNodes, edges, headers } = useMemo(
    () => buildGraph(funnels, allContentItems, products, topics),
    [funnels, allContentItems, products, topics],
  );
  const [nodes, setNodes] = useState<MapNode[]>(initialNodes);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItemData | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<{ title: string; items: ContentItemData[]; funnelId?: string } | null>(null);
  const [showContentPicker, setShowContentPicker] = useState<string | null>(null); // funnelId
  const dragMovedRef = useRef(false);

  const touchRef = useRef<TouchState>({ startX: 0, startY: 0, panX: 0, panY: 0, dist: 0, zoom: 1, nodeId: null, orig: [], moved: false });
  const lastTapRef = useRef<{ nodeId: string; time: number }>({ nodeId: "", time: 0 });
  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

  // Sync nodes when graph changes, preserving user-positioned nodes
  useEffect(() => {
    const saved = loadSavedPositions();
    setNodes(applyCustomPositions(initialNodes, saved));
  }, [initialNodes]);

  // Persist pan/zoom
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_VIEW, JSON.stringify({ pan, zoom }));
    }, 300);
    return () => clearTimeout(t);
  }, [pan, zoom]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const highlighted = selected ? getConnected(selected, edges) : null;

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.2, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  }, []);

  const getTopicTitle = useCallback((ci: ContentItemData) => {
    const topic = topics.find((t) => t.contentItems.some((c) => c.id === ci.id));
    return topic?.title || "";
  }, [topics]);

  const handleNodeClick = useCallback((node: MapNode) => {
    if (node.type === "keyword") return;
    if (node.type === "content" && node.contentItemData) {
      setEditingContent(node.contentItemData);
    } else if (node.type === "topic" && node.topicItems) {
      setExpandedTopic({ title: node.label, items: node.topicItems, funnelId: node.funnelId });
    } else if (node.type === "product" && node.productData) {
      setEditingProduct(node.productData);
    }
  }, []);

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

  const handleMouseUp = useCallback(() => {
    if (dragging?.type === "node" && dragMovedRef.current) {
      setNodes((cur) => { savePositions(cur); return cur; });
    }
    setDragging(null);
  }, [dragging]);

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
    if (touchRef.current.nodeId && touchRef.current.moved) {
      setNodes((cur) => { savePositions(cur); return cur; });
    }
    touchRef.current.nodeId = null;
  }, []);

  const handleTap = useCallback((nodeId: string) => {
    if (!touchRef.current.moved) setSelected((s) => (s === nodeId ? null : nodeId));
  }, []);

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

  const renderNode = (node: MapNode) => {
    const dimmed = highlighted && !highlighted.nodes.has(node.id);
    const isClickable = node.type !== "keyword";
    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        style={{ cursor: isClickable ? "pointer" : "grab", opacity: dimmed ? 0.12 : 1, transition: "opacity .2s" }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onDoubleClick={() => { if (isClickable) handleNodeClick(node); }}
        onMouseEnter={() => !isMobile && setSelected(node.id)}
        onMouseLeave={() => !isMobile && setSelected(null)}
        onTouchStart={(e) => {
          handleTouchStart(e, node.id);
          handleTap(node.id);
        }}
        onTouchEnd={() => {
          if (!touchRef.current.moved && isClickable) {
            const now = Date.now();
            const last = lastTapRef.current;
            if (last.nodeId === node.id && now - last.time < 350) {
              handleNodeClick(node);
              lastTapRef.current = { nodeId: "", time: 0 };
            } else {
              lastTapRef.current = { nodeId: node.id, time: now };
            }
          }
        }}
      >
        {isMobile && <rect x={-6} y={-6} width={node.w + 12} height={node.h + 12} fill="transparent" />}
        {node.type === "content" && <ContentNode node={node} />}
        {node.type === "topic" && <TopicNode node={node} />}
        {node.type === "keyword" && <KeywordNode node={node} />}
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

        <div className="flex-1 flex flex-col min-w-0 pt-10 md:pt-0" style={{ touchAction: "none" }}>
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 md:px-6">
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
                      localStorage.removeItem(STORAGE_KEY_POSITIONS);
                      localStorage.removeItem(STORAGE_KEY_VIEW);
                      setNodes(initialNodes);
                    }}
                    className="px-2 py-1 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Сброс
                  </button>
                </div>
              </div>
            </div>
          </header>

          {showHint && (
            <div
              className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-3.5 py-2 rounded-lg text-[11px] font-medium z-[200] whitespace-nowrap animate-fade-in shadow-lg cursor-pointer"
              onClick={() => setShowHint(false)}
            >
              {isMobile
                ? "двигай · щипком зумь · 2× тап = открыть"
                : "scroll = zoom · drag = двигать · 2× клик = открыть"}
            </div>
          )}

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
              {headers.map((h) => (
                <g key={h.label}>
                  {h.tierTypeId ? (
                    <foreignObject x={h.x + 4} y={20} width={18} height={18}>
                      <ProductTypeIcon typeId={h.tierTypeId} size={18} />
                    </foreignObject>
                  ) : (
                    h.icon && <h.icon x={h.x + 8} y={22} />
                  )}
                  <text
                    x={h.x + (h.tierTypeId || h.icon ? 26 : 8)}
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
              ))}

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

              {nodes.map(renderNode)}
            </g>
          </svg>
        </div>

        <MobileHeader />
        <MobileNav />
      </div>

      {/* Topic expansion modal */}
      {expandedTopic && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setExpandedTopic(null); }}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-[440px] max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom-3 duration-300"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,.15)" }}
          >
            <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-foreground">{expandedTopic.title}</h3>
                <span className="text-[11px] text-muted-foreground">{expandedTopic.items.length} единиц контента</span>
              </div>
              <button
                onClick={() => setExpandedTopic(null)}
                className="bg-muted border-none rounded-lg w-[28px] h-[28px] cursor-pointer text-[13px] text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[55vh] space-y-1">
              {expandedTopic.items.map((item) => {
                const status = STATUSES[item.status];
                return (
                  <div
                    key={item.id}
                    onClick={() => { setExpandedTopic(null); setEditingContent(item); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--primary)/0.04)] border border-transparent hover:border-primary/20"
                  >
                    <span className="relative shrink-0 w-2 h-2">
                      {status.color !== "#94a3b8" && (
                        <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: status.color }} />
                      )}
                      <span className="absolute inset-0 rounded-full" style={{ background: status.color }} />
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06] shrink-0">
                      <PlatformIcon platformId={item.platformId} size={16} />
                    </span>
                    <div className="flex-1 min-w-0 text-[12px] text-muted-foreground truncate">
                      {item.title || "Не заполнено"}
                    </div>
                  </div>
                );
              })}
            </div>
            {expandedTopic.funnelId && (
              <div className="px-6 py-3 border-t border-border">
                <button
                  onClick={() => {
                    const fid = expandedTopic.funnelId!;
                    setExpandedTopic(null);
                    setShowContentPicker(fid);
                  }}
                  className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer bg-transparent border-none"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Добавить
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content picker modal */}
      {showContentPicker && (() => {
        const funnelId = showContentPicker;
        const funnel = funnels.find((f) => f.id === funnelId);
        if (!funnel) return null;
        const usedIds = new Set(funnel.contentItemIds);
        const available = allContentItems.filter((ci) => !usedIds.has(ci.id));
        return (
          <ContentPickerModalMap
            availableContent={available}
            allTopics={topics}
            onSelect={(ciId) => {
              setFunnels((prev) => prev.map((f) =>
                f.id === funnelId
                  ? { ...f, contentItemIds: [...f.contentItemIds, ciId], contentCount: f.contentCount + 1 }
                  : f
              ));
            }}
            onClose={() => setShowContentPicker(null)}
          />
        );
      })()}

      {/* Product Edit Modal — same style as Products page */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => { updateProduct(updated); setEditingProduct(null); }}
          formats={formats}
          onAddFormat={addFormat}
          onDeleteFormat={deleteFormat}
        />
      )}

      {editingContent && (
        <ContentDetailModal
          item={editingContent}
          topicTitle={getTopicTitle(editingContent)}
          onClose={() => setEditingContent(null)}
          onSave={(updated) => { updateContentItem(updated); setEditingContent(null); }}
          onTopicRename={(newTitle) => {
            const topic = topics.find((t) => t.contentItems.some((ci) => ci.id === editingContent.id));
            if (topic) updateTopic({ ...topic, title: newTitle });
          }}
        />
      )}
    </SidebarProvider>
  );
};

export default FunnelMapPage;
