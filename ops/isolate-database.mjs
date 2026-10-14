import {readFileSync,writeFileSync,copyFileSync,existsSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {databasePool,readEnv,tables,fingerprint} from './db-config.mjs';

const directory='/etc/kartakontenta',sourceFile=directory+'/source-before-isolation.env',markerFile=directory+'/database-isolation.json';
const mode=process.argv[2]||'create',targetName='kartakontenta',sourceName='default_db';
if(!['create','copy'].includes(mode))throw Error('Use create or copy');
if(!existsSync(sourceFile))copyFileSync(directory+'/migration.env',sourceFile);
const source=readEnv(sourceFile),sourceUrl=new URL(source.DATABASE_URL);
if(sourceUrl.pathname!=='/'+sourceName||decodeURIComponent(sourceUrl.username)!=='gen_user')throw Error('Unexpected source database');
const targetUrl=new URL(sourceUrl);targetUrl.pathname='/'+targetName;
const sourcePool=databasePool(source),targetConfig={...source,DATABASE_URL:targetUrl.toString()};
let targetPool,temp,phase='validate',marker=existsSync(markerFile)?JSON.parse(readFileSync(markerFile,'utf8')):null;
const save=value=>{marker=value;writeFileSync(markerFile,JSON.stringify(value),{mode:0o600});};
const literal=value=>"'"+String(value).replace(/'/g,"''")+"'";
const pgEnv={...process.env,PGHOST:sourceUrl.hostname,PGPORT:sourceUrl.port||'5432',PGUSER:decodeURIComponent(sourceUrl.username),PGPASSWORD:decodeURIComponent(sourceUrl.password),PGDATABASE:sourceName,PGSSLMODE:'verify-full',PGSSLROOTCERT:source.PGSSLROOTCERT};
try {
  const found=(await sourcePool.query('select datname,pg_get_userbyid(datdba) as owner from pg_database where datname=$1',[targetName])).rows[0];
  if(mode==='create') {
    if(found) {
      if(!marker?.created||marker.target!==targetName||marker.source!==sourceName||found.owner!=='gen_user')throw Error('Existing target database is not this migration');
    } else {
      phase='create';
      const locale=(await sourcePool.query('select datcollate,datctype from pg_database where datname=current_database()')).rows[0];
      await sourcePool.query('create database "kartakontenta" owner gen_user template template0 encoding '+literal('UTF8')+' lc_collate '+literal(locale.datcollate)+' lc_ctype '+literal(locale.datctype));
      save({created:true,source:sourceName,target:targetName,owner:'gen_user',createdAt:new Date().toISOString(),status:'created'});
    }
    targetPool=databasePool(targetConfig);
    await targetPool.query('revoke all on database "kartakontenta" from public');
    await targetPool.query('revoke all on schema public from public');
    const access=(await targetPool.query("select has_schema_privilege(current_user,'public','CREATE') as can_migrate,has_database_privilege(current_user,current_database(),'CONNECT WITH GRANT OPTION') as can_delegate_connect,has_schema_privilege(current_user,'public','USAGE WITH GRANT OPTION') as can_delegate_usage,has_database_privilege(current_user,current_database(),'TEMPORARY') as can_use_temporary")).rows[0];
    if(Object.values(access).some(value=>value!==true))throw Error('New database privileges are insufficient');
    console.log(JSON.stringify({ok:true,database:targetName,owner:'gen_user',...access}));
  } else {
    if(!found||!marker?.created||marker.target!==targetName||marker.source!==sourceName||found.owner!=='gen_user')throw Error('Create the approved target database first');
    targetPool=databasePool(targetConfig);
    if(marker.status==='copied') {
      const current=await fingerprint(targetPool),origin=await fingerprint(sourcePool);
      if(current.fingerprint!==marker.state.fingerprint||origin.fingerprint!==marker.state.fingerprint)throw Error('Existing copy changed; inspect before reusing');
      console.log(JSON.stringify({ok:true,database:targetName,alreadyCopied:true,stateRows:current.rows}));
    } else {
      const targetTables=(await targetPool.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows[0].n;
      if(targetTables!==0)throw Error('Target contains tables; no overwrite is permitted');
      const base='/opt/kartakontenta-backups/encrypted';mkdirSync(base,{recursive:true,mode:0o700});temp=mkdtempSync(join(base,'.database-move-'));
      phase='snapshot';
      const client=await sourcePool.connect();let manifest;
      try {
        await client.query('begin isolation level repeatable read read only');
        const snapshot=(await client.query('select pg_export_snapshot() as id')).rows[0].id;
        const counts={};for(const table of tables){if((await client.query('select to_regclass($1) as id',[table])).rows[0].id)counts[table]=(await client.query('select count(*)::int as n from "'+table+'"')).rows[0].n;}
        const types={};for(const name of ['AuthProvider','TelegramLoginStatus'])types[name]=(await client.query('select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname=$1 and t.typname=$2 order by e.enumsortorder',['public',name])).rows.map(row=>row.enumlabel);
        manifest={counts,types,state:await fingerprint(client)};
        phase='dump';
        execFileSync('pg_dump',['--format=custom','--no-owner','--no-privileges','--snapshot='+snapshot,'--file='+join(temp,'database.dump'),...Object.keys(counts).map(table=>'--table=public.'+table)],{env:pgEnv,stdio:['ignore','ignore','pipe'],timeout:120000});
        await client.query('commit');
      }catch(error){await client.query('rollback');throw error;}finally{client.release();}
      phase='types';
      for(const [name,labels] of Object.entries(manifest.types)) {
        if(!labels.length)continue;
        const existing=(await targetPool.query('select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname=$1 and t.typname=$2 order by e.enumsortorder',['public',name])).rows.map(row=>row.enumlabel);
        if(existing.length){if(JSON.stringify(existing)!==JSON.stringify(labels))throw Error('Unexpected existing enum');}
        else await targetPool.query('create type "'+name+'" as enum ('+labels.map(literal).join(',')+')');
      }
      phase='restore';
      execFileSync('pg_restore',['--no-owner','--no-privileges','--exit-on-error','--single-transaction','--dbname='+targetName,join(temp,'database.dump')],{env:{...pgEnv,PGDATABASE:targetName},stdio:['ignore','ignore','pipe'],timeout:120000});
      phase='verify';
      for(const [table,count] of Object.entries(manifest.counts)){if((await targetPool.query('select count(*)::int as n from "'+table+'"')).rows[0].n!==count)throw Error('Copied row count differs');}
      const state=await fingerprint(targetPool),origin=await fingerprint(sourcePool);
      if(state.fingerprint!==manifest.state.fingerprint||state.rows!==manifest.state.rows||origin.fingerprint!==manifest.state.fingerprint)throw Error('Copied state differs or source changed');
      save({...marker,status:'copied',copiedAt:new Date().toISOString(),counts:manifest.counts,state});
      console.log(JSON.stringify({ok:true,database:targetName,tables:Object.keys(manifest.counts).length,stateRows:state.rows,workspaceMatches:true}));
    }
  }
}catch(error){console.error(JSON.stringify({ok:false,phase,error:error.code||'database_isolation_failed'}));process.exitCode=1;}
finally{if(targetPool)await targetPool.end();await sourcePool.end();if(temp&&resolve(temp).startsWith('/opt/kartakontenta-backups/encrypted/.database-move-'))rmSync(temp,{recursive:true,force:true});}