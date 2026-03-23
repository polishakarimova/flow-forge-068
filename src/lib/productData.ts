export interface ProductType {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export type ProductStatusKey = "draft" | "active" | "paused" | "archived";

export interface ProductStatusInfo {
  label: string;
  color: string;
  bg: string;
}

export interface Product {
  id: number;
  name: string;
  typeId: string;
  format: string;
  status: ProductStatusKey;
  price: string;
  currency: string;
  description: string;
  link: string;
  createdDate: string;
}

export const PRODUCT_TYPES: ProductType[] = [
  { id: "lead_magnet", label: "лид-магнит", icon: "🧲", color: "#8b5cf6" },
  { id: "tripwire", label: "трипвайер", icon: "⚡", color: "#f59e0b" },
  { id: "mid_ticket", label: "среднечек", icon: "💎", color: "#6366f1" },
  { id: "flagship", label: "флагман", icon: "🚀", color: "#ef4444" },
  { id: "consultation", label: "консультация", icon: "🎯", color: "#22c55e" },
  { id: "private", label: "личка", icon: "🔒", color: "#0ea5e9" },
];

export const PRODUCT_STATUSES: Record<ProductStatusKey, ProductStatusInfo> = {
  draft: { label: "черновик", color: "#94a3b8", bg: "#f1f5f9" },
  active: { label: "активный", color: "#22c55e", bg: "#dcfce7" },
  paused: { label: "на паузе", color: "#f59e0b", bg: "#fef3c7" },
  archived: { label: "в архиве", color: "#6366f1", bg: "#e0e7ff" },
};

export const PRODUCT_STATUS_ORDER: ProductStatusKey[] = ["draft", "active", "paused", "archived"];

export const DEFAULT_FORMATS = [
  "PDF-гайд", "Чек-лист", "Мини-курс", "Видео-урок", "Вебинар",
  "Канал по подписке", "Марафон", "Интенсив", "Наставничество", "Разбор",
];

export function formatProductDateLabel(dateStr: string): string {
  if (!dateStr) return "Без даты";
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Сегодня";
  if (dateStr === yesterdayStr) return "Вчера";
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return d.getDate() + " " + months[d.getMonth()];
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

export const initialProducts: Product[] = [
  { id: 1, name: "PDF-разбор «Как мы сделали 1,4 ляма»", typeId: "lead_magnet", format: "PDF-гайд", status: "active", price: "", currency: "₽", description: "Пошаговый разбор запуска с цифрами и скриншотами", link: "https://t.me/mybot?start=case", createdDate: today },
  { id: 2, name: "Мини-курс «5 воронок для эксперта»", typeId: "tripwire", format: "Мини-курс", status: "active", price: "2 990", currency: "₽", description: "5 видео-уроков + шаблоны воронок", link: "", createdDate: today },
  { id: 3, name: "Интенсив по контент-воронкам", typeId: "mid_ticket", format: "Интенсив", status: "draft", price: "14 900", currency: "₽", description: "", link: "", createdDate: yesterday },
  { id: 4, name: "Наставничество 1 на 1", typeId: "flagship", format: "Наставничество", status: "active", price: "150 000", currency: "₽", description: "3 месяца работы, 12 созвонов, чат 24/7", link: "https://mysite.ru/mentoring", createdDate: yesterday },
  { id: 5, name: "Разбор вашей воронки", typeId: "consultation", format: "Разбор", status: "active", price: "5 000", currency: "₽", description: "", link: "", createdDate: twoDaysAgo },
  { id: 6, name: "Закрытый канал по подписке", typeId: "private", format: "Канал по подписке", status: "paused", price: "990/мес", currency: "₽", description: "Еженедельные разборы + шаблоны", link: "https://t.me/+secret", createdDate: twoDaysAgo },
];
