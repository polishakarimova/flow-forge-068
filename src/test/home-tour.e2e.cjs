const { chromium, webkit, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TOUR_QA_BASE || 'http://127.0.0.1:8087';
const shots = process.env.TOUR_QA_DIR;
if (shots) fs.mkdirSync(shots, { recursive: true });
const titles = ['Добро пожаловать\nв «Карту контента»', 'Главное на сегодня', 'От идеи до готового поста', 'Всё по датам', 'Как контент ведёт к продаже', 'Основа твоего блога', 'Твой профиль', 'Можно начинать'];
const anchors = [null, 'home', 'content', 'calendar', 'sales', 'context', 'profile'];

async function fixture(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  let user = Object.hasOwn(options, 'user') ? options.user : 'tour-user';
  let writes = 0;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://telegram.org/**', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/**', r => {
    const endpoint = new URL(r.request().url()).pathname;
    const json = body => r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (r.request().method() !== 'GET') writes++;
    if (endpoint === '/api/auth/me') return json({ user: user ? { id: user, name: 'Полина', authProvider: 'telegram' } : null });
    if (endpoint === '/api/state/main' && options.mainError) return r.fulfill({ status: 503, body: '{}' });
    if (endpoint === '/api/state/main') return json({ data: { products: [], topics: [], funnels: [], keywords: [] }, revision: 'new' });
    if (endpoint === '/api/state/publications') return json({ data: { schema: 1, items: [] }, revision: 'new' });
    if (endpoint === '/api/content-workspace') return json({ main: { products: [], topics: [], funnels: [] }, publications: { schema: 1, items: [] }, revisions: { main: 'new', publications: 'new' } });
    return json({ data: null, revision: 'new' });
  });
  if (options.storageBlocked) await context.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key.startsWith('karta-home-tour:')) throw new DOMException('Blocked', 'SecurityError'); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('karta-home-tour:')) throw new DOMException('Blocked', 'SecurityError'); return set.call(this, key, value); };
  });
  if (options.telegram) await context.addInitScript(() => {
    window.Telegram = { WebApp: { platform: 'ios', isFullscreen: true, viewportStableHeight: innerHeight, safeAreaInset: { top: 47, bottom: 34 }, contentSafeAreaInset: { top: 56 }, ready() {}, expand() {}, onEvent() {}, offEvent() {} } };
  });
  return { context, page, errors, get writes() { return writes; }, setUser(value) { user = value; } };
}

async function verifyStep(page, index, label) {
  await expect(page.locator('#kk-tour-title')).toHaveText(titles[index]);
  await page.evaluate(() => document.fonts.ready);
  // Layout is measured after fonts, viewport, and target changes settle.
  await expect.poll(async () => {
    return page.locator('.kk-tour-note').evaluate(el => {
      const r = el.getBoundingClientRect();
      const safe = parseFloat(getComputedStyle(document.querySelector('.kk-tour')).paddingTop) || 0;
      return r.left >= 13 && r.top >= safe + 13 && r.right <= innerWidth - 13 && r.bottom <= innerHeight - 13;
    });
  }).toBe(true);
  assert.equal(new URL(page.url()).pathname, '/home', 'Tour must stay on home');
  if (anchors[index]) {
    const rect = await page.locator('.kk-tour-outline').boundingBox();
    assert.ok(rect && rect.width > 10 && rect.height > 10, 'Missing live target');
    assert.ok(rect.y >= -1 && rect.y + rect.height <= (await page.viewportSize()).height + 6, 'Target must be in view');
    const note = await page.locator('.kk-tour-note').boundingBox();
    assert.ok(note.x + note.width <= rect.x || note.x >= rect.x + rect.width || note.y + note.height <= rect.y || note.y >= rect.y + rect.height, `Note overlaps target: ${label} step ${index}`);
    const sharp = await page.evaluate(id => {
      let els = [...document.querySelectorAll(`[data-tour="${id}"]`)].filter(el => el.getClientRects().length);
      if (els.some(el => el.closest('main'))) els = els.filter(el => el.closest('main'));
      return els.flatMap(el => {
        const branches = []; for (let branch = el; branch; branch = branch.parentElement) branches.push(branch);
        return [...branches, ...el.querySelectorAll('*')].filter(child => getComputedStyle(child).filter !== 'none').map(child => child.outerHTML.slice(0, 250));
      });
    }, anchors[index]);
    assert.deepEqual(sharp, [], `Target must remain sharp: ${label} step ${index}`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (shots && (label === 'edge-390' || (['edge-320', 'webkit-390'].includes(label) && [0, 2].includes(index)) || (['edge-1280', 'edge-telegram'].includes(label) && [0, 4].includes(index)))) await page.screenshot({ path: path.join(shots, `${label}-${index}.png`) });
}

(async () => {
  for (const [engine, launch] of [['edge', () => chromium.launch({ channel: 'msedge', headless: true })], ['webkit', () => webkit.launch({ headless: true })]]) {
    if (process.env.TOUR_QA_ENGINES && !process.env.TOUR_QA_ENGINES.split(',').includes(engine)) continue;
    const browser = await launch();
    try {
      for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1280, height: 800 }]) {
        if (process.env.TOUR_QA_WIDTHS && !process.env.TOUR_QA_WIDTHS.split(',').includes(String(viewport.width))) continue;
        const f = await fixture(browser, viewport);
        const { page } = f;
        await page.goto(base + '/home', { waitUntil: 'domcontentloaded' });
        for (let step = 0; step < titles.length; step++) {
          await verifyStep(page, step, `${engine}-${viewport.width}`);
          await page.locator('.kk-tour-next').click();
        }
        await expect(page.locator('.kk-tour')).toHaveCount(0);
        console.log(`Completed steps ${engine} ${viewport.width}`);
        assert.equal(await page.locator('.kk-tour-muted').count(), 0);
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
        assert.equal(await page.evaluate(() => scrollY), 0, 'Restore original home scroll');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Экскурсия по разделам' }).waitFor();
        await page.waitForTimeout(850);
        assert.equal(await page.locator('.kk-tour').count(), 0, 'Do not repeat after completion');
        await page.getByRole('button', { name: 'Экскурсия по разделам' }).click();
        await verifyStep(page, 0, `${engine}-${viewport.width}-replay`);
        await page.keyboard.press('ArrowRight');
        await verifyStep(page, 1, `${engine}-${viewport.width}-keyboard`);
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('#kk-tour-title')).toHaveText(titles[0]);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('.kk-tour'))), true, 'Keep keyboard focus in tour');
        await page.keyboard.press('Escape');
        await expect(page.locator('.kk-tour')).toHaveCount(0);
        await page.getByRole('link', { name: 'Мой профиль', exact: true }).click();
        await page.getByRole('button', { name: 'Обучение', exact: true }).last().click();
        await verifyStep(page, 0, `${engine}-${viewport.width}-profile`);
        await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
        assert.equal(f.writes, 0, 'Tour must never write workspace data');
        assert.deepEqual(f.errors, []);
        await f.context.close();
        console.log(`PASS ${engine} ${viewport.width}x${viewport.height}: eight steps, sharp targets, no overlap, completion, replay, keyboard, profile, no writes`);
      }
      const f = await fixture(browser, { width: 390, height: 700 }, { telegram: true });
      await f.page.goto(base + '/home', { waitUntil: 'domcontentloaded' });
      for (let step = 0; step < titles.length; step++) { await verifyStep(f.page, step, engine + '-telegram'); await f.page.locator('.kk-tour-next').click(); }
      f.setUser('another-user');
      await f.page.reload({ waitUntil: 'domcontentloaded' });
      await verifyStep(f.page, 0, engine + '-another-user');
      await f.page.getByRole('button', { name: 'Закрыть экскурсию' }).click();
      await f.page.reload({ waitUntil: 'domcontentloaded' });
      await f.page.getByRole('button', { name: 'Экскурсия по разделам' }).waitFor();
      await f.page.waitForTimeout(850);
      assert.equal(await f.page.locator('.kk-tour').count(), 0, 'Close also remembers completion');
      assert.deepEqual(f.errors, []);
      await f.context.close();
      for (const options of [{ mainError: true }, { user: null }, { storageBlocked: true }]) {
        const special = await fixture(browser, { width: 390, height: 844 }, options);
        await special.page.goto(base + '/home', { waitUntil: 'domcontentloaded' });
        if (options.storageBlocked) {
          await special.page.getByRole('button', { name: 'Пропустить', exact: true }).click();
          await special.page.getByRole('link', { name: 'Мой профиль', exact: true }).click();
          await special.page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('link', { name: 'Главная', exact: true }).click();
          await special.page.getByRole('button', { name: 'Экскурсия по разделам' }).waitFor();
        } else await special.page.waitForTimeout(1500);
        assert.equal(await special.page.locator('.kk-tour').count(), 0);
        assert.deepEqual(special.errors, []);
        await special.context.close();
      }
      console.log(`PASS ${engine}: Telegram safe areas, separate accounts, close, failed loading, guest, restricted tour storage`);
      const deep = await fixture(browser, { width: 390, height: 844 });
      await deep.page.goto(base + '/calendar', { waitUntil: 'domcontentloaded' });
      await deep.page.waitForTimeout(1000);
      assert.equal(await deep.page.locator('.kk-tour').count(), 0, 'Do not interrupt a direct calendar link');
      await deep.context.close();
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
