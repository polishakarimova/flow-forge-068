// Root-only deployment helper. Does not approve or publish calendar entries.
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function loadEnv(path) {
  const result = {};
  for (const line of readFileSync(path,'utf8').split(/\r?\n/)) {
    const at = line.indexOf('='); if (at < 1 || line.trim().startsWith('#')) continue;
    let value = line.slice(at+1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value=value.slice(1,-1);
    result[line.slice(0,at).trim().replace(/^\uFEFF/,'')]=value;
  }
  return result;
}
function patchEnv(path, entries, backupDir) {
  const previous=existsSync(path)?readFileSync(path,'utf8'):'';
  mkdirSync(backupDir,{recursive:true,mode:0o700});
  if (existsSync(path)) {
    const backup=`${backupDir}/env-${Date.now()}`;
    copyFileSync(path,backup);chmodSync(backup,0o600);
  }
  const lines=previous.split(/\r?\n/).filter(line=>line.trim()&&!Object.keys(entries).some(key=>line.startsWith(`${key}=`)));
  for(const [key,value] of Object.entries(entries)) {
    if(!/^[A-Z_]+$/.test(key)||/[\r\n]/.test(value))throw new Error('Invalid environment entry');
    lines.push(`${key}=${value}`);
  }
  const temp=`${path}.publisher.tmp`;
  writeFileSync(temp,`${lines.join('\n')}\n`,{mode:0o600});chmodSync(temp,0o600);renameSync(temp,path);
}
const mode=process.argv[2];
if(mode==='foreign') {
  const chatId=process.argv[3];
  const env=loadEnv('/etc/polina-marketing-ai/env');
  if(!env.THREADS_ACCESS_TOKEN||env.THREADS_USERNAME!=='polisha.karimovaa')throw new Error('Threads account configuration mismatch');
  if(!env.TELEGRAM_ALLOWED_CHAT_IDS.split(',').map(x=>x.trim()).includes(chatId))throw new Error('Notification chat mismatch');
  mkdirSync('/etc/lina-threads-publisher',{recursive:true,mode:0o700});
  const path='/etc/lina-threads-publisher/env';
  const existing=existsSync(path)?loadEnv(path):{};
  patchEnv(path,{
    THREADS_WORKER_SECRET:existing.THREADS_WORKER_SECRET||randomBytes(32).toString('hex'),
    CONTENT_MAP_URL:'https://kartakontenta.ru',THREADS_NOTIFY_CHAT_ID:chatId,
    THREADS_PUBLISHER_STATE_DIR:'/var/lib/lina-threads-publisher',
  },'/var/backups/lina-threads-publisher');
  console.log('Foreign publisher environment ready; existing Meta token stays in Lina environment.');
} else if(mode==='export-bridge') {
  // Stdout must be piped to the other server, never displayed or stored locally.
  console.log(JSON.stringify({secret:loadEnv('/etc/lina-threads-publisher/env').THREADS_WORKER_SECRET}));
} else {
  const { default: pg } = await import('pg');
  const path='/opt/flow-forge-068/.env.local';
  const env=loadEnv(path);
  const url=new URL(env.DATABASE_URL);const sslmode=url.searchParams.get('sslmode');url.searchParams.delete('sslmode');
  const cert=env.PGSSLROOTCERT;
  const pool=new pg.Pool({connectionString:url.toString(),ssl:sslmode&&sslmode!=='disable'?cert&&existsSync(cert)?{ca:readFileSync(cert,'utf8'),rejectUnauthorized:true}:{rejectUnauthorized:false}:false});
  try {
    const userId=process.argv[3];
    const account=await pool.query('select username,"telegramId","chatId" from telegram_accounts where "userId"=$1',[userId]);
    if(account.rows.length!==1||account.rows[0].username!=='polinakarimova')throw new Error('Calendar account mismatch');
    const queue=await pool.query('select status,count(*)::int as count from cm_threads_queue where user_id=$1 group by status',[userId]);
    const calendar=await pool.query("select data,md5(data::text) as revision from cm_user_state where user_id=$1 and key='publications'",[userId]);
    const items=calendar.rows[0]?.data?.items?.filter(x=>x.format==='Threads')||[];
    if(mode==='inspect') {
      console.log(JSON.stringify({account:account.rows[0].username,chatId:account.rows[0].chatId||account.rows[0].telegramId,revision:calendar.rows[0]?.revision,series:items.map(x=>({id:x.id,date:x.date,posts:x.parts.length,draft:x.parts.filter(p=>p.approvalStatus==='draft').length,published:x.parts.filter(p=>p.published).length})),queue:queue.rows}));
    } else if(mode==='bridge') {
      const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!/^[a-f0-9]{64}$/.test(input.secret))throw new Error('Invalid bridge secret');
      patchEnv(path,{THREADS_WORKER_SECRET:input.secret,THREADS_WORKER_USER_ID:userId,THREADS_WORKER_USERNAME:'polisha.karimovaa',THREADS_REMOTE_ENABLED:'0',THREADS_AUTOPUBLISH_ENABLED:'0'},'/opt/kartakontenta-backups/20260930-foreign-publisher');
      console.log('Protected bridge configured; publishing disabled, calendar and queue unchanged.');
    } else if(mode==='enable') {
      if(queue.rows.some(row=>['ready','sending'].includes(row.status)&&row.count>0))throw new Error('Queue is not empty; do not enable before owner review');
      if(!env.THREADS_WORKER_SECRET||env.THREADS_WORKER_USER_ID!==userId)throw new Error('Bridge not configured');
      patchEnv(path,{THREADS_REMOTE_ENABLED:'1',THREADS_AUTOPUBLISH_ENABLED:'0'},'/opt/kartakontenta-backups/20260930-foreign-publisher');
      console.log('Foreign worker enabled; no approved jobs queued, calendar unchanged.');
    } else throw new Error('Unknown deployment action');
  } finally {await pool.end();}
}
