import { summarizeWorkspace } from './workspace-summary.mjs';
const list = value => Array.isArray(value) ? value.filter(v => v && typeof v === 'object') : [];
const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kaliningrad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const fields = ['reach', 'responses', 'leads', 'sales'];
export function buildUserDashboard(main = {}, publications = {}, clock = Date.now()) {
  main = main && typeof main === 'object' ? main : {};
  publications = publications && typeof publications === 'object' ? publications : {};
  const summary = summarizeWorkspace(main, publications), today = dateKey(clock);
  const until = dateKey(Date.parse(today + 'T12:00:00+02:00') + 6 * 86400000);
  const materials = list(main.topics).filter(t => !t.archived).flatMap(t => list(t.contentItems));
  const upcoming = list(publications.items).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= today && p.date <= until && list(p.parts).some(part => !part.published))
    .sort((a, b) => a.date.localeCompare(b.date)).map(p => ({ id: String(p.id), title: String(p.title || 'Без названия'), format: String(p.format || ''), date: p.date, remaining: list(p.parts).filter(part => !part.published).length }));
  const results = materials.filter(m => fields.some(k => Number.isFinite(m.metrics?.[k]) && m.metrics[k] >= 0)).map(m => ({
    id: m.id, title: String(m.title || 'Без названия'), platformId: String(m.platformId || 'other'),
    metrics: Object.fromEntries(fields.filter(k => Number.isFinite(m.metrics?.[k]) && m.metrics[k] >= 0).map(k => [k, m.metrics[k]])),
  })).sort((a, b) => (b.metrics.leads || 0) - (a.metrics.leads || 0) || (b.metrics.reach || 0) - (a.metrics.reach || 0));
  return { ...summary, generatedAt: new Date(clock).toISOString(), upcoming: { from: today, to: until, total: upcoming.length, items: upcoming.slice(0, 5) }, resultMaterials: results.slice(0, 5) };
}
export async function readUserDashboard(pool, userId, clock = Date.now()) {
  if (!userId) throw Object.assign(Error('unauthorized'), { status: 401 });
  // Account identity comes exclusively from the verified session, never a query parameter.
  const { rows } = await pool.query("select key,data,updated_at from cm_user_state where user_id=$1 and key in ('main','publications')", [userId]);
  const main = rows.find(row => row.key === 'main'), publications = rows.find(row => row.key === 'publications');
  const updated = rows.map(row => new Date(row.updated_at).getTime()).filter(Number.isFinite);
  return { ...buildUserDashboard(main?.data, publications?.data, clock), updatedAt: updated.length ? new Date(Math.max(...updated)).toISOString() : '' };
}
