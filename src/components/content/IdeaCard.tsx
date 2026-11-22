import { CardSurface } from './CardSurface';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, FileText, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/authContext';
import { useEditorial } from '@/lib/editorialContext';
import { FORMATS, formatLabel, type Idea } from '@/lib/editorial';
import { clearDraft, draftKey, readDraft, writeDraft } from '@/lib/editorialDrafts';
import { useCardNavigation, useTelegramCardBack } from '@/lib/editorialNavigation';
import { toast } from 'sonner';

export function IdeaCard({ id }: { id: string | null }) {
  const { user } = useAuth();
  const { data, error: loadError, refresh, command, busy } = useEditorial();
  const cards = useCardNavigation();
  const [params] = useSearchParams();
  const format = params.get('format');
  const savedIdea = id ? data?.main.topics?.find(idea => String(idea.id) === id) : undefined;
  const key = draftKey(user?.id || '', 'idea', id || 'new');
  const [recovery] = useState(() => readDraft<Partial<Idea>>(key));
  const [changes, setChanges] = useState<Partial<Idea> | null>(recovery);
  const [editing, setEditing] = useState(!id || Boolean(recovery));
  const [error, setError] = useState('');
  const [adaptFormat, setAdaptFormat] = useState(format && format !== 'all' ? format : 'reels');
  const draft: Partial<Idea> = changes || savedIdea || { title: '', thesisPlan: '', formatIds: format && format !== 'all' ? [format] : [] };
  const dirty = Boolean(changes);
  const available = !id || Boolean(savedIdea);

  function change(patch: Partial<Idea>) {
    const next = { ...draft, ...patch, revision: draft.revision || 1 };
    setChanges(next);
    if (!writeDraft(key, next)) setError('Не удалось сохранить черновик на устройстве. Сохрани идею перед выходом.');
  }

  function mayLeave() {
    return !busy && (!dirty || window.confirm('Закрыть идею? Черновик останется на этом устройстве.'));
  }

  function close() { if (mayLeave()) cards.close(); }
  useTelegramCardBack(close);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(input: Partial<Idea> = draft, message = 'Идея сохранена') {
    setError('');
    try {
      await command('idea.save', input);
      clearDraft(key);
      toast.success(message);
      cards.close();
    } catch (e) { setError((e as Error).message); }
  }

  async function createMaterial() {
    if (!savedIdea) return;
    setError('');
    try {
      if (changes) {
        await command('idea.save', changes);
        clearDraft(key);
        setChanges(null);
      }
      const result = await command('material.create', { ideaId: savedIdea.id, platformId: adaptFormat });
      if (result.id) cards.open({ material: result.id });
    } catch (e) { setError((e as Error).message); }
  }

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <CardSurface ready={available} className="ed-detail ed-idea" overlayClassName="bg-black/25">
      <div className="ed-detail-head">
        <span className="ed-badge"><Lightbulb size={13} />Идея</span>
        <DialogTitle>{id ? savedIdea?.title || 'Карточка идеи' : 'Новая идея'}</DialogTitle>
        <DialogDescription className="sr-only">Идея и адаптации</DialogDescription>
      </div>
      <div className="ed-detail-body">
        {!available ? <p role="status">{loadError || (data ? 'Идея не найдена.' : 'Загружаем идею…')} <button className="text-primary" onClick={() => void refresh()}>Обновить</button></p> : <>
          {recovery && changes && <p className="ed-note mb-3" role="status">Восстановлен черновик с этого устройства.</p>}
          {editing ? <>
          <label className="ed-label">Название<input className="ed-input" value={draft.title || ''} onChange={e => change({ title: e.target.value })} /></label>
          <label className="ed-label">Смысл и подача<textarea className="ed-input min-h-28" value={draft.thesisPlan || ''} onChange={e => change({ thesisPlan: e.target.value })} /></label>
          </> : <p className="ed-copy ed-idea-text">{draft.thesisPlan || 'Добавь смысл и подачу идеи.'}</p>}
          {savedIdea && <section className="ed-adaptations">
            <h3>Материалы из этой идеи</h3>
            {savedIdea.contentItems.map(m => <button className="ed-row" key={m.id} onClick={() => { if (mayLeave()) cards.open({ material: m.id }); }}>
              <FileText size={16} /><span className="flex-1 min-w-0">{m.title}<small>{formatLabel(m.platformId)}</small></span><ChevronRight size={16} />
            </button>)}
            <div className="flex flex-wrap gap-2 mt-2">
              <select aria-label="Формат нового материала" className="ed-input flex-1" value={adaptFormat} onChange={e => setAdaptFormat(e.target.value)}>{FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
              <Button variant="outline" disabled={busy} onClick={() => void createMaterial()}>Создать черновик</Button>
            </div>
          </section>}
          {editing && <details className="ed-details"><summary>Рубрики, форматы и продукт</summary>
            <label className="ed-label">Рубрики через запятую<input className="ed-input" value={(draft.tags || []).join(', ')} onChange={e => change({ tags: e.target.value.split(',').map(t => t.trimStart()) })} /></label>
            <fieldset className="mb-3"><legend className="ed-label">Подходит для</legend><div className="flex flex-wrap gap-2">
              {FORMATS.slice(0, 6).map(f => <button key={f.id} className="ed-format-choice" aria-pressed={draft.formatIds?.includes(f.id) || false} onClick={() => change({ formatIds: draft.formatIds?.includes(f.id) ? draft.formatIds.filter(id => id !== f.id) : [...(draft.formatIds || []), f.id] })}>{f.label}</button>)}
            </div></fieldset>
            <label className="ed-label">Продукт<select className="ed-input" value={draft.productId || ''} onChange={e => change({ productId: Number(e.target.value) || undefined })}><option value="">Не связан с продуктом</option>{data?.main.products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="ed-label">Источник / ссылка<input className="ed-input" value={draft.source || ''} onChange={e => change({ source: e.target.value })} /></label>
          </details>}
          {!editing && <div className="ed-idea-meta">
            {draft.tags?.length ? <p>Рубрики · {draft.tags.join(', ')}</p> : null}
            {draft.formatIds?.length ? <p>Форматы · {draft.formatIds.map(formatLabel).join(', ')}</p> : null}
            {draft.productId && <p>Продукт · {data?.main.products?.find(p => p.id === draft.productId)?.name}</p>}
            {draft.source && <p>Источник · {draft.source}</p>}
          </div>}
          {error && <div role="alert" className="ed-error">{error}{savedIdea && <Button variant="outline" disabled={busy} onClick={() => void save({ ...draft, id: undefined, revision: undefined, sourceKey: crypto.randomUUID(), title: draft.title + ' · моя копия' }, 'Копия идеи сохранена')}>Сохранить мою версию отдельной идеей</Button>}</div>}
        </>}
      </div>
      {available && <div className="ed-detail-footer">
        {editing ? <Button disabled={busy || !data} onClick={() => void save()}>Сохранить идею</Button> : <Button onClick={() => setEditing(true)}>Изменить идею</Button>}
        {savedIdea && <Button variant="ghost" disabled={busy} onClick={() => void save({ ...draft, archived: !draft.archived }, draft.archived ? 'Идея возвращена из архива' : 'Идея в архиве')}>{draft.archived ? 'Вернуть из архива' : 'В архив'}</Button>}
      </div>}
    </CardSurface>
  </Dialog>;
}
