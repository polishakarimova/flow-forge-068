import { randomUUID } from 'node:crypto';

const formats = { reels: 'Рилс', carousel: 'Карусель', tg_post: 'Пост ТГ', stories: 'Сторис', threads: 'Threads', youtube: 'YouTube', ig_post: 'Пост Инста', article: 'Статья', vk: 'ВК' };
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (v, max = 50000) => typeof v === 'string' ? v.slice(0, max) : '';
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const all = main => (main.topics || []).flatMap(t => t.contentItems || []);
const numericId = main => Math.max(Date.now(), ...all(main).map(m => m.id + 1), ...(main.topics || []).map(t => t.id + 1));
export const productIds = f => [f.leadMagnetId, f.tripwireId, f.midTicketId, f.flagshipId, f.consultationId].filter(Number.isFinite);
const dateNow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kaliningrad', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());

function block(input, index) {
  if (!input || typeof input.text !== 'string') fail('У каждого экрана должен быть текст.');
  return { id: text(input.id, 100) || randomUUID(), text: text(input.text), visual: text(input.visual), motion: text(input.motion), label: text(input.label, 250) || `Экран ${index + 1}` };
}
function checkLinks(main, data) {
  if (data.productId && !main.products?.some(p => p.id === data.productId)) fail('Продукт не найден. Обновите список.');
  if (data.funnelId && !main.funnels?.some(f => f.id === data.funnelId)) fail('Воронка не найдена. Обновите список.');
  if(data.productId&&data.funnelId&&!productIds(main.funnels.find(f=>f.id===data.funnelId)).includes(data.productId))fail('Выбранный продукт не входит в эту воронку. Измените продукт или воронку.');
}
function checkRevision(entity, input) {
  if (input.revision !== undefined && input.revision !== (entity.revision || 1)) fail('Есть новая версия. Сравните изменения или сохраните свою копию.', 409);
}
function guardPublished(pubs, before, next) {
  const published = pubs.items.flatMap(p=>p.parts.filter(b=>b.published&&(b.contentItemId===before.id||p.contentItemId===before.id)));
  if (!published.length) return;
  if (!before.blocks?.length) {
    if (before.body!==next.body || before.title!==next.title || JSON.stringify(before.blocks)!==JSON.stringify(next.blocks)) fail('Опубликованный сценарий менять нельзя. Создайте адаптацию.');
    return;
  }
  for (const part of published) {
    const old=before.blocks.find(b=>b.id===part.blockId), updated=next.blocks?.find(b=>b.id===part.blockId);
    if (!old || ['id','label','text','visual','motion'].some(k=>(old[k]||'')!==(updated?.[k]||'')) || before.blocks.indexOf(old)!==next.blocks.indexOf(updated)) fail('Опубликованный экран менять или перемещать нельзя.');
  }
}
function url(value) {
 const v=text(value,4000).trim();if(!v)return '';
 try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw 0;return u.href;}catch{fail('Укажите полную ссылку https:// или http://.');}
}
function metrics(value={}) {
 const out={};for(const k of ['reach','responses','leads','sales']){const v=value[k];if(v!==undefined&&v!==''){if(!Number.isSafeInteger(v)||v<0)fail('Результаты должны быть целыми неотрицательными числами.');out[k]=v;}}
 if(value.publishedDate&&!validDate(value.publishedDate))fail('Проверьте дату выхода.');return {...out,publishedDate:value.publishedDate||'',url:url(value.url)};
}
function assets(value) {
 if(!Array.isArray(value)||value.length>30)fail('Добавьте не более 30 файлов.');
 const out=value.map(a=>({id:text(a.id,100)||randomUUID(),label:text(a.label,250)||'Готовый материал',url:url(a.url),kind:['video','carousel','folder','other'].includes(a.kind)?a.kind:'other',downloadUrl:url(a.downloadUrl)}));
 if(out.some(a=>!a.url)||new Set(out.map(a=>a.id)).size!==out.length)fail('Проверьте ссылки и идентификаторы файлов.');return out;
}
function isPublished(pubs, id) { return pubs.items.some(p => p.parts.some(b => (b.contentItemId === id || p.contentItemId === id) && b.published)); }
function snapshot(m) {
  return { title: m.title, body: m.body, blocks: m.blocks, visual: m.visual, motion: m.motion, cta: m.cta, resources: m.resources, assets: m.assets, productId:m.productId, funnelId:m.funnelId, funnelRole:m.funnelRole, revision: m.revision || 1, savedAt: new Date().toISOString() };
}
function syncMaterial(main, pubs, material, slot) {
  const date = slot?.date ?? material.publishDate;
  if (!date) {
    if (isPublished(pubs,material.id)) fail('Опубликованный материал нельзя снимать с календаря.');
    pubs.items=pubs.items.map(p=>({...p,parts:p.parts.filter(b=>b.contentItemId!==material.id&&p.contentItemId!==material.id&&(!slot||p.slotId!==slot.id))})).filter(p=>p.parts.length);
    return;
  }
  if (!validDate(date)) fail('Выберите корректную дату.');
  const format = formats[material.platformId];
  if (!format) fail('Для этого формата пока нет календарного представления.');
  const existing = pubs.items.find(p => slot ? p.slotId === slot.id : p.contentItemId === material.id || p.parts.some(b => b.contentItemId === material.id));
  if (existing?.parts.some(b => b.published && (format !== 'Сторис' || b.contentItemId === material.id)) && (existing.date !== date || (format !== 'Сторис' && existing.contentItemId !== material.id))) fail('Опубликованный материал остаётся в истории. Создайте новую адаптацию.');
  const sourceBlocks = material.blocks?.length ? material.blocks : [{ id: 'text', text: material.body }];
  const parts = sourceBlocks.map(b => {
    const previous = existing?.parts.find(p => p.contentItemId === material.id && p.blockId === b.id);
    const changed = previous && (previous.text !== b.text || existing.date !== date);
    return { ...previous, id: previous?.id || `material-${material.id}-${b.id}`, blockId: b.id, contentItemId: material.id,
      text: b.text, published: previous?.published || false, approvalStatus: changed ? 'draft' : previous?.approvalStatus || 'draft',
      scheduledAt: existing?.date === date ? previous?.scheduledAt : undefined,
      ...(changed ? { previousText: previous.text } : {}) };
  });
  if (existing?.parts.some(b => b.published && b.contentItemId === material.id && !parts.some(n => n.id === b.id && n.text === b.text))) fail('Опубликованный текст менять нельзя. Создайте адаптацию.');
  if (format === 'Сторис') {
    const target = pubs.items.find(p => p.date === date && p.format === format);
    if (existing && existing !== target) {
      existing.parts = existing.parts.filter(b => b.contentItemId !== material.id);
      if (!existing.parts.length) pubs.items = pubs.items.filter(p => p !== existing);
    }
    if (target) {
      const at = target.parts.findIndex(b => b.contentItemId === material.id);
      target.parts = target.parts.filter(b => b.contentItemId !== material.id);
      target.parts.splice(at < 0 ? target.parts.length : at, 0, ...parts);
      // Several story chains share one day; links live on each part.
      delete target.contentItemId;
    } else pubs.items.push({ id: randomUUID(), date, format, title: material.title, parts });
  } else if (existing) Object.assign(existing, { date, format, title: material.title, contentItemId: material.id, parts });
  else pubs.items.push({ id: randomUUID(), date, format, title: material.title, contentItemId: material.id, ...(slot ? { slotId: slot.id } : {}), parts });
}
function normalize(main) {
  main.topics ||= []; main.products ||= []; main.funnels ||= [];
  main.editorial ||= { weeks: {}, slots: [] };
  main.editorial.weeks ||= {}; main.editorial.slots ||= [];
  return main;
}

export function applyEditorial(originalMain, originalPubs, command) {
  const main = normalize(structuredClone(originalMain || {}));
  const pubs = structuredClone(originalPubs || { schema: 1, items: [] });
  let result = {};
  const input = command?.input || {};
  const type = command?.type;
  if(type==='bundle.import') {
    if(!Array.isArray(input.ideas)||input.ideas.length>100||!Array.isArray(input.slots||[])||(input.slots||[]).length>100||input.ideas.reduce((n,i)=>n+(Array.isArray(i.materials)?i.materials.length:0),0)>200)fail('Проверьте пакет материалов: не более 100 идей и 200 сценариев.');
    let state={main,publications:pubs},created=0;
    const step=(type,input)=>{state=applyEditorial(state.main,state.publications,{type,input});return state.result;};
    for(const idea of input.ideas){
      if(!text(idea.sourceKey,500))fail('У каждой идеи пакета должен быть ключ источника.');
      const topicId=step('ideas.import',{ideas:[idea]}).ids[0];
      if(!Array.isArray(idea.materials||[])||(idea.materials||[]).length>30)fail('Слишком много вариантов у одной идеи.');
      for(const m of idea.materials||[]){
        if(!text(m.sourceKey,500))fail('У каждого сценария пакета должен быть ключ источника.');
        if(all(state.main).some(old=>old.sourceKey===m.sourceKey))continue;
        const id=step('material.create',{ideaId:topicId,platformId:m.platformId,title:m.title}).id;
        step('material.save',{...m,id,status:'in_progress'});
        all(state.main).find(x=>x.id===id).sourceKey=m.sourceKey;created++;
      }
    }
    for(const s of input.slots||[]){
      if(!text(s.sourceKey,500)||!Array.isArray(s.variantSourceKeys))fail('Проверьте ключ группы вариантов.');
      if(state.main.editorial.slots.some(old=>old.sourceKey===s.sourceKey))continue;
      const ids=s.variantSourceKeys.map(key=>all(state.main).find(m=>m.sourceKey===key)?.id);
      const id=step('slot.save',{title:s.title,variantIds:ids,recommendedId:all(state.main).find(m=>m.sourceKey===s.recommendedSourceKey)?.id,reason:s.reason,date:''}).id;
      state.main.editorial.slots.find(x=>x.id===id).sourceKey=s.sourceKey;
    }
    return {...state,result:{created,ids:input.ideas.map(i=>state.main.topics.find(t=>t.sourceKey===i.sourceKey)?.id)}};
  } else if (type === 'main.replace') {
    const incoming = structuredClone(input.data);
    if (!incoming || !Array.isArray(incoming.topics) || !Array.isArray(incoming.products) || !Array.isArray(incoming.funnels)) fail('Проверьте материалы.');
    const before = all(main), oldFunnels=main.funnels;
    for(const topic of incoming.topics){const old=main.topics.find(t=>t.id===topic.id);if(old&&JSON.stringify({...old,contentItems:[]})!==JSON.stringify({...topic,contentItems:[]}))topic.revision=(old.revision||1)+1;}
    for (const key of ['products','productTypes','formats','platforms','topics','funnels','keywords']) if (incoming[key] !== undefined) main[key] = structuredClone(incoming[key]);
    for(const f of main.funnels)if(f.route===undefined)f.route=oldFunnels.find(old=>old.id===f.id)?.route;
    for(const m of all(main)){const links=main.funnels.filter(f=>f.contentItemIds?.includes(m.id));if(m.funnelId&&!links.some(f=>f.id===m.funnelId))m.funnelId=links[0]?.id;}
    for (const previous of before.filter(m => m.revision||m.blocks?.length)) {
      const next = all(main).find(m => m.id === previous.id);
      if (!next) fail('Материал связан с планом. Обновите страницу перед изменением.', 409);
      if (JSON.stringify(next) !== JSON.stringify(previous)) {
        if (previous.blocks?.length && next.body!==previous.body && JSON.stringify(next.blocks)===JSON.stringify(previous.blocks)) fail('Откройте общую карточку сценария: текст экранов изменяется там.',409);
        if(next.blocks?.length)next.body=next.blocks.map(b=>b.text).join('\n\n');
        guardPublished(pubs,previous,{...previous,...next});
        // An older screen must not erase editorial fields or an approved version.
        Object.assign(next, {...previous,...next,scriptApproval:'draft',revision:(previous.revision||1)+1,history:[...(previous.history||[]),snapshot(previous)].slice(-30)});
        const slot = main.editorial.slots.find(s => s.variantIds.includes(next.id));
        if (!slot || slot.selectedId === next.id) syncMaterial(main,pubs,next,slot);
      }
    }
  } else if (type === 'publications.replace') {
    validatePublications(input.data);
    const incoming = structuredClone(input.data);
    for (const previous of pubs.items) {
      const next = incoming.items.find(p => p.id === previous.id);
      if (previous.parts.some(b=>b.contentItemId) && next?.parts.some(b=>!previous.parts.some(old=>old.id===b.id))) fail('Добавьте экран через карточку связанного сценария.');
      for (const oldPart of previous.parts.filter(b => b.contentItemId)) {
        const part = next?.parts.find(b => b.id === oldPart.id);
        if (!part || part.contentItemId !== oldPart.contentItemId || (oldPart.published && (part.text !== oldPart.text || next.date !== previous.date))) fail('Связанный сценарий нельзя удалить или перезаписать через календарь. Откройте его карточку.');
        const material = all(main).find(m => m.id === oldPart.contentItemId);
        if (!material) fail('Связанный материал не найден.');
        if (part.text !== oldPart.text) {
          material.history=[...(material.history||[]),snapshot(material)].slice(-30);
          material.revision=(material.revision||1)+1; material.scriptApproval='draft';
          if (material.blocks?.length) {
            const b=material.blocks.find(b=>b.id===part.blockId);
            if (!b) fail('Экран сценария не найден.');
            b.text=part.text; material.body=material.blocks.map(b=>b.text).join('\n\n');
          } else material.body=part.text;
          part.approvalStatus='draft';
        }
        if(part.text===oldPart.text && (JSON.stringify(part)!==JSON.stringify(oldPart)||next.date!==previous.date))material.revision=(material.revision||1)+1;
        material.publishDate=next.date;
        const slot=main.editorial.slots.find(s=>s.selectedId===material.id);
        if(slot)slot.date=next.date;
        const linked = incoming.items.flatMap(p=>p.parts).filter(b=>b.contentItemId===material.id);
        if(linked.length&&linked.every(b=>b.published))material.status='published';
        else if(material.status==='published')material.status='ready';
      }
    }
    pubs.items=incoming.items;
  } else if (type === 'idea.save' || type === 'ideas.import') {
    const incoming = type === 'ideas.import' ? input.ideas : [input];
    if (!Array.isArray(incoming) || !incoming.length || incoming.length > 200) fail('Добавьте от 1 до 200 идей.');
    const saved = [];
    for (const idea of incoming) {
      if (!text(idea.title, 500).trim()) fail('Напишите название идеи.');
      checkLinks(main, idea);
      const existing = idea.id ? main.topics.find(t => t.id === idea.id) : idea.sourceKey ? main.topics.find(t => t.sourceKey === idea.sourceKey) : main.topics.find(t => t.title.trim().toLowerCase() === idea.title.trim().toLowerCase() && (t.source || '') === (idea.source || ''));
      if (existing && !idea.id) { saved.push(existing.id); continue; }
      if (idea.id && !existing) fail('Идея не найдена.', 404);
      if(existing)checkRevision(existing,idea);
      const next = { ...existing, revision:existing?(existing.revision||1)+1:1, archived:idea.archived ?? existing?.archived ?? false, tags:[...new Set((idea.tags||existing?.tags||[]).map(t=>text(t,80).trim()).filter(Boolean))].slice(0,20), id: existing?.id || numericId(main), title: text(idea.title, 500).trim(), thesisPlan: text(idea.thesisPlan), isIdeaBank: true,
        contentItems: existing?.contentItems || [], formatIds: [...new Set((idea.formatIds || []).filter(id => typeof id === 'string' && (formats[id] || main.platforms?.some(p => p.id === id))))],
        source: text(idea.source, 2000), sourceKey: text(idea.sourceKey, 500), createdDate: existing?.createdDate || dateNow(), productId: idea.productId || undefined };
      if (existing) Object.assign(existing, next); else main.topics.push(next);
      saved.push(next.id);
    }
    result = { ids: saved, links: saved.map(id => `/content?mode=ideas&idea=${id}`) };
  } else if (type === 'material.create') {
    const topic = main.topics.find(t => t.id === input.ideaId);
    if (!topic) fail('Сначала сохраните идею.', 404);
    if (!formats[input.platformId]) fail('Выберите формат.');
    const original = input.fromId ? all(main).find(m => m.id === input.fromId) : null;
    if (input.fromId && !original) fail('Исходный материал не найден.');
    const material = { id: numericId(main), platformId: input.platformId, title: text(input.title, 500) || topic.title,
      body: '', createdDate: dateNow(), publishDate: '', status: 'in_progress', revision: 1,
      scriptApproval: 'draft', productId: original?.productId || topic.productId, funnelId: original?.funnelId,
      ...(original ? { adaptedFromId: original.id } : {}) };
    topic.contentItems.push(material);
    topic.formatIds = [...new Set([...(topic.formatIds || []), input.platformId])];
    result = { id: material.id };
  } else if (['material.save', 'material.approve', 'material.schedule'].includes(type)) {
    const material = all(main).find(m => m.id === input.id);
    if (!material) fail('Материал не найден.', 404);
    checkRevision(material,input);
    if (type === 'material.save') {
      checkLinks(main, {...material,...input});
      if (!text(input.title, 500).trim()) fail('Напишите название материала.');
      if (input.blocks !== undefined && !Array.isArray(input.blocks)) fail('Проверьте список экранов.');
      const blocks = input.blocks === undefined ? material.blocks : input.blocks.map(block);
      if (blocks?.length > 100 || new Set(blocks?.map(b => b.id)).size !== (blocks?.length || 0)) fail('Проверьте порядок и число экранов.');
      const next = { title: text(input.title, 500), body: blocks?.length ? blocks.map(b => b.text).join('\n\n') : text(input.body), blocks,
        visual: text(input.visual), motion: text(input.motion), resources: text(input.resources), cta: text(input.cta),
        assets:input.assets===undefined?material.assets:assets(input.assets), metrics:input.metrics===undefined?material.metrics:metrics(input.metrics),
        productId: 'productId' in input ? input.productId || undefined : material.productId, funnelId: 'funnelId' in input ? input.funnelId || undefined : material.funnelId, funnelRole: ['entry','support','delivery'].includes(input.funnelRole) ? input.funnelRole : 'entry' };
      const changed = Object.keys(next).some(key => JSON.stringify(material[key]) !== JSON.stringify(next[key]));
      if(changed)guardPublished(pubs,material,{...material,...next});
      if (changed) {
        const scriptChanged=['title','body','visual','motion','cta'].some(k=>(material[k]||'')!==(next[k]||''))||JSON.stringify(material.blocks?.map(block)||[])!==JSON.stringify(next.blocks||[]);
        if(scriptChanged)material.history = [...(material.history || []), snapshot(material)].slice(-30);
        Object.assign(material, next, { revision: (material.revision || 1) + 1, scriptApproval: scriptChanged?'draft':material.scriptApproval });
      }
      if (['in_progress', 'ready'].includes(input.status)&&material.status!==input.status){if(!changed)material.revision=(material.revision||1)+1;material.status=input.status;}
      // Legacy many-to-many memberships are canonical; only an explicit selection replaces them.
      if(input.replaceFunnelLinks===true){
        for(const f of main.funnels)f.contentItemIds=(f.contentItemIds||[]).filter(id=>id!==material.id);
      }
      const f=main.funnels.find(f=>f.id===material.funnelId);
      if(f)f.contentItemIds=[...new Set([...(f.contentItemIds||[]),material.id])];
    }
    if (type === 'material.approve') {
      material.revision=(material.revision||1)+1;
      if (!material.body?.trim()) fail('Сначала заполните сценарий.');
      material.scriptApproval = 'approved'; material.approvedRevision = material.revision || 1;
      const slot = main.editorial.slots.find(s => (input.slotId ? s.id === input.slotId : true) && s.variantIds.includes(material.id));
      if (input.slotId && !slot) fail('Вариант не относится к этому месту в плане.');
      if (slot) { slot.selectedId = material.id; for (const id of slot.variantIds) if (id !== material.id) all(main).find(m=>m.id===id).publishDate=''; }
    }
    if (type === 'material.schedule') {
      material.revision=(material.revision||1)+1;
      if (input.date && !validDate(input.date)) fail('Выберите корректную дату.');
      if (isPublished(pubs, material.id)) fail('Опубликованный материал нельзя переносить.');
      const slot = main.editorial.slots.find(s => s.variantIds.includes(material.id));
      if (slot) { slot.date = input.date || ''; /* Scheduling never chooses a variant. */ }
      else material.publishDate = input.date || '';
      if (!input.date) {
        pubs.items = pubs.items.map(p => ({ ...p, parts: p.parts.filter(b => b.contentItemId !== material.id && p.contentItemId !== material.id && (!slot || p.slotId !== slot.id)) })).filter(p => p.parts.length);
      }
    }
    const slot = main.editorial.slots.find(s => s.variantIds.includes(material.id));
    if (slot?.selectedId === material.id) { material.publishDate = slot.date; syncMaterial(main, pubs, material, slot); }
    else if (!slot) syncMaterial(main, pubs, material);
    else if (type === 'material.schedule' && slot.selectedId) { const chosen=all(main).find(m=>m.id===slot.selectedId); chosen.publishDate=slot.date; syncMaterial(main,pubs,chosen,slot); }
    result = { id: material.id };
  } else if(type==='material.fork') {
    const original=all(main).find(m=>m.id===input.id),topic=main.topics.find(t=>t.contentItems.some(m=>m.id===input.id));
    if(!original||!topic)fail('Материал не найден.',404);
    const copy={...original,...input,id:numericId(main),title:text(input.title,500)+' · копия',publishDate:'',status:'in_progress',scriptApproval:'draft',revision:1,history:[],adaptedFromId:original.id};
    delete copy.approvedRevision;delete copy.metrics;delete copy.sourceKey;checkLinks(main,copy);if(copy.assets)copy.assets=assets(copy.assets);
    copy.blocks=copy.blocks?.map(block);copy.body=copy.blocks?.length?copy.blocks.map(b=>b.text).join('\n\n'):text(copy.body);
    topic.contentItems.push(copy);result={id:copy.id};
  } else if(type==='material.metrics') {
    const m=all(main).find(m=>m.id===input.id);if(!m)fail('Материал не найден.',404);checkRevision(m,input);
    const metrics={};for(const k of ['reach','responses','leads','sales']){const v=input.metrics?.[k];if(v!==undefined&&v!==''){if(!Number.isSafeInteger(v)||v<0)fail('Результаты должны быть целыми неотрицательными числами.');metrics[k]=v;}}
    if(input.metrics?.publishedDate&&!validDate(input.metrics.publishedDate))fail('Проверьте дату выхода.');
    m.metrics={...metrics,publishedDate:input.metrics?.publishedDate||'',url:url(input.metrics?.url)};m.revision=(m.revision||1)+1;
  } else if(type==='day.move') {
    if(!validDate(input.from)||!validDate(input.date))fail('Выберите даты.');
    if(input.from===input.date)return {main,publications:pubs,result:{}};
    const moving=pubs.items.filter(p=>p.date===input.from);
    if(moving.some(p=>p.parts.some(b=>b.published)))fail('В дне есть опубликованные материалы. Перенесите оставшиеся по отдельности.');
    for(const p of moving){p.date=input.date;for(const b of p.parts){b.scheduledAt=b.scheduledAt?input.date+b.scheduledAt.slice(10):undefined;b.approvalStatus='draft';const m=all(main).find(m=>m.id===(b.contentItemId||p.contentItemId));if(m){m.publishDate=input.date;m.revision=(m.revision||1)+1;}}}
    for(const s of main.editorial.slots.filter(s=>s.date===input.from))s.date=input.date;
    const stories=pubs.items.filter(p=>p.date===input.date&&p.format==='Сторис');
    if(stories.length>1){stories[0].parts=stories.flatMap(p=>p.parts);pubs.items=pubs.items.filter(p=>!stories.slice(1).includes(p));}
  } else if(type==='slot.dissolve') {
    const s=main.editorial.slots.find(s=>s.id===input.id);if(!s)fail('Группа не найдена.',404);
    for(const p of pubs.items.filter(p=>p.slotId===s.id))delete p.slotId;
    main.editorial.slots=main.editorial.slots.filter(x=>x.id!==s.id);
  } else if(type==='funnel.route') {
    const f=main.funnels.find(f=>f.id===input.id);if(!f)fail('Воронка не найдена.',404);
    if(!Array.isArray(input.steps)||input.steps.length>20)fail('Добавьте до 20 шагов.');
    f.route=input.steps.map(s=>({id:text(s.id,100)||randomUUID(),label:text(s.label,250),url:url(s.url),note:text(s.note,2000)}));
    if(f.route.some(s=>!s.label.trim()))fail('Подпишите каждый шаг.');
  } else if (type === 'slot.save') {
    const ids = [...new Set(input.variantIds || [])];
    if (!ids.length || ids.some(id => !all(main).some(m => m.id === id))) fail('Добавьте варианты сценария.');
    const variants = ids.map(id => all(main).find(m => m.id === id));
    if (new Set(variants.map(m => m.platformId)).size !== 1) fail('Варианты должны быть одного формата.');
    if (variants[0].platformId === 'stories') fail('Цепочки сторис добавляются в день отдельными материалами.');
    if (main.editorial.slots.some(s => s.id !== input.id && s.variantIds.some(id => ids.includes(id)))) fail('Материал уже относится к другому месту в плане.');
    if (input.date && !validDate(input.date)) fail('Проверьте дату.');
    const old = main.editorial.slots.find(s => s.id === input.id);
    if (variants.some(m => !old?.variantIds.includes(m.id)&&(m.publishDate || pubs.items.some(p => p.contentItemId === m.id)))) fail('Сначала снимите отдельные материалы с календаря.');
    const slot = { id: old?.id || randomUUID(), title: text(input.title, 500) || variants[0].title, date: input.date || '', variantIds: ids, recommendedId: ids.includes(input.recommendedId) ? input.recommendedId : ids[0], selectedId: old?.selectedId, reason: text(input.reason, 3000) };
    if (slot.selectedId && !ids.includes(slot.selectedId)) fail('Выбранный сценарий должен остаться среди вариантов.');
    if (old) Object.assign(old, slot); else main.editorial.slots.push(slot);
    if (slot.selectedId) { const chosen=all(main).find(m => m.id === slot.selectedId);chosen.publishDate=slot.date;syncMaterial(main, pubs, chosen, slot); }
    result = { id: slot.id };
  } else if (type === 'focus.save') {
    if (!validDate(input.date)) fail('Выберите дату.');
    checkLinks(main, input);
    const key = input.scope === 'day' ? 'day:' + input.date : input.date;
    if(input.clear===true)delete main.editorial.weeks[key];else main.editorial.weeks[key] = { goal: text(input.goal, 1000), productId: input.productId || undefined, funnelId: input.funnelId || undefined, scope: input.scope === 'day' ? 'day' : 'week' };
  } else fail('Неизвестное действие.');
  if (all(main).length > 3000 || pubs.items.length > 1000 || pubs.items.some(p => p.parts.length > 100)) fail('Слишком много материалов или экранов в одном дне.');
  validatePublications(pubs);
  return { main, publications: pubs, result };
}

export function validatePublications(data) {
  if(data?.schema!==1 || !Array.isArray(data.items) || data.items.length>1000)fail('Проверьте календарь.');
  const ids=new Set(), stories=new Set();
  for(const p of data.items){
    if(!p || typeof p.id!=='string'||!p.id||ids.has(p.id)||!validDate(p.date)||!Object.values(formats).includes(p.format)||typeof p.title!=='string'||!Array.isArray(p.parts)||!p.parts.length||p.parts.length>100)fail('Проверьте дату, формат и блоки публикации.');
    ids.add(p.id);
    if(p.format==='Сторис'){if(stories.has(p.date))fail('В день нужна одна общая серия сторис.');stories.add(p.date);}
    const partIds=new Set();
    for(const b of p.parts){
      if(!b||typeof b.id!=='string'||!b.id||partIds.has(b.id)||typeof b.text!=='string'||b.text.length>50000||typeof b.published!=='boolean')fail('Проверьте текст блока.');
      if(b.scheduledAt!==undefined && (typeof b.scheduledAt!=='string'||!Number.isFinite(Date.parse(b.scheduledAt))||b.scheduledAt.slice(0,10)!==p.date))fail('Проверьте время публикации.');
      if(b.approvalStatus!==undefined && !['draft','approved'].includes(b.approvalStatus))fail('Проверьте согласование.');
      partIds.add(b.id);
    }
  }
}

// Lock order is queue -> publications -> main, matching the existing Threads publisher.
export async function readWorkspace(pool, userId) {
  const { rows } = await pool.query("select key,data,md5(data::text) as revision from cm_user_state where user_id=$1 and key in ('main','publications')", [userId]);
  const main = rows.find(r => r.key === 'main'), pubs = rows.find(r => r.key === 'publications');
  return { main: main?.data || {}, publications: pubs?.data || { schema:1,items:[] }, revisions: { main: main?.revision || 'new', publications: pubs?.revision || 'new' } };
}
export async function updateWorkspace(pool, userId, command) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    // Serializes creation of initially absent state rows and double submits.
    await client.query('select pg_advisory_xact_lock(hashtext($1))', ['editorial:' + userId]);
    const queue = (await client.query("select * from cm_threads_queue where user_id=$1 order by publication_id,part_id for update", [userId])).rows;
    await client.query("select key from cm_user_state where user_id=$1 and key='publications' for update", [userId]);
    await client.query("select key from cm_user_state where user_id=$1 and key='main' for update", [userId]);
    const current = await readWorkspace(client, userId);
    const entity = command.type==='idea.save'?current.main.topics?.find(t=>t.id===command.input?.id):['material.save','material.metrics'].includes(command.type)?all(current.main).find(m=>m.id===command.input?.id):null;
    const entityMatches=entity&&command.input?.revision===(entity.revision||1);
    if (!entityMatches && (!command.revisions || (command.type !== 'publications.replace' && command.revisions.main !== current.revisions.main) || (command.type !== 'main.replace' && command.revisions.publications !== current.revisions.publications))) fail('Материалы обновились на другом устройстве. Обновите список; ваш текст остаётся в редакторе.', 409);
    const next = applyEditorial(current.main, current.publications, command);
    for (const job of queue.filter(q => ['sending','uncertain'].includes(q.status))) {
      const before = current.publications.items.find(p => p.id === job.publication_id)?.parts.find(p => p.id === job.part_id);
      const after = next.publications.items.find(p => p.id === job.publication_id)?.parts.find(p => p.id === job.part_id);
      if (JSON.stringify(before) !== JSON.stringify(after)) fail('Материал сейчас отправляется. Дождитесь результата.', 409);
    }
    for (const [key, data] of [['publications',next.publications],['main',next.main]]) {
      if (JSON.stringify(data) === JSON.stringify(key === 'main' ? current.main : current.publications)) continue;
      await client.query("insert into cm_user_state(user_id,key,data) values($1,$2,$3::jsonb) on conflict(user_id,key) do update set data=excluded.data,updated_at=now()", [userId,key,JSON.stringify(data)]);
    }
    const saved = await readWorkspace(client, userId);
    await client.query('commit');
    return { ...saved, result: next.result };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
