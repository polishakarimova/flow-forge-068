import {useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,Check,ChevronRight,FileText,Loader2,ShieldCheck} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {Button} from '@/components/ui/button';
import {useLegal,type LegalDocument} from '@/lib/legalContext';
import {useAuth} from '@/lib/authContext';
import './legal.css';

function Reader({document,onClose}:{document:LegalDocument|null;onClose:()=>void}){
  return <Dialog open={!!document} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="legal-reader flex flex-col p-0 gap-0">
    <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-10 border-b"><DialogTitle className="text-base">{document?.title}</DialogTitle><DialogDescription className="text-xs">Редакция от 15 октября 2026 года</DialogDescription></DialogHeader>
    {document&&<iframe title={document.title} src={document.href} className="w-full flex-1 min-h-0 border-0 bg-white" />}
    <div className="shrink-0 border-t px-4 py-3 flex gap-3 items-center justify-between"><a className="text-xs text-primary underline min-h-10 inline-flex items-center" href={document?.pdf} target="_blank" rel="noopener noreferrer">Скачать PDF</a><Button variant="outline" className="rounded-xl min-h-10" onClick={onClose}>Вернуться</Button></div>
  </DialogContent></Dialog>;
}

export function LegalChoices({firstEntry=false,onSaved}:{firstEntry?:boolean;onSaved?:()=>void}){
  const {status,save}=useLegal();
  const [terms,setTerms]=useState(Boolean(status?.accepted)),[personalData,setPersonalData]=useState(Boolean(status?.personalData)),[advertising,setAdvertising]=useState(Boolean(status?.advertising));
  const [document,setDocument]=useState<LegalDocument|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  if(!status)return null;
  const docLink=(id:string,children:ReactNode)=>{const doc=status.documents.find(d=>d.id===id);return doc?<a className="text-primary underline underline-offset-2" href={doc.href} onClick={e=>{e.preventDefault();setDocument(doc);}}>{children}</a>:children;};
  async function submit(e:React.FormEvent){e.preventDefault();if(!terms||busy)return;setBusy(true);setError('');setSaved(false);
    try{await save({terms,personalData,advertising});setSaved(true);onSaved?.();}catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить выбор.');}finally{setBusy(false);}
  }
  return <><form onSubmit={submit} className="space-y-4">
    <div className="legal-choice"><Checkbox id="legal-terms" checked={terms} disabled={busy||(!firstEntry&&Boolean(status.accepted))} onCheckedChange={value=>{setTerms(value===true);setSaved(false);}} /><label htmlFor="legal-terms">Принимаю {docLink('terms','условия сервиса')}.<span className="block text-xs text-muted-foreground mt-1">{docLink('privacy','Политика обработки данных')} доступна до начала работы.</span></label></div>
    <div className="legal-choice"><Checkbox id="legal-personal-data" checked={personalData} disabled={busy} onCheckedChange={value=>{setPersonalData(value===true);if(value!==true)setAdvertising(false);setSaved(false);}} /><label htmlFor="legal-personal-data">Даю {docLink('personal-data','согласие на обработку данных для рассылки')}.</label></div>
    <div className="legal-choice"><Checkbox id="legal-advertising" checked={advertising} disabled={busy||!personalData} onCheckedChange={value=>{setAdvertising(value===true);setSaved(false);}} /><label htmlFor="legal-advertising">Хочу получать {docLink('advertising','специальные предложения, скидки и новости «Карты контента»')} в Telegram.</label></div>
    <p className="text-xs leading-relaxed text-muted-foreground">Рассылка добровольная. Её можно отключить в профиле.{!personalData&&' Для неё нужно отдельное согласие на обработку данных.'}</p>
    <Button type="submit" className="w-full rounded-xl min-h-11" disabled={!terms||busy}>{busy?<><Loader2 size={16} className="animate-spin" />Сохраняем…</>:firstEntry?'Продолжить':'Сохранить выбор'}</Button>
    {!terms&&<p className="text-xs text-muted-foreground">Чтобы продолжить, отметьте принятие условий сервиса.</p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved&&<p role="status" className="text-sm flex items-center gap-2"><Check size={16} className="text-primary" />Ваш выбор сохранён.</p>}
  </form><Reader document={document} onClose={()=>setDocument(null)} /></>;
}

export function LegalEntry(){
  const {status}=useLegal(),{logout}=useAuth();
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <div className="legal-entry"><section className="legal-entry-card" aria-labelledby="legal-title">
    <div className="flex items-center gap-2 text-xs font-medium text-primary mb-4"><ShieldCheck size={17} />Карта контента</div>
    <h1 id="legal-title" className="text-xl font-semibold tracking-tight">Перед началом работы</h1>
    <p className="mt-2 mb-5 text-sm text-muted-foreground leading-relaxed">Ознакомьтесь с документами и сохраните свой выбор.</p>
    <LegalChoices key={status?.manifestHash} firstEntry />
    <button disabled={busy} className="block mx-auto mt-4 min-h-10 px-3 text-xs text-muted-foreground underline disabled:opacity-50" onClick={async()=>{setBusy(true);try{await logout();}catch{setError('Не удалось выйти. Попробуйте ещё раз.');}finally{setBusy(false);}}}>{busy?'Выходим…':'Вернуться ко входу'}</button>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </section></div>;
}

export function LegalCentre(){
  const {status,loading,error,refresh,withdraw}=useLegal(),{isAuthenticated}=useAuth();
  const [document,setDocument]=useState<LegalDocument|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState('');
  return <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
    <Link to={isAuthenticated&&status?.accepted?'/profile':'/'} className="inline-flex gap-2 items-center min-h-11 text-sm text-muted-foreground"><ArrowLeft size={16} />{isAuthenticated&&status?.accepted?'В профиль':'К началу'}</Link>
    <h1 className="mt-4 text-xl font-semibold">Документы и согласия</h1><p className="text-sm text-muted-foreground mt-2 mb-5">Карта контента · редакция от 15 октября 2026 года</p>
    {loading&&<p role="status">Загружаем документы…</p>}
    {error&&<div role="alert" className="text-sm space-y-2"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>Повторить</Button></div>}
    <div className="divide-y border-y">{status?.documents.map(doc=><button key={doc.id} onClick={()=>setDocument(doc)} className="w-full flex items-center gap-3 min-h-14 py-3 text-left text-sm"><FileText size={17} className="text-primary shrink-0" /><span className="flex-1 min-w-0">{doc.title}</span><ChevronRight size={16} className="text-muted-foreground shrink-0" /></button>)}</div>
    {isAuthenticated&&status&&<section className="mt-7 max-w-md"><h2 className="text-base font-semibold mb-4">Ваш выбор</h2><LegalChoices key={`${status.manifestHash}:${status.updatedAt||'new'}`} firstEntry={!status.accepted} onSaved={()=>setMessage('Ваш выбор сохранён.')} />
      {status.acceptedAt&&<p className="text-xs text-muted-foreground mt-4">Условия подтверждены: {new Date(status.acceptedAt).toLocaleString('ru-RU')}. Версия: {status.version}.</p>}
      {(status.personalData||status.advertising)&&<Button disabled={busy} variant="outline" className="mt-4 min-h-11 rounded-xl" onClick={async()=>{setBusy(true);setFailure('');setMessage('');try{await withdraw();setMessage('Рассылка отключена. Картой можно пользоваться дальше.');}catch(e){setFailure(e instanceof Error?e.message:'Не удалось отключить рассылку.');}finally{setBusy(false);}}}>{busy?'Отключаем…':'Отключить рассылку'}</Button>}
      {message&&<p role="status" className="mt-3 text-sm">{message}</p>}{failure&&<p role="alert" className="mt-3 text-sm text-destructive">{failure}</p>}
    </section>}
    <p className="text-sm leading-relaxed text-muted-foreground mt-7">По вопросам обработки, выгрузки или удаления данных: <a href="mailto:karimovaip@inbox.ru" className="text-primary underline break-all">karimovaip@inbox.ru</a>.</p>
    <Reader document={document} onClose={()=>setDocument(null)} />
  </main>;
}
