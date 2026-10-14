import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {databasePool,readEnv,tables,fingerprint} from './db-config.mjs';
const root=process.env.KARTA_CODE_ROOT||(existsSync('/opt/kartakontenta/current/server/telegram-auth-server.mjs')?'/opt/kartakontenta/current':'/opt/flow-forge-068'),base='/opt/kartakontenta-backups/encrypted',keyFile='/etc/kartakontenta/backup.key';
mkdirSync(base,{recursive:true,mode:0o700});mkdirSync('/etc/kartakontenta',{recursive:true,mode:0o700});
if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32),{mode:0o600,flag:'wx'});
const key=readFileSync(keyFile);if(key.length!==32)throw Error('Invalid backup key');
const mode=process.argv[2]||'create',runtimeFile='/etc/kartakontenta/runtime.env',env=readEnv(mode==='verify'||!existsSync(runtimeFile)?'/etc/kartakontenta/migration.env':runtimeFile);
const url=new URL(env.DATABASE_URL),pgEnv={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1),PGSSLMODE:'verify-full',PGSSLROOTCERT:env.PGSSLROOTCERT};
const pool=databasePool(env),temp=mkdtempSync(join(base,'.staging-'));
let restoreDb;
function status(value){writeFileSync(join(base,mode+'-status.json'),JSON.stringify({at:new Date().toISOString(),...value}),{mode:0o600});}
try{
 if(mode==='create'){
  const client=await pool.connect();let manifest;
  try{
   await client.query('begin isolation level repeatable read read only');const snapshot=(await client.query('select pg_export_snapshot() as id')).rows[0].id;
   const counts={};for(const table of tables){const exists=(await client.query('select to_regclass($1) as id',[table])).rows[0].id;if(exists)counts[table]=(await client.query('select count(*)::int as n from "'+table+'"')).rows[0].n;}
   const types={};for(const name of ['AuthProvider','TelegramLoginStatus'])types[name]=(await client.query('select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname=$1 and t.typname=$2 order by e.enumsortorder',['public',name])).rows.map(row=>row.enumlabel);
   manifest={schema:1,at:new Date().toISOString(),counts,types,state:await fingerprint(client)};
   execFileSync('pg_dump',['--format=custom','--no-owner','--no-privileges','--snapshot='+snapshot,'--file='+join(temp,'database.dump'),...Object.keys(counts).map(table=>'--table=public.'+table)],{env:pgEnv,stdio:['ignore','ignore','pipe'],timeout:120000});
   await client.query('commit');
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
  writeFileSync(join(temp,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
  const config=['migration.env'];if(existsSync(runtimeFile))config.push('runtime.env');
  const configArgs=['-czf',join(temp,'config.tgz'),'-C','/etc/kartakontenta',...config];
  if(existsSync('/opt/flow-forge-068/.env.local')){writeFileSync(join(temp,'old-runtime.env'),readFileSync('/opt/flow-forge-068/.env.local'),{mode:0o600});configArgs.push('-C',temp,'old-runtime.env');}
  execFileSync('tar',configArgs,{stdio:'pipe'});
  execFileSync('tar',['-czf',join(temp,'code.tgz'),'--exclude=node_modules','--exclude=.git','--exclude=.env.local','-C',root,'.'],{stdio:'pipe',timeout:120000});
  const tar=join(temp,'bundle.tgz');execFileSync('tar',['-czf',tar,'-C',temp,'database.dump','manifest.json','config.tgz','code.tgz']);
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(readFileSync(tar)),cipher.final()]);
  const payload=Buffer.concat([Buffer.from('KARTA01'),iv,cipher.getAuthTag(),encrypted]);
  const name='karta-'+new Date().toISOString().replace(/[:.]/g,'-')+'.aes',path=join(base,name);
  writeFileSync(path,payload,{mode:0o600,flag:'wx'});writeFileSync(path+'.sha256',createHash('sha256').update(payload).digest('hex'),{mode:0o600});
  status({ok:true,file:name,bytes:payload.length,stateRows:manifest.state.rows});console.log(JSON.stringify({ok:true,file:name,bytes:payload.length}));
 }else if(mode==='verify'){
  const path=resolve(process.argv[3]||'');if(!path.startsWith(base+'/karta-')||!path.endsWith('.aes'))throw Error('Select a backup from the encrypted backup directory');
  const payload=readFileSync(path);if(createHash('sha256').update(payload).digest('hex')!==readFileSync(path+'.sha256','utf8').trim())throw Error('Backup hash mismatch');
  if(payload.subarray(0,7).toString()!=='KARTA01')throw Error('Unsupported backup format');
  const decipher=createDecipheriv('aes-256-gcm',key,payload.subarray(7,19));decipher.setAuthTag(payload.subarray(19,35));
  const tar=join(temp,'bundle.tgz');writeFileSync(tar,Buffer.concat([decipher.update(payload.subarray(35)),decipher.final()]),{mode:0o600});
  execFileSync('tar',['-xzf',tar,'-C',temp]);const manifest=JSON.parse(readFileSync(join(temp,'manifest.json'),'utf8'));
  restoreDb='karta_restore_'+Date.now()+'_'+randomBytes(4).toString('hex');
  await pool.query('create database "'+restoreDb+'"');
  const target=new URL(env.DATABASE_URL);target.pathname='/'+restoreDb;const restored=databasePool({...env,DATABASE_URL:target.toString()});
  try{
  for(const [name,labels] of Object.entries(manifest.types||{})){if(!['AuthProvider','TelegramLoginStatus'].includes(name)||!Array.isArray(labels))throw Error('Invalid enum manifest');if(labels.length)await restored.query('create type "'+name+'" as enum ('+labels.map(label=>"'"+String(label).replace(/'/g,"''")+"'").join(',')+')');}
  execFileSync('pg_restore',['--no-owner','--no-privileges','--exit-on-error','--dbname='+restoreDb,join(temp,'database.dump')],{env:{...pgEnv,PGDATABASE:restoreDb},stdio:['ignore','ignore','pipe'],timeout:120000});
  for(const [table,count] of Object.entries(manifest.counts)){if(!tables.includes(table))throw Error('Unexpected manifest table');if((await restored.query('select count(*)::int as n from "'+table+'"')).rows[0].n!==count)throw Error('Restored row count mismatch: '+table);}const state=await fingerprint(restored);if(state.fingerprint!==manifest.state.fingerprint||state.rows!==manifest.state.rows)throw Error('Restored workspace mismatch');
  }finally{await restored.end();}
  status({ok:true,file:path.split('/').at(-1),tables:Object.keys(manifest.counts).length,stateRows:manifest.state.rows});console.log(JSON.stringify({ok:true,tables:Object.keys(manifest.counts).length,workspaceMatches:true}));
 }else throw Error('Unsupported backup action');
}catch(error){status({ok:false,error:error.code||'backup_failed'});console.error('Backup failed: '+(error.code||error.name)+(typeof error.code==='string'?' '+error.message:''));process.exitCode=1;}
finally{
 if(restoreDb){if(!/^karta_restore_[0-9]+_[a-f0-9]{8}$/.test(restoreDb))throw Error('Unsafe restore cleanup target');await pool.query('drop database if exists "'+restoreDb+'"').catch(()=>{status({ok:false,error:'restore_cleanup_failed'});process.exitCode=1;});}
 await pool.end();if(resolve(temp).startsWith(resolve(base)+'/.staging-'))rmSync(temp,{recursive:true,force:true});
}
