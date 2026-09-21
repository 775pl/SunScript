const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createApp } = require('../dist/create-app');

(async () => {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(await app.getUrl());
      const frame = page.locator('.showcase-frame');
      assert.equal(await page.locator('.dash-wrap').count(), 0);
      for (const mood of ['terracotta', 'encre', 'botanique']) {
        await page.locator(`[name="showcase-mood"][value="${mood}"]`).check();
        assert.equal(await frame.getAttribute('data-mood'), mood);
        assert((await page.locator('.showcase-status').innerText()).includes(mood));
      }
      const desktop = await frame.boundingBox();
      const mobile = page.locator('[name="showcase-format"][value="mobile"]');
      await mobile.focus();
      await page.keyboard.press('Space');
      assert.equal(await frame.getAttribute('data-format'), 'mobile');
      assert((await frame.boundingBox()).width <= desktop.width);
      assert.equal(await page.locator('.floral-composition').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
      await page.locator('[name="showcase-format"][value="desktop"]').check();
      assert.equal(await frame.getAttribute('data-format'), 'desktop');
      const bounds = await frame.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width);
      if (width !== 320) await page.locator('.hero-r').screenshot({ path: `tests/home-showcase-${width}.png` });
    }
    const context = await browser.newContext({ javaScriptEnabled: false });
    const plain = await context.newPage();
    await plain.goto(await app.getUrl());
    assert(await plain.locator('.showcase-frame').isVisible());
    assert.equal(await plain.locator('.showcase-controls').isVisible(), false);
    assert(await plain.locator('.showcase-link').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS: palettes, keyboard, responsive preview, mobile bounds, no-JS fallback.');
  } finally { await browser.close(); await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
