const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 try {
  for (const mini of [true,false]) {
   const context = await browser.newContext(); const page = await context.newPage();
   let signedIn=false,starts=0,miniCalls=0;
   await context.addInitScript(() => { window.open=()=>null; });
   await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:mini?'window.Telegram={WebApp:{initData:"test-signed-payload"}};':''}));
   await page.route('**/api/**',async r=>{
    const p=new URL(r.request().url()).pathname;
    const reply=(data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    const user={id:'test-only',name:'Test',authProvider:'telegram'};
    if(p==='/api/auth/me')return reply({user:signedIn?user:null});
    if(p==='/api/auth/telegram-mini-app'){assert.equal(r.request().postDataJSON().initData,'test-signed-payload');miniCalls++;signedIn=true;return reply({user});}
    if(p==='/api/auth/telegram-login-token'){starts++;return reply({token:'test-token',expiresAt:new Date(Date.now()+600000).toISOString(),botLink:'https://t.me/test?start=login_test'});}
    if(p==='/api/auth/telegram-login-token/test-token'){signedIn=true;return reply({user,returnTo:'/calendar'});}
    return reply({data:null,revision:'new'});
   });
   await page.goto('http://127.0.0.1:8080/'+(mini?'calendar':'login?returnTo=%2Fcalendar'));
   if(mini){await page.getByRole('heading',{name:'Календарь',exact:true}).waitFor();assert.ok(miniCalls>0);assert.equal(starts,0);}
   else {await page.getByRole('button',{name:'Войти через Telegram',exact:true}).click();await page.getByText(/Откройте бота:/).waitFor();await page.getByRole('button',{name:'Войти через Telegram',exact:true}).click();await page.waitForURL('**/calendar');assert.equal(starts,1);}
   await context.close();console.log('PASS',mini?'Mini App signed initData login':'blocked popup resumes same login request');
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
