const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 async function setup({mini=true,failLogin=false,failLoad=false,authenticated=false}={}) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  let signedIn=authenticated,starts=0,miniCalls=0,mainWrites=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.open=()=>null;});
  await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:mini?'window.Telegram={WebApp:{initData:"test-signed-payload"}};':''}));
  await page.route('**/api/**',async r=>{
   const p=new URL(r.request().url()).pathname;
   const reply=(data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   const user={id:'test-only',name:'Проверка аккаунта',authProvider:'telegram'};
   if(p==='/api/auth/me')return reply({user:signedIn?user:null});
   if(p==='/api/auth/logout'){signedIn=false;return reply({ok:true});}
   if(p==='/api/auth/telegram-mini-app'){assert.equal(r.request().postDataJSON().initData,'test-signed-payload');miniCalls++;if(failLogin)return reply({error:'Invalid prisma.authIdentity.upsert enum TELEGRAM'},503);signedIn=true;return reply({user});}
   if(p==='/api/auth/telegram-login-token'){starts++;return reply({token:'test-token',expiresAt:new Date(Date.now()+600000).toISOString(),botLink:'https://t.me/test?start=login_test'});}
   if(p==='/api/auth/telegram-login-token/test-token'){signedIn=true;return reply({user,returnTo:'/calendar'});}
   if(p==='/api/state/main'){if(r.request().method()==='PUT')mainWrites++;if(failLoad)return reply({error:'unavailable'},503);}
   return reply({data:null,revision:'new'});
  });
  return {page,context,errors,stats:()=>({starts,miniCalls,mainWrites})};
 }
 try {
  for(const button of ['Начать']){
   const s=await setup();await s.page.goto('http://127.0.0.1:8080/');
   await s.page.getByRole('button',{name:button,exact:true}).waitFor();
   assert.equal(await s.page.getByRole('button').count(),1,'entry has exactly one action');
   assert.equal(s.stats().miniCalls,0);
   await s.page.getByRole('button',{name:button,exact:true}).click();
   await s.page.waitForURL('**/home');await s.page.getByRole('heading',{name:'Проверка, привет',exact:true}).waitFor();
   assert.equal(s.stats().miniCalls,1);assert.deepEqual(s.errors,[]);
   await s.context.close();console.log('PASS first tap:',button);
  }
  const failed=await setup({failLogin:true});await failed.page.goto('http://127.0.0.1:8080/');
  await failed.page.getByRole('button',{name:'Начать',exact:true}).click();
  await failed.page.getByRole('alert').filter({hasText:'Не удалось войти'}).waitFor();
  assert.equal(new URL(failed.page.url()).pathname,'/');
  assert.ok(!(await failed.page.locator('body').innerText()).includes('prisma'));
  await failed.page.screenshot({path:path.resolve(process.env.LOCALAPPDATA,'CodexWork/publications-qa-20260927/entry-error.png')});
  await failed.context.close();console.log('PASS failed auth stays at entry and sanitizes errors');
  const anonymous=await setup();
  for(const route of ['home','products','calendar','content','context','dashboard','map','profile','admin']){
   await anonymous.page.goto('http://127.0.0.1:8080/'+route);
   await anonymous.page.waitForURL('**/?returnTo=*');
   await anonymous.page.getByRole('button',{name:'Начать',exact:true}).waitFor();
  }
  await anonymous.context.close();console.log('PASS all workspace routes protected');
  const b=await setup({mini:false});await b.page.goto('http://127.0.0.1:8080/?returnTo=%2Fcalendar');
  await b.page.getByRole('button',{name:'Начать',exact:true}).click();
  await b.page.getByRole('link',{name:'Открыть Telegram'}).waitFor();
  await b.page.getByRole('button',{name:'Я подтвердил(а)',exact:true}).click();await b.page.waitForURL('**/calendar');
  assert.equal(b.stats().starts,1);await b.context.close();console.log('PASS blocked popup and resumed token');
  const broken=await setup({authenticated:true,failLoad:true});await broken.page.goto('http://127.0.0.1:8080/products');
  await broken.page.getByRole('alert').filter({hasText:'Сохранённые данные не изменены'}).waitFor();
  await broken.page.waitForTimeout(600);assert.equal(broken.stats().mainWrites,0);
  await broken.context.close();console.log('PASS load failure never seeds or overwrites main data');
  const smoke=await setup({authenticated:true});
  for(const route of ['products','calendar','content','context','dashboard','map','profile']){
   await smoke.page.goto('http://127.0.0.1:8080/'+route);await smoke.page.getByRole('navigation').waitFor();
   await smoke.page.waitForTimeout(150);
   await smoke.page.screenshot({path:path.resolve(process.env.LOCALAPPDATA,'CodexWork/publications-qa-20260927/audit-'+route+'.png')});
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route);
  }
  await smoke.page.getByRole('heading',{name:'Проверка аккаунта'}).waitFor();
  assert.ok(!(await smoke.page.locator('body').innerText()).includes('polina@example.com'));
  await smoke.page.getByRole('button',{name:'Выйти из аккаунта'}).click();await smoke.page.waitForURL('http://127.0.0.1:8080/');
  await smoke.page.getByRole('button',{name:'Начать',exact:true}).waitFor();
  await smoke.page.evaluate(()=>document.fonts.ready);
  await smoke.page.locator('.entry-wordmark img').evaluate(img=>img.decode());
  await smoke.page.screenshot({path:path.resolve(process.env.LOCALAPPDATA,'CodexWork/publications-qa-20260927/entry-mobile.png')});
  await smoke.page.setViewportSize({width:360,height:760});
  assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await smoke.page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await smoke.page.locator('.entry-wordmark').evaluate(e=>getComputedStyle(e).animationName),'none');
  const buttonBox=await smoke.page.getByRole('button',{name:'Начать',exact:true}).boundingBox();
  assert.ok(Math.abs(buttonBox.x+buttonBox.width/2-180)<2,'entry button centered');
  for(const size of [{width:320,height:568},{width:430,height:740},{width:1440,height:900}]) {
   await smoke.page.setViewportSize(size);
   const box=await smoke.page.getByRole('button',{name:'Начать',exact:true}).boundingBox();
   assert.ok(Math.abs(box.x+box.width/2-size.width/2)<2,'entry button centered at '+size.width);
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await smoke.page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'entry fits '+size.width);
   await smoke.page.screenshot({path:path.resolve(process.env.LOCALAPPDATA,'CodexWork/publications-qa-20260927/entry-'+size.width+'.png')});
  }
  assert.deepEqual(smoke.errors,[]);await smoke.context.close();console.log('PASS workspace routes, real profile, logout, mobile overflow');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
