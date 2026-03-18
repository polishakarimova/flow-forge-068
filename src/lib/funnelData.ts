export type ContentStatus = "published" | "ready" | "draft";
export type BadgeColor = "violet" | "amber" | "honey" | "lilac";
export type ProductTier = "lead-magnet" | "mid-ticket" | "flagship";

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
  rate: number; // percentage 0-100
  label: string; // e.g. "20%"
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
  hasNewActivity?: boolean; // pulsing dot
  contentItems: ContentItem[];
  cta: string;
  leadMagnet?: FunnelProduct;
  midTicket?: FunnelProduct;
  flagship?: FunnelProduct;
  conversions?: ConversionData[];
}

export const productTypeShort: Record<string, string> = {
  "Лид-магнит": "ЛМ",
  "Трипваер": "ТВ",
  "Средний чек": "СЧ",
  "Флагман": "ФГ",
};

// Shared product catalog
export const productsCatalog: FunnelProduct[] = [
  {
    id: "p1",
    name: "PDF-разбор кейса на 1.4 млн",
    price: "Бесплатно",
    type: "PDF",
    tier: "lead-magnet",
    description: "Подробный разбор реального кейса: как клиент заработал 1.4 млн через контент-воронку. Включает пошаговый план и шаблоны.",
    offerUrl: "https://example.com/case-pdf",
    funnelIds: ["1"],
  },
  {
    id: "p2",
    name: "Мини-разбор вашей ситуации",
    price: "5 000 ₽",
    type: "Консультация",
    tier: "mid-ticket",
    description: "30-минутная персональная консультация с разбором вашей текущей воронки продаж и рекомендациями по улучшению.",
    offerUrl: "https://example.com/mini-consult",
    funnelIds: ["1"],
  },
  {
    id: "p3",
    name: "Наставничество: Система продаж через контент",
    price: "150 000 ₽",
    type: "Наставничество",
    tier: "flagship",
    description: "12-недельная программа наставничества. Построим вашу систему продаж через контент с нуля до первых результатов.",
    offerUrl: "https://example.com/mentorship",
    funnelIds: ["1"],
  },
  {
    id: "p4",
    name: "Видео-туториал по примерке причёсок",
    price: "Бесплатно",
    type: "Видео",
    tier: "lead-magnet",
    description: "Пошаговый видео-гайд как примерить любую причёску с помощью AI.",
    funnelIds: ["2"],
  },
  {
    id: "p5",
    name: "Персональный стилист",
    price: "25 000 ₽",
    type: "Консультация",
    tier: "flagship",
    description: "Индивидуальная работа со стилистом: подбор образа, гардероб, причёска.",
    offerUrl: "https://example.com/stylist",
    funnelIds: ["2"],
  },
  {
    id: "p6",
    name: "Пошаговая инструкция по переносу канала",
    price: "Бесплатно",
    type: "PDF",
    tier: "lead-magnet",
    description: "Детальная инструкция по переносу Telegram-канала в MAX без потери подписчиков.",
    funnelIds: ["3"],
  },
  {
    id: "p7",
    name: "AI-команда: 5 ботов для эксперта",
    price: "Бесплатно",
    type: "Мини-курс",
    tier: "lead-magnet",
    description: "Бесплатный мини-курс по настройке 5 AI-ботов для автоматизации экспертного бизнеса.",
    funnelIds: ["4"],
  },
  {
    id: "p8",
    name: "Настройка AI-ассистента",
    price: "15 000 ₽",
    type: "Воркшоп",
    tier: "mid-ticket",
    description: "Практический воркшоп: настроим вашего AI-ассистента за 3 часа.",
    funnelIds: ["4"],
  },
  {
    id: "p9",
    name: "AI-команда под ключ",
    price: "49 000 ₽",
    type: "Услуга",
    tier: "flagship",
    description: "Полная настройка AI-команды из 5+ ботов для вашего бизнеса.",
    offerUrl: "https://example.com/ai-team",
    funnelIds: ["4"],
  },
];

export const funnelsData: Funnel[] = [
  {
    id: "1",
    keyword: "КЕЙС",
    badgeColor: "violet",
    product: "Статья про кейс на 1.4 млн",
    productType: "Лид-магнит",
    active: true,
    contentCount: 4,
    leads: 12,
    sales: 3,
    hasNewActivity: true,
    contentItems: [
      { id: "c1", platform: "Telegram", format: "Пост", title: "TG-пост про кейс", status: "published", views: 1200, messages: 45, leads: 8, sales: 2 },
      { id: "c2", platform: "Instagram", format: "Stories", title: "Stories: до/после", status: "published", views: 3400, messages: 120, leads: 3, sales: 1 },
      { id: "c3", platform: "Instagram", format: "Reels", title: "Reels: результат клиента", status: "ready" },
      { id: "c4", platform: "Blog", format: "Статья", title: "Подробный разбор кейса", status: "draft" },
    ],
    cta: "Напиши КЕЙС в директ",
    leadMagnet: productsCatalog.find((p) => p.id === "p1"),
    midTicket: productsCatalog.find((p) => p.id === "p2"),
    flagship: productsCatalog.find((p) => p.id === "p3"),
    conversions: [
      { from: "content", to: "cta", rate: 15, label: "15%" },
      { from: "cta", to: "lead-magnet", rate: 45, label: "45%" },
      { from: "lead-magnet", to: "mid-ticket", rate: 8, label: "8%" },
      { from: "mid-ticket", to: "flagship", rate: 3, label: "3%" },
    ],
  },
  {
    id: "2",
    keyword: "ОБРАЗ",
    badgeColor: "honey",
    product: "Туториал как примерить любую причёску",
    productType: "Лид-магнит",
    active: true,
    contentCount: 2,
    leads: 8,
    sales: 1,
    hasNewActivity: true,
    contentItems: [
      { id: "c5", platform: "Instagram", format: "Reels", title: "Reels: трансформация образа", status: "published", views: 5200, messages: 80, leads: 6, sales: 1 },
      { id: "c6", platform: "Instagram", format: "Stories", title: "Stories: опрос по стилю", status: "published", views: 1800, messages: 30, leads: 2 },
    ],
    cta: "Напиши ОБРАЗ в директ",
    leadMagnet: productsCatalog.find((p) => p.id === "p4"),
    flagship: productsCatalog.find((p) => p.id === "p5"),
    conversions: [
      { from: "content", to: "cta", rate: 12, label: "12%" },
      { from: "cta", to: "lead-magnet", rate: 35, label: "35%" },
      { from: "lead-magnet", to: "flagship", rate: 5, label: "5%" },
    ],
  },
  {
    id: "3",
    keyword: "МАКС",
    badgeColor: "violet",
    product: "Инструкция по переносу ТГ-канала",
    productType: "Лид-магнит",
    active: true,
    contentCount: 3,
    leads: 5,
    sales: 0,
    contentItems: [
      { id: "c7", platform: "Telegram", format: "Пост", title: "Пост: почему MAX", status: "published", views: 800, messages: 15, leads: 3 },
      { id: "c8", platform: "Instagram", format: "Stories", title: "Stories: пошаговый гайд", status: "ready" },
      { id: "c9", platform: "Instagram", format: "Reels", title: "Reels: сравнение платформ", status: "draft" },
    ],
    cta: "Напиши МАКС в директ",
    leadMagnet: productsCatalog.find((p) => p.id === "p6"),
    conversions: [
      { from: "content", to: "cta", rate: 7, label: "7%" },
      { from: "cta", to: "lead-magnet", rate: 25, label: "25%" },
    ],
  },
  {
    id: "4",
    keyword: "СИСТЕМА",
    badgeColor: "peach",
    product: "AI-команда под ключ",
    productType: "Трипваер",
    active: true,
    contentCount: 1,
    leads: 15,
    sales: 5,
    hasNewActivity: true,
    contentItems: [
      { id: "c10", platform: "Instagram", format: "Reels", title: "Reels: как Claude пишет за тебя", status: "published", views: 8900, messages: 210, leads: 15, sales: 5 },
    ],
    cta: "Напиши СИСТЕМА в директ",
    leadMagnet: productsCatalog.find((p) => p.id === "p7"),
    midTicket: productsCatalog.find((p) => p.id === "p8"),
    flagship: productsCatalog.find((p) => p.id === "p9"),
    conversions: [
      { from: "content", to: "cta", rate: 22, label: "22%" },
      { from: "cta", to: "lead-magnet", rate: 55, label: "55%" },
      { from: "lead-magnet", to: "mid-ticket", rate: 12, label: "12%" },
      { from: "mid-ticket", to: "flagship", rate: 6, label: "6%" },
    ],
  },
  {
    id: "5",
    keyword: "ЗАПУСК",
    badgeColor: "violet",
    product: "Чек-лист запуска продукта",
    productType: "Лид-магнит",
    active: false,
    contentCount: 1,
    leads: 0,
    sales: 0,
    contentItems: [
      { id: "c11", platform: "Instagram", format: "Stories", title: "Stories: тизер", status: "draft" },
    ],
    cta: "Напиши ЗАПУСК в директ",
  },
  {
    id: "6",
    keyword: "ВОРОНКА",
    badgeColor: "lilac",
    product: "Мини-курс по автоворонкам",
    productType: "Лид-магнит",
    active: true,
    contentCount: 1,
    leads: 0,
    sales: 0,
    contentItems: [
      { id: "c12", platform: "Instagram", format: "Reels", title: "Reels: что такое воронка", status: "draft" },
    ],
    cta: "Напиши ВОРОНКА в директ",
  },
];
