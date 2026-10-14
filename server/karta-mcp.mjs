import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, open, unlink, stat, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { registerAgentTools } from './agent-tools.mjs';

const fail=(message,status=500)=>{throw Object.assign(new Error(message),{status});};
export function validateAppUrl(value) {
  const url=new URL(value);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))fail('Нужен HTTPS-адрес приложения (HTTP разрешён только локально).');
  return url.origin;
}
function protect(value,decrypt=false) {
  if(process.platform!=='win32')return value;
  const prefix="[void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $v=[Console]::In.ReadToEnd(); ";
  const script=prefix+(decrypt?"$b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))":"$b=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($v),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($b))");
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{input:value,encoding:'utf8',windowsHide:true,timeout:15000});
  if(result.status!==0)fail('Не удалось открыть защищённый доступ. Подключите агента заново.');return result.stdout.trim();
}
export function createAgentClient({appUrl='https://kartakontenta.ru',account='default',credentialFile,fetchImpl=fetch}={}) {
  const base=validateAppUrl(appUrl);
  const profile=createHash('sha256').update(base+'\n'+account).digest('hex').slice(0,24);
  const file=credentialFile||join(process.platform==='win32'?process.env.LOCALAPPDATA||join(homedir(),'AppData','Local'):join(homedir(),'.local','share'),'KartaKontenta','agents',profile+'.credentials');
  async function read(){try{return JSON.parse(protect(await readFile(file,'utf8'),true));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async function save(data){await mkdir(dirname(file),{recursive:true,mode:0o700});const tmp=file+'.'+randomUUID();try{await writeFile(tmp,protect(JSON.stringify(data)),{mode:0o600});await rename(tmp,file);if(process.platform!=='win32')await chmod(file,0o600);}finally{await unlink(tmp).catch(()=>{});}}
  async function request(path,input,access){
    const response=await fetchImpl(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify(input),signal:AbortSignal.timeout(25000),redirect:'error'});
    const data=await response.json();if(!response.ok)fail(data.message||'Ошибка подключения.',response.status);return data;
  }
  // Serializes token rotation across host processes using the same account profile.
  async function locked(callback){
    await mkdir(dirname(file),{recursive:true,mode:0o700});let lock;const started=Date.now();
    while(!lock){try{lock=await open(file+'.lock','wx',0o600);}catch(e){if(e.code!=='EEXIST')throw e;const info=await stat(file+'.lock').catch(()=>null);if(info&&Date.now()-info.mtimeMs>120000)await unlink(file+'.lock').catch(()=>{});if(Date.now()-started>30000)fail('Другое подключение занято. Повторите запрос.');await new Promise(r=>setTimeout(r,100));}}
    try{return await callback();}finally{await lock.close();await unlink(file+'.lock').catch(()=>{});}
  }
  return {
    async connect(code){return locked(async()=>{const data=await request('/api/agent/connect',{code});await save({...data,expiresAt:Date.now()+data.expires_in*1000});return {connected:true,agent:data.agent};});},
    async execute(name,input){return locked(async()=>{
      let credentials=await read();if(!credentials)fail('Откройте «Подключить агента» в Карте контента и вызовите karta_connect с кодом.',401);
      async function refresh(){const data=await request('/api/agent/refresh',{refresh_token:credentials.refresh_token});credentials={...data,expiresAt:Date.now()+data.expires_in*1000};await save(credentials);}
      if(credentials.expiresAt<Date.now()+60000)await refresh();
      try{return await request('/api/agent/actions',{name,arguments:input},credentials.access_token);}catch(error){if(error.status!==401)throw error;await refresh();return request('/api/agent/actions',{name,arguments:input},credentials.access_token);}
    });},
  };
}

async function main(){
  const args=process.argv.slice(2),value=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
  const client=createAgentClient({appUrl:value('--url','https://kartakontenta.ru'),account:value('--account','codex')});
  const server=new McpServer({name:'karta-kontenta',version:'1.0.0'});
  server.registerTool('karta_connect',{description:'Подключиться к Карте контента по одноразовому коду из приложения. Доступ хранится защищённо на устройстве и обновляется автоматически.',inputSchema:{code:z.string().min(1).max(30)},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},async({code})=>{
    try{return {content:[{type:'text',text:JSON.stringify(await client.connect(code))}]};}catch(error){return {isError:true,content:[{type:'text',text:error.status?error.message:'Не удалось сохранить подключение.'}]};}
  });
  registerAgentTools(server,(name,input)=>client.execute(name,input));
  await server.connect(new StdioServerTransport());
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Не удалось запустить MCP Карты контента.');process.exitCode=1;});
