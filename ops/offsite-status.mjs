import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,realpath,readFile,mkdir,writeFile,rename} from 'node:fs/promises';
const archiveBase='/opt/kartakontenta-backups/encrypted',statusFile='/var/lib/kartakontenta-health/offsite-receipt.json';
export function archiveDate(file){
 const match=/^karta-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.aes$/.exec(file||'');
 if(!match)throw Error('invalid_archive_name');
 const iso=`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
 if(!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString()!==iso)throw Error('invalid_archive_date');
 return iso;
}
export function assessOffsite(receipt,clock=Date.now()){
 const fresh=value=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=clock+60000&&clock-Date.parse(value)<36*3600000;
 return {fresh:Boolean(/^[a-f0-9]{64}$/.test(receipt?.sha256||'')&&fresh(receipt.archiveCreatedAt)&&fresh(receipt.lastVerifiedAt)),failed:receipt?.ok===false,archiveCreatedAt:receipt?.archiveCreatedAt||null,lastVerifiedAt:receipt?.lastVerifiedAt||null};
}
export async function recordSuccess(file,sha256,{clock=Date.now(),verifyArchive,persist}){
 const archiveCreatedAt=archiveDate(file);
 if(!/^[a-f0-9]{64}$/.test(sha256||'')||Date.parse(archiveCreatedAt)>clock+60000)throw Error('invalid_offsite_receipt');
 if(await verifyArchive(file)!==sha256)throw Error('offsite_archive_hash_mismatch');
 const receipt={ok:true,file,sha256,archiveCreatedAt,lastVerifiedAt:new Date(clock).toISOString(),lastAttemptAt:new Date(clock).toISOString()};
 await persist(receipt);return receipt;
}
async function persist(value){await mkdir('/var/lib/kartakontenta-health',{recursive:true,mode:0o700});const temp=statusFile+'.tmp';await writeFile(temp,JSON.stringify(value),{mode:0o600});await rename(temp,statusFile);}
async function verifyArchive(file){const path=archiveBase+'/'+file,info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||await realpath(path)!==path)throw Error('invalid_archive_file');const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
if(['--record-success','--record-failure'].includes(process.argv[2])){
 try{
  if(process.argv[2]==='--record-success'){await recordSuccess(process.argv[3],process.argv[4],{verifyArchive,persist});console.log('offsite_receipt_recorded');}
  else if(process.argv[2]==='--record-failure'){let old={};try{old=JSON.parse(await readFile(statusFile,'utf8'));}catch{}await persist({...old,ok:false,lastAttemptAt:new Date().toISOString(),error:'sync_failed'});console.log('offsite_failure_recorded');}
  else throw Error('unsupported_action');
 }catch{console.error('offsite_receipt_rejected');process.exitCode=1;}
}
