import {createHash, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
const hash = value => createHash('sha256').update(value).digest('hex');
const failure = (message, status=400) => Object.assign(new Error(message), {status});

export function loadLegalManifest(base=new URL('../public/',import.meta.url)) {
  const manifest=JSON.parse(readFileSync(new URL('legal/manifest.json',base),'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.version) || manifest.documents?.length!==4) throw Error('invalid_legal_manifest');
  for (const id of ['terms','privacy','personal-data','advertising']) {
    const doc=manifest.documents.find(d=>d.id===id);
    if(!doc || doc.href!==`/legal/${manifest.version}/${id}.html` || doc.pdf!==`/legal/${manifest.version}/${id}.pdf` || !/^[a-f0-9]{64}$/.test(doc.sha256)) throw Error('invalid_legal_document');
    if(hash(readFileSync(new URL(doc.href.slice(1),base)))!==doc.sha256) throw Error('legal_document_hash_mismatch:'+id);
  }
  return {...manifest, manifestHash:hash(JSON.stringify(manifest))};
}
export const legalManifest=loadLegalManifest();

export async function ensureLegalSchema(pool) {
  await pool.query(`create table if not exists cm_legal_state (
    user_id text primary key, version text not null, manifest_hash text not null,
    terms boolean not null, personal_data boolean not null, advertising boolean not null,
    accepted_at timestamptz not null, updated_at timestamptz not null, sequence integer not null,
    check (not advertising or personal_data)
  );
  create table if not exists cm_legal_events (
    id text primary key, user_id text not null, sequence integer not null,
    action text not null check (action in ('accept','preferences','withdraw')),
    version text not null, manifest_hash text not null, documents jsonb not null,
    terms boolean not null, personal_data boolean not null, advertising boolean not null,
    created_at timestamptz not null default clock_timestamp(), unique(user_id,sequence)
  );create index if not exists cm_legal_events_user_idx on cm_legal_events(user_id,sequence);`);
}
export const isLegalCurrent = (state, manifest=legalManifest) => Boolean(state?.terms && state.version===manifest.version && state.manifest_hash===manifest.manifestHash);
export async function legalState(pool,userId) {
  if(!userId) return null;
  return (await pool.query('select * from cm_legal_state where user_id=$1',[userId])).rows[0]||null;
}
export function legalStatus(state,manifest=legalManifest) {
  const accepted=isLegalCurrent(state,manifest);
  return {...manifest, accepted, personalData:accepted&&state.personal_data===true, advertising:accepted&&state.advertising===true,
    acceptedAt:state?.accepted_at||null, updatedAt:state?.updated_at||null};
}
export async function requireLegal(pool,userId) {
  if(!isLegalCurrent(await legalState(pool,userId))) throw failure('Откройте Карту контента и подтвердите актуальные условия сервиса.',428);
}
export function validateLegalChoice(input,manifest=legalManifest) {
  if(input?.version!==manifest.version || input.manifestHash!==manifest.manifestHash) throw failure('Документы обновились. Проверьте новую редакцию.',409);
  if(input.terms!==true) throw failure('Для продолжения примите условия сервиса.');
  if(typeof input.personalData!=='boolean'||typeof input.advertising!=='boolean') throw failure('Подтвердите отдельный выбор для каждого согласия.');
  if(input.advertising&&!input.personalData) throw failure('Для рассылки требуется отдельное согласие на обработку данных.');
  return {terms:true,personalData:input.personalData,advertising:input.advertising};
}

export async function saveLegalChoice(pool,userId,input,{action='accept',manifest=legalManifest}={}) {
  // Identity comes only from the verified session, never from the submitted form.
  const choice=action==='withdraw'?null:validateLegalChoice(input,manifest);
  const client=await pool.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['legal:'+userId]);
    const previous=await legalState(client,userId);
    if(action==='withdraw'&&!previous){await client.query('commit');return legalStatus(null,manifest);}
    if(action==='preferences'&&!isLegalCurrent(previous,manifest)) throw failure('Сначала подтвердите актуальные условия сервиса.',428);
    const next=action==='withdraw'?{...previous,personal_data:false,advertising:false}:{
      ...previous,version:manifest.version,manifest_hash:manifest.manifestHash,terms:true,
      personal_data:choice.personalData,advertising:choice.advertising};
    if(previous&&['version','manifest_hash','terms','personal_data','advertising'].every(k=>previous[k]===next[k])) {
      await client.query('commit');return legalStatus(previous,manifest);
    }
    const at=new Date().toISOString(),sequence=(previous?.sequence||0)+1;
    const acceptedAt=action==='withdraw'||isLegalCurrent(previous,manifest)?previous.accepted_at:at;
    const documents=action==='withdraw'?(await client.query('select documents from cm_legal_events where user_id=$1 order by sequence desc limit 1',[userId])).rows[0]?.documents||[]:manifest.documents;
    await client.query(`insert into cm_legal_events(id,user_id,sequence,action,version,manifest_hash,documents,terms,personal_data,advertising,created_at)
      values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)`,
      [randomUUID(),userId,sequence,action,next.version,next.manifest_hash,JSON.stringify(documents),next.terms,next.personal_data,next.advertising,at]);
    await client.query(`insert into cm_legal_state(user_id,version,manifest_hash,terms,personal_data,advertising,accepted_at,updated_at,sequence)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(user_id) do update set
      version=excluded.version,manifest_hash=excluded.manifest_hash,terms=excluded.terms,personal_data=excluded.personal_data,
      advertising=excluded.advertising,accepted_at=excluded.accepted_at,updated_at=excluded.updated_at,sequence=excluded.sequence`,
      [userId,next.version,next.manifest_hash,next.terms,next.personal_data,next.advertising,acceptedAt,at,sequence]);
    await client.query('commit');return legalStatus({...next,accepted_at:acceptedAt,updated_at:at},manifest);
  } catch(error) {await client.query('rollback');throw error;} finally {client.release();}
}

// Every future promotional sender must check this immediately before delivery.
// No broadcast or promotional queue is enabled by collecting the preference.
export async function canSendMarketing(pool,userId) {
  const state=await legalState(pool,userId);
  return isLegalCurrent(state)&&state.personal_data===true&&state.advertising===true;
}

export async function legalApi(req,res,{path,pool,send,readBody,getUser}) {
  if(path==='/api/legal'&&req.method==='GET')return send(res,200,legalManifest);
  if(!['/api/legal/status','/api/legal/accept','/api/legal/preferences','/api/legal/withdraw'].includes(path))return send(res,404,{message:'Страница не найдена.'});
  const user=await getUser();if(!user)return send(res,401,{error:'unauthorized'});
  if(path==='/api/legal/status')return req.method==='GET'?send(res,200,legalStatus(await legalState(pool,user.id))):send(res,405,{message:'Используйте GET.'});
  if(req.method!=='POST')return send(res,405,{message:'Используйте POST.'});
  try {
    const action=path.split('/').at(-1);
    const input=await readBody(req);
    return send(res,200,await saveLegalChoice(pool,user.id,input,{action}));
  }catch(error){return send(res,error.status||503,{message:error.status?error.message:'Не удалось сохранить выбор. Попробуйте ещё раз.'});}
}
