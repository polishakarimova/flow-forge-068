import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ensureAgentSchema,createAgentConnection,exchangeAgentCode,refreshAgentToken,authenticateAgent,revokeAgent,executeAgentTool } from './agent-api.mjs';
import { readWorkspace } from './content-workspace.mjs';

// Call only on an isolated database or a connection whose search_path is pg_temp.
export async function runAgentDbChecks(pool) {
  await pool.query(`create table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz default now(),primary key(user_id,key));create table cm_threads_queue(user_id text,publication_id text,part_id text,status text);`);
  await ensureAgentSchema(pool);
  const auth=access=>authenticateAgent(pool,{headers:{authorization:'Bearer '+access}});
  const full=await createAgentConnection(pool,'owner',{name:'Writer',scopes:['content','products','funnels','planning','context']});
  const credentials=await exchangeAgentCode(pool,full.code);let agent=await auth(credentials.access_token);
  assert.equal(agent.user_id,'owner');await assert.rejects(exchangeAgentCode(pool,full.code),e=>e.status===401);
  await pool.query("insert into cm_user_state(user_id,key,data) values('owner','context','{\"privateFixture\":true}'::jsonb)");
  assert.equal((await executeAgentTool(pool,agent,'karta_get',{kind:'context'})).item.privateFixture,true);
  const snap=()=>readWorkspace(pool,'owner');
  const write=async(name,input={},revisions)=>(await executeAgentTool(pool,agent,name,{...input,requestId:randomUUID(),revisions:revisions||(await snap()).revisions}));
  const first={title:'Синтетический пост',platformId:'tg_post',body:'Черновик',requestId:randomUUID(),revisions:(await snap()).revisions};
  const created=await executeAgentTool(pool,agent,'karta_create_post',first),id=created.result.id;
  const replay=await executeAgentTool(pool,agent,'karta_create_post',first);assert.equal(replay.result.id,id);assert.equal(replay.replayed,true);
  assert.equal((await snap()).main.topics[0].contentItems.length,1);
  await assert.rejects(executeAgentTool(pool,agent,'karta_create_post',{...first,body:'Подмена'}),e=>e.status===409);
  await assert.rejects(write('karta_update_post',{id,body:'Потерянная версия'},first.revisions),e=>e.status===409);
  await write('karta_update_post',{id,body:'Правка'});assert.equal((await snap()).main.topics[0].contentItems[0].body,'Правка');
  const bad={title:'Не должен сохраниться',platformId:'tg_post',productId:123456,body:'Bad'};
  const before=JSON.stringify(await snap());await assert.rejects(write('karta_create_post',bad));assert.equal(JSON.stringify(await snap()),before,'failed command rolls back idea + post + audit');
  const readOnly=await createAgentConnection(pool,'other',{name:'Reader',scopes:['read']});const readerCredentials=await exchangeAgentCode(pool,readOnly.code),reader=await auth(readerCredentials.access_token);
  assert.equal((await executeAgentTool(pool,reader,'karta_list',{kind:'posts'})).total,0);
  await assert.rejects(executeAgentTool(pool,reader,'karta_get',{kind:'context'}),e=>e.status===403);
  await assert.rejects(executeAgentTool(pool,reader,'karta_get',{kind:'post',id}),e=>e.status===404);
  await assert.rejects(executeAgentTool(pool,reader,'karta_update_post',{id,body:'Hack',requestId:randomUUID(),revisions:(await snap()).revisions}),e=>e.status===403);
  const otherFull=await createAgentConnection(pool,'other',{name:'Other writer',scopes:['content']});const otherAgent=await auth((await exchangeAgentCode(pool,otherFull.code)).access_token);
  await assert.rejects(executeAgentTool(pool,otherAgent,'karta_update_post',{id,body:'Hack',requestId:randomUUID(),revisions:{main:'new',publications:'new'}}),e=>e.status===404);
  await write('karta_schedule_post',{id,date:'2030-10-13'});
  await pool.query("insert into cm_threads_queue values($1,$2,$3,'sending')",['owner',(await snap()).publications.items[0].id,(await snap()).publications.items[0].parts[0].id]);
  await assert.rejects(write('karta_update_post',{id,body:'Cannot change sending'}),e=>e.status===409);
  const rotated=await refreshAgentToken(pool,credentials.refresh_token);await assert.rejects(auth(credentials.access_token),e=>e.status===401);await assert.rejects(refreshAgentToken(pool,credentials.refresh_token),e=>e.status===401);
  agent=await auth(rotated.access_token);assert.equal((await executeAgentTool(pool,agent,'karta_overview',{})).counts.posts,1);
  await assert.rejects(revokeAgent(pool,'other',agent.id),e=>e.status===404);
  await revokeAgent(pool,'owner',agent.id);await assert.rejects(auth(rotated.access_token),e=>e.status===401);await assert.rejects(refreshAgentToken(pool,rotated.refresh_token),e=>e.status===401);
  await assert.rejects(write('karta_save_idea',{title:'No permission'}),e=>e.status===401);
  const expired=await createAgentConnection(pool,'expiring',{name:'Expired',scopes:['read']});await pool.query("update cm_agent_connections set code_expires_at=now()-interval '1 second' where id=$1",[expired.agent.id]);await assert.rejects(exchangeAgentCode(pool,expired.code),e=>e.status===401);
  for(let i=0;i<5;i++)await createAgentConnection(pool,'limit',{name:'Agent '+i,scopes:['read']});await assert.rejects(createAgentConnection(pool,'limit',{name:'Sixth',scopes:['read']}),e=>e.status===409);
  const audit=await pool.query('select * from cm_agent_actions');assert.equal(audit.rows.length,3);assert.equal(JSON.stringify(audit.rows).includes(credentials.access_token),false);
  return {ok:true,checks:'pairing, expiry, one-time code, scopes, account isolation, rollback, revisions, idempotency, in-flight guard, token rotation, revocation, limit, audit'};
}
