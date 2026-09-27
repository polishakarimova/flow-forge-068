import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setupTelegramViewport} from '../lib/telegramViewport.ts';
function fixture(overrides={}) {
 const calls=[],events={},styles={};
 const root={dataset:{},style:{setProperty:(k,v)=>{styles[k]=v}}};
 const app={platform:'ios',isFullscreen:false,viewportStableHeight:844,safeAreaInset:{top:47,bottom:34},contentSafeAreaInset:{top:56},isVersionAtLeast:v=>v==='8.0',ready:()=>calls.push('ready'),expand:()=>calls.push('expand'),requestFullscreen:()=>calls.push('full'),onEvent:(e,h)=>{events[e]=h},offEvent:e=>{delete events[e]},...overrides};
 return {app,root,calls,events,styles};
}
test('modern Telegram expands and requests fullscreen once, updates insets',()=>{
 const f=fixture();const stop=setupTelegramViewport(f.app,f.root);
 assert.deepEqual(f.calls,['ready','expand','full']);assert.equal(f.styles['--app-system-top'],'47px');assert.equal(f.styles['--app-content-top'],'56px');
 f.app.isFullscreen=true;f.app.safeAreaInset.top=20;f.events.fullscreenChanged();assert.equal(f.root.dataset.telegramFullscreen,'true');assert.equal(f.styles['--app-system-top'],'20px');
 f.app.isFullscreen=false;f.events.fullscreenChanged();f.events.fullscreenFailed();assert.equal(f.calls.filter(c=>c==='full').length,1);
 stop();assert.equal(Object.keys(f.events).length,0);assert.equal(f.root.dataset.telegramApp,undefined);
});
test('old Telegram expands without unsupported fullscreen request',()=>{
 const f=fixture({isVersionAtLeast:()=>false});setupTelegramViewport(f.app,f.root);assert.deepEqual(f.calls,['ready','expand']);
});
test('normal browser is unchanged even with the SDK present',()=>{
 const f=fixture({platform:'unknown'});setupTelegramViewport(f.app,f.root);assert.deepEqual(f.calls,[]);assert.deepEqual(f.root.dataset,{});
 setupTelegramViewport(undefined,f.root);
});
test('SDK errors do not prevent rendering, no duplicate request when already fullscreen',()=>{
 const f=fixture({expand:()=>{throw new Error('unsupported')},requestFullscreen:()=>{throw new Error('unsupported')}});assert.doesNotThrow(()=>setupTelegramViewport(f.app,f.root));
 const full=fixture({isFullscreen:true});setupTelegramViewport(full.app,full.root);assert.deepEqual(full.calls,['ready','expand']);
});
test('invalid viewport values never become CSS dimensions',()=>{
 const f=fixture({viewportStableHeight:NaN,safeAreaInset:{top:-4,bottom:Infinity}});setupTelegramViewport(f.app,f.root);assert.equal(f.styles['--app-system-top'],'0px');assert.equal(f.styles['--app-system-bottom'],'0px');assert.equal(f.styles['--app-viewport-height'],undefined);
});
