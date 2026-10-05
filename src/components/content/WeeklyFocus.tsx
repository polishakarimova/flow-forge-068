import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Target,ChevronRight} from 'lucide-react';
import {useEditorial} from '@/lib/editorialContext';
import {weekStart,dateLabel, type Focus} from '@/lib/editorial';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function WeeklyFocus({date,compact=false,scope='day'}:{date:string;compact?:boolean;scope?:'day'|'week'}){
 const {data,command,busy,error:workspaceError}=useEditorial();
 const key=weekStart(date),weeks=data?.main.editorial?.weeks || {};
 const focus=(scope==='day'?weeks['day:'+date]:undefined) || weeks[key];
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Focus>({goal:''}),[error,setError]=useState('');
 const products=data?.main.products || [],funnels=data?.main.funnels || [];
 const product=products.find(p=>p.id===focus?.productId),funnel=funnels.find(f=>f.id===focus?.funnelId);
 if(workspaceError&&!data)return null;
 return <section className="ed-focus" aria-label="Фокус недели">
  <div className="flex gap-2 items-start"><Target size={17} className="text-primary mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><span className="text-xs text-muted-foreground">{focus?.scope==='day'?'Фокус дня':'Фокус недели'}</span><p className="text-sm font-medium break-words">{focus?.goal || 'Выбери главное направление недели'}</p>
   <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-primary">{product&&<Link to={'/products?product='+product.id}>{product.name}</Link>}{funnel&&<Link to={'/dashboard?funnel='+encodeURIComponent(funnel.id)}>{funnel.keyword} → воронка</Link>}</div></div>
   {<Button variant="ghost" size="sm" onClick={()=>{setDraft(focus || {goal:'',scope:'week'});setOpen(true);}}>Изменить</Button>}
  </div>{compact&&<Link to={'/content?week='+key} className="inline-flex items-center gap-1 text-xs text-primary mt-2 min-h-9">Открыть неделю<ChevronRight size={14}/></Link>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ed-small-dialog"><DialogTitle>Фокус</DialogTitle><DialogDescription>Что продвигаем и к чему ведём контент.</DialogDescription>
   <label className="ed-label">Период<select className="ed-input" value={draft.scope||'week'} onChange={e=>setDraft({...draft,scope:e.target.value as Focus['scope']})}><option value="week">Неделя</option>{scope==='day'&&<option value="day">{dateLabel(date)}</option>}</select></label>
   <label className="ed-label">Цель<input className="ed-input" value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value})}/></label>
   <label className="ed-label">Продукт<select className="ed-input" value={draft.productId||''} onChange={e=>setDraft({...draft,productId:Number(e.target.value)||undefined})}><option value="">Без продукта</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="ed-label">Воронка<select className="ed-input" value={draft.funnelId||''} onChange={e=>setDraft({...draft,funnelId:e.target.value||undefined})}><option value="">Без воронки</option>{funnels.map(f=><option key={f.id} value={f.id}>{f.keyword} · {f.product}</option>)}</select></label>
   {scope==='day'&&weeks['day:'+date]&&<Button variant="outline" disabled={busy} onClick={async()=>{try{await command('focus.save',{date,scope:'day',clear:true});setOpen(false);}catch(e){setError((e as Error).message);}}}>Использовать фокус недели</Button>}
   {error&&<p role="alert">{error}</p>}<Button disabled={busy} onClick={async()=>{try{await command('focus.save',{...draft,date:draft.scope==='day'?date:key});setOpen(false);}catch(e){setError((e as Error).message);}}}>Сохранить фокус</Button>
  </DialogContent></Dialog>
 </section>;
}
