import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useAuth} from './authContext';
import type {Workspace} from './editorial';
type Context = {data:Workspace|null;error:string;busy:boolean;refresh:()=>Promise<void>;command:(type:string,input:unknown)=>Promise<{id?:number|string;ids?:number[]}>};
const Context = createContext<Context|null>(null);
export function EditorialProvider({children}:{children:ReactNode}) {
 const {user,isAuthenticated}=useAuth();
 const [data,setData]=useState<Workspace|null>(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
 const current=useRef<Workspace|null>(null), locked=useRef(false), generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(!isAuthenticated) return;
  const token=generation.current;
  try { const r=await fetch('/api/content-workspace',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!r.ok) throw new Error('Не удалось загрузить контент. Повторите загрузку.');
   const next=await r.json();
   if(token!==generation.current || locked.current) return;
   current.current=next;setData(next);setError('');
  } catch(e) {if(token===generation.current) setError(e instanceof Error?e.message:'Ошибка загрузки.');}
 },[isAuthenticated]);
 useEffect(()=>{generation.current++;current.current=null;setData(null);setError('');void refresh();},[user?.id,refresh]);
 useEffect(()=>{const handler=()=>{if(!locked.current) void refresh();};window.addEventListener('content-map:changed',handler);window.addEventListener('content-map:saved',handler);window.addEventListener('focus',handler);return()=>{window.removeEventListener('content-map:changed',handler);window.removeEventListener('content-map:saved',handler);window.removeEventListener('focus',handler);};},[refresh]);
 const command=useCallback(async(type:string,input:unknown)=>{
  if(locked.current || !current.current) throw new Error('Дождитесь сохранения или загрузки.');
  locked.current=true;setBusy(true);
  const token=generation.current;
  try {
   const r=await fetch('/api/content-workspace',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,input,revisions:current.current.revisions}),signal:AbortSignal.timeout(20000)});
   const next=await r.json();
   if(!r.ok) throw new Error(next.message || 'Не удалось сохранить. Ваш текст остаётся в редакторе.');
   if(token!==generation.current) throw new Error('Аккаунт изменился. Обновите страницу.');
   current.current=next;setData(next);setError('');
   window.dispatchEvent(new CustomEvent('content-map:saved',{detail:{...next,userId:user?.id}}));
   return next.result || {};
  } finally {locked.current=false;setBusy(false);}
 },[user?.id]);
 return <Context.Provider value={{data,error,busy,refresh,command}}>{children}</Context.Provider>;
}
export function useEditorial(){const value=useContext(Context);if(!value)throw new Error('EditorialProvider missing');return value;}
