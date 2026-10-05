import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {contentWorkspaceApi} from '../../server/content-workspace-api.mjs';
const hash=d=>createHash('md5').update(JSON.stringify(d)).digest('hex');
function memoryPool(){
 let states={main:{topics:[],products:[],funnels:[]},publications:{schema:1,items:[]}},saved;
 const client={query:async(sql,args=[])=>{
  if(sql==='begin'){saved=structuredClone(states);return{rows:[]};}
  if(sql==='rollback'){states=saved;return{rows:[]};}
  if(sql.startsWith('select key,data'))return {rows:Object.entries(states).map(([key,data])=>({key,data:structuredClone(data),revision:hash(data)}))};
  if(sql.startsWith('insert into cm_user_state')){states[args[1]]=JSON.parse(args[2]);return{rows:[]};}
  return{rows:[]};
 },release(){}};
 return{query:client.query,connect:async()=>client};
}
test('isolated HTTP endpoint authenticates, saves, rejects stale writes and returns persisted links',async()=>{
 const pool=memoryPool();
 const server=createServer(async(req,res)=>{
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const body=async req=>{let data='';for await(const chunk of req)data+=chunk;return JSON.parse(data);};
  await contentWorkspaceApi(req,res,{user:req.headers['x-test-user']==='fixture'?{id:'test-user'}:null,pool,body,send});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const headers={'x-test-user':'fixture','Content-Type':'application/json'};
 try{
  assert.equal((await fetch(url)).status,401);
  const first=await fetch(url,{headers});const initial=await first.json();
  assert.equal((await fetch(url,{headers:{...headers,'If-None-Match':first.headers.get('etag')}})).status,304);
  const response=await fetch(url,{method:'POST',headers,body:JSON.stringify({type:'idea.save',input:{title:'Проверка HTTP',source:'Тест'},revisions:initial.revisions})});
  assert.equal(response.status,200);const saved=await response.json();
  assert.equal(saved.main.topics.length,1);assert.match(saved.result.links[0],/^\/content\?mode=ideas&idea=/);
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({type:'idea.save',input:{title:'Устаревшее'},revisions:initial.revisions})})).status,409);
  const restored=await (await fetch(url,{headers})).json();assert.equal(restored.main.topics.length,1);
  assert.equal((await fetch(url,{method:'DELETE',headers})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
