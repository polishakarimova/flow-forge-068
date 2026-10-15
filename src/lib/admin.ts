export type AdminStats = { products: number; topics: number; ideas: number; archivedIdeas: number; contentItems: number; funnels: number; keywords: number; calendarItems: number };
export type AdminUser = { id: string; name: string; telegramId: string; telegramUsername: string; provider: string; createdAt: string; updatedAt: string; stateUpdatedAt: string; lastActivityAt: string; active: boolean; stats: AdminStats; connectedAgents: number };
export type AdminOverview = {
  generatedAt: string; period: { days: number; from: string; to: string; timeZone: string }; totals: AdminStats & { users: number };
  audience: { newUsers: number; activeUsers: number; returningUsers: number; adoption: { withProducts: number; withContent: number; withFunnels: number; complete: number; empty: number }; daily: { date: string; registrations: number; signIns: number }[] };
  content: { status: Record<string, number>; formats: Record<string, number>; withProduct: number; withFunnel: number; withCta: number; approvedScripts: number; activeFunnels: number; results: { materials: number; reach: number; responses: number; leads: number; sales: number; coverage: Record<string, number> } };
  calendar: { parts: number; published: number; approved: number; drafts: number };
  agents: { connected: number; owners: number; actions: number; recent: { tool: string; name: string; createdAt: string }[] };
  publishing: { threadsConnected: number; healthyWorkers: number; queue: Record<string, number> };
  system: { database: string; databaseMs: number; uptimeSeconds: number; telegramMode: string; autopublishEnabled: boolean; remotePublisherEnabled: boolean; payments: string; broadcasts: string; loginHistorySince: string; adminExpiresAt?: string };
  users: AdminUser[];
};
export const adminNumber = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
export const adminPercent = (value: number, total: number) => total ? Math.round(value / total * 100) : 0;
export function adminDate(value: string, time = false) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Нет данных';
  return new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Kaliningrad', day: 'numeric', month: 'short', ...(time ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }) });
}
export const adminFormat: Record<string, string> = { reels: 'Reels', stories: 'Сторис', carousel: 'Карусели', tg_post: 'Telegram', threads: 'Threads', youtube: 'YouTube', ig_post: 'Посты Instagram', article: 'Статьи', vk: 'ВК', other: 'Другие' };
