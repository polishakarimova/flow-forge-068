export async function inspectRuntimeAccess(pool) {
  const {rows} = await pool.query(`select current_database() as database_name,
    has_schema_privilege(current_user,'public','CREATE') as migration_create,
    has_database_privilege(current_user,current_database(),'CONNECT WITH GRANT OPTION') as delegate_connect,
    has_schema_privilege(current_user,'public','USAGE WITH GRANT OPTION') as delegate_usage,
    exists(select 1 from pg_roles where rolname='karta_runtime') as runtime_exists,
    case when exists(select 1 from pg_roles where rolname='karta_runtime') then
      has_database_privilege('karta_runtime',current_database(),'CONNECT') else false end as runtime_connect,
    case when exists(select 1 from pg_roles where rolname='karta_runtime') then
      has_schema_privilege('karta_runtime','public','USAGE') else false end as runtime_usage,
    case when exists(select 1 from pg_roles where rolname='karta_runtime') then
      has_schema_privilege('karta_runtime','public','CREATE') else false end as runtime_create,
    coalesce((select rolsuper or rolcreatedb or rolcreaterole or rolinherit
      from pg_roles where rolname='karta_runtime'),false) as runtime_elevated`);
  if (!rows[0]) throw Error('Не удалось проверить права установки.');
  return rows[0];
}

export function requireLimitedRuntime(access) {
  if (access.runtime_create || access.runtime_elevated) {
    throw Error('Существующая роль karta_runtime имеет лишние права. Установка остановлена.');
  }
}

export function requireRuntimeBootstrap(access) {
  requireLimitedRuntime(access);
  const database=access.database_name||'default_db';
  if (!access.migration_create) throw Error('Для миграции требуется CREATE схемы public в '+database+'.');
  const missing = [];
  if (!access.runtime_connect && !access.delegate_connect) missing.push('CONNECT к '+database);
  if (!access.runtime_usage && !access.delegate_usage) missing.push('USAGE схемы public');
  if (missing.length) {
    throw Error('Владелец базы должен выдать karta_runtime: ' + missing.join(', ') + '. Права делегирования у gen_user отсутствуют.');
  }
}