const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/create-app');
let app, base;
const request = global.fetch;
const saved = { ...process.env };
before(async () => { app = await createApp(); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); process.env.SITE_URL = base; });
after(async () => { global.fetch = request; process.env = saved; await app.close(); });
test('Contact validation, availability, delivery failures, recipient and rate limit', async () => {
  const body = { name: 'Camille', email: 'camille@example.com', need: 'Un site pour mon atelier.' };
  const post = (data = body, origin = base, accept = 'application/json') => request(base + '/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: accept, Origin: origin }, body: JSON.stringify(data),
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_FROM;
  assert.equal((await post()).status, 503);
  for (const data of [{ ...body, email: 'bad' }, { ...body, name: [] }, { ...body, need: 'x' }, { ...body, website: 'spam' }]) {
    assert.equal((await post(data)).status, 400);
  }
  assert.equal((await post(body, 'https://elsewhere.example')).status, 403);
  process.env.RESEND_API_KEY = 'test-only';
  process.env.CONTACT_FROM = 'SunScript <contact@example.com>';
  let calls = [];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    calls.push(JSON.parse(options.body));
    return new Response('{"error":"unavailable"}', { status: 503 });
  };
  assert.equal((await post()).status, 502);
  global.fetch = async (url, options) => { calls.push(JSON.parse(options.body)); return new Response('{"id":"test-receipt"}', { status: 200 }); };
  assert.equal((await post()).status, 200);
  assert.deepEqual(calls.at(-1).to, ['hello@sunscript.fr']);
  assert.equal(calls.at(-1).reply_to, body.email);
  const plain = await post(body, base, 'text/html');
  assert.equal(plain.status, 200);
  assert((await plain.text()).includes('Merci pour votre message.'));
  await post(); await post();
  assert.equal((await post()).status, 429);
  assert.equal(calls.length, 5);
});
