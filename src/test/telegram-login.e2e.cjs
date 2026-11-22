const { chromium, webkit } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const useWebKit = process.env.KARTA_BROWSER === 'webkit';
 const browser = await (useWebKit ? webkit : chromium).launch({headless:true,channel:!useWebKit && process.platform==='win32' ? 'msedge' : undefined});
 const base = process.env.KARTA_UI_URL || 'http://127.0.0.1:8080';
 const output = require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'karta-auth-'));
 async function setup({mini=true,failLogin=false,failLoad=false,authenticated=false,wrongSession=false,failRestoreOnce=false,accepted=true}={}) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  let signedIn=authenticated,starts=0,miniCalls=0,mainWrites=0,confirmed=false;const errors=[];
  let destination='/home',logouts=0;
  const initData=new URLSearchParams({user:JSON.stringify({id:101})}).toString();
  const user={id:'test-only',telegramId:'101',telegramUsername:'@fixture',name:'Проверка аккаунта',authProvider:'telegram'};
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.open=()=>null;});
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.fallback():r.abort());
  await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:'window.Telegram={WebApp:{initData:'+JSON.stringify(mini?initData:'')+'}};'}));
  await page.route('**/api/**',async r=>{
   const p=new URL(r.request().url()).pathname;
   const reply=(data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(p==='/api/legal/accept'){assert.equal(r.request().postDataJSON().advertising,false);accepted=true;}
   if(['/api/legal','/api/legal/status','/api/legal/accept'].includes(p))return reply({version:'fixture',manifestHash:'hash',documents:['terms','privacy','personal-data','advertising'].map(id=>({id})),accepted:signedIn && accepted});
   if(p==='/api/account/profile'){assert.equal(r.request().postDataJSON().accountId,user.id);user.name=r.request().postDataJSON().name;return reply({user});}
   if(p==='/api/account/referral')return reply({balance:0,invited:0,reward:50,url:base,transactions:[]});
   if(p==='/api/agent/connections')return reply({agents:[]});
   if(p.startsWith('/api/admin/'))return reply({error:'unauthorized'},401);
   if(p==='/api/content-workspace'){if(r.request().method()==='POST')mainWrites++;return reply({main:{},publications:{schema:1,items:[]},revisions:{main:'new',publications:'new'}});}
   if(p==='/api/auth/me'){
    if(failRestoreOnce){failRestoreOnce=false;return reply({error:'unavailable'},503);}
    return reply({user:signedIn?(wrongSession?{...user,id:'previous',telegramId:'202',name:'Прежний профиль'}:user):null});
   }
   if(p==='/api/auth/logout'){signedIn=false;logouts++;return reply({ok:true});}
   if(p==='/api/auth/telegram-mini-app'){assert.equal(r.request().postDataJSON().initData,initData);miniCalls++;if(failLogin)return reply({error:'auth_temporarily_unavailable'},503);signedIn=true;return reply({user});}
   if(p==='/api/auth/telegram-login-token'){starts++;destination=r.request().postDataJSON().returnTo;return reply({returnTo:destination,token:'test-token',expiresAt:new Date(Date.now()+600000).toISOString(),botLink:'https://t.me/test?start=login_test'});}
   if(p==='/api/auth/telegram-login-token/test-token'){if(!confirmed)return reply({status:'pending'},202);signedIn=true;return reply({user,returnTo:destination});}
   if(p==='/api/state/main'){if(r.request().method()==='PUT')mainWrites++;if(failLoad)return reply({error:'unavailable'},503);}
   return reply({data:null,revision:'new'});
  });
  return {page,context,errors,confirm:()=>{confirmed=true;},stats:()=>({starts,miniCalls,mainWrites,logouts})};
 }
 try {
  {
   const s=await setup();await s.page.goto(base+'/');
   await s.page.waitForURL('**/home');await s.page.getByRole('heading',{name:'Проверка, привет',exact:true}).waitFor();
   assert.equal(s.stats().miniCalls,1);assert.deepEqual(s.errors,[]);
   await s.context.close();console.log('PASS Mini App signs in automatically');
  }
  const switched=await setup({authenticated:true,wrongSession:true});
  await switched.page.goto(base+'/profile');
  await switched.page.getByRole('heading',{name:'Проверка аккаунта'}).waitFor();
  assert.equal(switched.stats().miniCalls,1);
  assert.equal(await switched.page.getByText('Прежний профиль').count(),0);
  await switched.page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'contentmap_session_change',newValue:'login:1'})));
  await switched.page.getByRole('button',{name:'Войти через Telegram'}).waitFor();
  assert.equal(switched.stats().miniCalls,1,'another tab cannot trigger a silent sign-in loop');
  await switched.context.close();console.log('PASS Telegram account switch selects the verified profile');
  const restore=await setup({authenticated:true,failRestoreOnce:true});
  await restore.page.goto(base+'/profile');
  await restore.page.getByRole('button',{name:'Повторить проверку'}).click();
  await restore.page.getByRole('heading',{name:'Проверка аккаунта'}).waitFor();
  assert.equal(restore.stats().miniCalls,0);
  await restore.context.close();console.log('PASS transient connection failure restores the existing session');
  const newcomer=await setup({accepted:false});
  await newcomer.page.goto(base+'/profile');
  await newcomer.page.getByRole('heading',{name:'Перед началом работы'}).waitFor();
  await newcomer.page.locator('#legal-terms').click();
  await newcomer.page.getByRole('button',{name:'Продолжить'}).click();
  await newcomer.page.getByRole('heading',{name:'Личный кабинет'}).waitFor();
  await newcomer.context.close();console.log('PASS first entry requires consent and returns to the requested account page');
  const failed=await setup({failLogin:true});await failed.page.goto(base+'/');
  await failed.page.getByRole('button',{name:'Войти через Telegram',exact:true}).click();
  await failed.page.getByRole('alert').filter({hasText:'Не удалось войти'}).waitFor();
  assert.equal(new URL(failed.page.url()).pathname,'/');
  assert.ok(!(await failed.page.locator('body').innerText()).includes('prisma'));
  await failed.page.screenshot({path:path.resolve(output,'entry-error.png')});
  await failed.context.close();console.log('PASS failed auth stays at entry and sanitizes errors');
  const anonymous=await setup({mini:false});
  for(const route of ['home','products','calendar','content','context','dashboard','map','profile','profile/dashboard','profile/agents']){
   await anonymous.page.goto(base+'/'+route);
   await anonymous.page.waitForURL('**/?returnTo=*');
   await anonymous.page.getByRole('button',{name:'Войти через Telegram',exact:true}).waitFor();
  }
  await anonymous.page.goto(base+'/admin');
  await anonymous.page.getByText('Войдите через Telegram под аккаунтом администратора.').waitFor();
  await anonymous.context.close();console.log('PASS all workspace routes protected');
  const b=await setup({mini:false});await b.page.goto(base+'/?returnTo=%2Fcalendar');
  await b.page.getByRole('button',{name:'Войти через Telegram',exact:true}).click();
  await b.page.getByRole('link',{name:'Открыть Telegram'}).waitFor();
  await b.page.reload();
  await b.page.getByRole('link',{name:'Открыть Telegram'}).waitFor();
  b.confirm();
  await b.page.waitForURL('**/calendar');
  assert.equal(b.stats().starts,1);await b.context.close();console.log('PASS blocked popup and resumed token');
  const admin=await setup({authenticated:true,mini:false});
  await admin.page.goto(base+'/admin');
  await admin.page.getByRole('button',{name:'Подтвердить вход в Telegram'}).click();
  await admin.page.getByRole('button',{name:'Войти через Telegram'}).click();
  await admin.page.getByRole('link',{name:'Открыть Telegram'}).waitFor();
  admin.confirm();await admin.page.waitForURL('**/admin');
  assert.equal(admin.stats().logouts,0);
  await admin.context.close();console.log('PASS administrative confirmation preserves personal session');
  const broken=await setup({authenticated:true,failLoad:true});await broken.page.goto(base+'/products');
  await broken.page.getByRole('alert').filter({hasText:'Сохранённые данные не изменены'}).waitFor();
  await broken.page.waitForTimeout(600);assert.equal(broken.stats().mainWrites,0);
  await broken.page.goto(base+'/profile');
  await broken.page.getByRole('button',{name:'Выйти из аккаунта'}).waitFor();
  await broken.context.close();console.log('PASS load failure never seeds or overwrites main data');
  const smoke=await setup({authenticated:true});
  for(const route of ['products','calendar','content','context','dashboard','map','profile']){
   await smoke.page.goto(base+'/'+route);await smoke.page.getByRole('navigation').waitFor();
   await smoke.page.waitForTimeout(150);
   await smoke.page.screenshot({path:path.resolve(output,'audit-'+route+'.png')});
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route);
  }
  await smoke.page.getByRole('heading',{name:'Проверка аккаунта'}).waitFor();
  await smoke.page.getByRole('button',{name:'Изменить имя'}).click();
  await smoke.page.getByLabel('Имя в Карте').fill('Сохранённое имя');
  await smoke.page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await smoke.page.getByRole('heading',{name:'Сохранённое имя'}).waitFor();
  await smoke.page.reload();
  await smoke.page.getByRole('heading',{name:'Сохранённое имя'}).waitFor();
  assert.ok(!(await smoke.page.locator('body').innerText()).includes('polina@example.com'));
  await smoke.page.getByRole('button',{name:'Выйти из аккаунта'}).click();
  await smoke.page.getByRole('button',{name:'Войти через Telegram',exact:true}).waitFor();
  assert.equal(smoke.page.url(),base+'/',JSON.stringify(smoke.stats()));
  await smoke.page.reload();
  await smoke.page.getByRole('button',{name:'Войти через Telegram',exact:true}).waitFor();
  assert.equal(smoke.stats().miniCalls,0,'restoration and intentional logout do not start a new session');
  await smoke.page.evaluate(()=>document.fonts.ready);
  await smoke.page.locator('.entry-wordmark img').evaluate(img=>img.decode());
  await smoke.page.screenshot({path:path.resolve(output,'entry-mobile.png')});
  await smoke.page.setViewportSize({width:360,height:760});
  assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await smoke.page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await smoke.page.locator('.entry-wordmark').evaluate(e=>getComputedStyle(e).animationName),'none');
  const buttonBox=await smoke.page.getByRole('button',{name:'Войти через Telegram',exact:true}).boundingBox();
  assert.ok(Math.abs(buttonBox.x+buttonBox.width/2-180)<2,'entry button centered');
  for(const size of [{width:320,height:568},{width:430,height:740},{width:1440,height:900}]) {
   await smoke.page.setViewportSize(size);
   const box=await smoke.page.getByRole('button',{name:'Войти через Telegram',exact:true}).boundingBox();
   assert.ok(Math.abs(box.x+box.width/2-size.width/2)<2,'entry button centered at '+size.width);
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'entry fits '+size.width);
   await smoke.page.screenshot({path:path.resolve(output,'entry-'+size.width+'.png')});
  }
  assert.deepEqual(smoke.errors,[]);await smoke.context.close();console.log('PASS workspace routes, real profile, logout, mobile overflow');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
