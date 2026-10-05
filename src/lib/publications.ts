export const publicationFormats = ['Рилс', 'Карусель', 'Пост ТГ', 'Сторис', 'Threads', 'YouTube', 'Пост Инста', 'Статья', 'ВК'] as const;
export type PublicationFormat = typeof publicationFormats[number];
export type PublicationPart = { id: string; text: string; published: boolean; contentItemId?: number; blockId?: string; scheduledAt?: string; approvalStatus?: 'draft' | 'approved'; sourceText?: string; incomingText?: string; previousText?: string };
export type Publication = { id: string; date: string; format: PublicationFormat; title: string; parts: PublicationPart[]; contentItemId?: number; slotId?: string };
export type PublicationState = { schema: 1; items: Publication[] };
export const emptyPublications: PublicationState = { schema: 1, items: [] };
export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const uid = () => crypto.randomUUID();
export const kaliningradTime = (iso?: string) => iso ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Kaliningrad', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '';
export const scheduleInKaliningrad = (date: string, time: string) => `${date}T${time}:00+02:00`;
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayKey(new Date(`${value}T12:00:00`)) === value;
}
export function parsePublications(input: unknown): PublicationState {
  const data = input as PublicationState;
  if (!data || data.schema !== 1 || !Array.isArray(data.items) || data.items.length > 1000) throw new Error('Нужен файл календаря: schema: 1 и список items.');
  const ids = new Set<string>();
  const stories = new Set<string>();
  for (const item of data.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || !validDate(item.date) || !publicationFormats.includes(item.format) || typeof item.title !== 'string' || !Array.isArray(item.parts) || !item.parts.length || item.parts.length > 100) throw new Error('Проверьте даты, форматы и уникальные ID публикаций.');
    ids.add(item.id);
    if (item.format === 'Сторис') {
      if (stories.has(item.date)) throw new Error('На один день нужна одна общая серия сторис.');
      stories.add(item.date);
    }
    const parts = new Set<string>();
    for (const part of item.parts) {
      if (!part || typeof part.id !== 'string' || !part.id || parts.has(part.id) || typeof part.text !== 'string' || part.text.length > 50000 || (part.published !== undefined && typeof part.published !== 'boolean')) throw new Error('Проверьте текст и ID блоков публикации.');
      if (part.scheduledAt !== undefined && (typeof part.scheduledAt !== 'string' || Number.isNaN(Date.parse(part.scheduledAt)) || part.scheduledAt.slice(0, 10) !== item.date)) throw new Error('Проверьте время публикации.');
      if (part.approvalStatus !== undefined && !['draft', 'approved'].includes(part.approvalStatus)) throw new Error('Проверьте статус согласования.');
      for (const key of ['sourceText', 'incomingText', 'previousText'] as const) if (part[key] !== undefined && typeof part[key] !== 'string') throw new Error('Некорректная версия текста.');
      parts.add(part.id);
    }
  }
  return { schema: 1, items: data.items.map(i => ({ ...i, parts: i.parts.map(p => ({ ...p, published: p.published ?? false })) })) };
}
// Import is additive: absent publications and manually edited text are never removed.
export function mergePublications(current: PublicationState, incoming: PublicationState): PublicationState {
  const items = current.items.map(i => ({ ...i, parts: i.parts.map(p => ({ ...p })) }));
  for (const next of incoming.items) {
    const old = items.find(i => i.id === next.id);
    if (!old) { items.push({ ...next, parts: next.parts.map(p => ({ ...p, sourceText: p.text })) }); continue; }
    if (old.format !== next.format) throw new Error('У существующей публикации изменён формат. Используйте новый ID.');
    for (const part of next.parts) {
      const previous = old.parts.find(p => p.id === part.id);
      if (!previous) { old.parts.push({ ...part, sourceText: part.text }); continue; }
      if (previous.text === part.text || previous.sourceText === part.text) continue;
      if (previous.text === previous.sourceText) {
        previous.previousText = previous.text;
        previous.text = part.text;
        previous.sourceText = part.text;
        previous.approvalStatus = 'draft';
      } else previous.incomingText = part.text;
    }
  }
  return parsePublications({ schema: 1, items });
}
export function movePublications(state: PublicationState, ids: string[], date: string): PublicationState {
  if (!validDate(date)) throw new Error('Выберите дату.');
  return parsePublications({ ...state, items: state.items.map(i => ids.includes(i.id) ? { ...i, date, parts: i.parts.map(p => ({ ...p, scheduledAt: p.scheduledAt ? scheduleInKaliningrad(date, kaliningradTime(p.scheduledAt)) : undefined, approvalStatus: p.approvalStatus ? 'draft' : undefined })) } : i) });
}
