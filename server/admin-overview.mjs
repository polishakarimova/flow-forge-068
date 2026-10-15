// Administrative summaries only. Never return workspace text, context or credentials.
const list = value => Array.isArray(value) ? value.filter(v => v && typeof v === 'object' && !Array.isArray(v)) : [];
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
const iso = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : '';
const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kaliningrad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const counts = () => ({ products: 0, topics: 0, ideas: 0, archivedIdeas: 0, contentItems: 0, funnels: 0, keywords: 0, calendarItems: 0 });
export function summarizeWorkspace(main = {}, publications = {}) {
  main = main && typeof main === 'object' ? main : {};
  publications = publications && typeof publications === 'object' ? publications : {};
  const topics = list(main.topics).filter(t => !t.archived);
  const materials = topics.flatMap(t => list(t.contentItems));
  const products = list(main.products), funnels = list(main.funnels);
  const productIds = new Set(products.map(p => p.id).filter(id => id !== undefined && id !== null));
  const status = { idea: 0, in_progress: 0, ready: 0, published: 0 };
  const formats = Object.create(null), results = { materials: 0, reach: 0, responses: 0, leads: 0, sales: 0, coverage: { reach: 0, responses: 0, leads: 0, sales: 0 } };
  let withProduct = 0, withFunnel = 0, withCta = 0, approvedScripts = 0;
  for (const m of materials) {
    status[Object.hasOwn(status, m.status) ? m.status : 'idea']++;
    const format = String(m.platformId || 'other');
    formats[format] = (formats[format] || 0) + 1;
    if (productIds.has(m.productId)) withProduct++;
    if (funnels.some(f => f.id === m.funnelId || (Array.isArray(f.contentItemIds) && f.contentItemIds.includes(m.id)))) withFunnel++;
    if (typeof m.cta === 'string' && m.cta.trim()) withCta++;
    if (m.scriptApproval === 'approved' && Number.isFinite(m.revision) && m.approvedRevision === m.revision) approvedScripts++;
    if (m.metrics && ['reach', 'responses', 'leads', 'sales'].some(k => typeof m.metrics[k] === 'number' && Number.isFinite(m.metrics[k]) && m.metrics[k] >= 0)) {
      results.materials++;
      for (const key of ['reach', 'responses', 'leads', 'sales']) {
        results[key] += number(m.metrics[key]);
        if (typeof m.metrics[key] === 'number' && Number.isFinite(m.metrics[key]) && m.metrics[key] >= 0) results.coverage[key]++;
      }
    }
  }
  const items = list(publications.items), parts = items.flatMap(i => list(i.parts));
  return {
    stats: { products: products.length, topics: topics.filter(t => !t.isIdeaBank).length, ideas: topics.filter(t => t.isIdeaBank).length,
      archivedIdeas: list(main.topics).filter(t => t.archived).length, contentItems: materials.length, funnels: funnels.length,
      keywords: Array.isArray(main.keywords) ? main.keywords.length : 0, calendarItems: items.length },
    content: { status, formats, withProduct, withFunnel, withCta, approvedScripts, activeFunnels: funnels.filter(f => f.active).length, results },
    calendar: { parts: parts.length, published: parts.filter(p => p.published === true).length,
      approved: parts.filter(p => !p.published && p.approvalStatus === 'approved').length,
      drafts: parts.filter(p => !p.published && p.approvalStatus !== 'approved').length },
  };
}

export function buildAdminOverview({ accounts = [], states = [], logins = [], agents = [], actions = [], actionCount = 0, queue = [], threads = {}, system = {}, days = 30, clock = Date.now() }) {
  days = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const today = day(clock), dates = Array.from({ length: days }, (_, i) => day(Date.parse(today + 'T12:00:00+02:00') - (days - 1 - i) * 86400000));
  const firstDay = dates[0], inPeriod = value => iso(value) && day(value) >= firstDay && new Date(value).getTime() <= clock;
  const stateByUser = new Map(), loginByUser = new Map();
  for (const row of states) {
    if (!stateByUser.has(row.user_id)) stateByUser.set(row.user_id, {});
    stateByUser.get(row.user_id)[row.key] = row;
  }
  const knownIds = new Set(accounts.map(a => a.id));
  const daily = dates.map(date => ({ date, registrations: 0, signIns: 0 }));
  const dailyMap = new Map(daily.map(d => [d.date, d]));
  for (const row of logins) {
    if (!knownIds.has(row.user_id)) continue;
    if (dailyMap.has(row.date)) dailyMap.get(row.date).signIns++;
    const previous = loginByUser.get(row.user_id);
    if (!previous || Date.parse(previous) < Date.parse(row.last_login)) loginByUser.set(row.user_id, row.last_login);
  }
  const totals = { users: accounts.length, ...counts() }, status = { idea: 0, in_progress: 0, ready: 0, published: 0 };
  const content = { status, formats: Object.create(null), withProduct: 0, withFunnel: 0, withCta: 0, approvedScripts: 0, activeFunnels: 0, results: { materials: 0, reach: 0, responses: 0, leads: 0, sales: 0, coverage: { reach: 0, responses: 0, leads: 0, sales: 0 } } };
  const calendar = { parts: 0, published: 0, approved: 0, drafts: 0 };
  const adoption = { withProducts: 0, withContent: 0, withFunnels: 0, complete: 0, empty: 0 };
  const users = accounts.map(account => {
    const state = stateByUser.get(account.id) || {};
    const summary = summarizeWorkspace(state.main?.data, state.publications?.data);
    for (const key of Object.keys(summary.stats)) totals[key] += summary.stats[key];
    for (const key of Object.keys(status)) status[key] += summary.content.status[key];
    for (const key of ['withProduct', 'withFunnel', 'withCta', 'approvedScripts', 'activeFunnels']) content[key] += summary.content[key];
    for (const [key, value] of Object.entries(summary.content.formats)) content.formats[key] = (content.formats[key] || 0) + value;
    for (const key of ['materials', 'reach', 'responses', 'leads', 'sales']) content.results[key] += summary.content.results[key];
    for (const key of Object.keys(content.results.coverage)) content.results.coverage[key] += summary.content.results.coverage[key];
    for (const key of Object.keys(calendar)) calendar[key] += summary.calendar[key];
    const hasProducts = summary.stats.products > 0, hasContent = summary.stats.contentItems > 0, hasFunnels = summary.stats.funnels > 0;
    if (hasProducts) adoption.withProducts++;
    if (hasContent) adoption.withContent++;
    if (hasFunnels) adoption.withFunnels++;
    if (hasProducts && hasContent && hasFunnels) adoption.complete++;
    if (!hasProducts && !hasContent && !hasFunnels && !summary.stats.ideas && !summary.stats.topics && !summary.stats.calendarItems) adoption.empty++;
    const latest = [account.updated_at, state.main?.updated_at, state.publications?.updated_at, loginByUser.get(account.id)].map(iso).filter(Boolean).sort().at(-1) || iso(account.created_at);
    const registered = iso(account.created_at);
    if (registered && dailyMap.has(day(registered))) dailyMap.get(day(registered)).registrations++;
    return { id: account.id, name: account.name || account.username || 'Пользователь', telegramId: account.telegram_id || '', telegramUsername: account.username ? '@' + account.username : '',
      provider: 'telegram', createdAt: registered, updatedAt: iso(account.updated_at), stateUpdatedAt: iso(state.main?.updated_at), lastActivityAt: latest,
      active: Boolean(inPeriod(latest)), stats: summary.stats, connectedAgents: agents.filter(a => a.user_id === account.id && !a.revoked_at && a.connected_at && Date.parse(a.refresh_expires_at) > clock).length };
  }).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  const activeAgents = agents.filter(a => !a.revoked_at && a.connected_at && Date.parse(a.refresh_expires_at) > clock);
  return { generatedAt: new Date(clock).toISOString(), period: { days, from: firstDay, to: today, timeZone: 'Europe/Kaliningrad' }, totals,
    audience: { newUsers: users.filter(u => inPeriod(u.createdAt)).length, activeUsers: users.filter(u => u.active).length,
      returningUsers: users.filter(u => u.active && u.createdAt && day(u.createdAt) < firstDay).length, adoption, daily }, content, calendar,
    agents: { connected: activeAgents.length, owners: new Set(activeAgents.map(a => a.user_id)).size,
      actions: Number(actionCount), recent: actions.map(a => ({ tool: a.tool, name: a.name, createdAt: iso(a.created_at) })) },
    publishing: { threadsConnected: Number(threads.connected || 0), healthyWorkers: Number(threads.workers || 0), queue: Object.fromEntries(queue.map(q => [q.status, Number(q.count)])) },
    system, users };
}

export async function readAdminOverview(pool, options = {}) {
  const started = performance.now(), clock = Date.now(), days = [7, 30, 90].includes(Number(options.days)) ? Number(options.days) : 30;
  const since = new Date(Date.parse(day(clock) + 'T00:00:00+02:00') - (days - 1) * 86400000);
  const client = await pool.connect();
  try {
    await client.query('begin isolation level repeatable read read only');
    const accounts = await client.query(`select u.id,u."displayName" as name,u."createdAt" as created_at,u."updatedAt" as updated_at,t."telegramId" as telegram_id,t.username
      from users u left join lateral (select "telegramId",username from telegram_accounts where "userId"=u.id order by "createdAt",id limit 1) t on true`);
    const states = await client.query("select user_id,key,data,updated_at from cm_user_state where key in ('main','publications')");
    const history = await client.query('select min(created_at) as since from cm_auth_sessions');
    const logins = await client.query(`select user_id,to_char(created_at at time zone 'Europe/Kaliningrad','YYYY-MM-DD') as date,max(created_at) as last_login
      from cm_auth_sessions where created_at >= $1 and created_at <= $2 group by user_id,date`, [since, new Date(clock)]);
    const agents = await client.query('select user_id,connected_at,revoked_at,refresh_expires_at from cm_agent_connections');
    const actions = await client.query(`select a.tool,a.created_at,c.name from cm_agent_actions a join cm_agent_connections c on c.id=a.agent_id where a.created_at >= $1 order by a.created_at desc limit 12`, [since]);
    const actionCount = await client.query('select count(*)::int as count from cm_agent_actions where created_at >= $1', [since]);
    const queue = await client.query('select status,count(*)::int as count from cm_threads_queue group by status');
    const threads = await client.query(`select (select count(*)::int from cm_threads_connections where expires_at is null or expires_at>now()) as connected,
      (select count(*)::int from cm_threads_workers where healthy and last_seen > now()-interval '3 minutes') as workers`);
    await client.query('commit');
    return buildAdminOverview({ accounts: accounts.rows, states: states.rows, logins: logins.rows, agents: agents.rows, actions: actions.rows,
      actionCount: actionCount.rows[0].count, queue: queue.rows, threads: threads.rows[0], days, clock,
      system: { database: 'ok', databaseMs: Math.round(performance.now() - started), uptimeSeconds: Math.floor(process.uptime()), adminExpiresAt: options.adminExpiresAt || '',
        telegramMode: options.telegramMode || 'webhook', autopublishEnabled: Boolean(options.autopublishEnabled), remotePublisherEnabled: Boolean(options.remotePublisherEnabled),
        payments: 'not_connected', broadcasts: 'not_connected', loginHistorySince: iso(history.rows[0].since) } });
  } catch (error) { await client.query('rollback').catch(() => {}); throw error; }
  finally { client.release(); }
}
