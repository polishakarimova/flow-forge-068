// Device-local recovery only; server remains the source of saved project data.
export function draftKey(user:string,kind:string,id:string|number){return `content-map:recovery:${user}:${kind}:${id}`;}
export function readDraft<T>(key:string):T|null {try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export function writeDraft(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function clearDraft(key:string){try{localStorage.removeItem(key);}catch{/* Optional recovery. */}}
