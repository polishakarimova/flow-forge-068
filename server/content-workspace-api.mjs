import { readWorkspace, updateWorkspace } from './content-workspace.mjs';
export async function contentWorkspaceApi(req,res,{user,pool,body,send}) {
 if(!user)return send(res,401,{message:'Войдите через Telegram.'});
 try{
  if(req.method==='GET'){
   const snapshot=await readWorkspace(pool,user.id),tag=snapshot.revisions.main+':'+snapshot.revisions.publications;
   if(req.headers?.['if-none-match']===tag){res.writeHead(304,{'Cache-Control':'private, no-cache','ETag':tag});res.end();return;}
   res.setHeader('ETag',tag);res.setHeader('Cache-Control','private, no-cache');return send(res,200,snapshot);
  }
  if(req.method==='POST') {
   const command=await body(req);
   const saved=await updateWorkspace(pool,user.id,command);
   return send(res,200,{...saved,revision:command.type==='main.replace'?saved.revisions.main:command.type==='publications.replace'?saved.revisions.publications:undefined});
  }
  return send(res,405,{message:'Метод не поддерживается.'});
 }catch(error){return send(res,error.status||500,{message:error.status?error.message:'Не удалось сохранить материалы.'});}
}
