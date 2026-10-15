// Isolated local integration: real consent SQL/API + synthetic account and workspace.
import {createServer} from 'node:http';
import {mkdirSync,writeFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {legalApi,legalManifest,ensureLegalSchema,requireLegal} from '../server/legal-consent.mjs';
import {readJsonBody} from '../server/request-security.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/polin/AppData/Local/CodexWork/browser-engines';
const {chromium,webkit,expect}=await import('@playwright/test');
const out='C:/Users/polin/AppData/Local/CodexWork/karta-legal-20261015/browser-qa';mkdirSync(out,{recursive:true});
const db=new PGlite(),query=async(sql,args)=>args?db.query(sql,args):(await db.exec(sql)).at(-1),pool={query,connect:async()=>({query,release(){}})};
await ensureLegalSchema(pool);
let workspaceReads=0;
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const fixture=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const user=req.headers.cookie?.includes('fixture_account=owner')?{id:'fixture-owner',name:'Тестовый автор',authProvider:'telegram'}:null;
  try{
    if(path.startsWith('/api/legal'))return await legalApi(req,res,{path,pool,send,readBody:readJsonBody,getUser:async()=>user});
    if(path==='/api/auth/me')return send(res,200,{user});
    if(path==='/api/auth/logout')return send(res,200,{ok:true});
    if(!user)return send(res,401,{error:'unauthorized'});
    await requireLegal(pool,user.id);
    if(path.startsWith('/api/state/')){workspaceReads++;return send(res,200,{data:null,revision:'new'});}
    if(path==='/api/content-workspace')return send(res,200,{main:{},publications:{schema:1,items:[]},revisions:{main:'new',publications:'new'}});
    if(path==='/api/account/referral')return send(res,200,{balance:0,invited:0,reward:50,url:'https://example.invalid/invite',transactions:[]});
    if(path==='/api/agent/connections')return send(res,200,{agents:[],actions:[]});
    return send(res,200,{});
  }catch(e){send(res,e.status||500,{error:e.status===428?'legal_required':'test_failure',message:e.message});}
});
await new Promise(r=>fixture.listen(3001,'127.0.0.1',r));
const cases=[],errors=[];
try{
  for(const engine of ['edge','webkit']){
    const browser=await (engine==='edge'?chromium.launch({channel:'msedge',headless:true}):webkit.launch({headless:true}));
    try{
      for(const width of [320,390,430,1280]){
        await query('truncate cm_legal_state,cm_legal_events');workspaceReads=0;
        const context=await browser.newContext({viewport:{width,height:width===1280?900:844}});
        await context.addCookies([{name:'fixture_account',value:'owner',url:'http://127.0.0.1:8087'}]);
        const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:8087/home');
        const continueButton=page.getByRole('button',{name:'Продолжить',exact:true});
        await expect(continueButton).toBeDisabled();
        await expect(page.locator('#legal-terms')).not.toBeChecked();
        await expect(page.locator('#legal-personal-data')).not.toBeChecked();
        await expect(page.locator('#legal-advertising')).not.toBeChecked();
        if(workspaceReads)throw Error('Workspace loaded before acceptance');
        const denied=await page.request.get('http://127.0.0.1:8087/api/state/main');if(denied.status()!==428)throw Error('Direct API consent bypass');
        await page.screenshot({path:`${out}/${engine}-${width}-entry.png`,fullPage:true});
        await page.locator('#legal-terms').click();await expect(continueButton).toBeEnabled();
        await page.getByRole('link',{name:'условия сервиса',exact:true}).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.frameLocator('iframe').getByRole('heading',{name:legalManifest.documents[0].title,exact:true})).toBeVisible();
        await expect(page.frameLocator('iframe').locator('article p').first()).toBeInViewport();
        await page.screenshot({path:`${out}/${engine}-${width}-reader.png`});
        await page.getByRole('button',{name:'Вернуться',exact:true}).click();
        await expect(page.locator('#legal-terms')).toBeChecked();
        await continueButton.click();
        await expect(page.getByRole('heading',{name:'Перед началом работы',exact:true})).toHaveCount(0);
        await expect(page.getByRole('heading',{name:'Тестовый, привет',exact:true})).toBeVisible();
        await expect(page.getByText('Загружаем публикации…',{exact:true})).toHaveCount(0);
        await page.goto('http://127.0.0.1:8087/profile');
        await expect(page.getByRole('link',{name:'Документы и согласия',exact:true})).toBeVisible();
        await page.getByRole('link',{name:'Документы и согласия',exact:true}).click();
        await expect(page.locator('#legal-terms')).toBeChecked();
        await expect(page.locator('#legal-personal-data')).not.toBeChecked();
        await expect(page.locator('#legal-advertising')).not.toBeChecked();
        const before=(await query('select * from cm_legal_events')).rows;if(before.length!==1||before[0].advertising)throw Error('Invalid initial journal');
        await page.locator('#legal-personal-data').click();await page.locator('#legal-advertising').click();
        await page.getByRole('button',{name:'Сохранить выбор',exact:true}).click();
        await expect(page.getByRole('button',{name:'Отключить рассылку',exact:true})).toBeVisible();
        await page.reload();await expect(page.locator('#legal-advertising')).toBeChecked();
        await page.screenshot({path:`${out}/${engine}-${width}-preferences.png`,fullPage:true});
        await page.getByRole('button',{name:'Отключить рассылку',exact:true}).click();
        await expect(page.locator('#legal-personal-data')).not.toBeChecked();await expect(page.locator('#legal-advertising')).not.toBeChecked();
        await expect(page.getByText('Рассылка отключена. Картой можно пользоваться дальше.',{exact:true})).toBeVisible();
        const after=(await query('select * from cm_legal_events order by sequence')).rows;if(after.length!==3||after[2].action!=='withdraw')throw Error('Invalid withdrawal journal');
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(overflow)throw Error('Horizontal overflow');
        await page.goto('http://127.0.0.1:8087/home');await expect(page.getByRole('heading',{name:'Перед началом работы'})).toHaveCount(0);
        await expect(page.getByRole('heading',{name:'Тестовый, привет',exact:true})).toBeVisible();
        await expect(page.getByText('Загружаем публикации…',{exact:true})).toHaveCount(0);
        cases.push({engine,width,passed:true,checks:17});await context.close();
      }
      const anonymous=await browser.newContext({viewport:{width:390,height:844}}),page=await anonymous.newPage();
      await page.goto('http://127.0.0.1:8087/');await expect(page.getByRole('link',{name:'Документы сервиса'})).toBeVisible();
      await page.getByRole('link',{name:'Документы сервиса'}).click();await expect(page.getByRole('heading',{name:'Документы и согласия'})).toBeVisible();
      await expect(page.getByRole('button',{name:legalManifest.documents[1].title,exact:true})).toBeVisible();
      await expect(page.locator('#legal-terms')).toHaveCount(0);cases.push({engine,anonymous:true,passed:true,checks:4});await anonymous.close();
    }finally{await browser.close();}
  }
  if(errors.length)throw Error(errors.join('\n'));
  writeFileSync(out+'/results.json',JSON.stringify({cases,errors,checks:cases.reduce((n,c)=>n+c.checks,0)},null,2));
  console.log(JSON.stringify({passed:cases.length,checks:cases.reduce((n,c)=>n+c.checks,0),errors}));
}finally{await new Promise(r=>fixture.close(r));await db.close();}
