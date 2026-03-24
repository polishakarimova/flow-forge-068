import { PLATFORMS, type ContentItemData, type ContentStatusKey } from "@/lib/contentData";
import { PRODUCT_TYPES, type Product } from "@/lib/productData";

export type ContentStatus = "published" | "ready" | "draft";
export type BadgeColor = "violet" | "amber" | "honey" | "lilac";
export type ProductTier = "lead-magnet" | "mid-ticket" | "flagship";

/* View types kept for backward compat with FunnelMapPage / ProductDrawer */
export interface ContentItem {
  id: string;
  platform: string;
  format: string;
  title: string;
  status: ContentStatus;
  views?: number;
  messages?: number;
  leads?: number;
  sales?: number;
}

export interface FunnelProduct {
  id: string;
  name: string;
  price: string;
  type: string;
  tier: ProductTier;
  description?: string;
  offerUrl?: string;
  funnelIds?: string[];
}

export interface ConversionData {
  from: string;
  to: string;
  rate: number;
  label: string;
}

export interface Funnel {
  id: string;
  keyword: string;
  badgeColor: BadgeColor;
  product: string;
  productType: string;
  active: boolean;
  contentCount: number;
  leads: number;
  sales: number;
  hasNewActivity?: boolean;
  contentItemIds: number[];         // references ContentItemData.id
  cta: string;
  leadMagnetId?: number;            // references Product.id
  tripwireId?: number;
  midTicketId?: number;
  flagshipId?: number;
  consultationId?: number;
  conversions?: ConversionData[];
}

export const PLATFORM_COLOR: Record<string, string> = {
  Telegram: "#2AABEE",
  Instagram: "#E1306C",
  Blog: "#34A853",
  YouTube: "#FF0000",
  Threads: "#000000",
  VK: "#4680C2",
};

export const productTypeShort: Record<string, string> = {
  "Лид-магнит": "ЛМ",
  "Трипваер": "ТВ",
  "Средний чек": "СЧ",
  "Флагман": "ФГ",
};

/* ── Conversion helpers ─────────────────────────────── */

const PLATFORM_MAP: Record<string, { platform: string; format: string }> = {
  stories: { platform: "Instagram", format: "Stories" },
  tg_post: { platform: "Telegram", format: "Пост" },
  ig_post: { platform: "Instagram", format: "Пост" },
  carousel: { platform: "Instagram", format: "Карусель" },
  reels: { platform: "Instagram", format: "Reels" },
  threads: { platform: "Threads", format: "Тред" },
  youtube: { platform: "YouTube", format: "Видео" },
  article: { platform: "Blog", format: "Статья" },
  vk: { platform: "VK", format: "Пост" },
};

const STATUS_TO_FUNNEL: Record<ContentStatusKey, ContentStatus> = {
  published: "published",
  ready: "ready",
  in_progress: "draft",
  idea: "draft",
};

export function contentItemDataToView(ci: ContentItemData): ContentItem {
  const mapped = PLATFORM_MAP[ci.platformId] || { platform: ci.platformId, format: ci.platformId };
  return {
    id: `ci-${ci.id}`,
    platform: mapped.platform,
    format: mapped.format,
    title: ci.title,
    status: STATUS_TO_FUNNEL[ci.status] || "draft",
  };
}

const TIER_MAP: Record<string, ProductTier> = {
  lead_magnet: "lead-magnet",
  tripwire: "lead-magnet",
  mid_ticket: "mid-ticket",
  flagship: "flagship",
  consultation: "flagship",
  private: "flagship",
};

export function productToFunnelView(p: Product): FunnelProduct {
  const typeInfo = PRODUCT_TYPES.find((t) => t.id === p.typeId);
  return {
    id: `p-${p.id}`,
    name: p.name,
    price: p.price ? `${p.price} ${p.currency}` : "Бесплатно",
    type: typeInfo?.label || p.typeId,
    tier: TIER_MAP[p.typeId] || "lead-magnet",
    description: p.description,
    offerUrl: p.link || undefined,
  };
}

/* ── Helper: resolve a funnel's content/products from store data ── */

export function resolveFunnelContent(
  funnel: Funnel,
  allContentItems: ContentItemData[],
): ContentItemData[] {
  return funnel.contentItemIds
    .map((id) => allContentItems.find((ci) => ci.id === id))
    .filter((ci): ci is ContentItemData => !!ci);
}

export function resolveFunnelProducts(
  funnel: Funnel,
  allProducts: Product[],
): { product: Product; field: string }[] {
  const result: { product: Product; field: string }[] = [];
  const fields: { field: string; id?: number }[] = [
    { field: "leadMagnet", id: funnel.leadMagnetId },
    { field: "tripwire", id: funnel.tripwireId },
    { field: "midTicket", id: funnel.midTicketId },
    { field: "flagship", id: funnel.flagshipId },
    { field: "consultation", id: funnel.consultationId },
  ];
  for (const { field, id } of fields) {
    if (id != null) {
      const p = allProducts.find((pr) => pr.id === id);
      if (p) result.push({ product: p, field });
    }
  }
  return result;
}

/* ── Seed data (references real IDs from contentData / productData) ── */

export const funnelsData: Funnel[] = [
  {
    id: "1",
    keyword: "КЕЙС",
    badgeColor: "violet",
    product: "PDF-разбор «Как мы сделали 1,4 ляма»",
    productType: "Лид-магнит",
    active: true,
    contentCount: 4,
    leads: 12,
    sales: 3,
    hasNewActivity: true,
    contentItemIds: [101, 102, 103, 104],   // Topic 1 content
    cta: "Напиши КЕЙС в директ",
    leadMagnetId: 1,    // PDF-разбор
    tripwireId: 2,      // Мини-курс
    flagshipId: 4,      // Наставничество
    conversions: [
      { from: "content", to: "cta", rate: 15, label: "15%" },
      { from: "cta", to: "lead-magnet", rate: 45, label: "45%" },
      { from: "lead-magnet", to: "tripwire", rate: 12, label: "12%" },
      { from: "tripwire", to: "flagship", rate: 3, label: "3%" },
    ],
  },
  {
    id: "2",
    keyword: "ОШИБКИ",
    badgeColor: "honey",
    product: "Мини-курс «5 воронок для эксперта»",
    productType: "Трипваер",
    active: true,
    contentCount: 4,
    leads: 8,
    sales: 1,
    hasNewActivity: true,
    contentItemIds: [201, 202, 203, 204],   // Topic 2 content
    cta: "Напиши ОШИБКИ в директ",
    leadMagnetId: 1,    // PDF-разбор
    midTicketId: 3,     // Интенсив
    conversions: [
      { from: "content", to: "cta", rate: 12, label: "12%" },
      { from: "cta", to: "lead-magnet", rate: 35, label: "35%" },
      { from: "lead-magnet", to: "mid-ticket", rate: 5, label: "5%" },
    ],
  },
  {
    id: "3",
    keyword: "ВОРОНКА",
    badgeColor: "violet",
    product: "Интенсив по контент-воронкам",
    productType: "Среднечек",
    active: true,
    contentCount: 3,
    leads: 5,
    sales: 0,
    contentItemIds: [301, 302, 303],        // Topic 3 content
    cta: "Напиши ВОРОНКА в директ",
    leadMagnetId: 1,    // PDF-разбор
    consultationId: 5,  // Разбор вашей воронки
    conversions: [
      { from: "content", to: "cta", rate: 7, label: "7%" },
      { from: "cta", to: "lead-magnet", rate: 25, label: "25%" },
      { from: "lead-magnet", to: "consultation", rate: 8, label: "8%" },
    ],
  },
];
