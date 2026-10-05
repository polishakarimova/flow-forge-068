import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Copy,CalendarDays,Plus,ArrowUp,ArrowDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {useEditorial} from '@/lib/editorialContext';
import {FORMATS,formatLabel,nextAction,materialAction,dateLabel,type Material,type StoryBlock} from '@/lib/editorial';
import '@/pages/editorial.css';
import {useAuth} from '@/lib/authContext';
import {draftKey,readDraft,writeDraft,clearDraft} from '@/lib/editorialDrafts';
import {ReadyAssets,ResourceText} from './ReadyAssets';

export function MaterialCard(){
 const {user}=useAuth();
 const [params,setParams]=useSearchParams();
 const id=Number(params.get('material')), slotId=params.get('slot')||'';
 const {data,command,busy,refresh}=useEditorial();
 const topics=data?.main.topics||[],materials=topics.flatMap(t=>t.contentItems);
 const slot=data?.main.editorial?.slots.find(s=>s.id===slotId || s.variantIds.includes(id));
 const current=materials.find(m=>m.id===id) || (slot?materials.find(m=>m.id===(slot.selectedId||slot.recommendedId||slot.variantIds[0])):undefined);
 const topic=topics.find(t=>t.contentItems.some(m=>m.id===current?.id));
 const [draft,setDraft]=useState<Material|null>(null),[editing,setEditing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [date,setDate]=useState(''),[adaptFormat,setAdaptFormat]=useState('stories'),[confirmClose,setConfirmClose]=useState(false);
 const open=Boolean(id || slotId), currentId=current?.id;
 const base=useRef('');
 const recoveryKey=draftKey(user?.id||'', 'material',currentId||'');
 const [removed,setRemoved]=useState<StoryBlock[]|null>(null);
 const lastOpened=useRef<string>('');
 useEffect(()=>{const key=recoveryKey+':'+open;if(lastOpened.current===key)return;lastOpened.current=key;if(current){const saved=readDraft<{draft:Material;base:string}>(recoveryKey);setDraft(saved?.draft||structuredClone(current));base.current=saved?.base||JSON.stringify(current);setDate(slot?.date||current.publishDate||'');setEditing(Boolean(saved));setNotice(saved?'Восстановлен несохранённый черновик на этом устройстве.':'');}else{setDraft(null);base.current='';}setError('');},[currentId,open,current,slot?.date,recoveryKey]);
 // A refresh must never replace an unsaved local draft.
 const dirty=Boolean(draft && JSON.stringify(draft)!==base.current);
 useEffect(()=>{if(!dirty&&current&&!readDraft(recoveryKey)){setDraft(structuredClone(current));base.current=JSON.stringify(current);setDate(slot?.date||current.publishDate||'');}},[current,slot?.date,dirty,recoveryKey]);
 useEffect(()=>{const leave=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[dirty]);
 function close(){if(dirty){setConfirmClose(true);return;}const next=new URLSearchParams(params);next.delete('material');next.delete('slot');setParams(next,{replace:true});}
 function choose(nextId:number){if(dirty){setError('Сначала сохрани изменения сценария.');return;}const next=new URLSearchParams(params);next.set('material',String(nextId));if(slot)next.set('slot',slot.id);setParams(next,{replace:true});}
 async function act(type:string,input:unknown,message='Сохранено'){
  setError('');
  try{const result=await command(type,input);setNotice(message);return result;}catch(e){setError((e as Error).message);return null;}
 }
 async function save(){if(!draft)return;if(current && (JSON.parse(base.current||'{}').revision||1)!==(current.revision||1)){setError('Сценарий изменился на другом устройстве. Скопируй свою версию и сравни с новой перед сохранением.');return;}const result=await act('material.save',{...draft,revision:JSON.parse(base.current||'{}').revision||1});if(result){clearDraft(recoveryKey);base.current=JSON.stringify(draft);setEditing(false);setRemoved(null);}}
 function patch(patch:Partial<Material>){if(draft){const next={...draft,...patch};setDraft(next);if(!writeDraft(recoveryKey,{draft:next,base:base.current}))setError('Не удалось сохранить резервный черновик на устройстве. Сохрани изменения перед выходом.');}}
 function patchBlock(index:number,patch:Partial<StoryBlock>){if(draft)patchBlocks((draft.blocks||[]).map((b,i)=>i===index?{...b,...patch}:b));}
 function patchBlocks(blocks:StoryBlock[]){patch({blocks,body:blocks.map(b=>b.text).join('\n\n')});}
 async function copy(){try{await navigator.clipboard.writeText(draft?.body||current?.body||'');setNotice('Текст скопирован');}catch{setError('Выдели текст и скопируй его вручную.');}}
 const product=data?.main.products?.find(p=>p.id===current?.productId);
 const funnel=data?.main.funnels?.find(f=>f.id===current?.funnelId || f.contentItemIds?.includes(current?.id||-1));
 const publications=data?.publications.items.filter(p=>p.contentItemId===current?.id || p.parts.some(b=>b.contentItemId===current?.id))||[];
 const published=publications.some(p=>p.parts.some(b=>b.published&&(b.contentItemId===current?.id||p.contentItemId===current?.id)));
 const publishedBlocks=new Set(publications.flatMap(p=>p.parts.filter(b=>b.published&&b.contentItemId===current?.id).map(b=>b.blockId)));
 const variants=slot?.variantIds.map(i=>materials.find(m=>m.id===i)).filter((m):m is Material=>Boolean(m))||[];
 return <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent overlayClassName="bg-black/20" className="ed-detail">
  <div className="ed-detail-head"><span className="ed-badge">{current?formatLabel(current.platformId):'Материал'}</span><DialogTitle className="text-base leading-snug mt-2">{current?.title||'Загрузка материала…'}</DialogTitle><DialogDescription className="text-xs mt-1">{current?materialAction(data,current):'Общая карточка сценария'}</DialogDescription></div>
  <div className="ed-detail-body" onClickCapture={e=>{if(dirty&&(e.target as HTMLElement).closest('a')&&!window.confirm('Несохранённый черновик останется на этом устройстве. Перейти?')){e.preventDefault();e.stopPropagation();}}}>
   {!data?<p role="status">Загружаем…</p>:!current?<p>Материал не найден. <button className="text-primary" onClick={()=>void refresh()}>Обновить</button></p>:draft&&<>
    {slot&&<div className="mb-4"><p className="ed-note">{slot.selectedId===current.id?'Выбран для этого дня':slot.recommendedId===current.id?'Рекомендуемый вариант':'Альтернативный вариант'} · {dateLabel(slot.date)}</p>{slot.recommendedId===current.id&&slot.reason&&<p className="ed-note mt-1">{slot.reason}</p>}
     {variants.length>1&&<details className="ed-details"><summary>Другие варианты — {variants.length-1}</summary>{variants.filter(m=>m.id!==current.id).map(m=><button className="ed-row" key={m.id} onClick={()=>choose(m.id)}><span>{m.title}<small>{m.id===slot.selectedId?'Выбран':m.id===slot.recommendedId?'Рекомендуем':'Альтернатива'}</small></span></button>)}</details>}
    </div>}
    {['reels','carousel'].includes(current.platformId)&&<ReadyAssets assets={editing?draft.assets:current.assets} editing={editing} onChange={assets=>patch({assets})}/>}
    {published&&editing&&<p className="ed-note mb-3">Опубликованные экраны зафиксированы. Можно менять остальные экраны, ссылки и подготовку.</p>}
    {editing?<div>
     <label className="ed-label">Название<input className="ed-input" disabled={published&&!draft.blocks?.length} value={draft.title} onChange={e=>patch({title:e.target.value})}/></label>
     {draft.blocks?.length?<div>{draft.blocks.map((b,i)=><section key={b.id} className="ed-story"><fieldset disabled={publishedBlocks.has(b.id)}><legend className="ed-note">{publishedBlocks.has(b.id)?'Опубликовано · экран зафиксирован':''}</legend>
      <div className="flex items-center justify-between gap-2 mb-2"><label className="ed-label mb-0 flex-1">Экран {i+1}<input className="ed-input" value={b.label} onChange={e=>patchBlock(i,{label:e.target.value})}/></label>
       <Button variant="ghost" size="icon" aria-label={'Поднять экран '+(i+1)} disabled={i===0||publishedBlocks.has(draft.blocks![i-1]?.id)} onClick={()=>{const bs=[...draft.blocks!];[bs[i-1],bs[i]]=[bs[i],bs[i-1]];patchBlocks(bs);}}><ArrowUp size={15}/></Button>
       <Button variant="ghost" size="icon" aria-label={'Опустить экран '+(i+1)} disabled={i===draft.blocks!.length-1||publishedBlocks.has(draft.blocks![i+1]?.id)} onClick={()=>{const bs=[...draft.blocks!];[bs[i+1],bs[i]]=[bs[i],bs[i+1]];patchBlocks(bs);}}><ArrowDown size={15}/></Button>
      </div>
      <label className="ed-label">Текст<textarea className="ed-input min-h-28" value={b.text} onChange={e=>patchBlock(i,{text:e.target.value})}/></label>
      <label className="ed-label">Что показать<textarea className="ed-input" value={b.visual} onChange={e=>patchBlock(i,{visual:e.target.value})}/></label>
      <label className="ed-label">Графика и движение<textarea className="ed-input" value={b.motion} onChange={e=>patchBlock(i,{motion:e.target.value})}/></label>
      <Button variant="ghost" disabled={draft.blocks!.slice(i).some(x=>publishedBlocks.has(x.id))} onClick={()=>{if(window.confirm('Убрать этот экран из сценария?')){setRemoved(draft.blocks!);patchBlocks(draft.blocks!.filter(x=>x.id!==b.id));}}}>Удалить экран</Button></fieldset>
     </section>)}</div>:<label className="ed-label">Сценарий<textarea className="ed-input ed-script-editor" disabled={published} value={draft.body} onChange={e=>patch({body:e.target.value})}/></label>}
     {removed&&<Button variant="link" onClick={()=>{patchBlocks(removed);setRemoved(null);}}>Вернуть удалённый экран</Button>}
     {['stories','carousel'].includes(draft.platformId)&&<Button variant="outline" className="my-3" onClick={()=>patchBlocks([...(draft.blocks?.length?draft.blocks:draft.body?[{id:crypto.randomUUID(),label:'Экран 1',text:draft.body,visual:'',motion:''}]:[]),{id:crypto.randomUUID(),label:'Новый экран',text:'',visual:'',motion:''}])}><Plus size={15}/>Добавить экран</Button>}
     <details className="ed-details"><summary>Что показать и графика</summary><label className="ed-label">Кадр и демонстрация<textarea className="ed-input" value={draft.visual||''} onChange={e=>patch({visual:e.target.value})}/></label><label className="ed-label">Монтаж и движение<textarea className="ed-input" value={draft.motion||''} onChange={e=>patch({motion:e.target.value})}/></label></details>
     <details className="ed-details"><summary>Материалы и ссылки</summary><textarea aria-label="Материалы и ссылки" className="ed-input" value={draft.resources||''} onChange={e=>patch({resources:e.target.value})}/></details>
     <details className="ed-details"><summary>Куда ведёт</summary>
      <label className="ed-label">Призыв<textarea className="ed-input" value={draft.cta||''} onChange={e=>patch({cta:e.target.value})}/></label>
      <label className="ed-label">Продукт<select className="ed-input" value={draft.productId||''} onChange={e=>patch({productId:Number(e.target.value)||null})}><option value="">Без продукта</option>{data.main.products?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="ed-label">Воронка<select className="ed-input" value={draft.funnelId===null?'':draft.funnelId||funnel?.id||''} onChange={e=>patch({funnelId:e.target.value||null,replaceFunnelLinks:true})}><option value="">Без воронки</option>{data.main.funnels?.map(f=><option key={f.id} value={f.id}>{f.keyword} · {f.product}</option>)}</select></label>
      <label className="ed-label">Роль материала<select className="ed-input" value={draft.funnelRole||'entry'} onChange={e=>patch({funnelRole:e.target.value as Material['funnelRole']})}><option value="entry">Привлекает в воронку</option><option value="support">Раскрывает продукт</option><option value="delivery">Выдаёт материал</option></select></label>
     </details>
    </div>:<>
     {current.blocks?.length?current.blocks.map((b,i)=><section className="ed-story" key={b.id}><h3>{i+1}. {b.label}</h3><p className="ed-copy">{b.text||'Текст ещё не написан'}</p>{(b.visual||b.motion)&&<details className="ed-details"><summary>Кадр и моушн</summary>{b.visual&&<p className="ed-copy">{b.visual}</p>}{b.motion&&<p className="ed-copy mt-2">{b.motion}</p>}</details>}</section>):<p className="ed-copy">{current.body||'Здесь будет сценарий. Начни с текста или подготовь его с агентом.'}</p>}
     {(current.visual||current.motion)&&<details className="ed-details"><summary>Что показать · графика</summary><p className="ed-copy">{current.visual}</p><p className="ed-copy mt-2">{current.motion}</p></details>}
     {current.resources&&<details className="ed-details"><summary>Материалы и ссылки</summary><ResourceText text={current.resources}/></details>}
     <details className="ed-details"><summary>Куда ведёт</summary>{current.cta&&<p className="ed-copy">{current.cta}</p>}<div className="ed-path">{funnel&&<Link to={'/dashboard?funnel='+encodeURIComponent(funnel.id)}>{funnel.keyword} → воронка</Link>}{product&&<Link to={'/products?product='+product.id}>{product.name}</Link>}{!funnel&&!product&&<p className="ed-note">Продукт и воронка не выбраны.</p>}</div></details>
    </>}
    <details className="ed-details"><summary><CalendarDays className="inline mr-2" size={14}/>Дата и подготовка</summary>
     <label className="ed-label">День публикации<input type="date" className="ed-input" value={date} onChange={e=>setDate(e.target.value)}/></label>
     <Button variant="outline" disabled={busy||dirty||published} onClick={()=>void act('material.schedule',{id:current.id,date},date?'Добавлено в календарь':'Оставлено без даты')}>Сохранить дату</Button>
     {publications.map(p=><Link key={p.id} className="block text-xs text-primary py-3" to={'/calendar?date='+p.date+'&item='+p.id}>Открыть {dateLabel(p.date)} в календаре</Link>)}
     {<label className="ed-label mt-3">Подготовка<select className="ed-input" value={draft.status==='ready'?'ready':'in_progress'} onChange={e=>patch({status:e.target.value as Material['status']})}><option value="in_progress">Нужно подготовить</option><option value="ready">Готово к публикации</option></select></label>}
     <p className="ed-note">Утверждение сценария сохраняет текст. Отправка Threads включается отдельно в календаре.</p>
    </details>
    <details className="ed-details"><summary>Идея и адаптации</summary>{topic&&<Link className="text-sm text-primary" to={'/content?mode=ideas&idea='+topic.id}>{topic.title}</Link>}
     {current.adaptedFromId&&<button className="block text-xs text-primary py-3" onClick={()=>choose(current.adaptedFromId!)}>Открыть исходный материал</button>}
     <div className="flex gap-2 mt-3"><select aria-label="Формат адаптации" className="ed-input" value={adaptFormat} onChange={e=>setAdaptFormat(e.target.value)}>{FORMATS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select><Button variant="outline" disabled={busy||dirty} onClick={async()=>{const result=await act('material.create',{ideaId:topic?.id,platformId:adaptFormat,fromId:current.id},'Создан связанный черновик');if(result?.id){const n=new URLSearchParams(params);n.delete('slot');n.set('material',String(result.id));setParams(n,{replace:true});}}}>Создать черновик</Button></div>
     <p className="ed-note mt-2">Создаётся пустой связанный черновик. Напиши сценарий для нового формата; исходная идея сохранится.</p>
    </details>
    <details className="ed-details"><summary>Результаты публикации</summary><p className="ed-note mb-3">Заполняются вручную после выхода.</p>{([['reach','Охват'],['responses','Отклики на кодовое слово'],['leads','Заявки'],['sales','Продажи']] as const).map(([key,label])=><label className="ed-label" key={key}>{label}<input type="number" min="0" step="1" className="ed-input" value={draft.metrics?.[key]??''} onChange={e=>patch({metrics:{...draft.metrics,[key]:e.target.value===''?undefined:Number(e.target.value)}})}/></label>)}<label className="ed-label">Дата выхода<input type="date" className="ed-input" value={draft.metrics?.publishedDate||''} onChange={e=>patch({metrics:{...draft.metrics,publishedDate:e.target.value}})}/></label><label className="ed-label">Ссылка на опубликованный пост<input type="url" className="ed-input" value={draft.metrics?.url||''} onChange={e=>patch({metrics:{...draft.metrics,url:e.target.value}})}/></label><p className="ed-note">Нажми «Сохранить изменения» внизу карточки.</p></details>
    {!!current.history?.length&&<details className="ed-details"><summary>История текста — {current.history.length}</summary>{[...current.history].reverse().map((v,i)=><details className="ed-details" key={i}><summary>Версия {v.revision} · {new Date(v.savedAt).toLocaleDateString('ru')}</summary><p className="ed-copy">{v.body}</p>{v.blocks?.map(b=><p className="ed-copy mt-2" key={b.id}>{b.label}: {b.visual} · {b.motion}</p>)}<ResourceText text={[v.visual,v.motion,v.resources].filter(Boolean).join('\n')}/><Button variant="outline" disabled={busy} onClick={()=>{patch({title:v.title,body:v.body,blocks:v.blocks,visual:v.visual,motion:v.motion,resources:v.resources,assets:v.assets,cta:v.cta});setEditing(true);setNotice('Версия открыта для проверки. Сохрани её, чтобы применить.');}}>Восстановить в редактор</Button></details>)}</details>}
   </>}
   {notice&&<p role="status" className="ed-note mt-3">{notice}</p>}
   {error&&<div role="alert" className="ed-error">{error}{dirty&&current&&<details className="mt-2"><summary>Текущая версия с сервера</summary><p className="ed-copy">{current.body}</p><Button variant="outline" disabled={busy} onClick={async()=>{const r=await act('material.fork',draft,'Твоя версия сохранена отдельным черновиком');if(r?.id){clearDraft(recoveryKey);base.current=JSON.stringify(draft);const n=new URLSearchParams(params);n.delete('slot');n.set('material',String(r.id));setParams(n,{replace:true});}}}>Сохранить мою версию отдельно</Button></details>}<button className="block underline mt-2" onClick={()=>void refresh()}>Обновить список, сохранив мой текст</button></div>}
   {confirmClose&&<div className="ed-error" role="alert">Есть несохранённый текст.<div className="flex gap-2 mt-2"><Button variant="outline" onClick={()=>setConfirmClose(false)}>Продолжить</Button><Button variant="outline" onClick={()=>{clearDraft(recoveryKey);setDraft(null);setConfirmClose(false);const n=new URLSearchParams(params);n.delete('material');n.delete('slot');setParams(n,{replace:true});}}>Закрыть без сохранения</Button></div></div>}
  </div>
  {current&&<div className="ed-detail-footer">
   {dirty||editing?<Button disabled={busy} onClick={()=>void save()}>Сохранить изменения</Button>:<Button disabled={busy||!current.body?.trim()||(current.scriptApproval==='approved'&&(!slot||slot.selectedId===current.id))} onClick={()=>void act('material.approve',{id:current.id,slotId:slot?.id,revision:current.revision||1},'Сценарий утверждён')}>{current.scriptApproval==='approved'&&(!slot||slot.selectedId===current.id)?'Сценарий утверждён':'Утвердить сценарий'}</Button>}
   {!editing&&<Button variant="outline" onClick={()=>setEditing(true)}>Изменить</Button>}
   <Button variant="ghost" className="px-2" aria-label="Копировать сценарий" onClick={()=>void copy()}><Copy size={16}/></Button>
  </div>}
 </DialogContent></Dialog>;
}
