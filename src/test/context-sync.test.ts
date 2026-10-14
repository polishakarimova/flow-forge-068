import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useContextPersistence} from '@/hooks/useContextPersistence';
vi.mock('sonner',()=>{const toast=Object.assign(vi.fn(),{error:vi.fn(),dismiss:vi.fn(),success:vi.fn()});return {toast};});
const empty={answers:[] as string[]};
const response=(data:unknown,status=200)=>Promise.resolve({ok:status===200,status,json:async()=>data} as Response);
const tick=()=>act(async()=>{await new Promise(r=>setTimeout(r,320));});
describe('context persistence',()=>{
 let saved:typeof empty,revision:string,writes:number;
 beforeEach(()=>{
  vi.stubGlobal('AbortSignal',{timeout:()=>new AbortController().signal});localStorage.clear();saved={answers:[]};revision='r1';writes=0;
  vi.stubGlobal('fetch',vi.fn((_url,options)=>{
   if(options?.method==='PUT'){writes++;if(options.headers['If-Match']!==revision)return response({error:'revision_conflict'},409);saved=JSON.parse(options.body).data;revision='r'+(writes+1);return response({data:saved,revision});}
   return response({data:saved,revision});
  }));
 });
 afterEach(()=>{cleanup();vi.unstubAllGlobals();});
 it('hydrates without writing and preserves rapid changes in one confirmed version',async()=>{
  const {result}=renderHook(()=>useContextPersistence('u1',empty));await waitFor(()=>expect(result.current.stateReady).toBe(true));await tick();expect(writes).toBe(0);
  act(()=>{result.current.setData(d=>({answers:[...d.answers,'ONE']}));result.current.setData(d=>({answers:[...d.answers,'TWO']}));});
  await tick();expect(writes).toBe(1);expect(saved.answers).toEqual(['ONE','TWO']);expect(localStorage.getItem('content-map-context-recovery:u1')).toBeNull();
 });
 it('retains a conflicting draft after remount without overwriting the other device',async()=>{
  const first=renderHook(()=>useContextPersistence('u1',empty));await waitFor(()=>expect(first.result.current.stateReady).toBe(true));revision='remote';
  act(()=>first.result.current.setData({answers:['LOCAL']}));await tick();expect(writes).toBe(1);expect(saved.answers).toEqual([]);first.unmount();
  const second=renderHook(()=>useContextPersistence('u1',empty));await waitFor(()=>expect(second.result.current.stateReady).toBe(true));expect(second.result.current.data.answers).toEqual(['LOCAL']);await tick();expect(writes).toBe(1);
 });
 it('never restores another account recovery and ignores delayed old loads',async()=>{
  localStorage.setItem('content-map-context-recovery:old',JSON.stringify({data:{answers:['PRIVATE']},revision:'r1'}));
  let finish:(value:Response)=>void=()=>{};vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const {result,rerender}=renderHook(({id})=>useContextPersistence(id,empty),{initialProps:{id:'old'}});rerender({id:'new'});await waitFor(()=>expect(result.current.stateReady).toBe(true));
  await act(async()=>finish(await response({data:{answers:['OLD LOAD']},revision:'r1'})));expect(result.current.data.answers).toEqual([]);
 });
 it('queues edits made during a pending request behind its returned revision',async()=>{
  const {result}=renderHook(()=>useContextPersistence('u1',empty));await waitFor(()=>expect(result.current.stateReady).toBe(true));
  let finish:()=>void=()=>{};vi.mocked(fetch).mockImplementationOnce((_url,options)=>new Promise(resolve=>{finish=()=>{saved=JSON.parse(String(options?.body)).data;revision='r2';writes++;resolve({ok:true,status:200,json:async()=>({data:saved,revision})} as Response);};}));
  act(()=>result.current.setData({answers:['FIRST']}));await tick();act(()=>result.current.setData(d=>({answers:[...d.answers,'SECOND']})));
  await act(async()=>finish());await tick();expect(saved.answers).toEqual(['FIRST','SECOND']);expect(writes).toBe(2);
 });
});
