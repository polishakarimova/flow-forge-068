const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const baselineRef=process.env.NAV_BASE_REF || 'eb7be364db75018e562f5e7af6c56097060e972d';

// Existing page markup and editors are part of the acceptance contract.
for(const file of ['src/pages/Products.tsx','src/pages/Index.tsx','src/pages/FunnelMapPage.tsx','src/pages/ContextPage.tsx','src/pages/Profile.tsx','src/pages/Calendar.tsx','src/pages/publications.css','src/index.css','src/components/content/ContentDetailModal.tsx','src/components/content/CreateTopicModal.tsx']){
 const old=execFileSync('git',['show',baselineRef+':'+file],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),old,'Existing file changed: '+file);
}
for(const [file,marker] of [['src/pages/Content.tsx','  return (\n    <SidebarProvider>'],['src/pages/Publications.tsx','  return <SidebarProvider>']]){
 const old=execFileSync('git',['show',baselineRef+':'+file],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 const current=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert.ok(old.includes(marker),'baseline marker '+file);
 assert.equal(current.slice(current.indexOf(marker)),old.slice(old.indexOf(marker)),'Existing page markup changed: '+file);
}

(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];let writes=0,authStarts=0,failOverview=false;
 page.on('pageerror',e=>errors.push(e.message));
 const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const items=['Сторис','Рилс','Пост ТГ','Карусель','Threads'].map((format,i)=>({id:'nav-'+i,date:today,format,title:'Тест: '+format,parts:[{id:'part1',text:'Текст для проверки навигации',published:false}]}));
 await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/**',r=>{
  const request=r.request(),url=new URL(request.url());
  // Main/context providers already autosave on hydration; this change leaves them intact.
  if(request.method()!=='GET' && url.pathname==='/api/state/publications')writes++;
  if(url.pathname.includes('telegram-'))authStarts++;
  const json=data=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/api/auth/me')return json({user:{id:'navigation-test',name:'Полина',authProvider:'telegram'}});
  if(url.pathname==='/api/state/publications')return failOverview?r.fulfill({status:503,body:'{}'}):json({data:{schema:1,items},revision:'a'.repeat(32)});
  return json({data:null,revision:'new'});
 });
 await context.addInitScript(({today,items})=>{
  localStorage.setItem('karta-publications-view:navigation-test',JSON.stringify({date:today,month:today.slice(0,7),screen:'publication',item:items[0].id,open:[`${items[0].id}:part1`],lastCopied:'',scroll:0}));
 },{today,items});
 await page.goto('http://127.0.0.1:8080/');await page.waitForURL('**/home');
 await page.getByRole('link',{name:'Все 5'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Начать',exact:true}).count(),0);
 assert.equal(authStarts,0,'Restored session should not sign in again');
 assert.equal(writes,0,'Home must not write calendar publications');
 assert.equal(await page.getByRole('navigation',{name:'Основные разделы'}).locator(':scope > div > a, :scope > div > button').count(),4);
 for(const width of [320,360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
  if(process.env.NAV_QA_DIR)await page.screenshot({path:path.join(process.env.NAV_QA_DIR,`home-real-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('link',{name:'Продолжить: Тест: Сторис'}).click();
 await page.getByText('Текст для проверки навигации',{exact:true}).waitFor();
 await page.getByRole('navigation',{name:'Основные разделы'}).getByRole('link',{name:'Главная',exact:true}).click();
 await page.getByRole('link',{name:'Все 5'}).click();await page.locator('.pub-publication').first().waitFor();assert.equal(await page.locator('.pub-publication').count(),5);
 await page.getByRole('navigation',{name:'Основные разделы'}).getByRole('link',{name:'Главная',exact:true}).click();
 await page.getByRole('link',{name:'Записать идею'}).click();await page.getByRole('heading',{name:'Новая тема'}).waitFor();
 await page.getByRole('button',{name:'В банк идей',exact:false}).waitFor();
 // Close an empty form using its unchanged control.
 await page.getByRole('button',{name:'✕',exact:true}).click();
 for(const [label,route] of [['Продукты','products'],['Воронки','dashboard'],['Карта','map']]){
  await page.getByRole('button',{name:'Продажи',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Продажи через контент'});
  await dialog.getByRole('link',{name:new RegExp('^'+label)}).click();await page.waitForURL('**/'+route);
  await dialog.waitFor({state:'hidden'});
 }
 await page.getByRole('navigation',{name:'Основные разделы'}).getByRole('link',{name:'Главная',exact:true}).click();
 await page.getByRole('link',{name:'Мой профиль'}).click();await page.getByRole('heading',{name:'Профиль',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:8080/home');await page.getByRole('link',{name:'Публикация',exact:true}).click();
 await page.getByRole('dialog',{name:'Новая публикация'}).waitFor();
 await page.goto('http://127.0.0.1:8080/calendar?view=legacy');await page.getByRole('link',{name:'← Публикации'}).waitFor();
 assert.equal(writes,0,'Navigation alone must not write publications');
 failOverview=true;await page.goto('http://127.0.0.1:8080/home');await page.getByRole('alert').filter({hasText:'Не удалось загрузить обзор'}).waitFor();
 await page.getByRole('link',{name:'Мой профиль'}).waitFor();assert.equal(writes,0);
 assert.deepEqual(errors,[]);
 console.log('PASS: unchanged pages/editors, returning login, 4 tabs, read-only home, resume, all 5 publications, existing idea form, all sales routes, profile, add publication, legacy calendar, error state, 320–1280px.');
 await context.close();
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
