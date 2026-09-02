const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { escapeXML } = require('ejs');
const { createApp } = require('../dist/create-app');
const { pages } = require('../dist/page-data');
let app, base;

before(async () => { app = await createApp(); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); });
after(async () => { await app?.close(); });

for (const [key, metadata] of Object.entries(pages)) {
  const route = key === 'home' ? '/' : '/' + key;
  test(`SSR ${route}: content, landmarks and compiled assets`, async () => {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes(escapeXML(metadata.title)));
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert(html.includes('/assets/site.css'));
    assert(html.includes('Préférences d’affichage') || html.includes("Préférences d'affichage"));
    assert(!html.includes('<%'), 'No unrendered EJS');
    assert(!html.includes('<style>'), 'Styles compiled outside the page');
    assert(!/<script(?![^>]*\bsrc=)/.test(html), 'No inline scripts');
    const links = [...html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)].map(match => match[1]);
    for (const link of new Set(links)) assert.equal((await fetch(base + link)).status, 200, link);
  });
  test(`Legacy ${key}.html redirects permanently`, async () => {
    const response = await fetch(base + (key === 'home' ? '/index.html' : '/' + key + '.html'), { redirect: 'manual' });
    assert.equal(response.status, 308); assert.equal(response.headers.get('location'), route);
  });
}

test('Unknown paths and private files are not served', async () => {
  for (const route of ['/missing', '/missing/deep', '/package.json', '/views/layout.ejs', '/src/main.ts', '/home']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
});
test('Health and security headers', async () => {
  const response = await fetch(base + '/health');
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert(response.headers.get('content-security-policy').includes("script-src 'self'"));
});
test('Original leaf is visible markup, isolated from text, with opt-out motion', async () => {
  const html = await (await fetch(base)).text();
  assert(html.includes('hero-leaf-frame'));
  assert(html.includes('M0,100 Q40,80 100,0 Q70,50 0,100'));
  const css = await (await fetch(base + '/assets/site.css')).text();
  assert(css.includes('tailwindcss'));
  assert(css.includes('leaf-sway'));
  assert(css.includes('prefers-reduced-motion'));
  assert(css.includes('grid-cols-1'));
  assert(css.includes('motion-enabled'));
});
