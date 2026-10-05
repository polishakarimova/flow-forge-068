import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEditorial,updateWorkspace} from '../../server/content-workspace.mjs';
const fresh=()=>({main:{topics:[{id:1,title:'Idea',contentItems:[{id:10,title:'Title',platformId:'stories',body:'A\n\nB',blocks:[{id:'a',label:'A',text:'A',visual:'',motion:''},{id:'b',label:'B',text:'B',visual:'',motion:''}],revision:1,status:'in_progress',publishDate:''}]}],products:[{id:1},{id:2}],funnels:[{id:'f1',contentItemIds:[10],tripwireId:1},{id:'f2',contentItemIds:[10],tripwireId:2}]},publications:{schema:1,items:[]}});
const run=(s,type,input)=>applyEditorial(s.main,s.publications,{type,input});
const mat=s=>s.main.topics[0].contentItems[0];
test('saving old material preserves multiple funnel memberships; explicit unlink removes them',()=>{
 let s=fresh();s=run(s,'material.save',{...mat(s),title:'Rename'});assert.deepEqual(s.main.funnels.map(f=>f.contentItemIds),[[10],[10]]);
 s=run(s,'material.save',{...mat(s),funnelId:null,replaceFunnelLinks:true});assert.deepEqual(s.main.funnels.map(f=>f.contentItemIds),[[],[]]);
});
test('body-only legacy save cannot diverge from blocks; proper block update synchronizes',()=>{
 let s=run(fresh(),'material.schedule',{id:10,date:'2026-10-05'});let incoming=structuredClone(s.main);mat({main:incoming}).body='Wrong';
 assert.throws(()=>run(s,'main.replace',{data:incoming}),/общую карточку/);
 incoming=structuredClone(s.main);mat({main:incoming}).blocks[1].text='Correct';s=run(s,'main.replace',{data:incoming});assert.equal(mat(s).body,'A\n\nCorrect');assert.equal(s.publications.items[0].parts[1].text,'Correct');
});
test('published story screen stays immutable while remaining screen is editable',()=>{
 let s=run(fresh(),'material.schedule',{id:10,date:'2026-10-05'});s.publications.items[0].parts[0].published=true;
 const next=structuredClone(mat(s));next.blocks[1].text='New second';s=run(s,'material.save',next);assert.equal(s.publications.items[0].parts[1].text,'New second');assert.equal(s.publications.items[0].parts[0].published,true);
 const bad=structuredClone(mat(s));bad.blocks[0].motion='Changed';assert.throws(()=>run(s,'material.save',bad),/Опубликованный экран/);
 const deleteFirst={...mat(s),blocks:mat(s).blocks.slice(1)};assert.throws(()=>run(s,'material.save',deleteFirst),/Опубликованный экран/);
});
test('whole-day move includes unselected slots and merges destination story chains',()=>{
 let s=run(fresh(),'material.schedule',{id:10,date:'2026-10-05'});s.main.topics[0].contentItems.push({id:11,title:'Reel',platformId:'reels',body:'X',publishDate:''});
 s=run(s,'slot.save',{variantIds:[11],date:'2026-10-05'});s.publications.items.push({id:'legacy',date:'2026-10-06',format:'Сторис',title:'Old',parts:[{id:'old',text:'Old',published:false}]});
 s=run(s,'day.move',{from:'2026-10-05',date:'2026-10-06'});assert.equal(s.main.editorial.slots[0].date,'2026-10-06');assert.equal(s.main.editorial.slots[0].selectedId,undefined);assert.equal(s.publications.items.length,1);assert.equal(s.publications.items[0].parts.length,3);assert.equal(mat(s).publishDate,'2026-10-06');
});
test('whole-day move refuses published day atomically',()=>{const s=run(fresh(),'material.schedule',{id:10,date:'2026-10-05'});s.publications.items[0].parts[0].published=true;assert.throws(()=>run(s,'day.move',{from:'2026-10-05',date:'2026-10-06'}),/опубликованные/);assert.equal(s.publications.items[0].date,'2026-10-05');});
test('assets validate URLs, persist beside script, and do not reset approval',()=>{
 let s=run(fresh(),'material.approve',{id:10});s=run(s,'material.save',{...mat(s),assets:[{id:'v',label:'Final',url:'https://drive.google.com/file/d/abc/view',kind:'video'}]});assert.equal(mat(s).assets.length,1);assert.equal(mat(s).scriptApproval,'approved');
 assert.throws(()=>run(s,'material.save',{...mat(s),assets:[{url:'javascript:alert(1)'}]}),/полную ссылку/);
});
test('idea revisions reject stale writes and archive keeps materials',()=>{
 let s=run(fresh(),'idea.save',{id:1,title:'Idea',revision:1,archived:true,tags:['Быт','Быт']});assert.equal(s.main.topics[0].contentItems.length,1);assert.deepEqual(s.main.topics[0].tags,['Быт']);assert.equal(s.main.topics[0].archived,true);
 assert.throws(()=>run(s,'idea.save',{id:1,title:'Stale',revision:1}),e=>e.status===409);
});
test('focus day reset retains week; invalid product/funnel pair rejected',()=>{
 let s=run(fresh(),'focus.save',{date:'2026-10-05',scope:'week',goal:'Week'});s=run(s,'focus.save',{date:'2026-10-05',scope:'day',goal:'Day'});s=run(s,'focus.save',{date:'2026-10-05',scope:'day',clear:true});assert.equal(s.main.editorial.weeks['2026-10-05'].goal,'Week');assert.equal(s.main.editorial.weeks['day:2026-10-05'],undefined);
 assert.throws(()=>run(s,'material.save',{...mat(s),productId:2,funnelId:'f1'}),/не входит/);
});
test('fork recovers own version without modifying server material or calendar',()=>{
 const s=run(fresh(),'material.fork',{...mat(fresh()),body:'Mine',blocks:undefined});assert.equal(mat(s).body,'A\n\nB');assert.equal(s.main.topics[0].contentItems[1].body,'Mine');assert.equal(s.publications.items.length,0);
});
test('dissolving selected slot keeps its calendar placement and all alternatives',()=>{
 let s=fresh();mat(s).platformId='reels';s.main.topics[0].contentItems.push({...mat(s),id:11});s=run(s,'slot.save',{variantIds:[10,11],date:'2026-10-05'});const slot=s.result.id;s=run(s,'material.approve',{id:10,slotId:slot});s=run(s,'slot.dissolve',{id:slot});assert.equal(s.main.editorial.slots.length,0);assert.equal(s.publications.items.length,1);assert.equal(s.publications.items[0].slotId,undefined);assert.equal(s.main.topics[0].contentItems.length,2);
});
test('manual results and real funnel steps save without publishing',()=>{
 let s=run(fresh(),'material.save',{...mat(fresh()),metrics:{reach:50,responses:4,leads:2,sales:1,publishedDate:'2026-10-05'}});assert.equal(mat(s).metrics.sales,1);assert.equal(s.publications.items.length,0);
 s=run(s,'funnel.route',{id:'f1',steps:[{label:'Оплата',url:'',note:'Ссылка готовится'}]});assert.equal(s.main.funnels[0].route[0].label,'Оплата');assert.throws(()=>run(s,'material.save',{...mat(s),metrics:{sales:-1}}));
});
test('stale entity revision is rejected even if workspace revisions match',()=>{const s=fresh();assert.throws(()=>run(s,'material.save',{...mat(s),revision:9}),e=>e.status===409);});

test('whole-day move keeps Threads local hour and requires fresh approval; same day is no-op',()=>{
 let s=fresh();s.publications.items.push({id:'thread',date:'2026-10-05',format:'Threads',title:'Thread',parts:[{id:'t',text:'Text',published:false,scheduledAt:'2026-10-05T18:30:00+02:00',approvalStatus:'approved'}]});
 const same=run(s,'day.move',{from:'2026-10-05',date:'2026-10-05'});assert.equal(same.publications.items[0].parts[0].approvalStatus,'approved');
 s=run(s,'day.move',{from:'2026-10-05',date:'2026-10-08'});assert.equal(s.publications.items[0].parts[0].scheduledAt,'2026-10-08T18:30:00+02:00');assert.equal(s.publications.items[0].parts[0].approvalStatus,'draft');
});

test('bundle import is idempotent, preserves edits, and never assigns dates or approval',()=>{
 const bundle={ideas:[{sourceKey:'i1',title:'Idea',formatIds:['reels'],materials:[{sourceKey:'m1',title:'Reel',platformId:'reels',body:'Original',publishDate:'2026-10-05',scriptApproval:'approved'}]}],slots:[{sourceKey:'s1',title:'Choice',variantSourceKeys:['m1'],recommendedSourceKey:'m1'}]};
 let s=run(fresh(),'bundle.import',bundle);const imported=s.main.topics.find(t=>t.sourceKey==='i1').contentItems[0];assert.equal(s.publications.items.length,0);assert.equal(imported.publishDate,'');assert.equal(imported.scriptApproval,'draft');assert.equal(s.main.editorial.slots[0].selectedId,undefined);
 s=run(s,'material.save',{...imported,body:'My edit'});s=run(s,'bundle.import',bundle);assert.equal(s.result.created,0);assert.equal(s.main.topics.find(t=>t.sourceKey==='i1').contentItems[0].body,'My edit');assert.equal(s.main.editorial.slots.length,1);
});

test('preparation-only changes advance entity revision',()=>{
 let s=run(fresh(),'material.save',mat(fresh()));const before=mat(s).revision;s=run(s,'material.save',{...mat(s),status:'ready'});assert.equal(mat(s).revision,before+1);assert.throws(()=>run(s,'material.save',{...mat(s),revision:before,status:'in_progress'}),e=>e.status===409);
});

test('day move keeps destination story identity and handles old colliding block IDs',()=>{
 const s=fresh();s.publications.items=[{id:'source',date:'2026-10-05',format:'Сторис',title:'Source',parts:[{id:'1',text:'Incoming',published:false}]},{id:'target',date:'2026-10-06',format:'Сторис',title:'Target',parts:[{id:'1',text:'Existing',published:true}]}];
 const next=run(s,'day.move',{from:'2026-10-05',date:'2026-10-06'});assert.equal(next.publications.items.length,1);const item=next.publications.items[0];assert.equal(item.id,'target');assert.equal(item.parts[0].id,'1');assert.equal(item.parts[0].published,true);assert.notEqual(item.parts[1].id,'1');assert.equal(item.parts[1].text,'Incoming');
});
