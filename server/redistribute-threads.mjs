import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function redistributeThreads(data, ids, startDate) {
  const selected = ids.map(id => data.items.find(item => item.id === id));
  if (selected.some(item => !item || item.format !== 'Threads')) throw new Error('Threads series missing');
  const parts = selected.flatMap(item => item.parts);
  if (parts.length !== 30 || parts.some(part => part.published || part.approvalStatus === 'approved')) throw new Error('Expected 30 unapproved drafts');
  const result = []; let offset = 0; let day = 0;
  while (offset < parts.length) {
    const date = new Date(`${startDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + day);
    const key = date.toISOString().slice(0,10);
    const count = Math.min(day === 0 ? 5 : 6, parts.length - offset);
    const id = ids[day] || `polina-threads-${key.replaceAll('-','')}`;
    result.push({ id, date: key, format: 'Threads', title: `${count} ${count === 1 ? 'пост' : 'постов'} Threads`,
      sourcePublicationIds: ids,
      parts: parts.slice(offset,offset+count).map((part,index) => ({ ...part, published:false, approvalStatus:'draft',
        scheduledAt:`${key}T${String((day === 0 ? 14 : 10)+index).padStart(2,'0')}:00:00+02:00` })) });
    offset += count; day++;
  }
  const output = { ...data, items: [...data.items.filter(item => !ids.includes(item.id)), ...result] };
  if (new Set(output.items.map(item=>item.id)).size !== output.items.length) throw new Error('Publication ID collision');
  return { data:output, series:result };
}

async function main() {
  const [userId,expectedRevision,backup] = process.argv.slice(2);
  if (!userId || !/^[a-f0-9]{32}$/.test(expectedRevision) || !backup?.startsWith('/opt/kartakontenta-backups/20260930-redistribute/')) throw new Error('Expected user, revision and private backup path');
  for (const line of readFileSync('/opt/flow-forge-068/.env.local','utf8').split(/\r?\n/)) {
    const at=line.indexOf('='); if(at<1||line.trim().startsWith('#'))continue;
    let value=line.slice(at+1).trim();if(value.startsWith('"')&&value.endsWith('"'))value=value.slice(1,-1);
    const key=line.slice(0,at).trim();if(!(key in process.env))process.env[key]=value;
  }
  const {default:pg}=await import('pg');
  const {approveThreads}=await import('./threads-autopost.mjs');
  const {remoteStatus}=await import('./threads-remote.mjs');
  const url=new URL(process.env.DATABASE_URL);const mode=url.searchParams.get('sslmode');url.searchParams.delete('sslmode');
  const cert=process.env.PGSSLROOTCERT;
  const pool=new pg.Pool({connectionString:url.toString(),ssl:mode&&mode!=='disable'?cert&&existsSync(cert)?{ca:readFileSync(cert,'utf8'),rejectUnauthorized:true}:{rejectUnauthorized:false}:false});
  const client=await pool.connect();
  const ids=['polina-threads-ai-review-20260929-day-1','polina-threads-ai-review-20260929-day-2','polina-threads-ai-review-20260929-day-3'];
  try {
    if(!(await remoteStatus(pool,userId)).connected||process.env.THREADS_REMOTE_ENABLED!=='1')throw new Error('Foreign publisher not ready');
    await client.query('begin');
    const account=await client.query('select username from telegram_accounts where "userId"=$1',[userId]);
    if(account.rows[0]?.username!=='polinakarimova')throw new Error('Account mismatch');
    const queue=await client.query('select count(*)::int as count from cm_threads_queue where user_id=$1',[userId]);
    if(queue.rows[0].count!==0)throw new Error('Queue is not empty; inspect before redistributing');
    const current=await client.query("select data,md5(data::text) as revision from cm_user_state where user_id=$1 and key='publications' for update",[userId]);
    if(current.rows[0]?.revision!==expectedRevision)throw new Error('Calendar changed; inspect latest revision');
    const output=redistributeThreads(current.rows[0].data,ids,'2026-09-30');
    mkdirSync('/opt/kartakontenta-backups/20260930-redistribute',{recursive:true,mode:0o700});
    writeFileSync(backup,JSON.stringify({savedAt:new Date().toISOString(),source:'Polina requested 5 today from 14:00 and 6/day thereafter',data:current.rows[0].data}),{flag:'wx',mode:0o600});
    await client.query("update cm_user_state set data=$2::jsonb,updated_at=now() where user_id=$1 and key='publications'",[userId,JSON.stringify(output.data)]);
    await client.query('commit');
    // The owner explicitly requested five publications today; future days require her daily approval.
    const approval=await approveThreads(pool,userId,'polinakarimova',[ids[0]]);
    console.log(JSON.stringify({schedule:output.series.map(item=>({id:item.id,date:item.date,posts:item.parts.length,times:item.parts.map(part=>part.scheduledAt.slice(11,16))})),today:approval,backup}));
  } catch(error){await client.query('rollback');throw error;}
  finally{client.release();await pool.end();}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
