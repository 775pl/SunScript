const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createApp } = require('../dist/create-app');

(async () => {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const url = `${await app.getUrl()}/a-propos`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page.locator('#lab-name').fill('<b>Mon atelier</b>');
      assert.equal(await page.locator('[data-lab-name]').innerText(), '<b>Mon atelier</b>');
      assert.equal(await page.locator('[data-lab-name] b').count(), 0);
      await page.locator('#lab-name').fill('');
      assert.equal(await page.locator('[data-lab-name]').innerText(), 'Votre atelier');
      for (const palette of ['soleil', 'ocean', 'nature']) {
        await page.locator(`[value="${palette}"]`).check();
        assert.equal(await page.locator('.lab-preview').getAttribute('data-palette'), palette);
      }
      await page.locator('#lab-booking').focus();
      await page.keyboard.press('Space');
      assert(await page.locator('.lab-booking').isVisible());
      await page.locator('.lab-booking button').click();
      assert.equal(await page.locator('.lab-result').innerText(), '');
      await page.locator('#lab-slot').selectOption('samedi à 14 h');
      await page.locator('.lab-booking button').click();
      assert((await page.locator('.lab-result').innerText()).includes('samedi à 14 h'));
      assert.equal(page.url(), url, 'Demo never navigates or submits to a server');
      await page.locator('#lab-slot').selectOption('samedi à 10 h');
      assert.equal(await page.locator('.lab-result').innerText(), '');
      await page.locator('.lab-underhood summary').focus();
      await page.keyboard.press('Enter');
      assert(await page.locator('.lab-underhood').evaluate(el => el.open));
      await page.locator('.lab-reset').click();
      assert.equal(await page.locator('#lab-name').inputValue(), 'Les petits ateliers');
      assert.equal(await page.locator('.lab-booking').isVisible(), false);
      assert.equal(await page.locator('.lab-preview').getAttribute('data-palette'), 'nature');
      await page.locator('#lab-booking').check();
      for (const dark of [true, false]) {
        if ((await page.locator('body').evaluate(el => el.classList.contains('dark-mode'))) !== dark) await page.locator('.theme-toggle').click();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const box = await page.locator('.lab-preview').boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width);
      }
      await page.locator('.about-portrait img').evaluate(img => img.decode());
      if (width !== 320) await page.screenshot({ path: `tests/about-interactive-${width}.png`, fullPage: true });
    }
    await page.locator('#lab-headline').fill('<b>Une pause nature</b>');
    assert.equal(await page.locator('[data-lab-headline]').innerText(), '<b>Une pause nature</b>');
    assert.equal(await page.locator('[data-lab-headline] b').count(), 0);
    await page.locator('[name="lab-type"][value="modern"]').check();
    await page.locator('[name="lab-layout"][value="compact"]').check();
    await page.locator('#lab-catalog').check();
    await page.locator('#lab-search').fill('ceramique');
    assert.equal(await page.locator('[data-workshop]:visible').count(), 1);
    assert((await page.locator('[data-workshop]:visible').innerText()).includes('terre'));
    await page.locator('#lab-search').fill('introuvable');
    assert.equal(await page.locator('[data-workshop]:visible').count(), 0);
    assert((await page.locator('.lab-count').innerText()).includes('Aucun atelier'));
    await page.locator('#lab-search').fill('');
    assert.equal(await page.locator('[data-workshop]:visible').count(), 3);
    await page.locator('.lab-save').click();
    await page.reload();
    assert.equal(await page.locator('#lab-headline').inputValue(), '<b>Une pause nature</b>');
    assert.equal(await page.locator('.lab-preview').getAttribute('data-type'), 'modern');
    assert.equal(await page.locator('.lab-preview').getAttribute('data-layout'), 'compact');
    assert(await page.locator('#lab-catalog').isChecked());
    await page.locator('.lab-reset').click();
    await page.reload();
    assert.equal(await page.locator('.lab-preview').getAttribute('data-type'), 'editorial');
    assert.equal(await page.locator('#lab-catalog').isChecked(), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('sunscript-creative-lab-v1')), null);
    await page.evaluate(() => localStorage.setItem('sunscript-creative-lab-v1', '{bad json'));
    await page.reload();
    assert(await page.locator('.lab-controls').isVisible());
    await page.locator('.lab-reset').click();
    const denied = await browser.newContext();
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('Blocked storage'); } }));
    const deniedPage = await denied.newPage();
    deniedPage.on('pageerror', error => errors.push(error.message));
    await deniedPage.goto(url);
    await deniedPage.locator('.lab-save').click();
    assert((await deniedPage.locator('.lab-save-status').innerText()).includes('ne permet pas'));
    await deniedPage.locator('.lab-reset').click();
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noJS.newPage();
    await plain.goto(url);
    assert(await plain.locator('.lab-preview').isVisible());
    assert.equal(await plain.locator('.lab-controls').isVisible(), false);
    assert(await plain.locator('noscript').isVisible());
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log('PASS: personalization, palettes, keyboard, validation, confirmation, reset, themes, mobile and no-JS fallback.');
  } finally { await browser.close(); await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
