const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createApp } = require('../dist/create-app');
(async () => {
  const app = await createApp(); await app.listen(0, '127.0.0.1');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    for (const width of [1440, 900, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(await app.getUrl());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.locator('.hero h1').evaluate(el => getComputedStyle(el).overflow), 'visible');
      assert.equal(await page.locator('.hero-leaf-frame').evaluate(el => getComputedStyle(el).position), 'absolute');
      for (const id of ['services', 'tarifs', 'realisations', 'process', 'contact']) {
        await page.locator(`.site-nav a[href="#${id}"]`).click();
        await page.waitForFunction(id => {
          const gap = document.getElementById(id).getBoundingClientRect().top - document.querySelector('.site-nav').getBoundingClientRect().bottom;
          return gap >= 10 && gap <= 25;
        }, id, { timeout: 5000 }).catch(async error => {
          throw new Error(`${width} #${id}: ${await page.locator(`#${id}`).evaluate(el => JSON.stringify({ top: el.getBoundingClientRect().top, nav: document.querySelector('.site-nav').getBoundingClientRect().bottom, y: scrollY, max: document.documentElement.scrollHeight - innerHeight }))}: ${error.message}`);
        });
        const gap = await page.locator(`#${id}`).evaluate(el => el.getBoundingClientRect().top - document.querySelector('.site-nav').getBoundingClientRect().bottom);
        assert(gap >= 10 && gap <= 25, `${width} #${id}: ${gap}px`);
      }
      await page.goto(await app.getUrl());
      if (width === 1440 || width === 390) await page.screenshot({ path: `tests/refinements-${width}.png`, fullPage: true });
    }
    await page.locator('.contact-form button').evaluate(el => el.disabled = false);
    await page.locator('#contact-name').fill('Camille');
    await page.locator('#contact-email').fill('camille@example.com');
    await page.locator('#contact-need').fill('Un site pour mon atelier.');
    await page.route('**/contact', route => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Envoi indisponible.' }) }));
    await page.locator('.contact-form button').click();
    await page.getByText('Envoi indisponible.', { exact: true }).waitFor();
    assert.equal(await page.locator('#contact-need').inputValue(), 'Un site pour mon atelier.');
    await page.unroute('**/contact');
    await page.route('**/contact', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Message transmis.' }) }));
    await page.locator('.contact-form button').click();
    await page.getByText('Message transmis.', { exact: true }).waitFor();
    assert.equal(await page.locator('#contact-need').inputValue(), '');
    console.log('PASS: anchors at four widths, overflow, leaf positioning, form failure and success.');
  } finally { await browser.close(); await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
