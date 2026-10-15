import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {useAuth} from './authContext';

export type LegalDocument = {id:string; title:string; href:string; pdf:string; sha256:string};
export type LegalStatus = {version:string; manifestHash:string; documents:LegalDocument[]; accepted?:boolean; personalData?:boolean; advertising?:boolean; acceptedAt?:string; updatedAt?:string};
type Choice={terms:boolean;personalData:boolean;advertising:boolean};
type LegalContextValue={status:LegalStatus|null;loading:boolean;error:string;refresh:()=>Promise<void>;save:(choice:Choice)=>Promise<void>;withdraw:()=>Promise<void>};
const Context=createContext<LegalContextValue|null>(null);
async function request(path:string,options?:RequestInit):Promise<LegalStatus>{
  const response=await fetch(path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...options?.headers},signal:options?.signal||AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.message||'Документы не загрузились. Попробуйте ещё раз.'),{status:response.status});
  if(!data.version||!data.manifestHash||data.documents?.length!==4)throw Error('Документы не загрузились. Попробуйте ещё раз.');
  return data;
}
export function LegalProvider({children}:{children:ReactNode}){
  const {isAuthenticated,isLoading}=useAuth();
  const [status,setStatus]=useState<LegalStatus|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const generation=useRef(0),mounted=useRef(true),mutating=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const refresh=useCallback(async()=>{
    if(isLoading||mutating.current)return;
    const current=++generation.current;
    try{const value=await request(isAuthenticated?'/api/legal/status':'/api/legal');if(mounted.current&&current===generation.current){setStatus(value);setError('');}}
    catch(e){if(mounted.current&&current===generation.current)setError(e instanceof Error?e.message:'Не удалось загрузить документы.');}
    finally{if(mounted.current&&current===generation.current)setLoading(false);}
  },[isAuthenticated,isLoading]);
  useEffect(()=>{void refresh();const onVisible=()=>{if(document.visibilityState==='visible')void refresh();};window.addEventListener('focus',onVisible);document.addEventListener('visibilitychange',onVisible);return()=>{window.removeEventListener('focus',onVisible);document.removeEventListener('visibilitychange',onVisible);};},[refresh]);
  async function mutate(path:string,body:unknown){
    if(mutating.current)throw Error('Дождитесь сохранения выбора.');
    mutating.current=true;
    const current=++generation.current;
    try{const value=await request(path,{method:'POST',body:JSON.stringify(body)});if(mounted.current&&current===generation.current){setStatus(value);setError('');}}
    catch(e){mutating.current=false;if((e as {status?:number}).status===409)await refresh();throw e;}
    finally{mutating.current=false;}
  }
  const save=async(choice:Choice)=>{if(!status)throw Error('Дождитесь загрузки документов.');await mutate(status.accepted?'/api/legal/preferences':'/api/legal/accept',{version:status.version,manifestHash:status.manifestHash,...choice});};
  const withdraw=async()=>mutate('/api/legal/withdraw',{});
  return <Context.Provider value={{status,loading,error,refresh,save,withdraw}}>{children}</Context.Provider>;
}
export function useLegal(){const context=useContext(Context);if(!context)throw Error('LegalProvider required');return context;}
