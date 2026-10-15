// A home redesign only needs to move its data-tour anchors.
export const TOUR_STEPS: { title: string; description: string; target?: string; action?: string }[] = [
  { title: 'Добро пожаловать\nв «Карту контента»', description: 'Покажем, где планировать контент и как связать его с продуктами.', action: 'Пройти экскурсию' },
  { title: 'Главное на сегодня', description: 'Здесь фокус недели и публикации на сегодня. Можно быстро записать идею или добавить публикацию.', target: 'home' },
  { title: 'От идеи до готового поста', description: 'Во вкладке «Контент» хранятся идеи, сценарии и готовые материалы. Здесь же собирается план на неделю.', target: 'content' },
  { title: 'Всё по датам', description: 'В «Календаре» планируй публикации, открывай нужные тексты и отмечай, что уже вышло.', target: 'calendar' },
  { title: 'Как контент ведёт к продаже', description: 'В «Продуктах» собери предложения. В «Воронках» свяжи контент, кодовые слова и продукты. «Карта» покажет все связи целиком.', target: 'sales' },
  { title: 'Основа твоего блога', description: 'В «Моём контексте» сохрани информацию о себе, аудитории и примеры. Эта фактура поможет готовить контент под твои задачи.', target: 'context' },
  { title: 'Твой профиль', description: 'Здесь можно подключить своего ИИ-агента и снова открыть обучение, когда захочется освежить в памяти разделы.', target: 'profile' },
  { title: 'Можно начинать', description: 'Запиши первую идею или добавь продукт. К экскурсии всегда можно вернуться через «Обучение» в профиле.', action: 'Начнём!' },
];

const completed = new Set<string>();
const key = (userId: string) => `karta-home-tour:v1:${userId}`;
export function isTourCompleted(userId: string): boolean {
  if (completed.has(userId)) return true;
  try { return localStorage.getItem(key(userId)) === 'true'; } catch { return false; }
}
export function completeTour(userId: string) {
  completed.add(userId);
  try { localStorage.setItem(key(userId), 'true'); } catch { /* Optional device memory. */ }
}

export interface TourRect { x: number; y: number; width: number; height: number }
export function placeTourNote(viewport: TourRect, note: { width: number; height: number }, target: TourRect | null) {
  const margin = 14;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
  const minX = viewport.x + margin, maxX = viewport.x + viewport.width - note.width - margin;
  const minY = viewport.y + margin, maxY = viewport.y + viewport.height - note.height - margin;
  let left = viewport.x + (viewport.width - note.width) / 2;
  let top = viewport.y + (viewport.height - note.height) / 2;
  if (target) {
    left = target.x + target.width / 2 - note.width / 2;
    const below = viewport.y + viewport.height - (target.y + target.height);
    const above = target.y - viewport.y;
    if (below >= note.height + 65 || below >= above) top = target.y + target.height + 54;
    else top = target.y - note.height - 54;
    if (below < note.height + 30 && above < note.height + 30 && viewport.x + viewport.width - (target.x + target.width) >= note.width + 50) {
      left = target.x + target.width + 48;
      top = target.y + (target.height - note.height) / 2;
    }
  }
  return { left: clamp(left, minX, maxX), top: clamp(top, minY, maxY) };
}
