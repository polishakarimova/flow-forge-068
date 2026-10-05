import type { Topic, ContentItemData } from './contentData';
import type { Product } from './productData';
import type { Funnel } from './funnelData';
import type { PublicationState } from './publications';
export type StoryBlock = { id: string; label: string; text: string; visual: string; motion: string };
export type Asset = {id:string;label:string;url:string;kind:'video'|'carousel'|'folder'|'other';downloadUrl?:string};
export type Material = ContentItemData & {
  blocks?: StoryBlock[]; visual?: string; motion?: string; resources?: string; cta?: string;
  productId?: number; funnelId?: string; funnelRole?: 'entry' | 'support' | 'delivery';
  revision?: number; scriptApproval?: 'draft' | 'approved'; approvedRevision?: number; adaptedFromId?: number;
  assets?:Asset[]; replaceFunnelLinks?:boolean; metrics?:{reach?:number;responses?:number;leads?:number;sales?:number;publishedDate?:string;url?:string};
  history?: (Partial<Omit<Material,'history'>> & { title: string; body: string; savedAt: string; revision: number })[];
};
export type Idea = Omit<Topic,'contentItems'> & { contentItems: Material[]; revision?:number; archived?:boolean; tags?:string[]; formatIds?: string[]; source?: string; sourceKey?: string; createdDate?: string; productId?: number };
export type PlanSlot = { id:string; title:string; date:string; variantIds:number[]; recommendedId?:number; selectedId?:number; reason?:string };
export type Focus = { goal:string; productId?:number; funnelId?:string; scope?:'week'|'day' };
export type Editorial = { weeks: Record<string,Focus>; slots: PlanSlot[] };
export type Workspace = {
  main: { topics?: Idea[]; products?:Product[]; funnels?:Funnel[]; editorial?: Editorial };
  publications: PublicationState; revisions: {main:string;publications:string};
};
export const FORMATS = [
  {id:'reels',label:'Reels'}, {id:'stories',label:'Сторис'}, {id:'carousel',label:'Карусели'}, {id:'tg_post',label:'Telegram'}, {id:'threads',label:'Threads'}, {id:'youtube',label:'YouTube'},
  {id:'ig_post',label:'Пост Инста'},{id:'article',label:'Статьи'},{id:'vk',label:'ВК'}
];
export const formatLabel = (id:string) => FORMATS.find(f=>f.id===id)?.label || id;
export const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kaliningrad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function addDays(key:string, n:number) { const d=new Date(key+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export function weekStart(key= todayKey()) { const d = new Date(key+'T12:00:00Z'); return addDays(key,-((d.getUTCDay()+6)%7)); }
export const dateLabel = (key:string) => key ? new Date(key+'T12:00:00Z').toLocaleDateString('ru',{day:'numeric',month:'short',weekday:'short', timeZone:'Europe/Kaliningrad'}) : 'Пока без даты';
export const materialLink = (id:number,base='/content') => base+'?material='+id;
export function nextAction(m:Material) {
  if(m.status==='published') return 'Опубликовано';
  if(m.scriptApproval!=='approved') return m.body?.trim() ? 'Проверить сценарий' : 'Написать сценарий';
  if(m.status==='ready') return 'Проверить перед публикацией';
  return ['reels','youtube'].includes(m.platformId) ? 'Снять видео' : ['carousel','stories'].includes(m.platformId) ? 'Подготовить графику' : 'Подготовить к публикации';
}
export function linkedProductIds(f:Funnel) { return [f.leadMagnetId,f.tripwireId,f.midTicketId,f.flagshipId,f.consultationId].filter((x):x is number=>x!==undefined); }


export function publicationProgress(data:Workspace|null,material:Material) {
 const parts=(data?.publications.items||[]).flatMap(p=>p.parts.filter(b=>b.contentItemId===material.id||p.contentItemId===material.id));
 return {total:parts.length,published:parts.filter(b=>b.published).length};
}
export function materialAction(data:Workspace|null,material:Material) {
 const progress=publicationProgress(data,material);
 if(progress.total&&progress.published===progress.total)return 'Опубликовано';
 if(progress.published)return `Опубликовано ${progress.published}/${progress.total} · ${material.scriptApproval==='approved'?'Продолжить публикацию':'Проверить оставшиеся экраны'}`;
 return nextAction(material);
}
