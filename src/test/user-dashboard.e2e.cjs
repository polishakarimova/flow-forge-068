const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const {buildUserDashboard}=await import('../../server/user-dashboard.mjs');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kaliningrad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const main={products:[{id:1,name:'Мой продукт'}],funnels:[{id:'f',keyword:'СТАРТ',active:true,contentItemIds:[1]}],topics:[{id:1,title:'Моя идея',isIdeaBank:true,contentItems:[{id:1,title:'Мой материал',body:'Текст',platformId:'reels',status:'ready',productId:1,cta:'Напишите',metrics:{reach:1234,leads:3,sales:0}}]}]};
 const pubs={schema:1,items:[{id:'p',title:'Ближайшая публикация',format:'Рилс',date:today,parts:[{id:'part',text:'Текст',published:false}]}]};
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 const base=process.env.KARTA_ADMIN_TEST_URL||'http://127.0.0.1:4189',folder=path.resolve('previews/dashboard-split-review');await fs.mkdir(folder,{recursive:true});
 let checks=0;
 try{
  for(const width of [360,390,430,1280]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));let mode='filled',signedIn=true,adminCalls=0,summaryCalls=0;
   await page.route('https://telegram.org/**',r=>r.fulfill({body:'',contentType:'application/javascript'}));
   await page.route('**/api/**',r=>{
    const p=new URL(r.request().url()).pathname,reply=(body,status=200)=>r.fulfill({status,body:JSON.stringify(body),contentType:'application/json'});
    if(p==='/api/auth/me')return reply({user:signedIn?{id:mode==='other'?'other':'owner',name:'Проверочный аккаунт',isAdmin:false}:null});
    if(p.startsWith('/api/admin/')){adminCalls++;return reply({error:'forbidden'},403);}
    if(p==='/api/state/main')return reply({data:main,revision:'test-main'});
    if(p==='/api/content-workspace')return reply({main,publications:pubs,revisions:{main:'test-main',publications:'test-pubs'}});
    if(p==='/api/agent/connections')return reply({agents:[]});
    if(p==='/api/account/referral')return reply({balance:0,invited:0,reward:50,url:'https://example.invalid',transactions:[]});
    if(p==='/api/account/dashboard'){
     summaryCalls++;if(mode==='error')return reply({error:'server_error'},503);
     const result=mode==='empty'?buildUserDashboard({},{}):mode==='other'?buildUserDashboard({topics:[{contentItems:[{id:99,title:'Материал второго аккаунта',status:'published',platformId:'tg_post',metrics:{reach:9000}}]}]},{}):buildUserDashboard(main,pubs);
     return reply({...result,updatedAt:new Date().toISOString()});
    }
    return reply({data:null,revision:'new'});
   });
   console.log('Проверка личного дашборда:',width);
   await page.goto(base+'/profile');await page.getByRole('link',{name:'Мой дашборд Контент, публикации и результаты'}).click();
   await page.getByRole('heading',{name:'Результаты моего контента',exact:true}).waitFor();checks++;
   const results=page.locator('section').filter({has:page.getByRole('heading',{name:'Результаты моего контента',exact:true})});
   assert.equal(await results.getByText('1 234',{exact:true}).count(),1);checks++;
   assert.equal(await page.getByRole('meter',{name:'Связан с продуктом',exact:true}).getAttribute('aria-valuenow'),'1');checks++;
   await page.getByText('Ближайшая публикация',{exact:true}).waitFor();checks++;
   assert.equal(await page.getByText('Всего пользователей',{exact:true}).count(),0);assert.equal(adminCalls,0);checks++;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
   if([390,1280].includes(width))await page.screenshot({path:path.join(folder,`personal-${width}.png`),fullPage:true});
   await page.getByRole('button',{name:'Обновить мой дашборд',exact:true}).click();await page.getByText('Ближайшая публикация',{exact:true}).waitFor();assert.ok(summaryCalls>=2);checks++;
   await page.getByRole('button',{name:'Назад',exact:true}).click();await page.getByRole('heading',{name:'Профиль',exact:true}).waitFor();checks++;
   await page.goto(base+'/profile/dashboard');await page.getByRole('heading',{name:'Результаты моего контента',exact:true}).waitFor();await page.getByRole('button',{name:'Назад',exact:true}).click();await page.getByRole('heading',{name:'Профиль',exact:true}).waitFor();checks++;
   mode='error';await page.goto(base+'/profile/dashboard');await page.getByText('Не удалось загрузить дашборд. Повторите попытку.',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Результаты моего контента',exact:true}).count(),0);checks++;
   mode='empty';await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();await page.getByText('Здесь появятся результаты вашей работы',{exact:true}).waitFor();await page.getByText('Результатов пока нет',{exact:true}).waitFor();checks++;
   mode='other';await page.reload();await page.getByText('Материал второго аккаунта',{exact:true}).waitFor();assert.equal(await page.getByText('Мой материал',{exact:true}).count(),0);checks++;
   signedIn=false;await page.goto(base+'/profile/dashboard');await page.getByRole('button',{name:'Начать'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('returnTo'),'/profile/dashboard');checks++;
   assert.deepEqual(errors,[]);checks++;await context.close();
  }
  console.log(JSON.stringify({checks,widths:[360,390,430,1280],screenshots:folder}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
