import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, webkit, expect } from '@playwright/test';
import { preview } from 'vite';
import { applyEditorial } from '../../server/content-workspace.mjs';

// Use the local build by default. Intercept every API request in either mode.
const server = process.env.KARTA_UI_URL ? null : await preview({ build: { outDir: process.env.KARTA_TEST_DIST || 'dist' }, preview: { host: '127.0.0.1', port: 0 } });
const base = process.env.KARTA_UI_URL || 'http://127.0.0.1:' + server.httpServer.address().port;
const docs = ['terms', 'privacy', 'personal-data', 'advertising'].map(id => ({ id, title: id, href: '/legal/' + id, pdf: '/legal/' + id + '.pdf' }));
const product = { id: 3, name: 'Первый Reels', typeId: 'lead_magnet', format: 'PDF-гайд', price: '', currency: '₽', description: 'Практика монтажа', status: 'draft', createdDate: '2026-11-01', publishDate: '' };
const idea = { id: 11, productId: product.id, title: 'Первый монтаж', thesisPlan: 'Показать монтаж с ИИ.', formatIds: ['reels'], contentItems: [
  { id: 25, productId: product.id, title: 'Первый монтаж с ИИ', platformId: 'reels', status: 'in_progress', publishDate: '', body: 'У вас уже есть снятое видео? Покажу, как начать монтировать его с ИИ.\n\n' + 'Проверяю слова и склейки. '.repeat(26), visual: 'Запись экрана студии', resources: 'Исходное видео' },
] };
const filler = Array.from({ length: 16 }, (_, i) => ({ ...idea, productId: undefined, id: 100 + i, title: 'Заметка ' + i, thesisPlan: 'Монтаж', contentItems: [] }));
const main = { topics: [...filler, idea], products: [product], funnels: [], editorial: { weeks: {}, slots: [] } };
const publications = { schema: 1, items: [{ id: 'reel', title: idea.contentItems[0].title, date: '2026-11-22', format: 'Рилс', contentItemId: 25, parts: [{ id: 'text', text: 'Сценарий', published: false }] }] };
const output = process.env.KARTA_QA_DIR;
if (output) await mkdir(output, { recursive: true });

async function check(engine) {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch({
    headless: true, channel: engine === 'chromium' && process.platform === 'win32' ? 'msedge' : undefined,
  });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let accepted = false;
    let workspace = { main: structuredClone(main), publications: structuredClone(publications) };
    let revision = 0;
    const revisions = () => ({ main: 'main-' + revision, publications: 'pubs-' + revision });
    await page.route('**/*', r => new URL(r.request().url()).origin === base ? r.fallback() : r.abort());
    await page.route('**/telegram-web-app.js*', r => r.fulfill({ contentType: 'text/javascript', body: `
      window.Telegram={WebApp:{platform:'ios',isFullscreen:true,isVersionAtLeast:()=>true,
        safeAreaInset:{top:47,bottom:34},contentSafeAreaInset:{top:48,bottom:0},
        BackButton:{onClick(f){window.nativeBack=f},offClick(f){if(window.nativeBack===f)window.nativeBack=null},show(){},hide(){}}}};
    ` }));
    await page.route('**/api/**', r => {
      const path = new URL(r.request().url()).pathname;
      const reply = data => r.fulfill({ json: data });
      if (path === '/api/auth/me') return reply({ user: { id: 'cards-test', name: 'Проверка', authProvider: 'telegram' } });
      if (path.startsWith('/api/legal')) {
        if (path === '/api/legal/accept') {
          const choice = r.request().postDataJSON();
          assert.equal(choice.terms, true);
          assert.equal(choice.personalData, false);
          assert.equal(choice.advertising, false);
          accepted = true;
        }
        return reply({ accountId: 'cards-test', sequence: +accepted, accepted, version: 'test', manifestHash: 'test', documents: docs });
      }
      if (path === '/api/content-workspace') {
        if (r.request().method() === 'POST') {
          const command = r.request().postDataJSON();
          assert.equal(command.revisions.main, revisions().main);
          workspace = applyEditorial(workspace.main, workspace.publications, command);
          revision++;
        }
        return reply({ ...workspace, revisions: revisions(), revision: revisions().main });
      }
      if (path === '/api/state/main') return reply({ data: workspace.main, revision: revisions().main });
      if (path === '/api/state/publications') return reply({ data: workspace.publications, revision: revisions().publications });
      return reply({ data: null, revision: 'new' });
    });
    const origin = base + '/content?mode=ideas&format=reels&q=' + encodeURIComponent('монтаж');
    await page.goto(origin);
    const boxes = page.getByRole('checkbox');
    await expect(boxes).toHaveCount(3);
    for (const b of await boxes.all()) await expect(b).not.toBeChecked();
    for (let i = 0; i < 3; i++) await boxes.nth(i).click();
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const b of await boxes.all()) {
        const rect = await b.boundingBox();
        assert.equal(rect.width, 22);
        assert.equal(rect.height, 22);
        await expect(b).toBeChecked();
      }
      if (width === 390 && output) await page.screenshot({ path: join(output, engine + '-consent.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await boxes.nth(1).click();
    await expect(boxes.nth(2)).not.toBeChecked();
    await page.getByRole('button', { name: 'Продолжить', exact: true }).click();

    const card = page.getByRole('dialog');
    const title = name => expect(card.getByRole('heading', { name, exact: true })).toBeVisible();
    const close = () => card.getByRole('button', { name: 'Закрыть', exact: true }).click();
    const ideaRow = page.getByRole('button', { name: /Первый монтаж.*Адаптаций/ });
    await ideaRow.scrollIntoViewIfNeeded();
    const listScroll = await page.evaluate(() => window.scrollY);
    assert.ok(listScroll > 100);
    await ideaRow.click();
    await title(idea.title);
    const ideaUrl = page.url();
    assert.equal(await page.evaluate(() => document.activeElement.tagName === 'INPUT'), false);
    await card.getByRole('button', { name: /Первый монтаж с ИИ/ }).click();
    await title(idea.contentItems[0].title);
    const materialUrl = page.url();
    await card.getByText('Куда ведёт', { exact: true }).click();
    await card.getByRole('link', { name: product.name }).click();
    await title(product.name);
    await close();
    await expect(page).toHaveURL(materialUrl);
    await title(idea.contentItems[0].title);
    await card.getByText('Куда ведёт', { exact: true }).click();
    for (const [width, height] of [[320, 650], [360, 750], [390, 844], [430, 844], [390, 510], [900, 650]]) {
      await page.setViewportSize({ width, height });
      const head = await card.locator('.ed-detail-head').boundingBox();
      const footer = await card.locator('.ed-detail-footer').boundingBox();
      const dismiss = await card.locator('.dialog-dismiss').boundingBox();
      await expect.poll(async () => (await card.locator('.ed-detail-head').boundingBox()).y, {message: JSON.stringify({engine, width, head})}).toBeGreaterThanOrEqual((width < 768 ? 95 : 70) - 1);
      assert.ok(dismiss.x >= 0 && dismiss.x + dismiss.width <= width + 1);
      await expect.poll(async () => { const box = await card.locator('.ed-detail-footer').boundingBox(); return box.y + box.height; }, {message: JSON.stringify({engine, width, height, head, footer})}).toBeLessThanOrEqual(height - 33);
      assert.ok(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      if (width === 390 && height === 844 && output) await page.screenshot({ path: join(output, engine + '-material.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await card.getByText('Идея и адаптации', { exact: true }).click();
    await card.getByRole('link', { name: idea.title, exact: true }).click();
    await title(idea.title);
    if (output) await page.screenshot({ path: join(output, engine + '-idea.png') });
    await close();
    await expect(page).toHaveURL(materialUrl);
    await title(idea.contentItems[0].title);
    await expect(card.getByRole('link', { name: idea.title, exact: true })).toBeVisible();
    await page.evaluate(() => window.nativeBack());
    await expect(page).toHaveURL(ideaUrl);
    await title(idea.title);
    await close();
    await expect(page).toHaveURL(origin);
    await expect(card).toHaveCount(0);
    await expect.poll(() => page.evaluate(y => Math.abs(window.scrollY - y), listScroll)).toBeLessThan(3);
    await page.goForward();
    await title(idea.title);
    await page.goBack();
    await expect(page).toHaveURL(origin);

    await page.goto(base + '/calendar?date=2026-11-22');
    const dayRow = page.locator('.pub-list').getByRole('button', { name: /Первый монтаж/ });
    await dayRow.click();
    await title(idea.contentItems[0].title);
    await card.getByText('Идея и адаптации', { exact: true }).click();
    await card.getByRole('link', { name: idea.title, exact: true }).click();
    await title(idea.title);
    await close();
    await title(idea.contentItems[0].title);
    await close();
    await expect(dayRow).toBeVisible();
    await expect(page).toHaveURL(base + '/calendar');

    await page.goto(base + '/home');
    await page.getByRole('link', { name: 'Записать идею' }).click();
    await title('Новая идея');
    await card.getByLabel('Название', { exact: true }).fill('Черновик для проверки');
    await page.goBack();
    await expect(card).toHaveCount(0);
    await page.getByRole('link', { name: 'Записать идею' }).click();
    await expect(card.getByLabel('Название', { exact: true })).toHaveValue('Черновик для проверки');
    page.once('dialog', d => d.accept());
    await close();
    await expect(page).toHaveURL(base + '/home');
    await page.goto(base + '/content?mode=ideas&idea=missing');
    await expect(card.getByRole('status')).toContainText('Идея не найдена');
    await close();
    await expect(page).toHaveURL(base + '/content?mode=ideas');
    for (const id of ['missing', '99999']) {
      await page.goto(base + '/content?mode=ideas&material=' + id);
      await title('Материал не найден');
      await expect(card.getByText('Загрузка материала…')).toHaveCount(0);
      await close();
      await expect(page).toHaveURL(base + '/content?mode=ideas');
    }

    const workspacePath = '**/api/content-workspace';
    const unavailable = r => r.fulfill({ status: 503, json: {} });
    await page.route(workspacePath, unavailable);
    await page.goto(base + '/content?material=25');
    await title('Не удалось загрузить материал');
    await page.unroute(workspacePath, unavailable);
    await card.getByRole('button', { name: 'Обновить', exact: true }).click();
    await title(idea.contentItems[0].title);
    await card.getByRole('button', { name: 'Изменить', exact: true }).click();
    const script = card.getByRole('textbox', { name: 'Сценарий', exact: true });
    await script.fill('Сохранённый текст сценария');
    await page.setViewportSize({ width: 390, height: 510 });
    const saveScript = card.getByRole('button', { name: 'Сохранить изменения', exact: true });
    await expect.poll(async () => { const b = await saveScript.boundingBox(); return b.y + b.height; }).toBeLessThanOrEqual(477);
    await saveScript.click();
    await expect(card.getByText('Сохранённый текст сценария', { exact: true })).toBeVisible();
    await page.reload();
    await expect(card.getByText('Сохранённый текст сценария', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const sourceUrl = origin + '&material=25';
    await page.goto(sourceUrl);
    await title(idea.contentItems[0].title);
    await card.getByText('Куда ведёт', { exact: true }).click();
    const productLink = card.getByRole('link', { name: product.name });
    await productLink.click();
    await title(product.name);
    await expect(card).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(sourceUrl);
    await title(idea.contentItems[0].title);
    await expect(productLink).toBeVisible();
    await productLink.click();
    await title(product.name);
    const saveProduct = card.getByRole('button', { name: 'Сохранить', exact: true });
    for (const [width, height] of [[320, 650], [390, 844], [390, 510], [430, 844], [900, 650]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => (await card.locator('.ed-detail-head').boundingBox()).y).toBeGreaterThanOrEqual(width < 768 ? 94 : 69);
      await expect.poll(async () => { const b = await saveProduct.boundingBox(); return b.y + b.height; }).toBeLessThanOrEqual(height - 33);
      assert.ok(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      if (width === 390 && height === 844 && output) await page.screenshot({ path: join(output, engine + '-product.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const productName = card.getByLabel('Название', { exact: true });
    const editedName = 'Первый Reels с ИИ';
    await card.getByLabel('Статус', { exact: true }).selectOption('active');
    await productName.fill(editedName);
    await card.getByText('Связанные материалы · 1').click();
    const related = card.getByRole('link', { name: /Первый монтаж с ИИ/ });
    await related.click();
    await title(idea.contentItems[0].title);
    await expect(card).toHaveCount(1);
    await page.evaluate(() => window.nativeBack());
    await title(product.name);
    await expect(productName).toHaveValue(editedName);
    await expect(related).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await close();
    await expect(productName).toHaveValue(editedName);
    await productName.fill('');
    await saveProduct.click();
    await expect(card.getByRole('alert')).toHaveText('Добавьте название продукта.');
    await productName.fill(editedName);
    await saveProduct.click();
    await expect(page).toHaveURL(sourceUrl);
    await expect.poll(() => workspace.main.products.find(p => p.id === 3)?.name).toBe(editedName);
    await page.goto(base + '/products?product=3');
    await title(editedName);
    await expect(card.getByLabel('Статус', { exact: true })).toHaveValue('active');
    await expect(productName).toHaveValue(editedName);
    await page.evaluate(() => window.nativeBack());
    await expect(page).toHaveURL(base + '/products');
    await page.getByRole('button', { name: 'Новый продукт', exact: true }).click();
    await title('Новый продукт');
    const create = card.getByRole('button', { name: /Создать продукт/ });
    await create.click();
    await expect(card.getByRole('alert')).toHaveText('Добавьте название продукта.');
    await card.getByLabel('Название продукта').fill('Проверка создания');
    await card.getByRole('button', { name: 'лид-магнит', exact: true }).click();
    await create.click();
    await expect(card).toHaveCount(0);
    await expect.poll(() => workspace.main.products.some(p => p.name === 'Проверка создания')).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: /Проверка создания/ }).click();
    await title('Проверка создания');
    await close();
    assert.deepEqual(errors, []);
    console.log(engine + ' passed consent geometry, safe area, card nesting, filters, history, recovery, product create/edit/return and direct links');
  } finally { await browser.close(); }
}

try {
  for (const engine of process.env.KARTA_BROWSER ? [process.env.KARTA_BROWSER] : ['chromium', 'webkit']) await check(engine);
} finally { await server?.close(); }
