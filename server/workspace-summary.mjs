// Shared workspace arithmetic; callers decide the account scope.
const list = value => Array.isArray(value) ? value.filter(v => v && typeof v === 'object' && !Array.isArray(v)) : [];
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
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

export function countWorkspace(main = {}, publications = {}) {
 main = main && typeof main === 'object' ? main : {};
 publications = publications && typeof publications === 'object' ? publications : {};
 const all = list(main.topics), topics = all.filter(t => !t.archived);
 return { products: list(main.products).length, topics: topics.filter(t => !t.isIdeaBank).length, ideas: topics.filter(t => t.isIdeaBank).length, archivedIdeas: all.filter(t => t.archived).length, contentItems: topics.reduce((n,t) => n + list(t.contentItems).length,0), funnels: list(main.funnels).length, keywords: Array.isArray(main.keywords) ? main.keywords.length : 0, calendarItems: list(publications.items).length };
}
