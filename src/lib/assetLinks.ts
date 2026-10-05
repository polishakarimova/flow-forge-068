import type {Asset} from './editorial';
export function safeUrl(value?:string){try{const u=new URL(value||'');return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function assetDownload(asset:Asset){
 if(asset.kind==='folder')return '';
 if(asset.downloadUrl)return safeUrl(asset.downloadUrl);
 const href=safeUrl(asset.url);if(!href)return '';
 const u=new URL(href);
 if(u.hostname==='drive.google.com'){
  if(u.pathname.includes('/folders/'))return '';
  const id=u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1]||u.searchParams.get('id');
  if(id&&/^[\w-]+$/.test(id)){const link=new URL('https://drive.google.com/uc');link.searchParams.set('export','download');link.searchParams.set('id',id);if(u.searchParams.get('resourcekey'))link.searchParams.set('resourcekey',u.searchParams.get('resourcekey')!);return link.href;}
 }
 return '';
}
