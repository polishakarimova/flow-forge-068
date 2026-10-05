import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {Funnel} from '@/lib/funnelData';
import {useEditorial} from '@/lib/editorialContext';
import {formatLabel,linkedProductIds,dateLabel,weekStart,addDays,publicationProgress,type Material} from '@/lib/editorial';
import '@/pages/editorial.css';
import {FunnelRoute} from './FunnelRoute';

export function FunnelOverview({funnel}:{funnel:Funnel}){
 const {data}=useEditorial(),[period,setPeriod]=useState('all'),[status,setStatus]=useState('all');
 const materials=data?.main.topics?.flatMap(t=>t.contentItems)||[],products=data?.main.products||[];
 const ids=linkedProductIds(funnel),week=weekStart();
 const source=materials.filter(m=>m.funnelId===funnel.id||funnel.contentItemIds?.includes(m.id));
 const slots=data?.main.editorial?.slots||[];
 const dated=(m:Material)=>m.publishDate || slots.find(s=>s.selectedId===m.id)?.date || '';
 const alternatives=new Set(slots.flatMap(s=>s.variantIds.filter(id=>id!==s.selectedId)));
 const published=(m:Material)=>{const progress=publicationProgress(data,m);return progress.total?progress.total===progress.published:m.status==='published';};
 const filtered=source.filter(m=>(period==='all'||(dated(m)>=week&&dated(m)<=addDays(week,6)))&&(status==='all'||(status==='published'?published(m):status==='undated'?!dated(m):Boolean(dated(m))&&!published(m))));
 const entries=filtered.filter(m=>(m.funnelRole||'entry')==='entry'&&!alternatives.has(m.id)&&(Boolean(dated(m))||published(m)));
 const support=filtered.filter(m=>m.funnelRole==='support'||m.funnelRole==='delivery');
 const potential=filtered.filter(m=>alternatives.has(m.id)||(!dated(m)&&!published(m)&&(m.funnelRole||'entry')==='entry'));
 const grouped=[...new Set(entries.map(m=>m.platformId))];
 const row=(m:Material)=><Link className="ed-row" key={m.id} to={'/content?material='+m.id}><span className="flex-1 min-w-0 break-words">{m.title}<small>{dateLabel(dated(m))} · {published(m)?'Опубликовано':dated(m)?'В плане':'Черновик'}</small></span><span>→</span></Link>;
 if(!data)return null;
 return <div className="px-3 md:px-5 pb-4">
  <div className="ed-path" aria-label="Путь воронки"><Link to={'/dashboard?keyword='+encodeURIComponent(funnel.keyword)}>{funnel.keyword}</Link>{ids.map(id=>{const p=products.find(p=>p.id===id);return p?<span key={id} className="contents"><span aria-hidden="true">→</span><Link to={'/products?product='+id}>{p.name}</Link></span>:null;})}</div>
  <FunnelRoute funnel={funnel}/>
  <div className="ed-filters"><select aria-label="Период воронки" className="ed-input w-auto" value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">Все недели</option><option value="week">Эта неделя</option></select><select aria-label="Контент воронки" className="ed-input w-auto" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Все материалы</option><option value="planned">В плане</option><option value="published">Опубликовано</option><option value="undated">Без даты</option></select></div>
  <p className="text-xs font-medium mb-2">Что ведёт в эту воронку · {entries.length}</p>
  {grouped.map(format=><details key={format} className="ed-details"><summary>{formatLabel(format)} · {entries.filter(m=>m.platformId===format).length}</summary>{entries.filter(m=>m.platformId===format).map(row)}</details>)}
  {!entries.length&&<p className="ed-note">В выбранном периоде пока нет входящих публикаций.</p>}
  {!!support.length&&<details className="ed-details"><summary>Прогрев и выдача · {support.length}</summary>{support.map(row)}</details>}
  {!!potential.length&&<details className="ed-details"><summary>Можно подготовить · {potential.length}</summary>{potential.map(row)}</details>}
 </div>;
}

export function ProductRelations({productId}:{productId:number}){
 const {data}=useEditorial();
 const funnels=(data?.main.funnels||[]).filter(f=>linkedProductIds(f).includes(productId));
 const materials=(data?.main.topics||[]).flatMap(t=>t.contentItems).filter(m=>m.productId===productId||funnels.some(f=>m.funnelId===f.id||f.contentItemIds?.includes(m.id)));
 const ideas=(data?.main.topics||[]).filter(t=>t.productId===productId);
 if(!data)return null;
 return <section className="border-t border-border pt-3 mt-3"><h3 className="text-sm font-medium mb-2">Контент и воронки продукта</h3>
  {funnels.map(f=><Link className="block text-sm text-primary py-2" to={'/dashboard?funnel='+encodeURIComponent(f.id)} key={f.id}>{f.keyword} → {f.product}</Link>)}
  <details className="ed-details"><summary>Связанные материалы · {materials.length}</summary>{materials.map(m=><Link className="block text-sm text-primary py-2 break-words" key={m.id} to={'/content?material='+m.id}>{formatLabel(m.platformId)} · {m.title}</Link>)}</details>
  <details className="ed-details"><summary>Идеи · {ideas.length}</summary>{ideas.map(t=><Link className="block text-sm text-primary py-2" key={t.id} to={'/content?mode=ideas&idea='+t.id}>{t.title}</Link>)}</details>
 </section>;
}
