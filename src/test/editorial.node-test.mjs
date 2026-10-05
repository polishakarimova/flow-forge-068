import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEditorial,validatePublications,updateWorkspace} from '../../server/content-workspace.mjs';
const fresh=()=>({main:{topics:[],products:[],funnels:[]},publications:{schema:1,items:[]}});
const run=(s,type,input)=>applyEditorial(s.main,s.publications,{type,input});
function material(s,format='reels',ideaId){
 if(!ideaId){s=run(s,'idea.save',{title:'Идея',formatIds:['reels','stories']});ideaId=s.result.ids[0];}
 s=run(s,'material.create',{ideaId,platformId:format});
 const id=s.result.id;
 s=run(s,'material.save',{id,title:'Сценарий',body:'Текст',visual:'Кадр',motion:'Появление',status:'in_progress'});
 return {...s,id,ideaId};
}
test('ideas import deduplicates and keeps source and formats',()=>{
 let s=fresh();const ideas=[{title:'Обед с ИИ',formatIds:['reels','stories'],source:'research',sourceKey:'ref-1'}];
 s=run(s,'ideas.import',{ideas});s=run(s,'ideas.import',{ideas});
 assert.equal(s.main.topics.length,1);assert.deepEqual(s.main.topics[0].formatIds,['reels','stories']);assert.equal(s.publications.items.length,0);
});
test('adaptation preserves original idea, does not copy approval or schedule',()=>{
 let s=material(fresh());const first=s.id;s=run(s,'material.approve',{id:first});
 s=run(s,'material.create',{ideaId:s.main.topics[0].id,platformId:'stories',fromId:first});
 assert.equal(s.main.topics[0].contentItems.length,2);assert.equal(s.main.topics[0].contentItems[1].scriptApproval,'draft');assert.equal(s.main.topics[0].contentItems[1].publishDate,'');
});
test('script approval never sets publication approval or creates queue',()=>{
 let s=material(fresh());const id=s.id;s=run(s,'material.schedule',{id,date:'2026-10-06'});s=run(s,'material.approve',{id});
 assert.equal(s.main.topics[0].contentItems[0].scriptApproval,'approved');assert.equal(s.publications.items[0].parts[0].approvalStatus,'draft');assert.equal('queue' in s,false);
});
test('three variants create one placement; switching and moving preserves identity',()=>{
 let s=material(fresh());const ideaId=s.ideaId,ids=[s.id];for(let i=0;i<2;i++){s=material(s,'reels',ideaId);ids.push(s.id);}
 s=run(s,'slot.save',{title:'Выбор',variantIds:ids,date:'2026-10-06'});const slot=s.result.id;
 assert.equal(s.publications.items.length,0);
 s=run(s,'material.approve',{id:ids[0],slotId:slot});const pub=s.publications.items[0].id;
 s=run(s,'material.approve',{id:ids[1],slotId:slot});
 assert.equal(s.publications.items.length,1);assert.equal(s.publications.items[0].id,pub);assert.equal(s.publications.items[0].contentItemId,ids[1]);
 s=run(s,'material.schedule',{id:ids[1],date:'2026-10-08'});assert.equal(s.publications.items[0].date,'2026-10-08');
 s=run(s,'material.schedule',{id:ids[1],date:''});assert.equal(s.publications.items.length,0);
});
test('story chains share one day, carry motion and move without losing another chain',()=>{
 let s=material(fresh(),'stories');const a=s.id,ideaId=s.ideaId;
 s=run(s,'material.save',{id:a,title:'А',body:'',blocks:[{id:'a1',text:'Первый',visual:'Человек',motion:'Въезд',label:'Вход'}]});
 s=run(s,'material.schedule',{id:a,date:'2026-10-06'});s=material(s,'stories',ideaId);const b=s.id;s=run(s,'material.schedule',{id:b,date:'2026-10-06'});
 assert.equal(s.publications.items.length,1);assert.equal(s.publications.items[0].parts.length,2);
 s=run(s,'material.schedule',{id:a,date:'2026-10-07'});assert.equal(s.publications.items.length,2);assert.equal(s.main.topics[0].contentItems[0].blocks[0].motion,'Въезд');
});
test('published version cannot be overwritten or moved',()=>{
 let s=material(fresh());const id=s.id;s=run(s,'material.schedule',{id,date:'2026-10-06'});s.publications.items[0].parts[0].published=true;
 assert.throws(()=>run(s,'material.save',{id,title:'Изменено',body:'Новое'}),/опубликован/i);
 assert.throws(()=>run(s,'material.schedule',{id,date:'2026-10-07'}),/опубликован/i);
});
test('calendar text and date edits update linked material and reset script approval',()=>{
 let s=material(fresh());const id=s.id;s=run(s,'material.schedule',{id,date:'2026-10-06'});s=run(s,'material.approve',{id});
 const incoming=structuredClone(s.publications);incoming.items[0].parts[0].text='Исправлено';incoming.items[0].date='2026-10-07';
 s=run(s,'publications.replace',{data:incoming});
 const m=s.main.topics[0].contentItems[0];assert.equal(m.body,'Исправлено');assert.equal(m.publishDate,'2026-10-07');assert.equal(m.scriptApproval,'draft');assert.equal(m.history.at(-1).body,'Текст');
});
test('week and day focuses coexist, missing links rejected',()=>{
 let s=fresh();s=run(s,'focus.save',{date:'2026-10-05',scope:'week',goal:'Неделя'});s=run(s,'focus.save',{date:'2026-10-05',scope:'day',goal:'День'});
 assert.equal(Object.keys(s.main.editorial.weeks).length,2);
 assert.throws(()=>run(s,'focus.save',{date:'2026-10-05',productId:99}),/Продукт не найден/);
});
test('legacy saves retain editorial focus and metadata',()=>{
 let s=material(fresh());s=run(s,'focus.save',{date:'2026-10-05',goal:'Продажи'});
 const incoming=structuredClone(s.main);delete incoming.editorial;
 s=run(s,'main.replace',{data:incoming});assert.equal(s.main.editorial.weeks['2026-10-05'].goal,'Продажи');
});
test('invalid dates, duplicate parts and unsupported formats rejected',()=>{
 assert.throws(()=>validatePublications({schema:1,items:[{id:'a',date:'2026-02-31',format:'Рилс',title:'x',parts:[{id:'p',text:'',published:false}]}]}));
 let s=material(fresh());assert.throws(()=>run(s,'material.schedule',{id:s.id,date:'2026-02-31'}));
});
test('stale revision rolls back without writes',async()=>{
 const calls=[];const client={query:async(sql)=>{calls.push(sql);return sql.startsWith('select key,data')?{rows:[{key:'main',data:{},revision:'a'},{key:'publications',data:{schema:1,items:[]},revision:'b'}]}:{rows:[]};},release(){}};
 await assert.rejects(updateWorkspace({connect:async()=>client},'u',{type:'idea.save',input:{title:'X'},revisions:{main:'old',publications:'b'}}),e=>e.status===409);
 assert.ok(calls.includes('rollback'));assert.equal(calls.some(s=>s.startsWith('insert')),false);
});



test('undating a slot clears its placement and approving from another view selects the variant',()=>{
 let s=material(fresh());const a=s.id,ideaId=s.ideaId;s=material(s,'reels',ideaId);const b=s.id;
 s=run(s,'slot.save',{title:'Choice',variantIds:[a,b],date:'2026-10-06'});const slot=s.result.id;
 s=run(s,'material.approve',{id:a,slotId:slot});s=run(s,'material.approve',{id:b});
 assert.equal(s.publications.items.length,1);assert.equal(s.publications.items[0].contentItemId,b);
 s=run(s,'slot.save',{id:slot,title:'Choice',variantIds:[a,b],date:''});
 assert.equal(s.publications.items.length,0);
 assert.equal(s.main.topics[0].contentItems.find(m=>m.id===b).publishDate,'');
});
