const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function retryDelay(error, failures) {
  const requested = Number(error?.retryAfter);
  const backoff = Math.min(60000, 3000 * 2 ** Math.min(failures, 5));
  return Math.min(2147483647, Math.max(backoff, Number.isFinite(requested) ? requested * 1000 : 0));
}

// Keep startup and an explicit setup request on the same attempt. The HTTP
// caller can get a prompt 503 while a failed startup is recovering.
export function createTelegramSetup(run, {onError, schedule = setTimeout}) {
  let running, waiting = false, failures = 0;
  function setup() {
    if (running) return running;
    if (waiting) return Promise.reject(Object.assign(new Error('telegram_setup_pending'), {status:503}));
    running = Promise.resolve().then(run).then(() => { failures = 0; }).catch(error => {
      onError(error);
      waiting = true;
      schedule(() => {
        waiting = false;
        void setup().catch(() => {});
      }, retryDelay(error, failures++));
      throw Object.assign(new Error('telegram_setup_pending'), {status:503});
    }).finally(() => { running = undefined; });
    return running;
  }
  return setup;
}

// Telegram cannot deliver a reply to a permanently unavailable chat. Its
// update is complete, while transport errors must remain retryable.
export async function processTelegramUpdate(update, handleUpdate, onUndeliverable) {
  try { await handleUpdate(update); }
  catch (error) {
    if (error.telegramMethod !== 'sendMessage' || ![400, 403].includes(error.telegramStatus)) throw error;
    onUndeliverable(error);
  }
}

export async function pollTelegramUpdates({api, handleUpdate, shouldStop = () => false, pause = sleep, onError = () => console.error('Telegram polling failed; retrying')}) {
  let offset = 0, failures = 0;
  const completed = new Set();
  while (!shouldStop()) {
    try {
      const updates = await api('getUpdates', {offset, timeout:25, allowed_updates:['message', 'edited_message', 'callback_query']});
      const deferredChats = new Set();
      let retry;
      for (const update of updates) {
        if (shouldStop()) return;
        const id = update.update_id;
        const chat = (update.message || update.edited_message || update.callback_query?.message)?.chat?.id ?? update.callback_query?.from?.id;
        if (chat != null && deferredChats.has(chat)) continue;
        if (!completed.has(id)) {
          try { await handleUpdate(update); }
          catch (error) {
            retry ??= error;
            if (error.retryAfter > 0) { retry = error; break; }
            if (chat != null) deferredChats.add(chat);
            continue;
          }
        }
        if (retry) completed.add(id);
        else { completed.delete(id); offset = id + 1; }
      }
      if (retry) throw retry;
      failures = 0;
    } catch (error) {
      onError(error);
      if (!shouldStop()) await pause(retryDelay(error, failures++));
    }
  }
}
