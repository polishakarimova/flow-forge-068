import {createHash, randomUUID} from 'node:crypto';

const labels = {
  authorized: 'Новый пользователь авторизовался', api: 'Ошибка запроса', server: 'Ошибка сервера',
  client: 'Ошибка приложения', worker: 'Ошибка фоновой задачи'
};
const pages = new Set(['home','profile','legal','admin','calendar','context','products','map','dashboard','ideas','funnels','agents','content','publications','stories','settings']);
const services = new Set(['auth','legal','account','admin','agent','state','threads','telegram','internal','publications','context']);
const endpoints = new Set(['me','logout','profile','dashboard','referral','status','start','accept','withdraw','preferences','overview','notices','main','publications','connections','actions','approve','telegram-mini-app','telegram-login-token','telegram','miniapp','tools','connect','refresh']);
const causes = new Set(['Error','TypeError','ReferenceError','RangeError','SyntaxError','ChunkLoadError','network','request_failed','telegram_setup','telegram_updates','threads_scheduler']);

export function noticeRecipient(env) {
  const allowed = [...new Set(String(env.ADMIN_TELEGRAM_IDS || '').split(',').map(id=>id.trim()).filter(id=>/^[1-9]\d{0,18}$/.test(id)))];
  const id = env.ADMIN_NOTICE_TELEGRAM_ID || (allowed.length === 1 ? allowed[0] : '');
  return allowed.includes(id) ? id : '';
}

export function noticeRoute(path, kind) {
  const pieces = String(path || '/').split(/[?#]/,1)[0].split('/');
  if (kind === 'client') return pages.has(pieces[1]) ? '/'+pieces[1] : '/';
  if (kind === 'worker') return 'Сервис';
  if (pieces[1] !== 'api' || !services.has(pieces[2])) return '/api';
  return '/api/'+[pieces[2],...pieces.slice(3,5).filter(part=>endpoints.has(part))].join('/');
}

export async function ensureNoticeSchema(pool) {
  await pool.query(`create table if not exists cm_admin_notices (
    id text primary key, event_key text unique not null, kind text not null,
    user_id text, route text not null default '', reason text not null default '',
    source_line integer not null default 0, method text not null default '', status integer not null default 0, occurrences integer not null default 1,
    created_at timestamptz not null default now(), last_at timestamptz not null default now(),
    next_at timestamptz not null default now(), attempts integer not null default 0, delivered_at timestamptz
  );
  create index if not exists cm_admin_notices_due on cm_admin_notices(next_at) where delivered_at is null;
  create index if not exists cm_admin_notices_recent on cm_admin_notices(last_at desc);`);
}

export async function firstAuthorization(client,userId) {
  await client.query(`insert into cm_admin_notices(id,event_key,kind,user_id) values($1,$2,'authorized',$3)
    on conflict(event_key) do nothing`,[randomUUID(),'first:'+userId,userId]);
}

export async function recordFault(pool,{kind,userId=null,path,reason,method,status,sourceLine},clock=Date.now()) {
  if (!['api','server','client','worker'].includes(kind)) return;
  const route = noticeRoute(path,kind);
  const safeReason = causes.has(reason) ? reason : 'request_failed';
  const verb = ['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method) ? method : '';
  const code = Number.isInteger(status) && status >= 500 && status <= 599 ? status : 0;
  const line=kind==='client' && Number.isInteger(sourceLine) && sourceLine>0 && sourceLine<=1000000 ? sourceLine : 0;
  const key = createHash('sha256').update(JSON.stringify([kind,userId,route,safeReason,verb,code,userId ? line : 0,Math.floor(clock/300000)])).digest('hex');
  await pool.query(`insert into cm_admin_notices(id,event_key,kind,user_id,route,reason,method,status,source_line)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(event_key) do update
    set occurrences=cm_admin_notices.occurrences+1, last_at=now()`,[randomUUID(),key,kind,userId,route,safeReason,verb,code,line]);
}

const details = `select n.id,n.kind,n.route,n.reason,n.method,n.status,n.source_line,n.occurrences,n.created_at,n.last_at,n.delivered_at,
  u."displayName" as name,t."telegramId" as telegram_id,t.username, ref."displayName" as inviter
  from cm_admin_notices n left join users u on u.id=n.user_id
  left join lateral(select "telegramId",username from telegram_accounts where "userId"=n.user_id order by "createdAt",id limit 1) t on true
  left join cm_like_transactions reward on n.kind='authorized' and reward.invited_user_id=n.user_id
  left join users ref on ref.id=reward.user_id`;
export async function readNotices(pool,id=null) {
  const {rows}=await pool.query(details+(id?' where n.id=$1':'')+' order by n.last_at desc limit 60',id?[id]:[]);
  return rows.map(row=>({...row,title:labels[row.kind]}));
}
function display(value) { return String(value || '').replace(/[\p{C}\r\n]/gu,' ').trim().slice(0,80); }
export function noticeText(item) {
  const person = item.telegram_id ? [display(item.name)||'Пользователь',item.username?'@'+display(item.username):'', 'Telegram ID '+item.telegram_id].filter(Boolean).join(' · ') : item.kind==='worker'?'Фоновая задача':'Аккаунт не определён';
  return ['Карта контента · '+labels[item.kind],person,item.inviter?'Пригласил(а) '+display(item.inviter):'',
    [item.method,item.route,item.status||'',item.reason].filter(Boolean).join(' · '),
    item.source_line?'Модуль приложения, строка '+item.source_line:'',
    item.occurrences>1?'Повторов в группе: '+item.occurrences:'',
    new Date(item.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Kaliningrad'})+' (Калининград)'].filter(Boolean).join('\n');
}

export async function deliverNotice(pool, recipient, appUrl, send) {
  if (!recipient) return false;
  // Claim a lease before doing network I/O so concurrent workers cannot send the same batch.
  const {rows:[claim]}=await pool.query(`update cm_admin_notices set next_at=now()+interval '2 minutes',attempts=attempts+1
    where id=(select id from cm_admin_notices where delivered_at is null and next_at<=now()
    order by (kind='authorized') desc,next_at,created_at limit 1 for update skip locked) returning id,attempts`);
  if(!claim) return false;
  try {
    const [item]=await readNotices(pool,claim.id);
    const link=new URL('/admin',appUrl);link.searchParams.set('event',claim.id);
    await send('sendMessage',{chat_id:recipient,text:noticeText(item),reply_markup:{inline_keyboard:[[{text:'Подробности в админке',web_app:{url:link.href}}]]}});
    await pool.query('update cm_admin_notices set delivered_at=now() where id=$1 and attempts=$2',[claim.id,claim.attempts]);
  } catch(error) {
    await pool.query("update cm_admin_notices set next_at=now()+$3*interval '1 second' where id=$1 and attempts=$2",
      [claim.id,claim.attempts,Math.max(Number(error.retryAfter)||0, Math.min(3600,10*2**Math.min(claim.attempts,9)))]);
    throw error;
  }
  return true;
}
