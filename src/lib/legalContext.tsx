import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {useAuth} from './authContext';

export type LegalDocument = {id:string; title:string; href:string; pdf:string; sha256:string};
export type LegalStatus = {version:string; manifestHash:string; documents:LegalDocument[]; accountId?:string; sequence?:number; accepted?:boolean; personalData?:boolean; advertising?:boolean; acceptedAt?:string|null; updatedAt?:string|null};
type Choice={terms:boolean;personalData:boolean;advertising:boolean};
type LegalContextValue={status:LegalStatus|null;loading:boolean;error:string;choiceNotice:string;refresh:()=>Promise<void>;save:(choice:Choice)=>Promise<void>;withdraw:()=>Promise<void>};
const Context=createContext<LegalContextValue|null>(null);
async function request(path:string,options?:RequestInit,accountId?:string):Promise<LegalStatus>{
  const response=await fetch(path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...options?.headers},signal:options?.signal||AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.message||'Документы не загрузились. Попробуйте ещё раз.'),{status:response.status,code:data.error});
  if(!data.version||!data.manifestHash||data.documents?.length!==4)throw Object.assign(Error('Документы не загрузились. Попробуйте ещё раз.'),{status:422});
  if(accountId) {
    if(typeof data.accountId!=='string'||!Number.isSafeInteger(data.sequence)||data.sequence<0)throw Object.assign(new Error('Обновите страницу, чтобы загрузить согласия вашего аккаунта.'),{status:422});
    if(data.accountId!==accountId)throw Object.assign(new Error('Аккаунт изменился. Проверяем текущий вход.'),{status:409,code:'account_changed'});
  }
  return data;
}
export function LegalProvider({children}:{children:ReactNode}){
  const {user,isAuthenticated,isLoading,sessionExpired,restore}=useAuth();
  const accountId=user?.id;
  const [choiceNotice,setChoiceNotice]=useState('');
  const [status,setStatus]=useState<LegalStatus|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const generation=useRef(0),mounted=useRef(true),mutating=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const refresh=useCallback(async()=>{
    if(isLoading||mutating.current)return;
    const current=++generation.current;
    try{const value=await request(isAuthenticated?'/api/legal/status':'/api/legal',undefined,accountId);if(mounted.current&&current===generation.current){setStatus(value);setError('');}}
    catch(e){
      if(mounted.current && current===generation.current){
        if((e as {code?:string}).code==='account_changed') {setStatus(null);await restore();}
        else if(isAuthenticated && (e as {status?:number}).status===401) sessionExpired();
        else {
          const code=(e as {status?:number}).status;
          if(code&&code<500&&code!==408&&code!==429)setStatus(null);
          setError(e instanceof Error?e.message:'Не удалось загрузить документы.');
        }
      }
    }
    finally{if(mounted.current&&current===generation.current)setLoading(false);}
  },[accountId,isAuthenticated,isLoading,restore,sessionExpired]);
  useEffect(()=>{void refresh();const onVisible=()=>{if(document.visibilityState==='visible')void refresh();};window.addEventListener('focus',onVisible);document.addEventListener('visibilitychange',onVisible);return()=>{window.removeEventListener('focus',onVisible);document.removeEventListener('visibilitychange',onVisible);};},[refresh]);
  async function mutate(path:string,body:Record<string,unknown>){
    if(mutating.current)throw Error('Дождитесь сохранения выбора.');
    if(!accountId||status?.accountId!==accountId||status.sequence===undefined)throw Error('Дождитесь загрузки согласий вашего аккаунта.');
    setChoiceNotice('');
    mutating.current=true;
    const current=++generation.current;
    try{const value=await request(path,{method:'POST',body:JSON.stringify({...body,accountId,expectedSequence:status.sequence})},accountId);if(mounted.current&&current===generation.current){setStatus(value);setError('');}}
    catch(e){
      mutating.current=false;
      if(mounted.current&&current===generation.current){
        const problem=e as {status?:number;code?:string;message?:string};
        if(problem.code==='account_changed'){setStatus(null);await restore();}
        else if(problem.status===401)sessionExpired();
        else if(problem.status===409){setChoiceNotice(problem.message||'Проверьте обновлённый выбор.');await refresh();}
      }
      throw e;
    }
    finally{mutating.current=false;}
  }
  const save=async(choice:Choice)=>{if(!status)throw Error('Дождитесь загрузки документов.');await mutate(status.accepted?'/api/legal/preferences':'/api/legal/accept',{version:status.version,manifestHash:status.manifestHash,...choice});};
  const withdraw=async()=>mutate('/api/legal/withdraw',{});
  return <Context.Provider value={{status,loading,error,choiceNotice,refresh,save,withdraw}}>{children}</Context.Provider>;
}
export function useLegal(){const context=useContext(Context);if(!context)throw Error('LegalProvider required');return context;}
