// Isolated local preview: synthetic data, no database, no production credentials or publishing.
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createServer as createViteServer} from 'vite';
import {applyEditorial} from '../../server/content-workspace.mjs';
const hash=data=>createHash('md5').update(JSON.stringify(data)).digest('hex');
const today='2026-10-05';
let main={products:[
 {id:1,name:'Первый Reels с GPT',typeId:'lead_magnet',format:'PDF',price:'0',currency:'₽',status:'active',description:'Бесплатная инструкция для первого ролика.',link:'',createdDate:today,publishDate:''},
 {id:2,name:'Монтаж с ИИ',typeId:'tripwire',format:'Мини-обучение',price:'990',currency:'₽',status:'draft',description:'Урок монтажа, фирменный стиль и библиотека материалов.',link:'',createdDate:today,publishDate:''}
],topics:[],funnels:[{id:'montage',keyword:'МОНТАЖ',badgeColor:'violet',product:'Монтаж с ИИ',productType:'Трипваер',active:true,contentCount:0,leads:0,sales:0,contentItemIds:[],cta:'Напиши МОНТАЖ',leadMagnetId:1,tripwireId:2}],keywords:['МОНТАЖ']};
let publications={schema:1,items:[]};
function command(type,input){const r=applyEditorial(main,publications,{type,input});main=r.main;publications=r.publications;return r.result;}
const first=command('idea.save',{title:'Один исходник — три результата',thesisPlan:'Показать простой монтаж, анимацию и человека рядом с графикой.',formatIds:['reels','carousel','stories'],source:'Пример для проверки интерфейса',productId:2}).ids[0];
const variants=[];
for(const title of ['Видео лежало неделю. Я собрала его с ИИ','Мой монтаж до и после ИИ','Три способа оформить один ролик']){
 const id=command('material.create',{ideaId:first,platformId:'reels',title}).id;
 command('material.save',{id,title,body:'Сняла видео, а на монтаж снова не хватило времени.\n\nПокажу, как собираю ролик в своей видеостудии: убираю паузы, добавляю субтитры и сохраняю свой стиль.\n\nНачать можно с одного короткого видео. Напиши МОНТАЖ — пришлю инструкцию.',visual:'Говорящая голова. Затем запись экрана с исходником и готовым роликом.',motion:'Надпись «До» сменяется «После». Без сложной анимации.',resources:'Исходное видео · скрин видеостудии · фирменный шрифт',cta:'Напиши МОНТАЖ',productId:2,funnelId:'montage',status:'in_progress'});
 variants.push(id);
}
command('slot.save',{title:'Первый ролик с ИИ',variantIds:variants,recommendedId:variants[0],reason:'Начинаем с узнаваемой ситуации и показываем результат.',date:today});
const story=command('material.create',{ideaId:first,platformId:'stories',title:'Как я освободила вечер от монтажа'}).id;
command('material.save',{id:story,title:'Как я освободила вечер от монтажа',body:'',blocks:[
 {id:'s1',label:'История',text:'Вечером хотела закончить ролик. Но сначала ужин и дети.',visual:'Живое видео на кухне.',motion:'Мягко появляется подпись «Знакомо?»'},
 {id:'s2',label:'Решение',text:'Показала ИИ, что нужно убрать и какой стиль сохранить.',visual:'Запись экрана видеостудии.',motion:'Подсветить две команды по очереди.'},
 {id:'s3',label:'Приглашение',text:'Хочешь повторить? Напиши МОНТАЖ.',visual:'Результат рядом с исходником.',motion:'Кодовое слово появляется под видео.'}
],productId:2,funnelId:'montage'});
command('material.schedule',{id:story,date:'2026-10-06'});
const extra=command('idea.save',{title:'Ужин из того, что есть в холодильнике',thesisPlan:'Бытовой пример без обязательной продажи.',formatIds:['reels','stories'],source:'Личная история'}).ids[0];
command('idea.save',{title:'Пять задач, которые можно поручить ИИ сегодня',thesisPlan:'Карусель с простыми примерами для специалистов.',formatIds:['carousel'],source:'Ресёрч'});
command('focus.save',{date:today,scope:'week',goal:'Первые продажи мини-обучения монтажу',productId:2,funnelId:'montage'});
const revision=()=>({main:hash(main),publications:hash(publications)});
const snapshot=()=>({main,publications,revisions:revision()});
const vite=await createViteServer({server:{middlewareMode:true,host:'127.0.0.1',hmr:false},appType:'spa'});
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(!path.startsWith('/api/'))return vite.middlewares(req,res);
 try{
  let raw='';for await(const chunk of req)raw+=chunk;const input=raw?JSON.parse(raw):{};
  if(path==='/api/auth/me')return send(200,{user:{id:'editorial-preview',name:'Полина · тестовый стенд',authProvider:'telegram'}});
  if(path==='/api/threads/status')return send(200,{available:false,connected:false,username:null,queue:[]});
  if(path==='/api/publications/approval')return send(403,{message:'Отправка отключена на тестовом стенде.'});
  if(path==='/api/content-workspace'){
   if(req.method==='GET')return send(200,snapshot());
   const rev=revision();
   if((input.type!=='publications.replace'&&input.revisions?.main!==rev.main)||(input.type!=='main.replace'&&input.revisions?.publications!==rev.publications))return send(409,{message:'Данные изменились. Обновите список, текст в редакторе сохранится.'});
   const result=command(input.type,input.input);
   return send(200,{...snapshot(),result,revision:input.type==='main.replace'?hash(main):hash(publications)});
  }
  if(path==='/api/state/main'){
   if(req.method==='PUT')main={...main,...input.data,editorial:main.editorial};
   return send(200,{data:main,revision:hash(main)});
  }
  if(path==='/api/state/publications'){
   if(req.method==='PUT'){if(req.headers['if-match']!==hash(publications))return send(409,{});command('publications.replace',{data:input.data});}
   return send(200,{data:publications,revision:hash(publications)});
  }
  return send(200,{data:null,revision:'new'});
 }catch(e){send(e.status||500,{message:e.message});}
}).listen(5178,'127.0.0.1',()=>console.log('Isolated UI preview: http://127.0.0.1:5178/content'));
