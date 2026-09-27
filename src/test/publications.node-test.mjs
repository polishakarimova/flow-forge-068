import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePublications, mergePublications, movePublications } from '../lib/publications.ts';
const story = (id = 'stories', date = '2026-09-28', text = 'Текст') => ({ id, date, title: 'Разбор', format: 'Сторис', parts: [{ id: 'p1', text, published: false, sourceText: 'Текст' }] });
const state = (...items) => ({ schema: 1, items });
test('all five publication formats are accepted', () => {
  const items = ['Рилс', 'Карусель', 'Пост ТГ', 'Сторис', 'Threads'].map((format, i) => ({ ...story(String(i)), format }));
  assert.equal(parsePublications(state(...items)).items.length, 5);
});
test('invalid dates and duplicate IDs are rejected', () => {
  assert.throws(() => parsePublications(state(story('s', '2026-02-30'))));
  assert.throws(() => parsePublications(state(story(), story())));
});
test('only one story series on a date', () => {
  assert.throws(() => parsePublications(state(story('a'), story('b'))));
});
test('imports protect manual edits and published flags', () => {
  const edited = story('s', '2026-09-28', 'Мой текст'); edited.parts[0].published = true;
  const result = mergePublications(state(edited), state(story('s', '2026-09-28', 'Новый вариант')));
  assert.equal(result.items[0].parts[0].text, 'Мой текст');
  assert.equal(result.items[0].parts[0].incomingText, 'Новый вариант');
  assert.equal(result.items[0].parts[0].published, true);
});
test('unchanged source never overwrites a manual edit', () => {
  const result = mergePublications(state(story('s', '2026-09-28', 'Мой текст')), state(story('s')));
  assert.equal(result.items[0].parts[0].text, 'Мой текст');
  assert.equal(result.items[0].parts[0].incomingText, undefined);
});
test('clean source updates retain undo and dates', () => {
  const result = mergePublications(state(story('s')), state(story('s', '2026-10-01', 'Новая версия')));
  assert.equal(result.items[0].parts[0].text, 'Новая версия');
  assert.equal(result.items[0].parts[0].previousText, 'Текст');
  assert.equal(result.items[0].date, '2026-09-28');
});
test('additive import leaves unrelated publications and parts intact', () => {
  const old = story('a'); old.parts.push({ id: 'p2', text: 'Не удалять', published: false });
  const result = mergePublications(state(old, story('b', '2026-09-29')), state(story('a')));
  assert.equal(result.items.length, 2); assert.equal(result.items[0].parts.length, 2);
});
test('move crosses months and preserves existing destination content', () => {
  const post = { ...story('b', '2026-10-01'), format: 'Пост ТГ' };
  const result = movePublications(state(story('a'), post), ['a'], '2026-10-01');
  assert.equal(result.items.length, 2); assert.equal(result.items[0].date, '2026-10-01'); assert.deepEqual(result.items[1], post);
});
test('moving into another story series does not overwrite it', () => {
  const original = state(story('a'), story('b', '2026-10-01'));
  assert.throws(() => movePublications(original, ['a'], '2026-10-01'));
  assert.equal(original.items[0].date, '2026-09-28');
});
