export type DashboardStats = { products: number; topics: number; ideas: number; archivedIdeas: number; contentItems: number; funnels: number; keywords: number; calendarItems: number };
export type UserDashboard = {
  generatedAt: string; updatedAt: string; stats: DashboardStats;
  content: { status: Record<string, number>; formats: Record<string, number>; withProduct: number; withFunnel: number; withCta: number; approvedScripts: number; activeFunnels: number;
    results: { materials: number; reach: number; responses: number; leads: number; sales: number; coverage: Record<string, number> } };
  calendar: { parts: number; published: number; approved: number; drafts: number };
  upcoming: { from: string; to: string; total: number; items: { id: string; title: string; format: string; date: string; remaining: number }[] };
  resultMaterials: { id: number; title: string; platformId: string; metrics: Record<string, number> }[];
};
export const dashboardNumber = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
export const dashboardFormats: Record<string, string> = { reels: 'Reels', stories: 'Сторис', carousel: 'Карусели', tg_post: 'Telegram', threads: 'Threads', youtube: 'YouTube', ig_post: 'Посты Instagram', article: 'Статьи', vk: 'ВК', other: 'Другие' };
export const dashboardDate = (value: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Kaliningrad', day: 'numeric', month: 'short' }) : 'Нет данных';
