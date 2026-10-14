import {useCallback,useEffect,useRef,useState,type SetStateAction} from 'react';
import {toast} from 'sonner';
type Session<T>={userId:string;data:T;revision:string;ready:boolean;dirty:boolean;running:boolean;conflict:boolean;active:boolean};
const key=(s:{userId:string})=>'content-map-context-recovery:'+s.userId;
export function useContextPersistence<T>(userId:string,empty:T){
 const initial=(id:string):Session<T>=>({userId:id,data:structuredClone(empty),revision:'new',ready:false,dirty:false,running:false,conflict:false,active:true});
 const [data,render]=useState<T>(empty),[stateReady,setReady]=useState(false),[stateError,setError]=useState(''),[isLoading,setLoading]=useState(false);
 const session=useRef(initial('')),timer=useRef<ReturnType<typeof setTimeout>>();
 const backup=useCallback((s:Session<T>)=>{try{localStorage.setItem(key(s),JSON.stringify({data:s.data,revision:s.revision}));}catch{toast.error('Не удалось сохранить черновик контекста. Не закрывайте страницу до сохранения.');}},[]);
 const download=useCallback((s:Session<T>)=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({data:s.data,revision:s.revision},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Контекст — несохранённые правки.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 },[]);
 const conflict=useCallback((s:Session<T>)=>toast.error('Контекст изменён на другом устройстве. Ваши правки сохранены здесь. Скачайте их перед загрузкой актуального.',{
  id:'context-save',duration:Infinity,action:{label:'Скачать правки',onClick:()=>download(s)},cancel:{label:'Загрузить актуальное',onClick:()=>{download(s);localStorage.removeItem(key(s));window.location.reload();}}
 }),[download]);
 const flush=useCallback(async():Promise<void>=>{
  const s=session.current;if(!s.active||!s.ready||!s.dirty||s.running||s.conflict)return;
  s.running=true;
  try{
   while(s.active&&s.dirty){
    const snapshot=s.data;
    const response=await fetch('/api/state/context',{method:'PUT',credentials:'include',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','If-Match':s.revision},body:JSON.stringify({data:snapshot})});
    const result=await response.json();if(!s.active)return;
    if(response.status===409){s.conflict=true;backup(s);conflict(s);return;}
    if(!response.ok||typeof result.revision!=='string')throw new Error('context_save_failed');
    s.revision=result.revision;s.dirty=s.data!==snapshot;
    if(s.dirty)backup(s);else{localStorage.removeItem(key(s));toast.dismiss('context-save');toast.success('Контекст сохранён',{id:'context-saved'});}
   }
  }catch{if(s.active){backup(s);toast.error('Контекст не сохранился. Черновик сохранён на этом устройстве.',{id:'context-save',duration:Infinity,action:{label:'Повторить',onClick:()=>void flush()}});}}
  finally{s.running=false;}
 },[backup,conflict]);
 useEffect(()=>{
  session.current.active=false;const s=initial(userId);session.current=s;setReady(false);setError('');render(s.data);
  if(!userId){setLoading(false);return()=>{s.active=false;};}
  setLoading(true);
  fetch('/api/state/context',{credentials:'include',signal:AbortSignal.timeout(20000)}).then(async response=>{
   if(!response.ok)throw new Error('context_load_failed');const result=await response.json();if(!s.active)return;
   if(typeof result.revision!=='string')throw new Error('context_revision_missing');
   s.data={...structuredClone(empty),...(result.data||{})};s.revision=result.revision;s.ready=true;
   try{const recovery=JSON.parse(localStorage.getItem(key(s))||'null');if(recovery?.data&&typeof recovery.revision==='string'){
    s.data=recovery.data;s.dirty=true;s.conflict=recovery.revision!==s.revision;
    if(s.conflict)conflict(s);else toast('Восстановлен черновик контекста.');
   }}catch{/* Invalid optional recovery cannot replace server data. */}
   render(s.data);setReady(true);if(s.dirty&&!s.conflict)void flush();
  }).catch(()=>{if(s.active)setError('Не удалось загрузить контекст. Сохранённые данные не изменены.');}).finally(()=>{if(s.active)setLoading(false);});
  return()=>{s.active=false;clearTimeout(timer.current);};
 // empty is a module-level schema default; mutations do not change it.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId,flush,conflict]);
 useEffect(()=>{
  const retry=()=>void flush();window.addEventListener('online',retry);window.addEventListener('focus',retry);
  const unload=(event:BeforeUnloadEvent)=>{if(session.current.dirty){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('beforeunload',unload);};
 },[flush]);
 const setData=useCallback((next:SetStateAction<T>)=>{
  const s=session.current;if(!s.active||!s.ready||!s.userId)return;
  s.data=typeof next==='function'?(next as (previous:T)=>T)(s.data):next;s.dirty=true;render(s.data);backup(s);
  clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),250);
 },[backup,flush]);
 return {data,setData,stateReady,stateError,isLoading};
}
