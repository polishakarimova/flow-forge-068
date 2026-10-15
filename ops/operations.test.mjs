import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {archiveDate,assessOffsite,recordSuccess} from './offsite-status.mjs';
import {healthAlerts} from './health.mjs';
const clock=Date.parse('2026-10-15T08:00:00.000Z'),file='karta-2026-10-15T03-20-03-723Z.aes',hash='a'.repeat(64);
const receipt={ok:true,file,sha256:hash,archiveCreatedAt:archiveDate(file),lastVerifiedAt:new Date(clock).toISOString()};
const healthy=()=>({appActive:true,appResponding:true,deployTimer:true,backupTimer:true,restoreTimer:true,backup:{ok:true,at:new Date(clock).toISOString()},restore:{ok:true,at:new Date(clock).toISOString()},backupResult:'success',restoreResult:'success',receipt,disk:{freeBytes:5*1024**3,usedPercent:80}});
test('receipts reject path traversal, invalid dates, hash mismatch and future archives',async()=>{
 for(const name of ['../'+file,'karta-2026-02-30T00-00-00-000Z.aes',file+'/x'])assert.throws(()=>archiveDate(name));
 let saved=false;const options={clock,verifyArchive:async()=>hash,persist:async()=>{saved=true;}};
 await assert.rejects(recordSuccess(file,'b'.repeat(64),options));
 await assert.rejects(recordSuccess('karta-2026-10-16T03-20-03-723Z.aes',hash,options));assert.equal(saved,false);
 assert.equal((await recordSuccess(file,hash,options)).file,file);assert.equal(saved,true);
});
test('reconfirming an old archive cannot make it fresh; failures preserve last success',()=>{
 assert.equal(assessOffsite(receipt,clock).fresh,true);
 assert.equal(assessOffsite({...receipt,archiveCreatedAt:new Date(clock-37*3600000).toISOString()},clock).fresh,false);
 assert.equal(assessOffsite({...receipt,lastVerifiedAt:new Date(clock-37*3600000).toISOString()},clock).fresh,false);
 assert.equal(assessOffsite({...receipt,lastVerifiedAt:new Date(clock+120000).toISOString()},clock).fresh,false);
 assert.equal(assessOffsite({...receipt,ok:false},clock).failed,true);
});
test('health detects failed services, stale or failed backups, receipts, restore and disk',()=>{
 assert.deepEqual(healthAlerts(healthy(),clock),[]);
 for(const [field,alert] of [['appActive','app_down'],['appResponding','app_down'],['deployTimer','deploy_schedule_down'],['backupTimer','backup_schedule_down'],['restoreTimer','restore_schedule_down']])assert.ok(healthAlerts({...healthy(),[field]:false},clock).includes(alert));
 for(const [change,expected] of [[{backup:null},'backup_stale'],[{backup:{ok:false,at:new Date(clock).toISOString()}},'backup_failed'],[{restore:null},'restore_stale'],[{restoreResult:'exit-code'},'restore_failed'],[{receipt:null},'offsite_stale'],[{receipt:{...receipt,ok:false}},'offsite_failed'],[{disk:{freeBytes:1024,usedPercent:90}},'disk_low']])assert.ok(healthAlerts({...healthy(),...change},clock).includes(expected));
});
test('receipt CLI runs through the installed current symlink and rejects bad input',{skip:process.platform==='win32'},()=>{
 const directory=mkdtempSync(join(tmpdir(),'karta-cli-test-'));
 try{const link=join(directory,'receipt.mjs');symlinkSync(fileURLToPath(new URL('./offsite-status.mjs',import.meta.url)),link);const result=spawnSync(process.execPath,[link,'--record-success','../invalid','bad'],{encoding:'utf8',timeout:5000});assert.equal(result.status,1);assert.match(result.stderr,/offsite_receipt_rejected/);}
 finally{rmSync(directory,{recursive:true,force:true});}
});
