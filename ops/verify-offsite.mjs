import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createDecipheriv} from 'node:crypto';
if(process.platform!=='win32')throw Error('Use the Windows account that owns the DPAPI recovery key');
const directory=process.argv[2]||join(process.env.USERPROFILE,'CodexBackups','Карта контента');
const script="Add-Type -AssemblyName System.Security; $p=[Console]::In.ReadToEnd(); $b=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($p),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($b)); [Array]::Clear($b,0,$b.Length)";
const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{input:join(directory,'Ключ восстановления.dpapi'),encoding:'utf8',windowsHide:true,timeout:15000});
if(result.status!==0)throw Error('Could not unlock the local recovery key');
const key=Buffer.from(result.stdout.trim(),'base64');result.stdout='';
try{
 if(key.length!==32)throw Error('Invalid recovery key');
 const archives=readdirSync(directory).filter(name=>/^karta-[0-9TZ-]+\.aes$/.test(name));
 if(!archives.length)throw Error('No encrypted archives found');
 for(const name of archives){const data=readFileSync(join(directory,name));if(data.subarray(0,7).toString()!=='KARTA01')throw Error('Unsupported archive');const cipher=createDecipheriv('aes-256-gcm',key,data.subarray(7,19));cipher.setAuthTag(data.subarray(19,35));let clear;try{clear=Buffer.concat([cipher.update(data.subarray(35)),cipher.final()]);}finally{clear?.fill(0);}}
 console.log(JSON.stringify({ok:true,archives:archives.length,localRecoveryKeyWorks:true,authenticatedArchives:true}));
}catch{console.error('Local archive verification failed');process.exitCode=1;}finally{key.fill(0);}
