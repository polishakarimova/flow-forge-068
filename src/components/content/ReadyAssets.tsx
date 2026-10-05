import {Button} from '@/components/ui/button';
import type {Asset} from '@/lib/editorial';
import {safeUrl,assetDownload} from '@/lib/assetLinks';
export function ReadyAssets({assets=[],editing=false,onChange}:{assets?:Asset[];editing?:boolean;onChange?:(assets:Asset[])=>void}){
 const patch=(id:string,p:Partial<Asset>)=>onChange?.(assets.map(a=>a.id===id?{...a,...p}:a));
 return <section className="ed-assets"><h3 className="text-sm font-medium mb-2">Готовые файлы</h3>
 {!assets.length&&<p className="ed-note">Здесь будет готовое видео или карусель. Добавь ссылку на файл либо папку со слайдами.</p>}
 {assets.map(a=><div key={a.id} className="ed-asset">{editing?<>
 <label className="ed-label">Название<input className="ed-input" value={a.label} onChange={e=>patch(a.id,{label:e.target.value})}/></label>
 <label className="ed-label">Вид материала<select className="ed-input" value={a.kind} onChange={e=>patch(a.id,{kind:e.target.value as Asset['kind']})}><option value="video">Видео Reels</option><option value="carousel">Карусель / слайд</option><option value="folder">Папка со слайдами</option><option value="other">Другой файл</option></select></label>
 <label className="ed-label">Ссылка на Google Drive или другой сервис<input type="url" className="ed-input" value={a.url} onChange={e=>patch(a.id,{url:e.target.value})}/></label>
 <details className="ed-details"><summary>Отдельная ссылка для скачивания</summary><input aria-label="Прямая ссылка на скачивание" type="url" className="ed-input" value={a.downloadUrl||''} onChange={e=>patch(a.id,{downloadUrl:e.target.value})}/></details>
 <Button variant="ghost" onClick={()=>{if(window.confirm('Убрать ссылку из карточки? Сам файл останется в хранилище.'))onChange?.(assets.filter(x=>x.id!==a.id));}}>Убрать ссылку</Button>
 </>:<><strong className="text-sm break-words">{a.label}</strong><div className="flex flex-wrap gap-2 mt-2">{safeUrl(a.url)&&<a className="ed-link-button" href={safeUrl(a.url)} target="_blank" rel="noopener noreferrer">{a.kind==='folder'?'Открыть папку':'Открыть файл'} ↗</a>}{assetDownload(a)&&<a className="ed-link-button" href={assetDownload(a)} target="_blank" rel="noopener noreferrer">Скачать ↓</a>}</div></>}</div>)}
 {editing&&<Button variant="outline" className="mt-2" onClick={()=>onChange?.([...assets,{id:crypto.randomUUID(),label:'',url:'',kind:'video'}])}>Добавить ссылку</Button>}
 {!!assets.length&&<p className="ed-note mt-2">Файл открывается с твоими правами доступа. Для папки скачивание доступно в меню Google Drive; большой файл может потребовать подтверждения.</p>}
 </section>;
}
export function ResourceText({text}:{text:string}){return <p className="ed-copy">{text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>safeUrl(part)?<a key={i} className="text-primary underline" href={safeUrl(part)} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</p>;}
