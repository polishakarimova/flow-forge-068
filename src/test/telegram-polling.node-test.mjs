import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramSetup, pollTelegramUpdates, processTelegramUpdate, telegramErrorCode } from '../../server/telegram-polling.mjs';

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


test('temporary setup failure schedules recovery and concurrent callers share the attempt', async () => {
  let attempts = 0, errors = 0, callback, delay;
  const setup = createTelegramSetup(async () => {
    attempts++;
    if (attempts === 1) throw Object.assign(new Error('Telegram busy'), {retryAfter:12});
  }, {
    onError() { errors++; },
    schedule(action, ms) { callback = action; delay = ms; }
  });
  const first = setup();
  assert.equal(first, setup());
  await assert.rejects(first, {status:503});
  await assert.rejects(setup(), {status:503});
  assert.equal(attempts, 1);
  assert.equal(delay, 12000);
  callback();
  await setup();
  assert.equal(attempts, 2);
  assert.equal(errors, 1);
});

test('unavailable chat is acknowledged, transient button delivery preserves chat order and other chats progress', async () => {
  const updates = [10,11,12,13].map((update_id,i) => ({update_id,message:{chat:{id:[1,1,2,3][i]}}}));
  const offsets = [], sent = [], missing = [], waits = [];
  let failed = false, stop = false;
  await pollTelegramUpdates({
    async api(_, {offset}) {
      offsets.push(offset);
      if (offset === 14) stop = true;
      return updates.filter(update => update.update_id >= offset);
    },
    handleUpdate: update => processTelegramUpdate(update, async ({update_id:id}) => {
      if (id === 10 && !failed) {
        failed = true;
        throw Object.assign(new Error('busy'), {telegramStatus:503,telegramMethod:'sendMessage'});
      }
      if (id === 12) throw Object.assign(new Error('blocked'), {telegramStatus:403,telegramMethod:'sendMessage'});
      sent.push(id);
    }, () => missing.push(update.update_id)),
    onError() {}, pause:async ms=>{waits.push(ms);}, shouldStop:()=>stop
  });
  assert.deepEqual(offsets,[0,0,14]);
  assert.deepEqual(sent,[13,10,11]);
  assert.deepEqual(missing,[12]);
  assert.deepEqual(waits,[3000]);
});

test('polling respects Telegram retry_after before more outbound operations', async () => {
  const calls = [], updates = [{update_id:1},{update_id:2}];
  let failed=false, stop=false;
  await pollTelegramUpdates({
    async api(_, {offset}) {
      if (offset === 3) stop = true;
      return updates.filter(u=>u.update_id >= offset);
    },
    async handleUpdate(update) {
      calls.push(update.update_id);
      if (!failed) { failed=true; throw Object.assign(new Error('wait'),{retryAfter:11}); }
    },
    onError() {}, pause:async ms=>{calls.push(ms);}, shouldStop:()=>stop
  });
  assert.deepEqual(calls,[1,11000,1,2]);
});

test('only a successful poll restores connectivity, independent of chat handling', async () => {
  const events = [];
  let polls = 0;
  await pollTelegramUpdates({
    async api() {
      polls++;
      if (polls===1) throw Object.assign(new Error('private URL'),{cause:{code:'ECONNRESET'}});
      return polls===2 ? [{update_id:1}] : [];
    },
    onPollSuccess: () => events.push('connected'),
    async handleUpdate() { throw Error('local handler failure'); },
    onError: (error,stage) => events.push([stage,telegramErrorCode(error)]),
    shouldStop: () => polls===3, pause:async()=>{}
  });
  assert.deepEqual(events,[['getUpdates','ECONNRESET'],'connected',['handleUpdate','UNKNOWN'],'connected']);
  assert.equal(telegramErrorCode({telegramStatus:429}),'TELEGRAM_429');
  assert.equal(telegramErrorCode({cause:{errors:[{code:'ENETUNREACH'}]}}),'ENETUNREACH');
  assert.equal(telegramErrorCode({name:'TimeoutError'}),'TIMEOUT');
  assert.equal(telegramErrorCode({code:'PRIVATE',message:'secret'}),'UNKNOWN');
});
