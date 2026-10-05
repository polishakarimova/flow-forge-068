import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useMainState} from '@/hooks/useMainState';
vi.mock('sonner',()=>({toast:{error:vi.fn(),dismiss:vi.fn()}}));
const response=(data:unknown,status=200)=>Promise.resolve({ok:status===200,status,json:async()=>data} as Response);
const tick=()=>act(async()=>{await new Promise(r=>setTimeout(r,320));});
describe('main persistence',()=>{
 let main:Record<string,unknown>,revision:string,posts:number;
 beforeEach(()=>{
  vi.stubGlobal('AbortSignal',{timeout:()=>new AbortController().signal});
  localStorage.clear();main={products:[],topics:[],funnels:[],keywords:[]};revision='r1';posts=0;
  vi.stubGlobal('fetch',vi.fn((_url,options)=>{
   if(options?.method==='POST'){
    posts++;const body=JSON.parse(options.body);if(body.revisions.main!==revision)return response({message:'Conflict'},409);
    main=body.input.data;revision='r'+(posts+1);return response({main,revision,revisions:{main:revision,publications:'p1'}});
   }
   return response({data:main,revision});
  }));
 });
 afterEach(()=>{cleanup();vi.unstubAllGlobals();});
 it('does not autosave hydration; serializes rapid edits and returns canonical state',async()=>{
  const {result}=renderHook(()=>useMainState('u1'));await waitFor(()=>expect(result.current.stateReady).toBe(true));await tick();expect(posts).toBe(0);
  act(()=>{result.current.setData(d=>({...d,keywords:['ONE']}));result.current.setData(d=>({...d,keywords:[...d.keywords,'TWO']}));});
  await tick();expect(posts).toBe(1);expect(main.keywords).toEqual(['ONE','TWO']);expect(localStorage.getItem('content-map-main-recovery:u1')).toBeNull();
 });
 it('takes editorial saves without triggering a second write',async()=>{
  const {result}=renderHook(()=>useMainState('u1'));await waitFor(()=>expect(result.current.stateReady).toBe(true));
  act(()=>window.dispatchEvent(new CustomEvent('content-map:saved',{detail:{userId:'u1',main:{...main,keywords:['EDIT']},revisions:{main:'r2'}}})));
  expect(result.current.data.keywords).toEqual(['EDIT']);await tick();expect(posts).toBe(0);
 });
 it('keeps a conflicting draft through remount, without overwriting newer server state',async()=>{
  const {result,unmount}=renderHook(()=>useMainState('u1'));await waitFor(()=>expect(result.current.stateReady).toBe(true));revision='remote';
  act(()=>result.current.setData(d=>({...d,keywords:['LOCAL']})));await tick();expect(posts).toBe(1);expect(main.keywords).toEqual([]);unmount();
  const second=renderHook(()=>useMainState('u1'));await waitFor(()=>expect(second.result.current.stateReady).toBe(true));
  expect(second.result.current.data.keywords).toEqual(['LOCAL']);await tick();expect(posts).toBe(1);
 });
 it('does not replace dirty data with an editorial event',async()=>{
  const {result}=renderHook(()=>useMainState('u1'));await waitFor(()=>expect(result.current.stateReady).toBe(true));
  act(()=>{result.current.setData(d=>({...d,keywords:['LOCAL']}));window.dispatchEvent(new CustomEvent('content-map:saved',{detail:{userId:'u1',main:{...main,keywords:['REMOTE']},revisions:{main:'r2'}}}));});
  expect(result.current.data.keywords).toEqual(['LOCAL']);
 });
 it('ignores an old account load after account change',async()=>{
  let finish:(value:Response)=>void=()=>{};
  vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const {result,rerender}=renderHook(({id})=>useMainState(id),{initialProps:{id:'old'}});rerender({id:'new'});
  await waitFor(()=>expect(result.current.stateReady).toBe(true));
  await act(async()=>finish(await response({data:{keywords:['OLD']},revision:'old'})));
  expect(result.current.data.keywords).toEqual([]);
 });
});
