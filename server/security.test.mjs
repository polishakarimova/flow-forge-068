import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {requestProtection,readJsonBody,telegramAuthDateValid,productionConfigErrors} from './request-security.mjs';
import {ensureSessionSchema,issueSession,readSession,revokeSession,authorizeAdmin} from './session-store.mjs';
import {readContext,saveContext} from './context-state.mjs';
import {PGlite} from '@electric-sql/pglite';
test('request protection blocks hostile origin, form body, oversized writes and untrusted proxy spoofing',async()=>{
 const headers={},res={setHeader:(k,v)=>headers[k]=v},url=new URL('https://kartakontenta.ru/api/content-workspace');
 const req={method:'POST',headers:{origin:url.origin,'content-type':'application/json'},socket:{remoteAddress:'10.0.0.1'}};
 const guard=requestProtection({appUrl:url.origin,clock:()=>1234,trustProxy:true});
 assert.equal(guard(req,res,url),null);assert.equal(headers['Cache-Control'],'no-store');assert.ok(headers['Content-Security-Policy']);
 assert.equal(guard({...req,headers:{...req.headers,origin:'https://attacker.invalid'}},res,url).status,403);
 assert.equal(guard({...req,headers:{...req.headers,'content-type':'text/plain'}},res,url).status,415);
 assert.equal(guard({...req,headers:{...req.headers,'content-length':'2000001'}},res,url).status,413);
 for(let i=0;i<250;i++)guard({...req,headers:{...req.headers,'x-real-ip':String(i)}},res,url);
 assert.equal(guard(req,res,url).status,429);assert.ok(headers['Retry-After']);
 await assert.rejects(()=>readJsonBody(Readable.from([Buffer.alloc(12)]),10),e=>e.status===413);
 await assert.rejects(()=>readJsonBody(Readable.from(['{bad'])),e=>e.status===400);
});
test('fresh Telegram dates and production secrets fail closed',()=>{
 const clock=1_000_000;assert.equal(telegramAuthDateValid(1000,clock),true);
 assert.equal(telegramAuthDateValid(699,clock),false);assert.equal(telegramAuthDateValid(1060,clock),false);
 assert.ok(productionConfigErrors({NODE_ENV:'production',APP_URL:'http://localhost',DATABASE_URL:'postgres://localhost/app',SESSION_SECRET:'weak'}).length>=4);
});
test('real SQL: revoked sessions, finite admin access, context version conflicts and account isolation',async()=>{
 const db=new PGlite(),query=async(sql,args)=>{const r=args?await db.query(sql,args):(await db.exec(sql)).at(-1);return {...r,rowCount:r?.affectedRows};};
 const pool={query,connect:async()=>({query,release(){}})},secret='s'.repeat(64),clock=Date.now();
 try{
  await ensureSessionSchema(pool);const token=await issueSession(pool,'fixture-owner',secret,clock);
  const session=await readSession(pool,token,secret,clock);assert.equal(session.user_id,'fixture-owner');
  assert.equal(await readSession(pool,token+'x',secret,clock),null);
  assert.equal(await authorizeAdmin(pool,session,clock),true);
  const elevated=await readSession(pool,token,secret,clock+1000);assert.equal(await authorizeAdmin(pool,elevated,clock+301000),false);
  await revokeSession(pool,token);assert.equal(await readSession(pool,token,secret,clock),null);
  const other=await issueSession(pool,'fixture-other',secret,clock);assert.ok(await readSession(pool,other,secret,clock));
  await query('create table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz,primary key(user_id,key))');
  const first=await saveContext(pool,'fixture-owner',{expertProfile:{name:'One'}},'new');assert.notEqual(first.revision,'new');
  await assert.rejects(()=>saveContext(pool,'fixture-owner',{expertProfile:{name:'Lost update'}},'new'),e=>e.status===409);
  assert.equal((await readContext(pool,'fixture-owner')).data.expertProfile.name,'One');
  assert.deepEqual(await readContext(pool,'fixture-other'),{data:null,revision:'new'});
  const saved=await saveContext(pool,'fixture-owner',{expertProfile:{name:'Two'}},first.revision);assert.notEqual(saved.revision,first.revision);
  await assert.rejects(()=>saveContext(pool,'fixture-owner',{},undefined),e=>e.status===428);
 }finally{await db.close();}
});
