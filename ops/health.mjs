import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,mkdir,writeFile,rename,statfs} from 'node:fs/promises';
import {assessOffsite} from './offsite-status.mjs';
const run=promisify(execFile),directory='/var/lib/kartakontenta-health';
const messages={app_down:'Приложение или база недоступны',deploy_schedule_down:'Остановлена проверка обновлений',backup_schedule_down:'Остановлено создание копий',restore_schedule_down:'Остановлена проверка восстановления',backup_stale:'Нет свежей серверной копии',backup_failed:'Ошибка создания копии',offsite_stale:'Компьютер давно не подтвердил свежую копию',offsite_failed:'Ошибка копирования на компьютер',restore_stale:'Давно не проверялось восстановление',restore_failed:'Ошибка проверки восстановления',disk_low:'Мало свободного места на сервере'};
export function healthAlerts(state,clock=Date.now()){
 const fresh=(value,max)=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=clock+60000&&clock-Date.parse(value)<max;
 const alerts=[];
 if(!state.appActive||!state.appResponding)alerts.push('app_down');
 for(const [field,alert] of [['deployTimer','deploy_schedule_down'],['backupTimer','backup_schedule_down'],['restoreTimer','restore_schedule_down']])if(!state[field])alerts.push(alert);
 if(!fresh(state.backup?.at,36*3600000))alerts.push('backup_stale');
 if(state.backup?.ok===false||state.backupResult!=='success')alerts.push('backup_failed');
 const offsite=assessOffsite(state.receipt,clock);if(!offsite.fresh)alerts.push('offsite_stale');if(offsite.failed)alerts.push('offsite_failed');
 if(!fresh(state.restore?.at,8*86400000))alerts.push('restore_stale');
 if(state.restore?.ok===false||state.restoreResult!=='success')alerts.push('restore_failed');
 if(state.disk.freeBytes<2*1024**3||state.disk.usedPercent>=85)alerts.push('disk_low');
 return alerts;
}
async function json(path){try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}}
async function command(args){try{return (await run('systemctl',args,{timeout:5000,maxBuffer:4096})).stdout.trim();}catch{return '';}}
async function responds(){try{const response=await fetch('http://127.0.0.1:3001/api/health',{signal:AbortSignal.timeout(4000)});return response.ok&&(await response.json()).ok===true;}catch{return false;}}
async function main(){
 const [app,deploy,backupTimer,restoreTimer,backupResult,restoreResult,appResponding,backup,restore,receipt,disk,previous]=await Promise.all([
  ...['kartakontenta.service','kartakontenta-deploy.timer','kartakontenta-backup.timer','kartakontenta-backup-verify.timer'].map(unit=>command(['is-active',unit])),
  ...['kartakontenta-backup.service','kartakontenta-backup-verify.service'].map(unit=>command(['show',unit,'--property=Result','--value'])),
  responds(),json('/opt/kartakontenta-backups/encrypted/create-status.json'),json('/opt/kartakontenta-backups/encrypted/verify-status.json'),json(directory+'/offsite-receipt.json'),statfs('/opt/kartakontenta'),json(directory+'/status.json')
 ]);
 const state={at:new Date().toISOString(),appActive:app==='active',appResponding,deployTimer:deploy==='active',backupTimer:backupTimer==='active',restoreTimer:restoreTimer==='active',backupResult,restoreResult,backup,restore,receipt,disk:{freeBytes:disk.bavail*disk.bsize,usedPercent:Math.round((1-disk.bavail/disk.blocks)*100)},notificationsConfigured:false};
 state.alerts=healthAlerts(state);state.messages=state.alerts.map(code=>messages[code]);
 await mkdir(directory,{recursive:true,mode:0o700});const temp=directory+'/status.json.tmp';await writeFile(temp,JSON.stringify(state),{mode:0o600});await rename(temp,directory+'/status.json');
 for(const code of state.alerts)if(!previous?.alerts?.includes(code))console.error(messages[code]);
 console.log(JSON.stringify({ok:state.alerts.length===0,alerts:state.alerts}));
}
if(process.argv.includes('--run'))await main();
