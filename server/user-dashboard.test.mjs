import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {buildUserDashboard,readUserDashboard} from './user-dashboard.mjs';
import {buildAdminOverview} from './admin-overview.mjs';
const clock=Date.parse('2026-10-15T12:00:00Z');
const main={products:[{id:1}],funnels:[{id:'f',active:true,contentItemIds:[1]}],topics:[{isIdeaBank:true,contentItems:[
 {id:1,title:'Свой материал',body:'PRIVATE BODY',platformId:'reels',status:'ready',productId:1,cta:'Напишите',metrics:{reach:100,leads:0}},
 {id:2,title:'Сильный материал',platformId:'tg_post',status:'published',metrics:{reach:20,leads:3,sales:1}},
]},{archived:true,contentItems:[{id:3,metrics:{reach:99999}}]}]};
const pubs={items:[
 {id:'today',date:'2026-10-15',title:'Сегодня',format:'Рилс',parts:[{published:false}]},
 {id:'done',date:'2026-10-16',title:'Завершено',parts:[{published:true}]},
 {id:'last',date:'2026-10-21',title:'Через шесть дней',parts:[{published:false},{published:true}]},
 {id:'late',date:'2026-10-22',title:'Позже недели',parts:[{}]},
 {id:'old',date:'2026-10-14',title:'Вчера',parts:[{}]},
]};
test('personal dashboard separates material totals, manual metrics and calendar parts',()=>{
 const result=buildUserDashboard(main,pubs,clock);
 assert.equal(result.stats.contentItems,2);assert.equal(result.content.results.reach,120);assert.equal(result.content.results.coverage.sales,1);
 assert.equal(result.content.results.leads,3);assert.equal(result.content.withProduct,1);assert.equal(result.content.activeFunnels,1);
 assert.deepEqual(result.upcoming.items.map(p=>p.id),['today','last']);assert.equal(result.upcoming.items[1].remaining,1);
 assert.equal(result.calendar.published,2);assert.equal(result.resultMaterials[0].id,2);assert.equal(result.resultMaterials[1].metrics.leads,0);
 assert.equal(result.resultMaterials[1].metrics.sales,undefined);assert.ok(!JSON.stringify(result).includes('PRIVATE BODY'));
});
test('missing and empty workspaces remain empty instead of showing another account or invented results',()=>{
 const result=buildUserDashboard(null,null,clock);
 assert.equal(result.stats.contentItems,0);assert.equal(result.content.results.materials,0);assert.deepEqual(result.resultMaterials,[]);assert.equal(result.upcoming.total,0);
});
test('service admin never includes users business results, readiness or upcoming plans',()=>{
 const result=buildAdminOverview({clock,accounts:[{id:'owner'}],states:[{user_id:'owner',key:'main',data:main},{user_id:'owner',key:'publications',data:pubs}]});
 assert.equal(result.totals.contentItems,2);assert.equal(result.audience.adoption.complete,1);
 for(const key of ['content','calendar','upcoming','resultMaterials'])assert.equal(Object.hasOwn(result,key),false);
 for(const secret of ['Свой материал','Сильный материал','PRIVATE BODY','reach','sales'])assert.ok(!JSON.stringify(result).includes(secret));
});
test('real SQL: each account gets only its own summary; context and other-account state are never read',async()=>{
 const db=new PGlite();
 const pool={query:(sql,args)=>db.query(sql,args)};
 try{
  await db.exec('create table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz default now())');
  await db.query('insert into cm_user_state(user_id,key,data) values($1,$2,$3),($1,$4,$5),($6,$2,$7),($1,$8,$9)',['owner','main',JSON.stringify(main),'publications',JSON.stringify(pubs),'other',JSON.stringify({topics:[{contentItems:[{id:9,title:'OTHER ACCOUNT',metrics:{reach:5000}}]}]}),'context','{"private":"PRIVATE CONTEXT"}']);
  const owner=await readUserDashboard(pool,'owner',clock),other=await readUserDashboard(pool,'other',clock),empty=await readUserDashboard(pool,'empty',clock);
  assert.equal(owner.content.results.reach,120);assert.equal(other.content.results.reach,5000);assert.equal(empty.content.results.materials,0);
  assert.ok(!JSON.stringify(owner).includes('OTHER ACCOUNT'));assert.ok(!JSON.stringify(owner).includes('PRIVATE CONTEXT'));assert.ok(!JSON.stringify(other).includes('Свой материал'));
  assert.ok(owner.updatedAt);await assert.rejects(()=>readUserDashboard(pool,'',clock),e=>e.status===401);
  assert.equal((await db.query('select count(*)::int as n from cm_user_state')).rows[0].n,4);
 }finally{await db.close();}
});
