import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgentClient, validateAppUrl } from './karta-mcp.mjs';

test('credentials never appear in tool output; 401 rotates access and retries exact request',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'karta-mcp-'));const calls=[];let unauthorized=true;
  const fetchImpl=async(url,options)=>{
    const input=JSON.parse(options.body);calls.push({url,input,auth:options.headers.Authorization});
    if(url.endsWith('/connect'))return {ok:true,json:async()=>({access_token:'access-private',refresh_token:'refresh-private',expires_in:3600,agent:{id:'a'}})};
    if(url.endsWith('/refresh'))return {ok:true,json:async()=>({access_token:'new-access',refresh_token:'new-refresh',expires_in:3600,agent:{id:'a'}})};
    if(unauthorized){unauthorized=false;return {ok:false,status:401,json:async()=>({message:'Expired'})};}
    return {ok:true,json:async()=>({result:{id:1}})};
  };
  try{
    const client=createAgentClient({credentialFile:join(dir,'auth'),fetchImpl});
    await assert.rejects(client.execute('karta_overview',{}),/karta_connect/);
    const connected=await client.connect('ABCDE-FGHJK');assert.equal(JSON.stringify(connected).includes('private'),false);
    const input={requestId:'same-request'};assert.equal((await client.execute('karta_create_post',input)).result.id,1);
    assert.equal(calls[2].input.refresh_token,'refresh-private');assert.deepEqual(calls[1].input,calls[3].input);
    if(process.platform==='win32')assert.equal((await readFile(join(dir,'auth'),'utf8')).includes('new-refresh'),false);
    const reopened=createAgentClient({credentialFile:join(dir,'auth'),fetchImpl});await reopened.execute('karta_overview',{});assert.equal(calls.at(-1).auth,'Bearer new-access');
  }finally{assert.ok(dir.startsWith(join(tmpdir(),'karta-mcp-')));await rm(dir,{recursive:true,force:true});}
});
test('bridge refuses remote HTTP, credential URLs and redirects',()=>{
  assert.equal(validateAppUrl('http://127.0.0.1:9999'),'http://127.0.0.1:9999');
  for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?token=secret'])assert.throws(()=>validateAppUrl(url));
});
