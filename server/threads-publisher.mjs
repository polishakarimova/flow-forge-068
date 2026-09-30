import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function publisherConfig(env) {
  const origin = new URL(env.CONTENT_MAP_URL || 'https://kartakontenta.ru');
  if (origin.protocol !== 'https:' || origin.pathname !== '/') throw new Error('Invalid content map origin');
  const config = { origin: origin.origin, secret: env.THREADS_WORKER_SECRET, token: env.THREADS_ACCESS_TOKEN,
    username: env.THREADS_USERNAME, botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.THREADS_NOTIFY_CHAT_ID,
    stateDir: env.THREADS_PUBLISHER_STATE_DIR || '/var/lib/lina-threads-publisher', dryRun: env.THREADS_PUBLISHER_DRY_RUN === '1' };
  if (!config.secret || config.secret.length < 32 || !config.token || !config.username) throw new Error('Publisher configuration incomplete');
  if (config.chatId && !(env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(x => x.trim()).includes(config.chatId)) throw new Error('Notification chat is not allowed');
  return config;
}

export function createPublisher(config, fetcher = fetch) {
  const request = async (url, init, label) => {
    const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(20000) });
    const value = await response.json().catch(() => ({}));
    // Do not log response bodies or URLs: Meta and Telegram may echo credentials.
    if (!response.ok || value.error || value.ok === false) throw new Error(`${label}: HTTP ${response.status}`);
    return value;
  };
  const bridge = (action, input) => request(`${config.origin}/api/internal/threads/${action}`, {
    method: input === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json' },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  }, 'Content map');
  const meta = (path, input) => request(`https://graph.threads.net/v1.0/${path}`, {
    method: input ? 'POST' : 'GET', headers: { Authorization: `Bearer ${config.token}` },
    ...(input ? { body: new URLSearchParams(input) } : {}),
  }, 'Threads');
  return { bridge, meta,
    profile: () => meta('me?fields=id,username'),
    async publish(job, save) {
      const container = await meta('me/threads', { media_type: 'TEXT', text: job.text });
      if (!/^\d+$/.test(String(container.id))) throw new Error('Threads container missing');
      save({ ...job, stage: 'container', containerId: String(container.id) });
      await bridge('result', { dispatchId: job.dispatchId, status: 'container', containerId: String(container.id) });
      // Persist before the irreversible request. After a restart this stage is never re-sent.
      save({ ...job, stage: 'publishing', containerId: String(container.id) });
      const published = await meta('me/threads_publish', { creation_id: String(container.id) });
      if (!/^\d+$/.test(String(published.id))) throw new Error('Threads publication ID missing');
      const result = { ...job, stage: 'published', remoteId: String(published.id) };
      save(result);
      try { result.permalink = (await meta(`${published.id}?fields=permalink`)).permalink; } catch { /* ID already confirms publication. */ }
      save(result);
      return result;
    },
    async notify(job) {
      if (!config.botToken || !config.chatId) return;
      const date = new Date(job.scheduledAt).toLocaleString('ru-RU', { timeZone: 'Europe/Kaliningrad', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const text = job.stage === 'published'
        ? `Threads опубликован · ${date}\n${job.text.slice(0, 160)}${job.text.length > 160 ? '…' : ''}\n${job.permalink || `ID публикации: ${job.remoteId}`}`
        : `Публикация Threads требует проверки · ${date}\nПодтверждение отправки не получено. Проверьте аккаунт перед повтором.\n${config.origin}/calendar`;
      await request(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text, link_preview_options: { is_disabled: true } }),
      }, 'Lina notification');
    },
  };
}

export async function runPublisher(config) {
  mkdirSync(config.stateDir, { recursive: true, mode: 0o700 });
  const filename = join(config.stateDir, 'inflight.json');
  const save = job => {
    const temp = `${filename}.tmp`;
    writeFileSync(temp, JSON.stringify(job), { mode: 0o600 });
    renameSync(temp, filename);
  };
  const load = () => existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf8')) : null;
  const publisher = createPublisher(config);
  let profile = null; let checkedAt = 0;
  let failures = 0;
  for (;;) {
    try {
      if (!profile || Date.now() - checkedAt > 60000) {
        profile = await publisher.profile();
        if (profile.username !== config.username || !profile.id) throw new Error('Threads profile mismatch');
        checkedAt = Date.now();
      }
      await publisher.bridge('heartbeat', { username: profile.username, profileId: String(profile.id), healthy: true });
      if (config.dryRun) {
        console.log(JSON.stringify({ mode: 'dry-run', username: profile.username, bridge: await publisher.bridge('health') }));
        return;
      }
      let job = load();
      // Unknown outcome is recorded for inspection, never automatically published again.
      if (job && !['published', 'reported', 'uncertain'].includes(job.stage)) {
        job = { ...job, stage: 'uncertain' }; save(job);
      }
      if (!job) {
        job = (await publisher.bridge('claim', {})).job;
        if (job) {
          save({ ...job, stage: 'claimed' });
          try { job = await publisher.publish(job, save); }
          catch {
            job = load();
            if (job.stage !== 'published') { job = { ...job, stage: 'uncertain' }; save(job); }
          }
        }
      }
      if (job) {
        if (job.stage === 'published' || job.stage === 'uncertain') {
          await publisher.bridge('result', { dispatchId: job.dispatchId, status: job.stage, remoteId: job.remoteId, permalink: job.permalink });
          save({ ...job, stage: 'reported', outcome: job.stage });
          job = load();
        }
        if (job.stage === 'reported') {
          await publisher.notify({ ...job, stage: job.outcome });
          unlinkSync(filename);
          console.log(JSON.stringify({ status: job.outcome, partId: job.partId, remoteId: job.remoteId || null }));
        }
      }
      if (failures) console.log('Publisher connection restored');
      failures = 0;
    } catch (error) {
      if (!failures || failures % 30 === 0) console.error(`Publisher paused: ${error.message}`);
      failures++;
    }
    await pause(20000);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runPublisher(publisherConfig(process.env));
}
