// Read-only operational audit. Never print connection strings or user materials.
import {readEnv,databasePool,fingerprint,tables} from '/opt/kartakontenta/current/ops/db-config.mjs';
const env=readEnv('/etc/kartakontenta/runtime.env'),pool=databasePool(env);
try{
 const details=(await pool.query(`select current_database() as database,current_user as role,
  (select ssl from pg_stat_ssl where pid=pg_backend_pid()) as verifiedConnectionUsesTls,
  has_database_privilege(current_user,current_database(),'CREATE') as canCreateSchema,
  has_database_privilege(current_user,current_database(),'TEMP') as canUseTemporary,
  has_schema_privilege(current_user,'public','CREATE') as canCreateTables,
  (select rolsuper or rolcreatedb or rolcreaterole from pg_roles where rolname=current_user) as elevatedRole`)).rows[0];
 const tableChecks=[];
 for(const table of tables)tableChecks.push({table,...(await pool.query(`select to_regclass($1) is not null as present,has_table_privilege(current_user,$1,'SELECT') as readable,has_table_privilege(current_user,$1,'UPDATE') as writable`,[table])).rows[0]});
 const state=await fingerprint(pool);
 const ok=details.database==='kartakontenta'&&details.role==='karta_runtime'&&details.verifiedconnectionusestls&&!details.elevatedrole&&!details.cancreateschema&&!details.canusetemporary&&!details.cancreatetables&&tableChecks.every(row=>row.present&&row.readable&&row.writable);
 console.log(JSON.stringify({ok,...details,tableCount:tableChecks.length,allTablesReadableAndWritable:tableChecks.every(row=>row.present&&row.readable&&row.writable),state}));
 if(!ok)process.exitCode=1;
}catch{console.error('runtime_audit_failed');process.exitCode=1;}finally{await pool.end();}
