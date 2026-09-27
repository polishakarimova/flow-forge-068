const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/**',r=>{
  const url=new URL(r.request().url());
  const json=data=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/api/auth/me')return json({user:{id:'back-test',name:'Полина',authProvider:'telegram'}});
  if(url.pathname==='/api/admin/overview')return r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Доступ ограничен'})});
  if(url.pathname==='/api/state/publications')return json({data:{schema:1,items:[{id:'s',date:'2026-09-28',format:'Сторис',title:'Серия',parts:[{id:'p',text:'Тестовый текст',published:false}]}]},revision:'a'.repeat(32)});
  return json({data:null,revision:'new'});
 });
 const base='http://127.0.0.1:8080';
 // A fresh deep link must not navigate outside the app or back to login.
 for(const route of ['products','content','dashboard','map','context','profile','admin','calendar?view=legacy']){
  await page.goto(base+'/'+route);await page.getByRole('button',{name:'Назад',exact:true}).first().waitFor();
  assert.equal(await page.getByRole('button',{name:'Карта контента',exact:true}).count(),0,'No visible mobile brand strip');
  assert.equal(await page.locator('.fixed.top-0.h-8').count(),0,'No static top bar');
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+route+' '+width);
  }
  if(process.env.NAV_QA_DIR)await page.screenshot({path:path.join(process.env.NAV_QA_DIR,'back-'+route.split('?')[0]+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Назад',exact:true}).first().click();await page.waitForURL('**/home');
 }
 await page.goto(base+'/home');await page.getByRole('link',{name:'Мои продукты',exact:false}).click();
 await page.getByRole('button',{name:'Продажи',exact:true}).click();
 await page.getByRole('dialog').getByRole('link',{name:/^Карта/}).click();
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.waitForURL('**/products');
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.waitForURL('**/home');
 // Detail -> day -> month -> workspace, including consumed entry parameters.
 await page.goto(base+'/calendar?date=2026-09-28&item=s');await page.getByText('Тестовый текст',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.locator('.pub-list').waitFor();
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.locator('.pub-grid').waitFor();
 await page.getByRole('button',{name:'Назад',exact:true}).click();await page.waitForURL('**/home');
 await page.getByRole('link',{name:'Мой профиль'}).click();await page.getByRole('button',{name:'Обучение',exact:true}).click();
 await page.getByText('Добро пожаловать в Content Map!',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: no top strip, all page back buttons, safe deep links, nested route back, calendar detail/day/month, mobile overflow checks.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
