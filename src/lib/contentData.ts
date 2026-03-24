export interface Platform {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface StatusInfo {
  label: string;
  color: string;
  bg: string;
  priority: number;
}

export type ContentStatusKey = "idea" | "in_progress" | "ready" | "published";

export interface ContentItemData {
  id: number;
  platformId: string;
  status: ContentStatusKey;
  title: string;
  body: string;
  createdDate: string;
  publishDate: string;
}

export interface Topic {
  id: number;
  title: string;
  thesisPlan: string;
  isIdeaBank: boolean;
  contentItems: ContentItemData[];
}

export const PLATFORMS: Platform[] = [
  { id: "stories", label: "Сторис", icon: "/icons/stories.svg", color: "#8B5CF6" },
  { id: "tg_post", label: "Пост ТГ", icon: "/icons/telegram.svg", color: "#8B5CF6" },
  { id: "ig_post", label: "Пост Инста", icon: "/icons/instagram.svg", color: "#8B5CF6" },
  { id: "carousel", label: "Карусель", icon: "/icons/carousel.svg", color: "#8B5CF6" },
  { id: "reels", label: "Reels", icon: "/icons/reels.svg", color: "#8B5CF6" },
  { id: "threads", label: "Тредс", icon: "/icons/threads.svg", color: "#8B5CF6" },
  { id: "youtube", label: "Ютуб", icon: "/icons/youtube.svg", color: "#8B5CF6" },
  { id: "article", label: "Статья", icon: "/icons/article.svg", color: "#8B5CF6" },
  { id: "vk", label: "ВК", icon: "/icons/vk.svg", color: "#8B5CF6" },
];

export const STATUSES: Record<ContentStatusKey, StatusInfo> = {
  idea: { label: "идея", color: "#94a3b8", bg: "#f1f5f9", priority: 0 },
  in_progress: { label: "в работе", color: "#f59e0b", bg: "#fef3c7", priority: 3 },
  ready: { label: "готово", color: "#22c55e", bg: "#dcfce7", priority: 2 },
  published: { label: "опубликовано", color: "#6366f1", bg: "#e0e7ff", priority: 1 },
};

export const STATUS_ORDER: ContentStatusKey[] = ["idea", "in_progress", "ready", "published"];

export function getEffectiveDate(item: ContentItemData): string {
  return item.publishDate || item.createdDate || "";
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "Без даты";
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Сегодня";
  if (dateStr === yesterdayStr) return "Вчера";
  if (dateStr === tomorrowStr) return "Завтра";
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return d.getDate() + " " + months[d.getMonth()];
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

export const initialTopics: Topic[] = [
  {
    id: 1,
    title: "Кейс 1,4 ляма: как мы это сделали",
    thesisPlan: "— Что было до\n— Что сделали\n— Результат в цифрах\n— Вывод и CTA",
    isIdeaBank: false,
    contentItems: [
      { id: 101, platformId: "tg_post", status: "published", title: "Как мы сделали 1,4 млн за один запуск", body: "Расскажу как мы с ученицей сделали 1,4 млн за один запуск.\n\nДо работы со мной: хаотичный контент, 0 системы.\nПосле: чёткая воронка, 47 заявок, 12 продаж.\n\nГлавный инсайт — дело не в количестве подписчиков.", createdDate: threeDaysAgo, publishDate: yesterday },
      { id: 102, platformId: "stories", status: "ready", title: "До/После: путь к 1,4 млн", body: "Слайд 1: Цифра 1,4 млн крупно\nСлайд 2: Что было до\nСлайд 3: Что поменяли\nСлайд 4: CTA", createdDate: threeDaysAgo, publishDate: today },
      { id: 103, platformId: "reels", status: "in_progress", title: "60 секунд — результат ученицы", body: "", createdDate: twoDaysAgo, publishDate: "" },
      { id: 104, platformId: "carousel", status: "idea", title: "3 шага к запуску на 1,4 млн", body: "", createdDate: twoDaysAgo, publishDate: "" },
    ],
  },
  {
    id: 2,
    title: "5 ошибок прогрева перед запуском",
    thesisPlan: "— Ошибка 1: нет сегментации\n— Ошибка 2: рано продавать\n— Ошибка 3: нет кейсов",
    isIdeaBank: false,
    contentItems: [
      { id: 201, platformId: "ig_post", status: "ready", title: "Не начинай продавать в первый день", body: "Ошибка №1 — начинаете продавать в первый же день прогрева.\n\nЛюди ещё не понимают зачем им ваш продукт.", createdDate: yesterday, publishDate: today },
      { id: 202, platformId: "carousel", status: "in_progress", title: "Чек-лист: проверь свой прогрев", body: "", createdDate: yesterday, publishDate: "" },
      { id: 203, platformId: "tg_post", status: "idea", title: "Почему аудитория молчит после прогрева", body: "", createdDate: today, publishDate: "" },
      { id: 204, platformId: "reels", status: "idea", title: "Ошибка №1 которая убивает запуск", body: "", createdDate: today, publishDate: "" },
    ],
  },
  {
    id: 3,
    title: "Как я строю контент-воронку на холодный трафик",
    thesisPlan: "— Источники трафика\n— Что работает в 2025\n— Мой фреймворк",
    isIdeaBank: false,
    contentItems: [
      { id: 301, platformId: "youtube", status: "in_progress", title: "Моя система: от рилса до продажи", body: "", createdDate: today, publishDate: "" },
      { id: 302, platformId: "article", status: "idea", title: "Фреймворк контент-воронки 2025", body: "", createdDate: today, publishDate: "" },
      { id: 303, platformId: "tg_post", status: "idea", title: "3 источника трафика которые работают сейчас", body: "", createdDate: today, publishDate: "" },
    ],
  },
  {
    id: 6,
    title: "Как собрать воронку за выходные",
    thesisPlan: "— Минимальная воронка\n— Что нужно: лид-магнит + бот + 2 поста\n— Пошаговый план на субботу-воскресенье",
    isIdeaBank: false,
    contentItems: [
      { id: 601, platformId: "reels", status: "ready", title: "Собрала воронку за 2 дня — показываю", body: "Хук: Думаешь воронка — это сложно?\nОсновная часть: показываю что я сделала за субботу и воскресенье\nCTA: Напиши ВОРОНКА — пришлю гайд", createdDate: yesterday, publishDate: today },
      { id: 602, platformId: "tg_post", status: "in_progress", title: "Пошаговый план: воронка за уик-энд", body: "", createdDate: today, publishDate: "" },
    ],
  },
  {
    id: 4,
    title: "Сравнение воронок для разных ниш",
    thesisPlan: "— Разобрать 3 ниши\n— Показать разные воронки\n— Дать шаблон",
    isIdeaBank: true,
    contentItems: [],
  },
  {
    id: 5,
    title: "Почему не работают бесплатные марафоны",
    thesisPlan: "— Статистика по марафонам\n— Что делать вместо\n— Альтернативный формат",
    isIdeaBank: true,
    contentItems: [],
  },
];
