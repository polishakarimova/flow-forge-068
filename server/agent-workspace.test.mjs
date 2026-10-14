import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyAgentCommand } from './agent-workspace.mjs';
import { agentTools } from './agent-tools.mjs';

const empty=()=>({main:{topics:[],products:[],funnels:[],keywords:[]},publications:{schema:1,items:[]}});
const run=(s,name,input)=>applyAgentCommand(s.main,s.publications,name,input);
test('post creation is atomic and edits preserve omitted script fields',()=>{
  const original=empty();let s=run(original,'karta_create_post',{title:'Пост',platformId:'tg_post',body:'Текст',cta:'Напиши',visual:'Кадр',resources:'Источники'});
  assert.equal(original.main.topics.length,0);assert.equal(s.main.topics.length,1);
  const id=s.result.id;s=run(s,'karta_update_post',{id,body:'Правка'});
  const post=s.main.topics[0].contentItems[0];assert.equal(post.body,'Правка');assert.equal(post.cta,'Напиши');assert.equal(post.visual,'Кадр');assert.equal(post.resources,'Источники');assert.equal(post.scriptApproval,'draft');assert.equal(post.history.at(-1).body,'Текст');
});
test('story edits require explicit screens; published screen remains immutable',()=>{
  let s=run(empty(),'karta_create_post',{title:'Сторис',platformId:'stories',blocks:[{id:'a',text:'Первый'},{id:'b',text:'Второй'}]});const id=s.result.id;
  s=run(s,'karta_schedule_post',{id,date:'2030-10-13'});assert.equal(s.publications.items[0].parts[0].approvalStatus,'draft');
  assert.throws(()=>run(s,'karta_update_post',{id,body:'Старые экраны?'}),/экраны/);
  s.publications.items[0].parts[0].published=true;
  assert.throws(()=>run(s,'karta_update_post',{id,blocks:[{id:'a',text:'Правка первого'},{id:'b',text:'Второй'}]}),/Опубликованный экран/);
  s=run(s,'karta_update_post',{id,blocks:[{id:'a',text:'Первый'},{id:'b',text:'Правка второго'}]});assert.equal(s.publications.items[0].parts[1].text,'Правка второго');
});
test('product and funnel creation maintain references and reject foreign/missing links',()=>{
  let s=run(empty(),'karta_save_product',{name:'Гайд',typeId:'lead_magnet',link:'https://example.com/guide'});const productId=s.result.id;
  s=run(s,'karta_save_funnel',{keyword:'ГАЙД',leadMagnetId:productId,route:[{label:'Выдача',url:'https://example.com/guide'}]});const funnelId=s.result.id;
  s=run(s,'karta_create_post',{title:'Вход',platformId:'reels',productId,funnelId,body:'Сценарий'});const id=s.result.id;
  assert.ok(s.main.funnels[0].contentItemIds.includes(id));assert.equal(s.main.funnels[0].route[0].label,'Выдача');
  assert.throws(()=>run(s,'karta_save_funnel',{id:funnelId,leadMagnetId:999}),/Продукт воронки/);
  assert.throws(()=>run(s,'karta_update_post',{id,productId:999}),/Продукт не найден/);
  s=run(s,'karta_save_funnel',{id:funnelId,contentItemIds:[]});assert.equal(s.main.topics[0].contentItems[0].funnelId,undefined);
});
test('planning uses the real calendar and never approves delivery',()=>{
  let s=run(empty(),'karta_create_post',{title:'Threads',platformId:'threads',body:'Текст'});const id=s.result.id;
  s=run(s,'karta_schedule_post',{id,date:'2030-10-14'});assert.equal(s.publications.items[0].date,'2030-10-14');assert.equal(s.publications.items[0].parts[0].approvalStatus,'draft');assert.equal(s.publications.items[0].parts[0].published,false);
  s=run(s,'karta_schedule_post',{id,date:''});assert.equal(s.publications.items.length,0);
});
test('validation rejects malformed tools, status forgery, arbitrary state replacement and bad URLs',()=>{
  const base={requestId:randomUUID(),revisions:{main:'new',publications:'new'}};
  assert.throws(()=>agentTools.karta_create_post.schema.parse({...base,title:'Пост',platformId:'threads',status:'published'}));
  assert.throws(()=>agentTools.karta_update_post.schema.parse({...base,id:123,published:true}));
  assert.throws(()=>agentTools.karta_save_product.schema.parse({...base,name:'Гайд',userId:'other'}));
  assert.throws(()=>run(empty(),'main.replace',{}),/Неизвестное действие/);
  assert.throws(()=>run(empty(),'karta_save_product',{name:'Гайд',typeId:'lead_magnet',link:'javascript:alert(1)'}),/полную ссылку/);
  assert.throws(()=>run(empty(),'karta_schedule_post',{id:1,date:'2030-02-31'}));
});
