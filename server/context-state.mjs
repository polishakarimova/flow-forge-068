export async function readContext(pool,userId){const {rows}=await pool.query("select data,md5(data::text) as revision from cm_user_state where user_id=$1 and key='context'",[userId]);return {data:rows[0]?.data||null,revision:rows[0]?.revision||'new'};}
export async function saveContext(pool,userId,data,revision){
 if(typeof revision!=='string'||!/^(new|[a-f0-9]{32})$/.test(revision))throw Object.assign(new Error('revision_required'),{status:428});
 if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('invalid_context'),{status:400});
 const client=await pool.connect();
 try{
  await client.query('begin');await client.query('select pg_advisory_xact_lock(hashtext($1))',['context:'+userId]);
  const current=await readContext(client,userId);
  if(current.revision!==revision)throw Object.assign(new Error('revision_conflict'),{status:409});
  await client.query("insert into cm_user_state(user_id,key,data,updated_at) values($1,'context',$2::jsonb,now()) on conflict(user_id,key) do update set data=excluded.data,updated_at=now()",[userId,JSON.stringify(data)]);
  const saved=await readContext(client,userId);await client.query('commit');return saved;
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
