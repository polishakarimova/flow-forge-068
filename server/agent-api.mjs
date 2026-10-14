import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { agentTools, registerAgentTools } from './agent-tools.mjs';
import { applyAgentCommand } from './agent-workspace.mjs';
import { readWorkspace, updateWorkspace } from './content-workspace.mjs';

export const AGENT_SCOPES = ['read','content','products','funnels','planning','context'];
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=v=>createHash('sha256').update(v).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const normalizeCode=v=>String(v||'').toUpperCase().replace(/[-\s]/g,'');
const activeSql='revoked_at is null and connected_at is not null';
const limits=new Map();

export async function ensureAgentSchema(pool) {
  await pool.query(`create table if not exists cm_agent_connections (
    id text primary key, user_id text not null, name text not null, scopes jsonb not null,
    code_hash text unique, code_expires_at timestamptz, connected_at timestamptz,
    access_hash text unique, access_expires_at timestamptz, refresh_hash text unique, refresh_expires_at timestamptz,
    revoked_at timestamptz, last_seen_at timestamptz, created_at timestamptz not null default now()
  );
  create index if not exists cm_agent_connections_user_idx on cm_agent_connections(user_id);
  create table if not exists cm_agent_actions (
    id text primary key, agent_id text not null references cm_agent_connections(id), user_id text not null,
    request_id text not null, request_hash text not null, tool text not null, result jsonb not null,
    created_at timestamptz not null default now(), unique(agent_id,request_id)
  );
  create index if not exists cm_agent_actions_user_idx on cm_agent_actions(user_id,created_at);`);
}

async function limitedBody(req) {
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>2_000_000)fail('Запрос слишком большой.',413);chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{fail('Некорректный JSON.');}
}
function throttle(req) {
  const key=String(req.headers['x-real-ip']||req.socket?.remoteAddress||'local').slice(0,100),now=Date.now();
  for(const [k,v] of limits)if(v.until<now)limits.delete(k);
  if(limits.size>10000)fail('Попробуйте позже.',429);
  const entry=limits.get(key)||{count:0,until:now+60000};entry.count++;limits.set(key,entry);
  if(entry.count>30)fail('Слишком много попыток. Подождите минуту.',429);
}
const publicConnection=row=>({id:row.id,name:row.name,scopes:row.scopes,createdAt:row.created_at,connectedAt:row.connected_at,lastSeenAt:row.last_seen_at,revokedAt:row.revoked_at,codeExpiresAt:row.connected_at?null:row.code_expires_at});
const credentialResponse=(row,access,refresh)=>({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,refresh_expires_in:2592000,agent:publicConnection(row)});

export async function createAgentConnection(pool,userId,input) {
  const parsed=z.object({name:z.string().trim().min(1).max(80),scopes:z.array(z.enum(AGENT_SCOPES)).min(1).max(AGENT_SCOPES.length)}).strict().parse(input);
  const scopes=[...new Set(['read',...parsed.scopes])];
  const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ',bytes=randomBytes(10);
  const raw=[...bytes].map(b=>alphabet[b%alphabet.length]).join(''),code=raw.slice(0,5)+'-'+raw.slice(5);
  const client=await pool.connect();
  try{
    await client.query('begin');await client.query('select pg_advisory_xact_lock(hashtext($1))',['agents:'+userId]);
    const {rows}=await client.query(`select id from cm_agent_connections where user_id=$1 and revoked_at is null and (connected_at is not null and refresh_expires_at>now() or connected_at is null and code_expires_at>now())`,[userId]);
    if(rows.length>=5)fail('Можно подключить до пяти агентов. Отключите ненужного.',409);
    const result=await client.query(`insert into cm_agent_connections(id,user_id,name,scopes,code_hash,code_expires_at) values($1,$2,$3,$4::jsonb,$5,now()+interval '10 minutes') returning *`,[randomUUID(),userId,parsed.name,JSON.stringify(scopes),hash(raw)]);
    await client.query('commit');return {code,expiresAt:result.rows[0].code_expires_at,agent:publicConnection(result.rows[0])};
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}

export async function exchangeAgentCode(pool,code) {
  const raw=normalizeCode(code);if(!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/.test(raw))fail('Код неверный или истёк.',401);
  const access=token(),refresh=token();
  const {rows}=await pool.query(`update cm_agent_connections set connected_at=now(),code_hash=null,access_hash=$2,access_expires_at=now()+interval '1 hour',refresh_hash=$3,refresh_expires_at=now()+interval '30 days',last_seen_at=now() where code_hash=$1 and revoked_at is null and connected_at is null and code_expires_at>now() returning *`,[hash(raw),hash(access),hash(refresh)]);
  if(!rows[0])fail('Код неверный, уже использован или истёк.',401);return credentialResponse(rows[0],access,refresh);
}
export async function refreshAgentToken(pool,refresh) {
  if(typeof refresh!=='string'||refresh.length>200||refresh.length<40)fail('Подключите агента заново.',401);
  const access=token(),nextRefresh=token();
  const {rows}=await pool.query(`update cm_agent_connections set access_hash=$2,access_expires_at=now()+interval '1 hour',refresh_hash=$3,refresh_expires_at=now()+interval '30 days',last_seen_at=now() where refresh_hash=$1 and ${activeSql} and refresh_expires_at>now() returning *`,[hash(refresh),hash(access),hash(nextRefresh)]);
  if(!rows[0])fail('Доступ отключён или истёк. Подключите агента заново.',401);return credentialResponse(rows[0],access,nextRefresh);
}
export async function authenticateAgent(pool,req) {
  const auth=String(req.headers.authorization||''),access=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(access.length<40||access.length>200)fail('Подключите агента с одноразовым кодом.',401);
  const {rows}=await pool.query(`select * from cm_agent_connections where access_hash=$1 and ${activeSql} and access_expires_at>now()`,[hash(access)]);
  if(!rows[0])fail('Доступ истёк или отключён.',401);return rows[0];
}
export async function revokeAgent(pool,userId,id) {
  const {rows}=await pool.query(`update cm_agent_connections set revoked_at=now(),code_hash=null,access_hash=null,refresh_hash=null where id=$1 and user_id=$2 and revoked_at is null returning id`,[id,userId]);
  if(!rows[0])fail('Подключение не найдено.',404);return {ok:true};
}

export async function executeAgentTool(pool,agent,name,args) {
  const tool=agentTools[name];if(!tool)fail('Неизвестный инструмент.',404);
  let input;try{input=tool.schema.parse(args);}catch{fail('Проверьте поля запроса и версии материалов.');}
  if(!agent.scopes.includes(tool.scope))fail('Для этого действия не выданы права.',403);
  if(tool.scope==='read') {
    const snapshot=await readWorkspace(pool,agent.user_id),main=snapshot.main,all=(main.topics||[]).flatMap(t=>t.contentItems||[]);
    const base={revisions:snapshot.revisions};
    if(name==='karta_overview')return {...base,agent:publicConnection(agent),counts:{ideas:(main.topics||[]).length,posts:all.length,products:(main.products||[]).length,funnels:(main.funnels||[]).length,calendar:snapshot.publications.items.length},platforms:main.platforms||[],productTypes:main.productTypes||[],keywords:main.keywords||[]};
    if(name==='karta_get'){
      if(input.kind==='context'){if(!agent.scopes.includes('context'))fail('Полный контекст требует отдельного разрешения владельца.',403);const {rows}=await pool.query("select data from cm_user_state where user_id=$1 and key='context'",[agent.user_id]);return {...base,item:rows[0]?.data||null};}
      const lists={idea:main.topics||[],post:all,product:main.products||[],funnel:main.funnels||[]};
      const item=lists[input.kind].find(m=>m.id===input.id);if(!item)fail('Материал не найден.',404);return {...base,item};
    }
    const lists={ideas:main.topics||[],posts:all,products:main.products||[],funnels:main.funnels||[],calendar:snapshot.publications.items,focus:Object.entries(main.editorial?.weeks||{}).map(([id,v])=>({id,...v}))};
    let items=lists[input.kind];
    if(input.query){const q=input.query.toLowerCase();items=items.filter(m=>[m.title,m.name,m.keyword,m.body,m.thesisPlan,m.description].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));}
    if(input.date)items=items.filter(m=>(m.date||m.publishDate)===input.date);
    if(input.funnelId)items=items.filter(m=>m.funnelId===input.funnelId||main.funnels?.find(f=>f.id===input.funnelId)?.contentItemIds?.includes(m.id));
    if(input.platformId)items=items.filter(m=>m.platformId===input.platformId);
    return {...base,total:items.length,offset:input.offset,items:items.slice(input.offset,input.offset+input.limit).map(m=>{const {body,blocks,history,contentItems,parts,...summary}=m;return {...summary,preview:body?.slice(0,300),screens:blocks?.length,materials:contentItems?.length,parts:parts?.map(p=>({id:p.id,contentItemId:p.contentItemId,published:p.published,approvalStatus:p.approvalStatus}))};})};
  }
  const requestHash=hash(JSON.stringify({name,input}));
  return updateWorkspace(pool,agent.user_id,{type:'agent.write',input,revisions:input.revisions},{
    apply:(main,pubs)=>applyAgentCommand(main,pubs,name,input),
    beforeApply:async client=>{
      const {rows}=await client.query(`select * from cm_agent_connections where id=$1 and user_id=$2 and ${activeSql} and access_expires_at>now() for update`,[agent.id,agent.user_id]);
      if(!rows[0]||rows[0].access_hash!==agent.access_hash)fail('Доступ истёк или отключён.',401);
      if(!rows[0].scopes.includes(tool.scope))fail('Для этого действия не выданы права.',403);
      const previous=await client.query('select request_hash,result from cm_agent_actions where agent_id=$1 and request_id=$2',[agent.id,input.requestId]);
      if(previous.rows[0]){if(previous.rows[0].request_hash!==requestHash)fail('Этот requestId уже использован для другого действия.',409);return {...previous.rows[0].result,replayed:true};}
    },
    afterApply:async(client,saved)=>{
      const result={result:saved.result,revisions:saved.revisions};
      await client.query('insert into cm_agent_actions(id,agent_id,user_id,request_id,request_hash,tool,result) values($1,$2,$3,$4,$5,$6,$7::jsonb)',[randomUUID(),agent.id,agent.user_id,input.requestId,requestHash,name,JSON.stringify(result)]);
      await client.query('update cm_agent_connections set last_seen_at=now() where id=$1',[agent.id]);
    },
  }).then(saved=>({result:saved.result,revisions:saved.revisions,...(saved.replayed?{replayed:true}:{})}));
}

export async function agentApi(req,res,{path,pool,send,requireUser,appUrl}) {
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  try{
    if(req.headers.origin&&req.headers.origin!==new URL(appUrl).origin)fail('Недопустимый источник запроса.',403);
    if(path==='/api/agent/connections'||path.startsWith('/api/agent/connections/')) {
      if(req.method!=='GET'&&req.headers.origin!==new URL(appUrl).origin)fail('Откройте подключение из приложения.',403);
      const user=await requireUser(req,res);if(!user)return;
      if(path==='/api/agent/connections'&&req.method==='GET'){
        const agents=await pool.query('select * from cm_agent_connections where user_id=$1 order by created_at desc limit 50',[user.id]);
        const actions=await pool.query('select a.tool,a.created_at,c.name,a.result from cm_agent_actions a join cm_agent_connections c on c.id=a.agent_id where a.user_id=$1 order by a.created_at desc limit 20',[user.id]);
        return send(res,200,{agents:agents.rows.map(publicConnection),actions:actions.rows.map(a=>({tool:a.tool,createdAt:a.created_at,name:a.name,result:a.result.result}))});
      }
      if(path==='/api/agent/connections'&&req.method==='POST')return send(res,201,await createAgentConnection(pool,user.id,await limitedBody(req)));
      const match=path.match(/^\/api\/agent\/connections\/([a-f0-9-]{36})$/);
      if(match&&req.method==='DELETE')return send(res,200,await revokeAgent(pool,user.id,match[1]));
      return send(res,405,{message:'Метод не поддерживается.'});
    }
    if(path==='/api/agent/connect'||path==='/api/agent/refresh'){
      if(req.method!=='POST')return send(res,405,{message:'Используйте POST.'});throttle(req);
      const input=await limitedBody(req);const result=path.endsWith('/connect')?await exchangeAgentCode(pool,input.code):await refreshAgentToken(pool,input.refresh_token);return send(res,200,result);
    }
    const agent=await authenticateAgent(pool,req);
    if(path==='/api/agent/me'&&req.method==='GET')return send(res,200,{agent:publicConnection(agent)});
    if(path==='/api/agent/tools'&&req.method==='GET')return send(res,200,{tools:Object.entries(agentTools).filter(([,t])=>agent.scopes.includes(t.scope)).map(([name,t])=>({name,description:t.description,inputSchema:zodToJsonSchema(t.schema,{$refStrategy:'none'})}))});
    if(path==='/api/agent/actions'&&req.method==='POST'){const input=await limitedBody(req);return send(res,200,await executeAgentTool(pool,agent,input.name,input.arguments||{}));}
    if(path==='/api/agent/mcp'){
      if(req.method!=='POST')return send(res,405,{message:'Streamable HTTP: используйте POST.'},{Allow:'POST'});
      const server=new McpServer({name:'karta-kontenta',version:'1.0.0'});
      registerAgentTools(server,(name,input)=>executeAgentTool(pool,agent,name,input));
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on('close',()=>{void transport.close();void server.close();});
      await server.connect(transport);await transport.handleRequest(req,res,await limitedBody(req));return;
    }
    return send(res,404,{message:'Маршрут не найден.'});
  }catch(error){if(res.headersSent)return res.end();return send(res,error.status|| (error instanceof z.ZodError?400:500),{message:error.status?error.message:error instanceof z.ZodError?'Проверьте имя и права подключения.':'Не удалось выполнить действие.'});}
}
