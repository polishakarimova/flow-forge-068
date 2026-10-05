import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Plus,Lightbulb,ChevronLeft,ChevronRight,FileText,Upload} from 'lucide-react';
import {SidebarProvider} from '@/components/ui/sidebar';
import {AppSidebar} from '@/components/AppSidebar';
import {MobileNav} from '@/components/MobileNav';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useEditorial} from '@/lib/editorialContext';
import {WeeklyFocus} from '@/components/content/WeeklyFocus';
import {FORMATS,formatLabel,weekStart,addDays,dateLabel,nextAction,materialAction,type Idea,type PlanSlot} from '@/lib/editorial';
import './editorial.css';
import ContentLegacy from './ContentLegacy';

export default function Content(){
 const {data,error}=useEditorial();
 // Keep the current editor available until the new server capability is installed.
 if(error&&!data)return <ContentLegacy/>;
 return <ContentWorkspace/>;
}
function ContentWorkspace(){
 const {data,error:loadError,refresh,command,busy}=useEditorial();
 const [params,setParams]=useSearchParams();
 const mode=params.get('mode')==='ideas'?'ideas':'plan',format=params.get('format')||'all';
 const rawWeek=params.get('week'),week=rawWeek&&/^\d{4}-\d{2}-\d{2}$/.test(rawWeek)&&!Number.isNaN(Date.parse(rawWeek))?weekStart(rawWeek):weekStart();
 const query=params.get('q')||'',used=params.get('used')||'all',theme=params.get('theme')||'';
 const topics=data?.main.topics||[],materials=topics.flatMap(t=>t.contentItems),slots=data?.main.editorial?.slots||[];
 const [dialog,setDialog]=useState<'idea'|'import'|'slot'|null>(null),[draft,setDraft]=useState<Partial<Idea>>({title:'',thesisPlan:'',formatIds:[]});
 const [error,setError]=useState(''),[importText,setImportText]=useState(''),[notice,setNotice]=useState('');
 const [adaptFormat,setAdaptFormat]=useState('reels'),[slotDraft,setSlotDraft]=useState<Partial<PlanSlot>>({title:'',date:'',variantIds:[]});
 function nav(patch:Record<string,string|undefined>,replace=false){const n=new URLSearchParams(params);for(const [k,v] of Object.entries(patch)){if(v)n.set(k,v);else n.delete(k);}setParams(n,{replace});}
 function newIdea(){setDraft({title:'',thesisPlan:'',formatIds:format==='all'?[]:[format]});setError('');setDialog('idea');}
 const selectedIdea=topics.find(t=>t.id===Number(params.get('idea')));
 const showIdea=dialog==='idea'||Boolean(selectedIdea)||params.get('action')==='idea';
 const ideaDraft=dialog==='idea'?draft:selectedIdea || draft;
 function changeIdea(patch:Partial<Idea>){setDraft({...ideaDraft,...patch});setDialog('idea');}
 function closeIdea(){setDialog(null);nav({idea:undefined,action:undefined},true);}
 async function act(type:string,input:unknown){setError('');try{return await command(type,input);}catch(e){setError((e as Error).message);return null;}}
 const matches=(title:string)=>title.toLowerCase().includes(query.toLowerCase());
 const eligible=topics.filter(t=>(!theme||String(t.id)===theme)&&(matches(t.title+' '+t.thesisPlan)||t.contentItems.some(m=>matches(m.title+' '+m.body))));
 const filteredIdeas=eligible.filter(t=>(format==='all'||t.formatIds?.includes(format)||t.contentItems.some(m=>m.platformId===format))&&(used==='all'||(used==='used'?t.contentItems.length>0:t.contentItems.length===0)));
 const inSlot=new Set(slots.flatMap(s=>s.variantIds));
 const filteredMaterials=eligible.flatMap(t=>t.contentItems).filter(m=>format==='all'||m.platformId===format);
 const weeklySlots=slots.filter(s=>s.date>=week&&s.date<=addDays(week,6)&&s.variantIds.some(id=>filteredMaterials.some(m=>m.id===id)));
 const scheduled=filteredMaterials.filter(m=>!inSlot.has(m.id)&&m.publishDate>=week&&m.publishDate<=addDays(week,6));
 const undated=filteredMaterials.filter(m=>!inSlot.has(m.id)&&!m.publishDate);
 const undatedSlots=slots.filter(s=>!s.date&&s.variantIds.some(id=>filteredMaterials.some(m=>m.id===id)));
 const slotFormat=(s:PlanSlot)=>materials.find(m=>m.id===s.variantIds[0])?.platformId||'reels';
 const formatMap:Record<string,string>={'Рилс':'reels','Сторис':'stories','Карусель':'carousel','Пост ТГ':'tg_post','Threads':'threads','YouTube':'youtube'};
 const legacy=(data?.publications.items||[]).filter(p=>!p.contentItemId&&!p.parts.some(b=>b.contentItemId)&&p.date>=week&&p.date<=addDays(week,6)&&(format==='all'||formatMap[p.format]===format)&&matches(p.title)&&!theme);
 const groupDates=[...new Set([...weeklySlots.map(s=>s.date),...scheduled.map(m=>m.publishDate),...legacy.map(p=>p.date)])].sort();
 const materialRow=(m:typeof materials[number])=><button key={'m'+m.id} className="ed-row" onClick={()=>nav({material:String(m.id)})}><FileText size={18} className="text-primary shrink-0"/><span className="min-w-0 flex-1 break-words"><strong className="font-medium">{m.title}</strong><small>{formatLabel(m.platformId)} · {materialAction(data,m)}</small></span><ChevronRight size={16}/></button>;
 const slotRow=(s:PlanSlot)=><button key={s.id} className="ed-row" onClick={()=>nav({slot:s.id,material:String(s.selectedId||s.recommendedId||s.variantIds[0])})}><FileText size={18} className="text-primary shrink-0"/><span className="min-w-0 flex-1 break-words"><strong className="font-medium">{materials.find(m=>m.id===s.selectedId)?.title||s.title}</strong><small>{formatLabel(slotFormat(s))} · {s.selectedId?'Сценарий выбран':'Нужно выбрать'} · {s.variantIds.length} варианта</small></span><ChevronRight size={16}/></button>;
 return <SidebarProvider><div className="min-h-screen flex w-full bg-background"><div className="hidden md:block"><AppSidebar/></div><main className="min-w-0 flex-1"><div className="ed-page">
  <header className="ed-toolbar"><div><h1 className="kk-page-title text-lg font-semibold">Контент</h1><p className="ed-note">От идеи к публикации</p></div><Button size="sm" onClick={newIdea}><Plus size={16}/>Идея</Button></header>
  <div className="ed-modes" aria-label="Режим контента"><button aria-pressed={mode==='plan'} onClick={()=>nav({mode:'plan'})}>План</button><button aria-pressed={mode==='ideas'} onClick={()=>nav({mode:'ideas'})}>Банк идей</button></div>
  {mode==='plan'&&<><div className="ed-toolbar"><Button variant="ghost" size="icon" aria-label="Предыдущая неделя" onClick={()=>nav({week:addDays(week,-7)})}><ChevronLeft size={18}/></Button><button className="text-sm" onClick={()=>nav({week:weekStart()})}>{dateLabel(week)} — {dateLabel(addDays(week,6))}</button><Button variant="ghost" size="icon" aria-label="Следующая неделя" onClick={()=>nav({week:addDays(week,7)})}><ChevronRight size={18}/></Button></div><WeeklyFocus date={week}/></>}
  <div className="ed-formats" aria-label="Формат контента">{[{id:'all',label:'Все'},...FORMATS.slice(0,6)].map(f=>{
   const count=mode==='ideas'?topics.filter(t=>f.id==='all'||t.formatIds?.includes(f.id)||t.contentItems.some(m=>m.platformId===f.id)).length:materials.filter(m=>(f.id==='all'||m.platformId===f.id)&&!inSlot.has(m.id)&&m.publishDate>=week&&m.publishDate<=addDays(week,6)).length+slots.filter(s=>s.date>=week&&s.date<=addDays(week,6)&&(f.id==='all'||slotFormat(s)===f.id)).length;
   return <button key={f.id} className="ed-format" aria-pressed={format===f.id} onClick={()=>nav({format:f.id})}>{f.label}<small>{mode==='ideas'?'Идей: ':'В плане: '}{count}</small></button>;
  })}</div>
  <details className="ed-filter-disclosure" open={mode==='ideas'?true:undefined}><summary>Поиск и фильтры</summary><div className="ed-filters"><input aria-label="Поиск контента" placeholder="Найти тему или идею" className="ed-input flex-1 min-w-[140px]" value={query} onChange={e=>nav({q:e.target.value},true)}/>
   <select aria-label="Тема" className="ed-input w-auto max-w-full" value={theme} onChange={e=>nav({theme:e.target.value})}><option value="">Все темы</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
   {mode==='ideas'&&<select aria-label="Использование идеи" className="ed-input w-auto" value={used} onChange={e=>nav({used:e.target.value})}><option value="all">Все идеи</option><option value="new">Ещё не использованы</option><option value="used">Есть адаптации</option></select>}
   <select aria-label="Другие форматы" className="ed-input w-auto" value={FORMATS.slice(6).some(f=>f.id===format)?format:''} onChange={e=>nav({format:e.target.value||'all'})}><option value="">Другие форматы</option>{FORMATS.slice(6).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select>
  </div>
  </details>
  {loadError&&<div className="ed-error" role="alert">{loadError}<button className="underline block" onClick={()=>void refresh()}>Повторить</button></div>}
  {!data&&!loadError&&<p role="status">Загружаем материалы…</p>}
  {notice&&<p role="status" className="ed-note mb-3">{notice}</p>}
  {mode==='ideas'?<>
   <div className="ed-toolbar"><p className="ed-note">Идей: {filteredIdeas.length} · исходники сохраняются</p><Button variant="ghost" size="sm" onClick={()=>{setDialog('import');setError('');}}><Upload size={14}/>Импорт</Button></div>
   {filteredIdeas.length?<div className="ed-list">{filteredIdeas.map(t=><button className="ed-row" key={t.id} onClick={()=>{setDraft(t);setAdaptFormat(format==='all'?'reels':format);nav({idea:String(t.id)});}}><Lightbulb size={18} className="text-primary shrink-0"/><span className="flex-1 min-w-0 break-words"><strong className="font-medium">{t.title}</strong><small>{t.contentItems.length?'Адаптаций: '+t.contentItems.length:'Ещё не использована'}{t.source?' · '+t.source:''}</small></span><ChevronRight size={16}/></button>)}</div>:<div className="ed-empty">Здесь будут сохранённые идеи.<Button variant="link" onClick={newIdea}>Записать первую</Button></div>}
  </>:<div className="ed-split"><div>
   {groupDates.map(date=><section className="ed-group" key={date}><h2>{dateLabel(date)}</h2><div className="ed-list">{weeklySlots.filter(s=>s.date===date).map(slotRow)}{scheduled.filter(m=>m.publishDate===date).map(materialRow)}{legacy.filter(p=>p.date===date).map(p=><Link className="ed-row" key={p.id} to={'/calendar?date='+p.date+'&item='+p.id}><FileText size={18} className="text-primary"/><span className="flex-1">{p.title}<small>{p.format} · {p.parts.every(b=>b.published)?'Опубликовано':'В календаре'}</small></span><ChevronRight size={16}/></Link>)}</div></section>)}
   {!groupDates.length&&data&&<div className="ed-empty">На эту неделю пока нет материалов. Открой идею, подготовь сценарий и выбери дату.</div>}
   <section className="ed-group"><div className="ed-toolbar"><h2 className="text-sm font-semibold">Пока без даты <span className="text-muted-foreground font-normal">{undated.length+undatedSlots.length}</span></h2><Button variant="ghost" size="sm" onClick={()=>{setSlotDraft({title:'',date:'',variantIds:[]});setError('');setDialog('slot');}}>Объединить варианты</Button></div>
    {undated.length||undatedSlots.length?<div className="ed-list">{undatedSlots.map(slotRow)}{undated.map(materialRow)}</div>:<p className="ed-note">Сценарии, которым ещё не назначен день.</p>}
   </section>
  </div><aside className="ed-overview"><div className="ed-focus"><h2 className="text-sm font-medium mb-3">Неделя в работе</h2><p className="ed-note">Ожидают выбора: {weeklySlots.filter(s=>!s.selectedId).length}</p><p className="ed-note mt-2">Без даты: {undated.length+undatedSlots.length}</p><Link className="text-xs text-primary block py-3" to={'/calendar?date='+week}>Открыть календарь →</Link></div><p className="ed-note">Одна карточка — в плане, календаре и на главной.</p></aside></div>}
 </div></main><MobileNav/></div>
 <Dialog open={showIdea} onOpenChange={v=>{if(!v)closeIdea();}}><DialogContent className="ed-small-dialog"><DialogTitle>{ideaDraft.id?'Идея и адаптации':'Новая идея'}</DialogTitle><DialogDescription>Из одной идеи можно подготовить несколько материалов.</DialogDescription>
  <label className="ed-label">Название<input className="ed-input" value={ideaDraft.title||''} onChange={e=>changeIdea({title:e.target.value})}/></label>
  <label className="ed-label">Смысл и подача<textarea className="ed-input min-h-28" value={ideaDraft.thesisPlan||''} onChange={e=>changeIdea({thesisPlan:e.target.value})}/></label>
  <label className="ed-label">Источник / ссылка<input className="ed-input" value={ideaDraft.source||''} onChange={e=>changeIdea({source:e.target.value})}/></label>
  <div><p className="ed-label">Подходит для</p><div className="flex gap-2 flex-wrap">{FORMATS.slice(0,6).map(f=><button key={f.id} className="ed-badge min-h-9 border" aria-pressed={ideaDraft.formatIds?.includes(f.id)||false} style={{opacity:ideaDraft.formatIds?.includes(f.id)?1:.55}} onClick={()=>changeIdea({formatIds:ideaDraft.formatIds?.includes(f.id)?ideaDraft.formatIds.filter(id=>id!==f.id):[...(ideaDraft.formatIds||[]),f.id]})}>{f.label}</button>)}</div></div>
  <label className="ed-label">Продукт<select className="ed-input" value={ideaDraft.productId||''} onChange={e=>changeIdea({productId:Number(e.target.value)||undefined})}><option value="">Не связан с продуктом</option>{data?.main.products?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {error&&<p role="alert" className="ed-error">{error}</p>}
  <Button disabled={busy} onClick={async()=>{const r=await act('idea.save',ideaDraft);if(r){setNotice('Идея сохранена');closeIdea();}}}>Сохранить идею</Button>
  {ideaDraft.id&&<div className="border-t pt-3"><h3 className="text-sm font-medium mb-2">Материалы из этой идеи</h3>{selectedIdea?.contentItems.map(m=><button className="ed-row" key={m.id} onClick={()=>{setDialog(null);nav({idea:undefined,material:String(m.id)});}}>{formatLabel(m.platformId)} · {m.title}</button>)}
   <div className="flex flex-wrap gap-2 mt-3"><select aria-label="Формат нового материала" className="ed-input flex-1" value={adaptFormat} onChange={e=>setAdaptFormat(e.target.value)}>{FORMATS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select><Button variant="outline" disabled={busy} onClick={async()=>{const saved=await act('idea.save',ideaDraft);if(!saved)return;const r=await act('material.create',{ideaId:ideaDraft.id,platformId:adaptFormat});if(r?.id){setDialog(null);nav({idea:undefined,material:String(r.id),action:undefined});}}}>Создать черновик</Button></div>
  </div>}
 </DialogContent></Dialog>
 <Dialog open={dialog==='import'} onOpenChange={v=>{if(!v)setDialog(null);}}><DialogContent className="ed-small-dialog"><DialogTitle>Идеи от агента</DialogTitle><DialogDescription>Вставь список идей с источниками. Даты не назначаются.</DialogDescription><textarea className="ed-input min-h-48" aria-label="Список идей JSON" value={importText} placeholder={'[{"title":"Тема","thesisPlan":"Смысл","formatIds":["carousel"],"source":"Ссылка"}]'} onChange={e=>setImportText(e.target.value)}/>{error&&<p role="alert" className="ed-error">{error}</p>}<Button disabled={busy} onClick={async()=>{try{const ideas=JSON.parse(importText);const r=await act('ideas.import',{ideas});if(r){setNotice('Сохранено идей: '+r.ids?.length+'. Повторы объединены.');setDialog(null);setImportText('');}}catch{setError('Проверь формат списка от агента.');}}}>Сохранить в банк идей</Button></DialogContent></Dialog>
 <Dialog open={dialog==='slot'} onOpenChange={v=>{if(!v)setDialog(null);}}><DialogContent className="ed-small-dialog"><DialogTitle>Варианты одной публикации</DialogTitle><DialogDescription>Выбери сценарии одного формата. В календаре будет одно место.</DialogDescription>
  <label className="ed-label">Тема дня<input className="ed-input" value={slotDraft.title||''} onChange={e=>setSlotDraft({...slotDraft,title:e.target.value})}/></label>
  <label className="ed-label">Дата · можно оставить пустой<input type="date" className="ed-input" value={slotDraft.date||''} onChange={e=>setSlotDraft({...slotDraft,date:e.target.value})}/></label>
  {undated.filter(m=>m.platformId!=='stories').map(m=><label className="flex gap-2 py-2 text-sm items-start" key={m.id}><input type="checkbox" className="mt-1" checked={slotDraft.variantIds?.includes(m.id)||false} onChange={e=>setSlotDraft({...slotDraft,variantIds:e.target.checked?[...(slotDraft.variantIds||[]),m.id]:slotDraft.variantIds?.filter(id=>id!==m.id)})}/>{formatLabel(m.platformId)} · {m.title}</label>)}
  <label className="ed-label">Рекомендуемый вариант<select className="ed-input" value={slotDraft.recommendedId||slotDraft.variantIds?.[0]||''} onChange={e=>setSlotDraft({...slotDraft,recommendedId:Number(e.target.value)})}><option value="">Выберите сценарий</option>{materials.filter(m=>slotDraft.variantIds?.includes(m.id)).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
  <label className="ed-label">Почему рекомендуем<textarea className="ed-input" value={slotDraft.reason||''} onChange={e=>setSlotDraft({...slotDraft,reason:e.target.value})}/></label>
  {error&&<p role="alert" className="ed-error">{error}</p>}<Button disabled={busy} onClick={async()=>{const r=await act('slot.save',slotDraft);if(r){setDialog(null);setNotice('Варианты объединены.');}}}>Сохранить варианты</Button>
 </DialogContent></Dialog>
 </SidebarProvider>;
}
