// Receive only authenticated Bot API updates when inbound webhook delivery is unavailable.
export async function pollTelegramUpdates({ api, handleUpdate, shouldStop = () => false, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), onError = () => console.error('Telegram polling failed; retrying') }) {
  let offset = 0;
  while (!shouldStop()) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'edited_message'] });
      for (const update of updates) {
        if (shouldStop()) return;
        await handleUpdate(update);
        // Acknowledge only after successful processing; failed updates are retried.
        offset = update.update_id + 1;
      }
    } catch {
      onError();
      if (!shouldStop()) await pause(3000);
    }
  }
}
