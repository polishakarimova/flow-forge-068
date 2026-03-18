export type ContentStatus = "published" | "ready" | "draft";
export type BadgeColor = "violet" | "amber";

export interface ContentItem {
  id: string;
  platform: string;
  format: string;
  title: string;
  status: ContentStatus;
}

export interface FunnelStep {
  id: string;
  title: string;
  type: string;
}

export interface FunnelProduct {
  name: string;
  price: string;
  type: string;
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
  // Expanded data
  contentItems: ContentItem[];
  cta: string;
  deliveryType: string;
  deliveryTitle: string;
  steps: FunnelStep[];
  finalProduct?: FunnelProduct;
}

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
    contentItems: [
      { id: "c1", platform: "Telegram", format: "Пост", title: "TG-пост про кейс", status: "published" },
      { id: "c2", platform: "Instagram", format: "Stories", title: "Stories: до/после", status: "published" },
      { id: "c3", platform: "Instagram", format: "Reels", title: "Reels: результат клиента", status: "ready" },
      { id: "c4", platform: "Blog", format: "Статья", title: "Подробный разбор кейса", status: "draft" },
    ],
    cta: "Напиши КЕЙС в директ",
    deliveryType: "PDF",
    deliveryTitle: "PDF-разбор кейса на 1.4 млн",
    steps: [
      { id: "s1", title: "Мини-разбор вашей ситуации", type: "Консультация" },
    ],
    finalProduct: {
      name: "Система продаж через контент",
      price: "150 000 ₽",
      type: "Наставничество",
    },
  },
  {
    id: "2",
    keyword: "ОБРАЗ",
    badgeColor: "amber",
    product: "Туториал как примерить любую причёску",
    productType: "Лид-магнит",
    active: true,
    contentCount: 2,
    leads: 8,
    sales: 1,
    contentItems: [
      { id: "c5", platform: "Instagram", format: "Reels", title: "Reels: трансформация образа", status: "published" },
      { id: "c6", platform: "Instagram", format: "Stories", title: "Stories: опрос по стилю", status: "published" },
    ],
    cta: "Напиши ОБРАЗ в директ",
    deliveryType: "Видео",
    deliveryTitle: "Видео-туториал по примерке причёсок",
    steps: [],
    finalProduct: {
      name: "Персональный стилист",
      price: "25 000 ₽",
      type: "Консультация",
    },
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
      { id: "c7", platform: "Telegram", format: "Пост", title: "Пост: почему MAX", status: "published" },
      { id: "c8", platform: "Instagram", format: "Stories", title: "Stories: пошаговый гайд", status: "ready" },
      { id: "c9", platform: "Instagram", format: "Reels", title: "Reels: сравнение платформ", status: "draft" },
    ],
    cta: "Напиши МАКС в директ",
    deliveryType: "PDF",
    deliveryTitle: "Пошаговая инструкция по переносу канала",
    steps: [],
  },
  {
    id: "4",
    keyword: "СИСТЕМА",
    badgeColor: "amber",
    product: "AI-команда под ключ",
    productType: "Трипваер",
    active: true,
    contentCount: 1,
    leads: 15,
    sales: 5,
    contentItems: [
      { id: "c10", platform: "Instagram", format: "Reels", title: "Reels: как Claude пишет за тебя", status: "published" },
    ],
    cta: "Напиши СИСТЕМА в директ",
    deliveryType: "Мини-курс",
    deliveryTitle: "AI-команда: 5 ботов для эксперта",
    steps: [
      { id: "s2", title: "Настройка AI-ассистента", type: "Воркшоп" },
    ],
    finalProduct: {
      name: "AI-команда под ключ",
      price: "49 000 ₽",
      type: "Услуга",
    },
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
    deliveryType: "Чек-лист",
    deliveryTitle: "Чек-лист запуска продукта",
    steps: [],
  },
  {
    id: "6",
    keyword: "ВОРОНКА",
    badgeColor: "amber",
    product: "Мини-курс по автоворонкам",
    productType: "Лид-магнит",
    active: false,
    contentCount: 1,
    leads: 0,
    sales: 0,
    contentItems: [
      { id: "c12", platform: "Instagram", format: "Reels", title: "Reels: что такое воронка", status: "draft" },
    ],
    cta: "Напиши ВОРОНКА в директ",
    deliveryType: "Мини-курс",
    deliveryTitle: "Мини-курс по автоворонкам",
    steps: [],
  },
];
