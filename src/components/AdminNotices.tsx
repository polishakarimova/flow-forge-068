import {useEffect,useState} from 'react';
import {adminDate} from '@/lib/admin';

type Notice = {id:string;title:string;name?:string;telegram_id?:string;inviter?:string;kind:string;route:string;reason:string;source_line?:number;method:string;status:number;occurrences:number;created_at:string;delivered_at?:string};

export function AdminNotices({eventId}:{eventId:string|null}) {
  const [selected,setSelected]=useState(eventId);
  const [items,setItems]=useState<Notice[]>([]);
  const [configured,setConfigured]=useState(false),[state,setState]=useState('loading'),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setState('loading'); setItems([]);
    void (async()=>{
      const response=await fetch('/api/admin/notices'+(selected?'?event='+encodeURIComponent(selected):''),{credentials:'include',signal:controller.signal});
      if (!response.ok) throw Error();
      const data=await response.json();
      if (!controller.signal.aborted) {setItems(data.items);setConfigured(data.configured);setState('ready');}
    })().catch(()=>{if(!controller.signal.aborted)setState('error');});
    return ()=>controller.abort();
  },[selected,revision]);
  return <section className="min-w-0 space-y-3 rounded-2xl border bg-card p-4" aria-label="Журнал уведомлений">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Уведомления бота</h2><button className="min-h-11 text-sm text-primary underline" onClick={()=>setRevision(v=>v+1)}>Обновить</button></div>
    {selected&&<button className="min-h-10 text-sm text-primary underline" onClick={()=>setSelected(null)}>Все события</button>}
    {state==='loading'&&<p role="status">Загружаем события…</p>}
    {state==='error'&&<p role="alert">Не удалось загрузить журнал. Проверьте административный вход и обновите список.</p>}
    {state==='ready'&&<><p className="text-xs text-muted-foreground">{configured?'Личный чат администратора подключён.':'Получатель уведомлений не настроен.'}</p>
      {!items.length&&<p className="text-sm">{selected?'Событие не найдено.':'Новых авторизаций и технических ошибок пока нет.'}</p>}
      <ul className="divide-y">{items.map(n=><li key={n.id} className="space-y-1 py-3 text-sm">
        <div className="font-medium">{n.title}</div><div>{n.name|| (n.kind==='worker'?'Фоновая задача':'Аккаунт не определён')}{n.telegram_id&&' · Telegram ID '+n.telegram_id}</div>
        {n.inviter&&<div>Пригласил(а) {n.inviter}</div>}
        {Boolean(n.source_line)&&<div>Модуль приложения, строка {n.source_line}</div>}
        {n.route&&<div className="break-words">{[n.method,n.route,n.status||'',n.reason].filter(Boolean).join(' · ')}</div>}
        <div className="text-xs text-muted-foreground">{adminDate(n.created_at,true)} · {n.delivered_at?'Доставлено':'Ожидает отправки'}{n.occurrences>1&&' · Повторов: '+n.occurrences}</div>
      </li>)}</ul></>}
  </section>;
}
