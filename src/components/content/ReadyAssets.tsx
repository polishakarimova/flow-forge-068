import {Download,ExternalLink,Files} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import type {Asset} from '@/lib/editorial';
import {safeUrl,assetDownload} from '@/lib/assetLinks';
export function ReadyAssets({assets=[],onChange}:{assets?:Asset[];onChange:(assets:Asset[])=>void}){
 const patch=(id:string,p:Partial<Asset>)=>onChange(assets.map(a=>a.id===id?{...a,...p}:a));
 return <details className="ed-details"><summary>Готовые файлы{assets.length?` · ${assets.length}`:''}</summary>
 {assets.map(a=><div key={a.id} className="ed-asset">
 <label className="ed-label">Название<input className="ed-input" value={a.label} onChange={e=>patch(a.id,{label:e.target.value})}/></label>
 <label className="ed-label">Вид материала<select className="ed-input" value={a.kind} onChange={e=>patch(a.id,{kind:e.target.value as Asset['kind']})}><option value="video">Видео Reels</option><option value="carousel">Карусель / слайд</option><option value="folder">Папка со слайдами</option><option value="other">Другой файл</option></select></label>
 <label className="ed-label">Ссылка на Google Drive или другой сервис<input type="url" className="ed-input" value={a.url} onChange={e=>patch(a.id,{url:e.target.value})}/></label>
 <details className="ed-details"><summary>Отдельная ссылка для скачивания</summary><input aria-label="Прямая ссылка на скачивание" type="url" className="ed-input" value={a.downloadUrl||''} onChange={e=>patch(a.id,{downloadUrl:e.target.value})}/></details>
 <Button variant="ghost" onClick={()=>{if(window.confirm('Убрать ссылку из карточки? Сам файл останется в хранилище.'))onChange(assets.filter(x=>x.id!==a.id));}}>Убрать ссылку</Button>
 </div>)}
 <Button variant="outline" className="mt-2" onClick={()=>onChange([...assets,{id:crypto.randomUUID(),label:'',url:'',kind:'video'}])}>Добавить ссылку</Button>
 </details>;
}
export function ReadyAssetActions({assets=[]}:{assets?:Asset[]}){
 const files=assets.map(a=>({asset:a,download:assetDownload(a),open:safeUrl(a.url)})).filter(a=>a.download||a.open);
 if(!files.length)return null;
 if(files.length===1){
  const {asset,download,open}=files[0];
  const label=download?'Скачать':asset.kind==='folder'?'Открыть папку':'Открыть файл';
  return <Button asChild variant="outline" className="ed-download-action"><a href={download||open} target="_blank" rel="noopener noreferrer" aria-label={label} title={label+(asset.label?' · '+asset.label:'')}>{download?<Download size={16}/>:<ExternalLink size={16}/>}<span>{label}</span></a></Button>;
 }
 return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="ed-download-action" aria-label="Готовые файлы" title="Готовые файлы"><Files size={16}/><span>Файлы</span></Button></DropdownMenuTrigger>
 <DropdownMenuContent side="top" align="end" className="ed-download-menu">{files.map(({asset,download,open},i)=><div key={asset.id}><p className="px-2 pt-2 text-xs text-muted-foreground break-words">{asset.label||`Файл ${i+1}`}</p>{download&&<DropdownMenuItem asChild><a href={download} target="_blank" rel="noopener noreferrer"><Download size={16}/>Скачать</a></DropdownMenuItem>}{open&&<DropdownMenuItem asChild><a href={open} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{asset.kind==='folder'?'Открыть папку':'Открыть файл'}</a></DropdownMenuItem>}</div>)}</DropdownMenuContent>
 </DropdownMenu>;
}
export function ResourceText({text}:{text:string}){return <p className="ed-copy">{text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>safeUrl(part)?<a key={i} className="text-primary underline" href={safeUrl(part)} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</p>;}
