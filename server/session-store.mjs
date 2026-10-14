import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const digest=v=>createHash('sha256').update(String(v||'')).digest('hex');
const sign=(payload,secret)=>createHmac('sha256',secret).update(payload).digest('base64url');
export async function ensureSessionSchema(pool){await pool.query(`create table if not exists cm_auth_sessions (
 token_hash text primary key,user_id text not null,created_at timestamptz not null default now(),expires_at timestamptz not null,
 revoked_at timestamptz,admin_until timestamptz,admin_seen_at timestamptz
 );create index if not exists cm_auth_sessions_user_idx on cm_auth_sessions(user_id);`);}
export async function issueSession(pool,userId,secret,clock=Date.now()){
 if(!secret||secret.length<32)throw new Error('session_secret_required');
 const exp=clock+30*86400000,payload=Buffer.from(JSON.stringify({userId,exp,nonce:randomBytes(32).toString('base64url')})).toString('base64url');
 const token=payload+'.'+sign(payload,secret);
 await pool.query('insert into cm_auth_sessions(token_hash,user_id,created_at,expires_at) values($1,$2,$3,$4)',[digest(token),userId,new Date(clock),new Date(exp)]);
 return token;
}
export async function readSession(pool,token,secret,clock=Date.now()){
 if(!token||String(token).length>2048||!secret)return null;
 try{
  const parts=String(token).split('.');if(parts.length!==2)return null;
  const [payload,signature]=parts,expected=sign(payload,secret),a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!data.nonce||!data.userId||!Number.isFinite(data.exp)||data.exp<=clock)return null;
  const {rows}=await pool.query('select * from cm_auth_sessions where token_hash=$1 and user_id=$2 and revoked_at is null and expires_at>$3',[digest(token),String(data.userId),new Date(clock)]);
  return rows[0]||null;
 }catch(error){if(error.code)throw error;return null;}
}
export async function revokeSession(pool,token){if(token)await pool.query('update cm_auth_sessions set revoked_at=now() where token_hash=$1 and revoked_at is null',[digest(token)]);}
export async function authorizeAdmin(pool,session,clock=Date.now()){
 if(!session)return false;
 if(session.admin_until){
  if(Date.parse(session.admin_until)<=clock||!session.admin_seen_at||clock-Date.parse(session.admin_seen_at)>=300000)return false;
  const {rowCount}=await pool.query('update cm_auth_sessions set admin_seen_at=$2 where token_hash=$1 and revoked_at is null and admin_until>$2 and admin_seen_at>$3',[session.token_hash,new Date(clock),new Date(clock-300000)]);
  return rowCount===1;
 }
 if(clock-Date.parse(session.created_at)>120000||Date.parse(session.created_at)>clock+30000)return false;
 const {rowCount}=await pool.query('update cm_auth_sessions set admin_until=$2,admin_seen_at=$3 where token_hash=$1 and revoked_at is null and admin_until is null',[session.token_hash,new Date(clock+900000),new Date(clock)]);
 return rowCount===1;
}
