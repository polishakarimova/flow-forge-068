const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const date = '2026-10-01';
  const formats = ['Рилс','Карусель','Пост ТГ','Сторис','Threads'];
  let data = {schema:1,items:formats.map((format,index)=>({id:`series-${index}`,date,format,title:format === 'Threads' ? '6 постов Threads' : `Серия: ${format}`,parts:Array.from({length:format === 'Threads'?6:1},(_,i)=>({id:`p-${i}`,text:`Текст ${format} ${i+1}`,published:false,approvalStatus:'draft',scheduledAt:`${date}T${String(10+i).padStart(2,'0')}:00:00+02:00`}))}))};
  data.items.push({...data.items[4],id:'extra',title:'Ещё один Threads',parts:[{...data.items[4].parts[0],id:'extra'}]});
  let revision = 'a'.repeat(32); let actions = 0; let reject = false;
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(),endpoint=new URL(req.url()).pathname;
      const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
      if(endpoint==='/api/auth/me')return json({user:{id:'daily-preview',name:'Полина',authProvider:'telegram'}});
      if(endpoint==='/api/threads/status')return json({available:true,connected:true,username:'polisha.karimovaa',queue:[]});
      if(endpoint==='/api/state/publications') {
        if(req.method()==='GET')return json({data,revision});
        assert.equal(req.headers()['if-match'],revision);data=req.postDataJSON().data;revision='b'.repeat(32);return json({revision});
      }
      if(endpoint==='/api/publications/approval'){
        assert.equal(req.headers()['if-match'],revision);
        const input=req.postDataJSON();assert.equal(input.date,date);
        if(reject)return json({message:'Издатель Threads сейчас не подключён. Попробуйте позже.'},503);
        actions++;
        data=structuredClone(data);for(const item of data.items.filter(i=>i.date===input.date&&i.format===input.format))for(const part of item.parts)part.approvalStatus=input.action==='approve'?'approved':'draft';
        revision=String.fromCharCode(98+actions).repeat(32);return json({data,revision});
      }
      return json({data:{products:[],topics:[],funnels:[],keywords:[],formats:[],platforms:[],productTypes:[]}});
    });
    await page.goto(`${process.env.CALENDAR_QA_BASE||'http://127.0.0.1:8080'}/calendar?date=${date}`);
    const skip=page.getByRole('button',{name:'Пропустить'});
    if(await skip.waitFor({timeout:5000}).then(()=>true).catch(()=>false))await skip.click();
    await page.getByText('0 из 6 выложено').waitFor();
    assert.equal(await page.getByRole('button',{name:'Утвердить серию на день',exact:true}).count(),5);
    const threads=page.locator('.pub-series').filter({has:page.locator('[aria-label="Утверждение серии: Threads"]')});
    await threads.getByRole('button',{name:'Утвердить серию на день'}).click();
    await threads.getByRole('button',{name:'Снять утверждение'}).waitFor();
    assert.ok(data.items.filter(i=>i.format==='Threads').every(i=>i.parts.every(p=>p.approvalStatus==='approved')));
    assert.ok(data.items.filter(i=>i.format!=='Threads').every(i=>i.parts.every(p=>p.approvalStatus==='draft')));
    const tg=page.locator('.pub-series').filter({has:page.locator('[aria-label="Утверждение серии: Пост ТГ"]')});
    await tg.getByRole('button',{name:'Утвердить серию на день'}).click();
    await tg.getByRole('button',{name:'Снять утверждение'}).waitFor();
    await tg.getByText(/Автопостинг этого формата ещё не подключён/).waitFor();
    for(const width of [360,390,430,1280]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
      if(process.env.CALENDAR_QA_DIR)await page.screenshot({path:path.join(process.env.CALENDAR_QA_DIR,`daily-approval-${width}.png`),fullPage:true});
    }
    await threads.getByRole('button',{name:'Снять утверждение'}).click();
    await threads.getByRole('button',{name:'Утвердить серию на день'}).waitFor();
    reject=true;await threads.getByRole('button',{name:'Утвердить серию на день'}).click();
    await page.getByRole('alert').filter({hasText:'Издатель Threads сейчас не подключён'}).waitFor();
    assert.equal(await threads.getByRole('button',{name:'Снять утверждение'}).count(),0);
    reject=false;
    await threads.locator('.pub-publication').first().click();
    await page.getByRole('button',{name:'Утвердить серию на день'}).click();
    await page.getByRole('button',{name:'Снять утверждение'}).waitFor();
    await page.reload();await page.getByRole('button',{name:'Снять утверждение'}).waitFor();
    const time=page.getByLabel('Время публикации: Пост 1');await time.fill('16:00');
    await page.locator('.pub-app[data-save-state="saved"]').waitFor();
    await page.getByRole('button',{name:'Утвердить серию на день'}).waitFor();
    assert.equal(data.items[4].parts[0].approvalStatus,'draft');
    assert.deepEqual(errors,[]);
    console.log('PASS: five daily buttons, multiple Threads series grouped, approval/cancel, offline error, detail/reload, edits revoke approval; 360/390/430/1280 no overflow.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
