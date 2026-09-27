const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://telegram.org/js/telegram-web-app.js?63',r=>r.fulfill({contentType:'application/javascript',body:`
 window.tgCalls=[];window.tgEvents={};window.Telegram={WebApp:{platform:'ios',isFullscreen:false,viewportStableHeight:844,safeAreaInset:{top:47,bottom:34,left:0,right:0},contentSafeAreaInset:{top:56,bottom:0,left:0,right:0},isVersionAtLeast:()=>true,ready:()=>tgCalls.push('ready'),expand:()=>tgCalls.push('expand'),requestFullscreen:()=>{tgCalls.push('full');Telegram.WebApp.isFullscreen=true;tgEvents.fullscreenChanged?.()},onEvent:(e,h)=>{tgEvents[e]=h},offEvent:e=>delete tgEvents[e]}};
 `}));
 let fail=false;
 await page.route('**/api/**',r=>{
  const url=new URL(r.request().url());const json=data=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/api/auth/me')return json({user:{id:'fullscreen-test',name:'Полина',authProvider:'telegram'}});
  if(url.pathname==='/api/state/publications')return fail?r.fulfill({status:503,body:'{}'}):json({data:{schema:1,items:[]},revision:'a'.repeat(32)});
  return json({data:null,revision:'new'});
 });
 const base=process.env.NAV_QA_BASE||'http://127.0.0.1:8080';
 await page.goto(`${base}/home`);await page.getByRole('heading',{name:'Полина, привет'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>tgCalls),['ready','expand','full']);
 assert.equal(await page.getByRole('button',{name:'Назад',exact:true}).count(),0);
 assert.equal(await page.locator('[data-home] header p').count(),0);
 assert.equal(await page.locator('[aria-labelledby="home-today"] a').count(),0);
 assert.ok((await page.locator('[data-home] header').boundingBox()).y>=84);
 const homeTitle=await page.locator('[data-home] h1').boundingBox();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Empty home should fit the viewport');
 const nav=page.getByRole('navigation',{name:'Основные разделы'});
 assert.equal(await nav.evaluate(el=>getComputedStyle(el).paddingBottom),'34px');
 if(process.env.NAV_QA_DIR)await page.screenshot({path:path.join(process.env.NAV_QA_DIR,'fullscreen-home.png')});
 await nav.getByRole('link',{name:'Календарь',exact:true}).click();await page.locator('.pub-app[data-save-state="saved"]').waitFor();
 assert.equal(await page.getByText('Сохранено',{exact:true}).count(),0);
 assert.equal(await page.locator('.pub-header button').count(),2); // Back and Plus only.
 await page.evaluate(()=>scrollTo(0,160));
 assert.ok(Math.abs((await page.locator('.pub-header').boundingBox()).y-84)<2);
 const calendarTitle=await page.locator('.pub-heading h1').boundingBox();
 assert.ok(Math.abs(homeTitle.y-calendarTitle.y)<3,`Home/calendar heading offset: ${homeTitle.y} / ${calendarTitle.y}`);
 assert.ok(Math.abs(homeTitle.height-calendarTitle.height)<1,'Page heading sizes should match');
 const grid=await page.locator('.pub-grid').boundingBox();
 const navBox=await nav.boundingBox();
 assert.ok(grid.y+grid.height<=navBox.y+1,'The final calendar week should remain above the bottom navigation');
 const cellHeight=await page.locator('.pub-cell').first().evaluate(el=>getComputedStyle(el).height);
 assert.ok(parseFloat(cellHeight)<102,'Calendar cells should adapt to the viewport');
 for(let i=0;i<12&&await page.locator('.pub-cell').count()!==42;i++)await page.getByRole('button',{name:'Следующий месяц'}).click();
 assert.equal(await page.locator('.pub-cell').count(),42,'A six-week month should be available');
 const longGrid=await page.locator('.pub-grid').boundingBox();
 assert.ok(longGrid.y+longGrid.height<=(await nav.boundingBox()).y+1,'Six-week calendar should fit above the navigation');
 assert.ok(parseFloat(await page.locator('.pub-cell').first().evaluate(el=>getComputedStyle(el).height))>=72,'Week cells should stay readable');
 for(const [route,title] of [['/content','Контент'],['/products','Продукты'],['/dashboard','Воронки'],['/context','Контекст'],['/profile','Профиль']]){
  await page.goto(`${base}${route}`);
  const heading=page.getByRole('heading',{name:title,exact:true}).first();await heading.waitFor();
  const titleBox=await heading.boundingBox();
  assert.ok(Math.abs(titleBox.y-calendarTitle.y)<=3,`${title} heading offset: ${titleBox.y} / ${calendarTitle.y}`);
  assert.ok(Math.abs(titleBox.height-calendarTitle.height)<=1,`${title} heading size differs`);
 }
 await page.goto(`${base}/map`);
 const mapTitle=page.getByText('КАРТА ВОРОНОК',{exact:true});await mapTitle.waitFor();
 const mapBox=await mapTitle.boundingBox();
 assert.ok(Math.abs(mapBox.y-calendarTitle.y)<=3,'Map heading should share the page title height');
 assert.ok(Math.abs(mapBox.height-calendarTitle.height)<=1,'Map heading size should match');
 await page.goto(`${base}/calendar`);await page.locator('.pub-app[data-save-state="saved"]').waitFor();
 await page.getByRole('button',{name:'Новая публикация'}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 const box=await dialog.boundingBox();assert.ok(box.y>=84);assert.ok(box.y+box.height<=844-34);
 await page.keyboard.press('Escape');await page.locator('[data-state="closed"][role="dialog"]').waitFor({state:'detached'});
 for(const width of [320,360,390,430]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 if(process.env.NAV_QA_DIR)await page.screenshot({path:path.join(process.env.NAV_QA_DIR,'fullscreen-calendar.png')});
 await page.getByText('Работа с файлами',{exact:true}).click();await page.getByRole('button',{name:'Скачать календарь',exact:true}).waitFor();
 // Insets can change while the same page is open (rotation, fullscreen exit).
 await page.evaluate(()=>{Telegram.WebApp.safeAreaInset={top:0,bottom:0,left:47,right:47};Telegram.WebApp.contentSafeAreaInset={top:0,bottom:0};Telegram.WebApp.isFullscreen=false;tgEvents.safeAreaChanged();tgEvents.contentSafeAreaChanged();tgEvents.fullscreenChanged()});
 assert.equal(await page.locator('html').getAttribute('data-telegram-fullscreen'),'false');
 assert.equal(await page.evaluate(()=>tgCalls.filter(c=>c==='full').length),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 fail=true;await page.reload();await page.getByRole('alert').filter({hasText:'Не удалось загрузить календарь'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: Telegram expand/fullscreen, safe areas, no Home clutter, quiet save status, clean calendar header, preserved file controls/errors, dialogs, narrow widths, changed insets.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
