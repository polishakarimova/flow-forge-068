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
import {FORMATS,formatLabel,weekStart,addDays,dateLabel,materialAction,type PlanSlot} from '@/lib/editorial';
import './editorial.css';
import {useCardNavigation} from '@/lib/editorialNavigation';
import {AppBackButton} from '@/components/AppBackButton';

export default function Content(){
 return <ContentWorkspace/>;
}
function ContentWorkspace(){
 const cards=useCardNavigation();
 const {data,error:loadError,refresh,command,busy}=useEditorial();
 const [params,setParams]=useSearchParams();
 const mode=params.get('mode')==='ideas'?'ideas':'plan',format=params.get('format')||'all';
 const rawWeek=params.get('week'),week=rawWeek&&/^\d{4}-\d{2}-\d{2}$/.test(rawWeek)&&!Number.isNaN(Date.parse(rawWeek))?weekStart(rawWeek):weekStart();
 const query=params.get('q')||'',used=params.get('used')||'all',theme=params.get('theme')||'',tag=params.get('tag')||'',archive=params.get('archive')==='yes';
 const topics=data?.main.topics||[],materials=topics.flatMap(t=>t.contentItems),slots=data?.main.editorial?.slots||[];
 const [dialog,setDialog]=useState<'import'|'slot'|null>(null);
 const [error,setError]=useState(''),[importText,setImportText]=useState(''),[notice,setNotice]=useState('');
 const [slotDraft,setSlotDraft]=useState<Partial<PlanSlot>>({title:'',date:'',variantIds:[]});
 function nav(patch:Record<string,string|undefined>,replace=false){const n=new URLSearchParams(params);for(const [k,v] of Object.entries(patch)){if(v)n.set(k,v);else n.delete(k);}setParams(n,{replace});}
 function newIdea(){cards.open({action:'idea'});}
 async function act(type:string,input:unknown){setError('');try{return await command(type,input);}catch(e){setError((e as Error).message);return null;}}
 const matches=(title:string)=>title.toLowerCase().includes(query.toLowerCase());
 const eligible=topics.filter(t=>(!tag||t.tags?.includes(tag))&&(!theme||String(t.id)===theme)&&(matches(t.title+' '+t.thesisPlan)||t.contentItems.some(m=>matches(m.title+' '+m.body))));
 const filteredIdeas=eligible.filter(t=>Boolean(t.archived)===archive&&(format==='all'||t.formatIds?.includes(format)||t.contentItems.some(m=>m.platformId===format))&&(used==='all'||(used==='used'?t.contentItems.length>0:t.contentItems.length===0)));
 const inSlot=new Set(slots.flatMap(s=>s.variantIds));
 const filteredMaterials=eligible.flatMap(t=>t.contentItems).filter(m=>format==='all'||m.platformId===format);
 const weeklySlots=slots.filter(s=>s.date>=week&&s.date<=addDays(week,6)&&s.variantIds.some(id=>filteredMaterials.some(m=>m.id===id)));
 const scheduled=filteredMaterials.filter(m=>!inSlot.has(m.id)&&m.publishDate>=week&&m.publishDate<=addDays(week,6));
 const undated=filteredMaterials.filter(m=>!inSlot.has(m.id)&&!m.publishDate);
 const undatedSlots=slots.filter(s=>!s.date&&s.variantIds.some(id=>filteredMaterials.some(m=>m.id===id)));
 const slotFormat=(s:PlanSlot)=>materials.find(m=>m.id===s.variantIds[0])?.platformId||'reels';
 const formatMap:Record<string,string>={'Рилс':'reels','Сторис':'stories','Карусель':'carousel','Пост ТГ':'tg_post','Threads':'threads','YouTube':'youtube','Пост Инста':'ig_post','Статья':'article','ВК':'vk'};
 const legacyBase=(data?.publications.items||[]).filter(p=>!p.contentItemId&&p.parts.some(b=>!b.contentItemId)&&p.date>=week&&p.date<=addDays(week,6)&&matches(p.title)&&!theme&&!tag);
 const legacy=legacyBase.filter(p=>format==='all'||formatMap[p.format]===format);
 const groupDates=[...new Set([...weeklySlots.map(s=>s.date),...scheduled.map(m=>m.publishDate),...legacy.map(p=>p.date)])].sort();
 const materialRow=(m:typeof materials[number])=><button key={'m'+m.id} className="ed-row" onClick={()=>cards.open({material:m.id})}><FileText size={18} className="text-primary shrink-0"/><span className="min-w-0 flex-1 break-words"><strong className="font-medium">{m.title}</strong><small>{formatLabel(m.platformId)} · {materialAction(data,m)}</small></span><ChevronRight size={16}/></button>;
 const slotRow=(s:PlanSlot)=><div key={s.id}><button className="ed-row" onClick={()=>cards.open({slot:s.id,material:s.selectedId||s.recommendedId||s.variantIds[0]})}><FileText size={18} className="text-primary shrink-0"/><span className="min-w-0 flex-1 break-words"><strong className="font-medium">{materials.find(m=>m.id===s.selectedId)?.title||s.title}</strong><small>{formatLabel(slotFormat(s))} · {s.selectedId?'Вариант выбран · '+materialAction(data,materials.find(m=>m.id===s.selectedId)!):'Нужно выбрать'} · {s.variantIds.length} варианта</small></span><ChevronRight size={16}/></button><Button variant="ghost" size="sm" className="ml-3 mb-2" onClick={()=>{setSlotDraft(structuredClone(s));setError('');setDialog('slot');}}>Настроить варианты</Button></div>;
 return <SidebarProvider><div className="min-h-screen flex w-full bg-background"><div className="hidden md:block"><AppSidebar/></div><main className="min-w-0 flex-1"><div className="ed-page">
  <header className="ed-toolbar"><div className="flex items-center gap-2"><AppBackButton/><div><h1 className="kk-page-title text-lg font-semibold">Контент</h1><p className="ed-note">От идеи к публикации</p></div></div><Button size="sm" onClick={newIdea}><Plus size={16}/>Идея</Button></header>
  <div className="ed-modes" aria-label="Режим контента"><button aria-pressed={mode==='plan'} onClick={()=>nav({mode:'plan'})}>План</button><button aria-pressed={mode==='ideas'} onClick={()=>nav({mode:'ideas'})}>Банк идей</button></div>
  {mode==='plan'&&<><div className="ed-toolbar"><Button variant="ghost" size="icon" aria-label="Предыдущая неделя" onClick={()=>nav({week:addDays(week,-7)})}><ChevronLeft size={18}/></Button><button className="text-sm" onClick={()=>nav({week:weekStart()})}>{dateLabel(week)} — {dateLabel(addDays(week,6))}</button><Button variant="ghost" size="icon" aria-label="Следующая неделя" onClick={()=>nav({week:addDays(week,7)})}><ChevronRight size={18}/></Button></div><details className="ed-week-focus"><summary>Фокус недели · {data?.main.editorial?.weeks[week]?.goal||'Выбрать направление'}</summary><WeeklyFocus date={week} scope="week"/></details></>}
  <div className="ed-formats" aria-label="Формат контента">{[{id:'all',label:'Все'},...FORMATS.slice(0,6)].map(f=>{
   const count=mode==='ideas'?eligible.filter(t=>Boolean(t.archived)===archive&&(f.id==='all'||t.formatIds?.includes(f.id)||t.contentItems.some(m=>m.platformId===f.id))&&(used==='all'||(used==='used'?t.contentItems.length>0:t.contentItems.length===0))).length:eligible.flatMap(t=>t.contentItems).filter(m=>(f.id==='all'||m.platformId===f.id)&&!inSlot.has(m.id)&&m.publishDate>=week&&m.publishDate<=addDays(week,6)).length+slots.filter(s=>s.date>=week&&s.date<=addDays(week,6)&&(f.id==='all'||slotFormat(s)===f.id)&&s.variantIds.some(id=>eligible.some(t=>t.contentItems.some(m=>m.id===id)))).length+legacyBase.filter(p=>f.id==='all'||formatMap[p.format]===f.id).length;
   return <button key={f.id} className="ed-format" aria-pressed={format===f.id} onClick={()=>nav({format:f.id})}>{f.label}<small>{mode==='ideas'?'Идей: ':'В плане: '}{count}</small></button>;
  })}</div>
  <details className="ed-filter-disclosure" open={mode==='ideas'?true:undefined}><summary>Поиск и фильтры</summary><div className="ed-filters"><input aria-label="Поиск контента" placeholder="Найти тему или идею" className="ed-input flex-1 min-w-[140px]" value={query} onChange={e=>nav({q:e.target.value},true)}/>
   <select aria-label="Тема" className="ed-input w-auto max-w-full" value={theme} onChange={e=>nav({theme:e.target.value})}><option value="">Все темы</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
   <select aria-label="Рубрика" className="ed-input w-auto" value={tag} onChange={e=>nav({tag:e.target.value})}><option value="">Все рубрики</option>{[...new Set(topics.flatMap(t=>t.tags||[]))].map(t=><option key={t}>{t}</option>)}</select>
   {mode==='ideas'&&<select aria-label="Архив идей" className="ed-input w-auto" value={archive?'yes':'no'} onChange={e=>nav({archive:e.target.value})}><option value="no">Активные идеи</option><option value="yes">Архив</option></select>}
   {mode==='ideas'&&<select aria-label="Использование идеи" className="ed-input w-auto" value={used} onChange={e=>nav({used:e.target.value})}><option value="all">Все идеи</option><option value="new">Ещё не использованы</option><option value="used">Есть адаптации</option></select>}
   <select aria-label="Другие форматы" className="ed-input w-auto" value={FORMATS.slice(6).some(f=>f.id===format)?format:''} onChange={e=>nav({format:e.target.value||'all'})}><option value="">Другие форматы</option>{FORMATS.slice(6).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select>
  </div>
  </details>
  {loadError&&<div className="ed-error" role="alert">{loadError}<button className="underline block" onClick={()=>void refresh()}>Повторить</button></div>}
  {!data&&!loadError&&<p role="status">Загружаем материалы…</p>}
  {notice&&<p role="status" className="ed-note mb-3">{notice}</p>}
  {mode==='ideas'?<>
   <div className="ed-toolbar"><p className="ed-note">Идей: {filteredIdeas.length} · исходники сохраняются</p><Button variant="ghost" size="sm" onClick={()=>{setDialog('import');setError('');}}><Upload size={14}/>Импорт</Button></div>
   {filteredIdeas.length?<div className="ed-list">{filteredIdeas.map(t=><button className="ed-row" key={t.id} onClick={()=>cards.open({idea:t.id})}><Lightbulb size={18} className="text-primary shrink-0"/><span className="flex-1 min-w-0 break-words"><strong className="font-medium">{t.title}</strong><small>{t.contentItems.length?'Адаптаций: '+t.contentItems.length:'Ещё не использована'}{t.source?' · '+t.source:''}</small></span><ChevronRight size={16}/></button>)}</div>:<div className="ed-empty">Здесь будут сохранённые идеи.<Button variant="link" onClick={newIdea}>Записать первую</Button></div>}
  </>:<div className="ed-split"><div>
   {groupDates.map(date=><section className="ed-group" key={date}><h2>{dateLabel(date)}</h2><div className="ed-list">{weeklySlots.filter(s=>s.date===date).map(slotRow)}{scheduled.filter(m=>m.publishDate===date).map(materialRow)}{legacy.filter(p=>p.date===date).map(p=><Link className="ed-row" key={p.id} to={'/calendar?date='+p.date+'&item='+p.id}><FileText size={18} className="text-primary"/><span className="flex-1">{p.title}<small>{p.format} · {p.parts.every(b=>b.published)?'Опубликовано':'В календаре'}</small></span><ChevronRight size={16}/></Link>)}</div></section>)}
   {!groupDates.length&&data&&<div className="ed-empty">На эту неделю пока нет материалов. Открой идею, подготовь сценарий и выбери дату.</div>}
   <section className="ed-group"><div className="ed-toolbar"><h2 className="text-sm font-semibold">Пока без даты <span className="text-muted-foreground font-normal">{undated.length+undatedSlots.length}</span></h2><Button variant="ghost" size="sm" onClick={()=>{setSlotDraft({title:'',date:'',variantIds:[]});setError('');setDialog('slot');}}>Объединить варианты</Button></div>
    {undated.length||undatedSlots.length?<div className="ed-list">{undatedSlots.map(slotRow)}{undated.map(materialRow)}</div>:<p className="ed-note">Сценарии, которым ещё не назначен день.</p>}
   </section>
  </div><aside className="ed-overview"><div className="ed-focus"><h2 className="text-sm font-medium mb-3">Неделя в работе</h2><p className="ed-note">Ожидают выбора: {weeklySlots.filter(s=>!s.selectedId).length}</p><p className="ed-note mt-2">Без даты: {undated.length+undatedSlots.length}</p><Link className="text-xs text-primary block py-3" to={'/calendar?date='+week}>Открыть календарь →</Link></div><p className="ed-note">Одна карточка — в плане, календаре и на главной.</p></aside></div>}
 </div></main><MobileNav/></div>
 <Dialog open={dialog==='import'} onOpenChange={v=>{if(!v)setDialog(null);}}><DialogContent className="ed-small-dialog"><DialogTitle>Импорт идей из JSON</DialogTitle><DialogDescription>Ручной импорт списка с источниками. Агент пока не подключён; даты не назначаются.</DialogDescription><textarea className="ed-input min-h-48" aria-label="Список идей JSON" value={importText} placeholder={'[{"title":"Тема","thesisPlan":"Смысл","formatIds":["carousel"],"source":"Ссылка"}]'} onChange={e=>setImportText(e.target.value)}/>{error&&<p role="alert" className="ed-error">{error}</p>}<Button disabled={busy} onClick={async()=>{try{const ideas=JSON.parse(importText);const r=await act(Array.isArray(ideas)?'ideas.import':'bundle.import',Array.isArray(ideas)?{ideas}:ideas);if(r){setNotice('Сохранено идей: '+r.ids?.length+'. Повторы объединены.');setDialog(null);setImportText('');}}catch{setError('Проверь формат списка от агента.');}}}>Сохранить в банк идей</Button></DialogContent></Dialog>
 <Dialog open={dialog==='slot'} onOpenChange={v=>{if(!v)setDialog(null);}}><DialogContent className="ed-small-dialog"><DialogTitle>Варианты одной публикации</DialogTitle><DialogDescription>Выбери сценарии одного формата. В календаре будет одно место.</DialogDescription>
  <label className="ed-label">Тема дня<input className="ed-input" value={slotDraft.title||''} onChange={e=>setSlotDraft({...slotDraft,title:e.target.value})}/></label>
  <label className="ed-label">Дата · можно оставить пустой<input type="date" className="ed-input" value={slotDraft.date||''} onChange={e=>setSlotDraft({...slotDraft,date:e.target.value})}/></label>
  {materials.filter(m=>m.platformId!=='stories'&&((!inSlot.has(m.id)&&!m.publishDate)||slots.find(s=>s.id===slotDraft.id)?.variantIds.includes(m.id)||slotDraft.variantIds?.includes(m.id))).map(m=><label className="flex gap-2 py-2 text-sm items-start" key={m.id}><input type="checkbox" className="mt-1" checked={slotDraft.variantIds?.includes(m.id)||false} onChange={e=>setSlotDraft({...slotDraft,variantIds:e.target.checked?[...(slotDraft.variantIds||[]),m.id]:slotDraft.variantIds?.filter(id=>id!==m.id)})}/>{formatLabel(m.platformId)} · {m.title}</label>)}
  <label className="ed-label">Рекомендуемый вариант<select className="ed-input" value={slotDraft.recommendedId||slotDraft.variantIds?.[0]||''} onChange={e=>setSlotDraft({...slotDraft,recommendedId:Number(e.target.value)})}><option value="">Выберите сценарий</option>{materials.filter(m=>slotDraft.variantIds?.includes(m.id)).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
  <label className="ed-label">Почему рекомендуем<textarea className="ed-input" value={slotDraft.reason||''} onChange={e=>setSlotDraft({...slotDraft,reason:e.target.value})}/></label>
  {error&&<p role="alert" className="ed-error">{error}</p>}<Button disabled={busy} onClick={async()=>{const r=await act('slot.save',slotDraft);if(r){setDialog(null);setNotice('Варианты объединены.');}}}>Сохранить варианты</Button>{slotDraft.id&&<Button variant="outline" disabled={busy} onClick={async()=>{if(!window.confirm('Разделить группу? Выбранная публикация останется в календаре, остальные сценарии — без даты.'))return;const r=await act('slot.dissolve',{id:slotDraft.id});if(r)setDialog(null);}}>Разделить группу</Button>}
 </DialogContent></Dialog>
 </SidebarProvider>;
}
