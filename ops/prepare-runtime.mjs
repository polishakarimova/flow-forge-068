import {existsSync,readFileSync,writeFileSync,mkdirSync,chmodSync,copyFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {readEnv,databasePool,tables,fingerprint} from './db-config.mjs';
import {prismaDatabaseUrl} from '../server/database-urls.mjs';
const dir='/etc/kartakontenta',source='/opt/flow-forge-068/.env.local';
mkdirSync(dir,{recursive:true,mode:0o700});
const previous=readEnv(source),beforeSession=previous.SESSION_SECRET||previous.TELEGRAM_WEBHOOK_SECRET||previous.ADMIN_TOKEN||previous.TELEGRAM_BOT_TOKEN;
const migrationPath=dir+'/migration.env';
const oldUrl=new URL(previous.DATABASE_URL);if(oldUrl.pathname!=='/default_db')throw Error('Unexpected target database');oldUrl.searchParams.set('sslmode','verify-full');
const migration={DATABASE_URL:oldUrl.toString(),PGSSLROOTCERT:'/etc/ssl/certs/timeweb-cloud-root.crt'};
const encode=env=>Object.entries(env).filter(([k])=>/^[A-Z0-9_]+$/.test(k)).map(([k,v])=>{if(/[\r\n]/.test(v))throw Error('Invalid environment entry');return k+'='+v;}).join('\n')+'\n';
if(!existsSync(migrationPath))writeFileSync(migrationPath,encode(migration),{mode:0o600,flag:'wx'});
if(process.argv[2]==='config'){console.log('Protected migration configuration ready.');process.exit(0);}
const pool=databasePool(migration);
try{
 const before=await fingerprint(pool);const privilege=(await pool.query("select has_schema_privilege(current_user,'public','CREATE') as allowed")).rows[0];
 if(!privilege.allowed)throw Error('Schema CREATE privilege is still required');
 const existing=existsSync(dir+'/runtime.env')?readEnv(dir+'/runtime.env'):null;
 const roles=(await pool.query("select rolname from pg_roles where rolname='karta_runtime'")).rows;
 if(roles.length&&!existing)throw Error('Existing runtime role without its protected configuration; inspect before changing it');
 const password=existing?decodeURIComponent(new URL(existing.DATABASE_URL).password):randomBytes(32).toString('hex');
 if(!roles.length)await pool.query("create role karta_runtime login password '"+password+"' nosuperuser nocreatedb nocreaterole noinherit");
 await pool.query('grant connect on database default_db to karta_runtime');await pool.query('grant usage on schema public to karta_runtime');
 for(const table of tables)await pool.query('grant select,insert,update,delete on table public."'+table+'" to karta_runtime');
 const url=new URL(migration.DATABASE_URL);url.username='karta_runtime';url.password=password;
 const env={...(existing||previous),DATABASE_URL:url.toString(),PRISMA_DATABASE_URL:prismaDatabaseUrl(url.toString(),migration.PGSSLROOTCERT),PGSSLROOTCERT:migration.PGSSLROOTCERT,KARTA_SCHEMA_MODE:'runtime'};
 delete env.ADMIN_TOKEN;
 env.THREADS_TOKEN_SECRET=env.THREADS_TOKEN_SECRET||beforeSession;
 if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||env.SESSION_SECRET===env.TELEGRAM_WEBHOOK_SECRET||env.SESSION_SECRET===env.TELEGRAM_BOT_TOKEN)env.SESSION_SECRET=randomBytes(32).toString('hex');
 if(!env.TELEGRAM_WEBHOOK_SECRET||env.TELEGRAM_WEBHOOK_SECRET.length<32)env.TELEGRAM_WEBHOOK_SECRET=randomBytes(32).toString('hex');
 if(existing){const backup=dir+'/runtime.before-'+Date.now()+'.env';copyFileSync(dir+'/runtime.env',backup);chmodSync(backup,0o600);}
 writeFileSync(dir+'/runtime.env',encode(env),{mode:0o600});chmodSync(dir+'/runtime.env',0o600);
 const runtime=databasePool(env);try{if((await fingerprint(runtime)).fingerprint!==before.fingerprint)throw Error('Runtime workspace verification mismatch');const privileges=(await runtime.query("select current_user,has_table_privilege(current_user,'cm_user_state','UPDATE') as can_save,has_schema_privilege(current_user,'public','CREATE') as can_create,rolcreaterole,rolcreatedb from pg_roles where rolname=current_user")).rows[0];if(privileges.can_create||privileges.rolcreaterole||privileges.rolcreatedb)throw Error('Runtime role is too broad');console.log(JSON.stringify({ok:true,stateRows:before.rows,role:privileges.current_user,canSave:privileges.can_save,canCreate:false}));}finally{await runtime.end();}
}finally{await pool.end();}
