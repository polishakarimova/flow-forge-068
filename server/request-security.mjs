import {existsSync} from 'node:fs';
const bad=(error,status=403)=>({error,status});
export function productionConfigErrors(env=process.env){
 if(env.NODE_ENV!=='production')return [];
 const errors=[];let app;
 try{app=new URL(env.APP_URL);}catch{errors.push('app_url_required');}
 if(app&&(app.protocol!=='https:'||app.username||app.password||app.search||app.hash))errors.push('https_app_url_required');
 for(const name of ['SESSION_SECRET','TELEGRAM_WEBHOOK_SECRET'])if(String(env[name]||'').length<32)errors.push(name.toLowerCase()+'_required');
 if(env.SESSION_SECRET===env.TELEGRAM_WEBHOOK_SECRET||env.SESSION_SECRET===env.TELEGRAM_BOT_TOKEN)errors.push('independent_session_secret_required');
 if(env.KARTA_SCHEMA_MODE!=='runtime')errors.push('runtime_schema_mode_required');
 if(!env.TELEGRAM_BOT_TOKEN)errors.push('telegram_token_required');
 try{const db=new URL(env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(db.protocol)||db.searchParams.get('sslmode')!=='verify-full')errors.push('verified_database_tls_required');}catch{errors.push('database_url_required');}
 if(env.PGSSLROOTCERT&&!existsSync(env.PGSSLROOTCERT))errors.push('database_ca_missing');
 return errors;
}
export function assertProductionConfig(env=process.env){const errors=productionConfigErrors(env);if(errors.length)throw new Error('invalid_production_config:'+errors.join(','));}
export function requestProtection({appUrl,clock=Date.now,trustProxy=false}){
 const origin=new URL(appUrl).origin,buckets=new Map();
 return (req,res,url)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; frame-src 'self' https://oauth.telegram.org; frame-ancestors 'self' https://web.telegram.org https://*.web.telegram.org");
  if(origin.startsWith('https:'))res.setHeader('Strict-Transport-Security','max-age=31536000');
  if(url.pathname.startsWith('/api/'))res.setHeader('Cache-Control','no-store');
  if(!url.pathname.startsWith('/api/'))return null;
  const webhook=['/api/telegram/webhook','/api/auth/telegram/webhook'].includes(url.pathname);
  const service=url.pathname.startsWith('/api/internal/threads/');
  const mutates=!['GET','HEAD','OPTIONS'].includes(req.method)||/^\/api\/auth\/(?:telegram-login-token\/|telegram\/status)/.test(url.pathname);
  if(mutates&&!webhook&&!service){
   const supplied=req.headers.origin,site=req.headers['sec-fetch-site'];
   if((supplied&&supplied!==origin)||site==='cross-site')return bad('invalid_request_origin');
   if(!supplied&&req.headers.referer){try{if(new URL(req.headers.referer).origin!==origin)return bad('invalid_request_origin');}catch{return bad('invalid_request_origin');}}
   if(req.headers.cookie&&!supplied&&!req.headers.referer&&site&&!['same-origin','none'].includes(site))return bad('request_origin_required');
  }
  if(!['GET','HEAD','OPTIONS','DELETE'].includes(req.method)&&String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')return bad('application_json_required',415);
  if(Number(req.headers['content-length'])>2_000_000)return bad('request_too_large',413);
  if(service||webhook)return null;
  const category=/^\/api\/auth\/(?:telegram-login-token|telegram\/start)$/.test(url.pathname)&&req.method==='POST'?'login-start':url.pathname.startsWith('/api/auth/')?'auth':url.pathname.startsWith('/api/admin/')?'admin':mutates?'write':'read';
  const limit=category==='login-start'?10:category==='auth'?120:category==='admin'?60:category==='write'?240:600;
  const remote=req.socket?.remoteAddress||'local',local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);
  const ip=trustProxy&&local?String(req.headers['x-real-ip']||remote):remote;
  const key=category+':'+ip.slice(0,100),now=clock();
  for(const [k,v] of buckets)if(v.until<=now)buckets.delete(k);
  if(buckets.size>10000)return bad('busy',503);
  const entry=buckets.get(key)||{count:0,until:now+60000};entry.count++;buckets.set(key,entry);
  if(entry.count>limit){res.setHeader('Retry-After',String(Math.ceil((entry.until-now)/1000)));return bad('too_many_requests',429);}
  return null;
 };
}
export async function readJsonBody(req,max=2_000_000){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(new Error('request_too_large'),{status:413});chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('invalid_json'),{status:400});}
}
export function telegramAuthDateValid(value,clock=Date.now()){const time=Number(value),age=clock/1000-time;return Number.isSafeInteger(time)&&time>0&&age>=-30&&age<=300;}
