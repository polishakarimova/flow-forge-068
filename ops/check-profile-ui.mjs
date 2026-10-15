import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.KARTA_UI_URL || 'http://127.0.0.1:5186';
const output = 'C:/Users/polin/AppData/Local/CodexWork/karta-referrals-20261015';
await mkdir(output, { recursive: true });
const main = { products: [], topics: [], funnels: [], keywords: [] };
const workspace = { main, publications: { version: 1, items: [], preferences: {} }, revisions: { main: 'fixture', publications: 'fixture' } };
const url = base + '/?ref=' + 'a'.repeat(24);
let checks = 0;
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch(engine === 'chromium' ? { channel: 'msedge', headless: true } : { headless: true });
  try {
    for (const width of [360, 390, 430, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 850 } });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let failWallet = false, balance = 100;
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/account/referral' && failWallet) return route.fulfill({ status: 503, json: {} });
        const data = path === '/api/auth/me' ? { user: { id: 'fixture', name: 'Тестовый профиль', authProvider: 'telegram' } }
          : path === '/api/content-workspace' ? workspace
          : path === '/api/agent/connections' ? { agents: [{ id: 'fixture-agent', name: 'Мой агент', scopes: ['read'], connectedAt: new Date().toISOString(), revokedAt: null }], actions: [] }
          : path === '/api/account/referral' ? { balance, invited: balance / 50, reward: 50, url, transactions: balance ? [{ id: 'fixture-referral', amount: 50, createdAt: '2026-10-15T06:00:00Z' }] : [] }
          : { data: null, revision: 'new' };
        return route.fulfill({ json: data });
      });
      await page.goto(base + '/profile');
      await page.getByText('100 лайков', { exact: true }).waitFor(); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      await page.screenshot({ animations: 'disabled', path: `${output}/${engine}-${width}-profile.png`, fullPage: true });
      await page.getByRole('button', { name: /Пригласить друзей/ }).click();
      await page.getByLabel('Ваша ссылка', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Ваша ссылка', { exact: true }).inputValue(), url); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      await page.screenshot({ animations: 'disabled', path: `${output}/${engine}-${width}-invite.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /Мои лайки/ }).click();
      await page.getByText('История начислений', { exact: true }).waitFor(); checks++;
      await page.screenshot({ animations: 'disabled', path: `${output}/${engine}-${width}-history.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await page.getByRole('link', { name: /Мои агенты/ }).click();
      await page.getByRole('heading', { name: 'Мои агенты', exact: true, level: 1 }).waitFor(); checks++;
      await page.getByRole('link', { name: 'В профиль' }).click();
      await page.getByText('100 лайков', { exact: true }).waitFor();
      await page.goto(base + '/agents');
      await page.getByRole('heading', { name: 'Мои агенты', exact: true, level: 1 }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/profile/agents'); checks++;
      failWallet = true;
      await page.goto(base + '/profile');
      await page.getByText('Не удалось загрузить лайки. Попробуйте ещё раз.').waitFor(); checks++;
      assert.equal(await page.getByRole('button', { name: /Пригласить друзей/ }).isDisabled(), true); checks++;
      failWallet = false; balance = 0;
      await page.getByRole('button', { name: 'Повторить', exact: true }).click();
      await page.getByText('0 лайков', { exact: true }).waitFor(); checks++;
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ ok: true, checks, engines: ['Edge', 'WebKit'], widths: [360, 390, 430, 1280], screenshots: output }));
