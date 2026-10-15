import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {legalManifest,loadLegalManifest,ensureLegalSchema,legalState,legalStatus,saveLegalChoice,requireLegal,canSendMarketing,legalApi} from './legal-consent.mjs';
const choice=(changes={})=>({version:legalManifest.version,manifestHash:legalManifest.manifestHash,terms:true,personalData:false,advertising:false,...changes});
async function database(){
  const db=new PGlite();const query=async(sql,args)=>args?db.query(sql,args):(await db.exec(sql)).at(-1);
  const pool={query,connect:async()=>({query,release(){}})};await ensureLegalSchema(pool);return {db,pool};
}
test('real SQL: no automatic consent, no marketing by default, isolated account and idempotent retry',async()=>{
  const {db,pool}=await database();try{
    await assert.rejects(requireLegal(pool,'owner'),e=>e.status===428);
    assert.equal(legalStatus(await legalState(pool,'owner')).accepted,false);
    assert.equal(await canSendMarketing(pool,'owner'),false);
    const value=await saveLegalChoice(pool,'owner',choice({userId:'other'}));
    assert.equal(value.accepted,true);assert.equal(value.personalData,false);assert.equal(value.advertising,false);
    await requireLegal(pool,'owner');await assert.rejects(requireLegal(pool,'other'),e=>e.status===428);
    await saveLegalChoice(pool,'owner',choice());
    const events=(await pool.query('select * from cm_legal_events')).rows;
    assert.equal(events.length,1);assert.equal(events[0].user_id,'owner');assert.equal(events[0].documents.length,4);
    assert.equal(events[0].documents[0].sha256,legalManifest.documents[0].sha256);
  }finally{await db.close();}
});
test('real SQL: independent optional choices, immediate withdrawal and no duplicate withdrawal event',async()=>{
  const {db,pool}=await database();try{
    await assert.rejects(saveLegalChoice(pool,'owner',choice({terms:false})),e=>e.status===400);
    await assert.rejects(saveLegalChoice(pool,'owner',choice({advertising:true})),e=>e.status===400);
    await saveLegalChoice(pool,'owner',choice({personalData:true}));assert.equal(await canSendMarketing(pool,'owner'),false);
    const enabled=await saveLegalChoice(pool,'owner',choice({personalData:true,advertising:true}),{action:'preferences'});
    assert.equal(await canSendMarketing(pool,'owner'),true);
    const withdrawn=await saveLegalChoice(pool,'owner',{}, {action:'withdraw'});
    assert.equal(withdrawn.accepted,true);assert.equal(withdrawn.personalData,false);assert.equal(withdrawn.advertising,false);
    assert.equal(new Date(withdrawn.acceptedAt).toISOString(),new Date(enabled.acceptedAt).toISOString());
    assert.equal(await canSendMarketing(pool,'owner'),false);await requireLegal(pool,'owner');
    await saveLegalChoice(pool,'owner',{}, {action:'withdraw'});
    assert.equal((await pool.query('select * from cm_legal_events')).rows.length,3);
    await assert.rejects(saveLegalChoice(pool,'other',choice(),{action:'preferences'}),e=>e.status===428);
  }finally{await db.close();}
});
test('real SQL: changed document hash invalidates old consent and rejects stale submissions',async()=>{
  const {db,pool}=await database();try{
    await saveLegalChoice(pool,'owner',choice({personalData:true,advertising:true}));
    const changed={...legalManifest,manifestHash:'f'.repeat(64)};
    assert.equal(legalStatus(await legalState(pool,'owner'),changed).accepted,false);
    assert.equal(legalStatus(await legalState(pool,'owner'),changed).advertising,false);
    await assert.rejects(saveLegalChoice(pool,'owner',choice(),{manifest:changed}),e=>e.status===409);
    const state=await saveLegalChoice(pool,'owner',choice({manifestHash:changed.manifestHash}),{manifest:changed});
    assert.equal(state.accepted,true);assert.equal(state.advertising,false);
    assert.equal((await pool.query('select * from cm_legal_events')).rows.length,2);
  }finally{await db.close();}
});
test('HTTP handlers: documents are public, choices require session and cannot impersonate another account',async()=>{
  const {db,pool}=await database();try{
    const call=async(path,method,user,input)=>{let result;await legalApi({method},{},{path,pool,send:(_res,status,data)=>{result={status,data};},readBody:async()=>input,getUser:async()=>user});return result;};
    assert.equal((await call('/api/legal','GET',null)).status,200);
    assert.equal((await call('/api/legal/accept','POST',null,choice())).status,401);
    assert.equal((await call('/api/legal/accept','GET',{id:'owner'})).status,405);
    assert.equal((await call('/api/legal/accept','POST',{id:'owner'},choice({userId:'other'}))).status,200);
    assert.equal((await call('/api/legal/status','GET',{id:'other'})).data.accepted,false);
    assert.equal((await call('/api/legal/accept','POST',{id:'owner'},choice({version:'old'}))).status,409);
  }finally{await db.close();}
});
test('startup rejects changed or missing public documents before accepting any choice',()=>{
  const dir=mkdtempSync(join(tmpdir(),'karta-legal-'));
  try{
    cpSync(new URL('../public/legal',import.meta.url),join(dir,'legal'),{recursive:true});
    assert.equal(loadLegalManifest(pathToFileURL(dir+'/')).manifestHash,legalManifest.manifestHash);
    const file=join(dir,legalManifest.documents[0].href.slice(1));writeFileSync(file,readFileSync(file,'utf8')+'modified');
    assert.throws(()=>loadLegalManifest(pathToFileURL(dir+'/')),/hash_mismatch/);
  }finally{assert.ok(dir.startsWith(join(tmpdir(),'karta-legal-')));rmSync(dir,{recursive:true,force:true});}
});
