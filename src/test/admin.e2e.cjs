const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const { buildAdminOverview } = await import('../../server/admin-overview.mjs');
  const clock = Date.now(), today = new Date(clock).toISOString();
  const accounts = Array.from({ length: 25 }, (_, i) => ({ id: 'fixture-' + i, name: 'Проверка ' + String(i + 1).padStart(2, '0'), telegram_id: String(1000 + i), username: 'fixture' + i, created_at: today, updated_at: today }));
  const states = [{ user_id: 'fixture-0', key: 'main', updated_at: today, data: { products: [{ id: 1 }], topics: [{ contentItems: [{ id: 1, platformId: 'reels', status: 'ready', productId: 1, cta: 'Напишите', metrics: { reach: 1500, leads: 4 } }] }], funnels: [{ id: 'f', active: true, contentItemIds: [1] }], keywords: ['СТАРТ'] } }];
  const fixture = days => buildAdminOverview({ accounts, states, days, clock, queue: [{ status: 'uncertain', count: 1 }], system: { database: 'ok', databaseMs: 18, uptimeSeconds: 7200, telegramMode: 'polling', autopublishEnabled: false, remotePublisherEnabled: false, loginHistorySince: today } });
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, executablePath: process.env.KARTA_BROWSER_PATH || undefined, args: process.platform === 'win32' ? [] : ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  const baseUrl = process.env.KARTA_ADMIN_TEST_URL || 'http://127.0.0.1:4187';
  const folder = path.resolve('previews/admin-review'); await fs.mkdir(folder, { recursive: true });
  let checks = 0;
  try {
    for (const width of process.env.KARTA_ADMIN_AUTH_ONLY ? [] : [360, 390, 430, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      let mode = 'ok', calls = 0;
      await page.route('https://telegram.org/**', r => r.fulfill({ body: '', contentType: 'application/javascript' }));
      await page.route('**/api/**', r => {
        const url = new URL(r.request().url());
        const reply = (body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname === '/api/auth/me') return reply({ user: { id: 'fixture-0', name: 'Проверка', isAdmin: true } });
        if (url.pathname === '/api/admin/overview') { calls++; return mode === 'ok' ? reply(fixture(Number(url.searchParams.get('days')))) : reply({ error: mode }, mode === 'forbidden' ? 403 : 503); }
        if (url.pathname === '/api/content-workspace') return reply({ main: {}, publications: { schema: 1, items: [] }, revisions: { main: 'fixture', publications: 'fixture' } });
        return reply({ data: null, revision: 'new' });
      });
      console.log('Проверка админ-панели:', width);
      await page.goto(baseUrl + '/admin');
      await page.getByText('Всего пользователей', { exact: true }).waitFor({ timeout: 120000 }).catch(async error => { console.error({ errors, body: (await page.locator('body').innerText()).slice(0, 2500) }); throw error; });
      assert.equal(await page.getByRole('meter', { name: 'Связан с продуктом', exact: true }).getAttribute('aria-valuenow'), '1'); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      await page.getByLabel('Период показателей').selectOption('7');
      await page.getByText('+25 за 7 дней', { exact: true }).waitFor(); checks++;
      if ([390, 1280].includes(width)) await page.screenshot({ path: path.join(folder, `overview-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Пользователи', exact: true }).click();
      await page.getByRole('button', { name: 'Следующая страница' }).click();
      await page.getByText('Страница 2 из 2', { exact: true }).waitFor(); checks++;
      await page.getByLabel('Поиск пользователей').fill('Проверка 01');
      await page.getByRole('button', { name: /Проверка 01/ }).click();
      await page.getByText('Telegram ID: 1000', { exact: true }).waitFor(); checks++;
      await page.getByLabel('Поиск пользователей').fill('не существует');
      await page.getByText('Нет пользователей по этому запросу.', { exact: true }).waitFor(); checks++;
      await page.getByLabel('Очистить поиск').click();
      await page.getByLabel('Фильтр пользователей').selectOption('empty');
      assert.equal(await page.getByRole('button', { name: /Проверка 01/ }).count(), 0); checks++;
      await page.getByRole('button', { name: 'Система', exact: true }).click();
      await page.getByText('Нужно проверить отправку', { exact: true }).waitFor(); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      if (width === 390) await page.screenshot({ path: path.join(folder, 'system-390.png'), fullPage: true });
      mode = 'forbidden'; await page.getByRole('button', { name: 'Обновить показатели', exact: true }).click();
      await page.getByText('Для этого Telegram-аккаунта доступ администратора не выдан.', { exact: true }).waitFor();
      assert.equal(await page.getByText('Состояние сервиса', { exact: true }).count(), 0); checks++;
      mode = 'ok'; await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
      await page.getByText('Состояние сервиса', { exact: true }).waitFor(); checks++;
      assert.ok(calls >= 4); assert.deepEqual(errors, []); checks += 2;
      await context.close();
    }
    // Telegram entry can renew an old administrative session once, using signed initData.
    const page = await browser.newPage(); let signedIn = false, renewals = 0;
    const signedErrors = []; page.on('pageerror', e => signedErrors.push(e.message));
    await page.addInitScript(() => { window.Telegram = { WebApp: { initData: 'synthetic-signed-payload' } }; });
    await page.route('https://telegram.org/**', r => r.fulfill({ body: '', contentType: 'application/javascript' }));
    await page.route('**/api/**', r => {
      const url = new URL(r.request().url()), reply = (data, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/auth/me') return reply({ user: { id: 'fixture-0', name: 'Проверка', isAdmin: true } });
      if (url.pathname === '/api/auth/telegram-mini-app') { assert.equal(r.request().postDataJSON().initData, 'synthetic-signed-payload'); signedIn = true; renewals++; return reply({ user: { id: 'fixture-0', name: 'Проверка', isAdmin: true } }); }
      if (url.pathname === '/api/admin/overview') { const data = fixture(30); data.system.adminExpiresAt = new Date(Date.now() + 5000).toISOString(); return signedIn ? reply(data) : reply({ error: 'admin_reauthentication_required' }, 401); }
      if (url.pathname === '/api/content-workspace') return reply({ main: {}, publications: { schema: 1, items: [] }, revisions: { main: 'fixture', publications: 'fixture' } });
      return reply({ data: null, revision: 'new' });
    });
    await page.goto(baseUrl + '/admin?token=obsolete');
    await page.getByText('Всего пользователей', { exact: true }).waitFor().catch(async error => { console.error({ signedErrors, renewals, body: await page.locator('body').innerText() }); throw error; });
    assert.equal(renewals, 1); assert.equal(new URL(page.url()).searchParams.has('token'), false); assert.deepEqual(signedErrors, []); checks += 3;
    await page.getByText(/Подтвердите вход ещё раз\. Административный доступ/).waitFor();
    assert.equal(await page.getByText('Всего пользователей', { exact: true }).count(), 0); checks++;
    console.log(JSON.stringify({ checks, widths: [360, 390, 430, 1280], screenshots: folder }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
