import { randomUUID } from 'node:crypto';
import { applyEditorial, productIds } from './content-workspace.mjs';

const fail = (message,status=400) => { throw Object.assign(new Error(message),{status}); };
const posts = main => (main.topics||[]).flatMap(t=>t.contentItems||[]);
const webLink = value => { if(!value)return ''; try { const u=new URL(value); if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw 0; return u.href; } catch { fail('Укажите полную ссылку http:// или https://.'); } };
const validDate = d => !d || /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;

// This command is internal; agents never receive the unrestricted main.replace action.
export function applyAgentCommand(main, pubs, name, input) {
  let state = {main:structuredClone(main||{}),publications:structuredClone(pubs)};
  const step=(type,input)=>{state=applyEditorial(state.main,state.publications,{type,input});return state.result;};
  if(name==='karta_create_post') {
    const ideaId=input.ideaId || step('idea.save',{title:input.ideaTitle||input.title,formatIds:[input.platformId],productId:input.productId}).ids[0];
    const id=step('material.create',{ideaId,platformId:input.platformId,title:input.title}).id;
    step('material.save',{...input,id,status:input.status||'in_progress'});
    for(const f of state.main.funnels||[])f.contentCount=(f.contentItemIds||[]).length;
    return {...state,result:{id,ideaId,link:`/content?material=${id}`}};
  }
  if(name==='karta_update_post') {
    const old=posts(state.main).find(m=>m.id===input.id);if(!old)fail('Материал не найден.',404);
    // Preserve all omitted fields. A body patch must not silently leave obsolete blocks.
    if(input.body!==undefined&&input.blocks===undefined&&old.blocks?.length)fail('У сценария есть экраны. Исправьте blocks или передайте blocks:[] для общего текста.');
    step('material.save',{...old,...input,revision:undefined});
  } else if(name==='karta_save_idea') {
    const old=input.id?(state.main.topics||[]).find(t=>t.id===input.id):null;
    step('idea.save',{...old,...input,revision:undefined});
  } else if(name==='karta_save_product') {
    state.main.products ||= [];
    const old=input.id?state.main.products.find(p=>p.id===input.id):null;if(input.id&&!old)fail('Продукт не найден.',404);
    const next={name:'',typeId:'',format:'',price:'',currency:'₽',description:'',link:'',status:'draft',publishDate:'',...old,...input};
    if(!next.name.trim()||!next.typeId.trim())fail('Заполните название и тип продукта.');
    if(!validDate(next.publishDate))fail('Проверьте дату продукта.');
    next.link=webLink(next.link);next.id=old?.id||Math.max(Date.now(),...state.main.products.map(p=>p.id+1));next.createdDate=old?.createdDate||new Date().toISOString().slice(0,10);
    delete next.requestId;delete next.revisions;
    if(old)Object.assign(old,next);else state.main.products.push(next);
    for(const f of state.main.funnels||[]){const first=state.main.products.find(p=>p.id===productIds(f)[0]);if(first){f.product=first.name;f.productType=first.typeId;}}
    state.result={id:next.id,link:'/products'};
  } else if(name==='karta_save_funnel') {
    state.main.funnels ||= [];state.main.products ||= [];state.main.keywords ||= [];
    const old=input.id?state.main.funnels.find(f=>f.id===input.id):null;if(input.id&&!old)fail('Воронка не найдена.',404);
    const next={id:randomUUID(),keyword:'',cta:'',active:true,badgeColor:'violet',contentItemIds:[],leads:0,sales:0,...old,...input};
    if(!next.keyword.trim())fail('Укажите кодовое слово.');
    next.keyword=next.keyword.trim().toUpperCase();
    const ids=productIds(next);if(ids.some(id=>!state.main.products.some(p=>p.id===id)))fail('Продукт воронки не найден.');
    if(next.contentItemIds.some(id=>!posts(state.main).some(m=>m.id===id)))fail('Связанный пост не найден.');
    for(const m of posts(state.main).filter(m=>next.contentItemIds.includes(m.id))) {
      if(m.productId&&!ids.includes(m.productId))fail('Продукт связанного поста должен входить в воронку.');
    }
    // An explicit membership edit must preserve consistent primary links.
    for(const m of posts(state.main).filter(m=>m.funnelId===next.id&&!next.contentItemIds.includes(m.id))) {
      m.funnelId=state.main.funnels.find(f=>f.id!==next.id&&f.contentItemIds?.includes(m.id))?.id;m.revision=(m.revision||1)+1;
    }
    const first=state.main.products.find(p=>p.id===ids[0]);next.product=first?.name||'';next.productType=first?.typeId||'';next.contentCount=next.contentItemIds.length;
    delete next.requestId;delete next.revisions;const route=next.route;delete next.route;
    if(old)Object.assign(old,next);else state.main.funnels.push(next);
    if(!state.main.keywords.includes(next.keyword))state.main.keywords.push(next.keyword);
    if(route)step('funnel.route',{id:next.id,steps:route});
    state.result={id:next.id,link:'/dashboard'};
  } else {
    const types={karta_schedule_post:'material.schedule',karta_save_focus:'focus.save',karta_save_variants:'slot.save',karta_save_metrics:'material.metrics'};
    if(!types[name])fail('Неизвестное действие.');step(types[name],input);
  }
  // Reuse publication validation and all existing bounds after custom entity edits.
  if((state.main.products||[]).length>3000||(state.main.funnels||[]).length>3000)fail('Слишком много продуктов или воронок.');
  const validated=applyEditorial(state.main,state.publications,{type:'main.replace',input:{data:{topics:state.main.topics||[],products:state.main.products||[],funnels:state.main.funnels||[]}}});
  return {...validated,result:state.result};
}
