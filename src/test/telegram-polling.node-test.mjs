import test from 'node:test';
import assert from 'node:assert/strict';
import { pollTelegramUpdates } from '../../server/telegram-polling.mjs';

test('polling advances offset only after successfully handling each update', async () => {
  const offsets = []; const handled = []; let failed = false; let stop = false;
  await pollTelegramUpdates({
    api: async (_, args) => { offsets.push(args.offset); if (offsets.length === 3) { stop = true; return []; } return [{update_id: 10}, {update_id: 11}].filter(u => u.update_id >= args.offset); },
    handleUpdate: async update => { if (update.update_id === 11 && !failed) { failed = true; throw new Error('temporary database error'); } handled.push(update.update_id); },
    shouldStop: () => stop, pause: async () => {}, onError: () => {},
  });
  assert.deepEqual(offsets, [0, 11, 12]);
  assert.deepEqual(handled, [10, 11]);
});
