import {useCallback,useEffect,useRef,useState,type SetStateAction} from 'react';
import {toast} from 'sonner';
import type {AppDataState} from '@/lib/dataStore';
import {DEFAULT_FORMATS,DEFAULT_PRODUCT_TYPES} from '@/lib/productData';
import {DEFAULT_PLATFORMS} from '@/lib/contentData';

function normalize(value:Partial<AppDataState> = {}):AppDataState {
 return {products:value.products||[],productTypes:value.productTypes?.length?value.productTypes:DEFAULT_PRODUCT_TYPES,
  formats:value.formats?.length?value.formats:DEFAULT_FORMATS,platforms:value.platforms?.length?value.platforms:DEFAULT_PLATFORMS,
  topics:value.topics||[],funnels:value.funnels||[],keywords:value.keywords||[]};
}
type Session={userId:string;data:AppDataState;revision:string;ready:boolean;dirty:boolean;running:boolean;conflict:boolean;active:boolean};
const initial=(userId:string):Session=>({userId,data:normalize(),revision:'new',ready:false,dirty:false,running:false,conflict:false,active:true});

/** Main data shares the editorial transaction; only actual user edits are written. */
export function useMainState(userId:string){
 const [data,render]=useState<AppDataState>(normalize),[stateReady,setReady]=useState(false),[stateError,setError]=useState(''),[isDataLoading,setLoading]=useState(false);
 const session=useRef(initial('')),timer=useRef<ReturnType<typeof setTimeout>>();
 const key=(s:Session)=>'content-map-main-recovery:'+s.userId;
 const backup=useCallback((s:Session)=>{
  try{localStorage.setItem(key(s),JSON.stringify({data:s.data,revision:s.revision}));}
  catch{toast.error('Не удалось сохранить резервную копию. Не закрывайте страницу до сохранения.');}
 },[]);
 const download=useCallback((s:Session)=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({data:s.data,revision:s.revision},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Карта контента — несохранённые правки.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 },[]);
 const warnConflict=useCallback((s:Session)=>{
  toast.error('Данные изменились на другом устройстве. Ваши правки сохранены здесь. Скачайте их перед загрузкой актуальной версии.',{
   id:'main-save',duration:Infinity,action:{label:'Скачать правки',onClick:()=>download(s)},
   cancel:{label:'Загрузить актуальное',onClick:()=>{download(s);localStorage.removeItem(key(s));window.location.reload();}}
  });
 },[download]);
 const flush=useCallback(async()=>{
  const s=session.current;
  if(!s.active||!s.ready||!s.dirty||s.running||s.conflict)return;
  s.running=true;
  try{
   while(s.active&&s.dirty){
    const snapshot=s.data;
    const response=await fetch('/api/content-workspace',{method:'POST',credentials:'include',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'main.replace',input:{data:snapshot},revisions:{main:s.revision}})});
    const saved=await response.json();
    if(!s.active)return;
    if(response.status===409){s.conflict=true;backup(s);warnConflict(s);return;}
    if(!response.ok||typeof saved.revision!=='string')throw new Error(saved.message||'Не удалось сохранить изменения.');
    s.revision=saved.revision;s.dirty=s.data!==snapshot;
    if(s.dirty)backup(s);
    else{
     s.data=normalize(saved.main);render(s.data);localStorage.removeItem(key(s));toast.dismiss('main-save');
     window.dispatchEvent(new CustomEvent('content-map:saved',{detail:{...saved,userId:s.userId}}));
    }
   }
  }catch(e){
   if(s.active){backup(s);toast.error((e as Error).message+' Правки остаются на устройстве.',{id:'main-save',duration:Infinity,action:{label:'Повторить',onClick:()=>void flush()}});}
  }finally{s.running=false;}
 },[backup,warnConflict]);

 useEffect(()=>{
  const s=initial(userId);session.current=s;render(s.data);setReady(false);setError('');setLoading(Boolean(userId));
  if(userId)void(async()=>{
   try{
    const response=await fetch('/api/state/main',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Не удалось загрузить материалы. Сохранённые данные не изменены.');
    const result=await response.json();if(!s.active)return;
    if(typeof result.revision!=='string')throw new Error('Обновите приложение перед сохранением.');
    s.data=normalize(result.data||{});s.revision=result.revision;s.ready=true;
    const raw=localStorage.getItem(key(s));
    if(raw){
     try{const draft=JSON.parse(raw);if(draft.data&&typeof draft.revision==='string'){
      s.data=normalize(draft.data);s.dirty=true;s.conflict=draft.revision!==result.revision;
      if(s.conflict)warnConflict(s);
     }}catch{toast.error('Не удалось прочитать резервную копию. Она сохранена на устройстве.');}
    }
    render(s.data);setReady(true);if(s.dirty&&!s.conflict)void flush();
   }catch(e){if(s.active)setError((e as Error).message);}
   finally{if(s.active)setLoading(false);}
  })();
  return()=>{s.active=false;clearTimeout(timer.current);toast.dismiss('main-save');};
 },[userId,flush,warnConflict]);

 const setData=useCallback((value:SetStateAction<AppDataState>)=>{
  const s=session.current;if(!s.active||!s.ready)return;
  const next=typeof value==='function'?value(s.data):value;
  if(JSON.stringify(next)===JSON.stringify(s.data))return;
  s.data=next;s.dirty=true;render(next);backup(s);
  clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),250);
 },[backup,flush]);

 useEffect(()=>{
  const receive=(event:Event)=>{
   const s=session.current,saved=(event as CustomEvent).detail;
   if(!s.active||!s.ready||s.dirty||s.running||saved?.userId!==s.userId||!saved.main||!saved.revisions)return;
   s.data=normalize(saved.main);s.revision=saved.revisions.main;render(s.data);
  };
  const refresh=async()=>{
   const s=session.current;if(!s.active||!s.ready||s.dirty||s.running||s.conflict||document.visibilityState==='hidden')return;
   const revision=s.revision;
   try{
    const r=await fetch('/api/state/main',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)return;
    const next=await r.json();
    if(s.active&&!s.dirty&&!s.running&&s.revision===revision&&typeof next.revision==='string'&&next.revision!==revision){s.data=normalize(next.data||{});s.revision=next.revision;render(s.data);}
   }catch{/* Keep local data during temporary disconnection. */}
  };
  const online=()=>void flush(),visible=()=>{if(document.visibilityState==='hidden')void flush();else void refresh();};
  const leave=(event:BeforeUnloadEvent)=>{if(session.current.dirty){event.preventDefault();event.returnValue='';}};
  const interval=setInterval(()=>void refresh(),20000);
  window.addEventListener('content-map:saved',receive);window.addEventListener('online',online);window.addEventListener('focus',refresh);window.addEventListener('beforeunload',leave);document.addEventListener('visibilitychange',visible);
  return()=>{clearInterval(interval);window.removeEventListener('content-map:saved',receive);window.removeEventListener('online',online);window.removeEventListener('focus',refresh);window.removeEventListener('beforeunload',leave);document.removeEventListener('visibilitychange',visible);};
 },[flush]);
 return {data,setData,isDataLoading,stateReady:stateReady&&session.current.userId===userId,stateError};
}
