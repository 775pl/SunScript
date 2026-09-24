const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/create-app');
const { ContactController } = require('../dist/contact.controller');
const { Logger } = require('@nestjs/common');
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

test('Delivery diagnostics distinguish configuration and network errors without exposing private data', async () => {
  const originalError = Logger.prototype.error;
  const logs = [];
  Logger.prototype.error = message => logs.push(JSON.parse(message));
  process.env.RESEND_API_KEY = 'secret-do-not-log';
  process.env.CONTACT_FROM = 'SunScript <formulaire@contact.example.com>';
  const req = { get: () => undefined, accepts: () => 'json', ip: '127.0.0.1' };
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const body = { name: 'Private Name', email: 'private@example.com', need: 'Private project content' };
  const cases = [
    [403, 'The contact.example.com domain is not verified.', 'sender_domain_not_verified'],
    [403, 'You can only send testing emails to your own email address (private@example.com).', 'resend_test_sender_restricted'],
    [401, 'API key is invalid secret-do-not-log', 'api_key_rejected'],
    [403, 'API key is restricted', 'api_key_permission_or_status'],
    [429, 'Too many requests', 'provider_rate_limit'],
    [400, 'Invalid from field: private@example.com', 'provider_validation_error'],
    [503, 'upstream unavailable', 'provider_rejected'],
  ];
  try {
    for (const [status, message, reason] of cases) {
      global.fetch = async () => new Response(JSON.stringify({ message }), { status });
      await new ContactController().submit(body, req, res);
      assert.equal(res.code, 502);
      assert.equal(logs.at(-1).status, status);
      assert.equal(logs.at(-1).reason, reason);
    }
    for (const [response, reason] of [
      [() => new Response('<html>Bad gateway</html>', { status: 502 }), 'provider_rejected'],
      [() => new Response('{}'), 'invalid_provider_receipt'],
      [() => { throw new DOMException('private@example.com', 'TimeoutError'); }, 'provider_timeout'],
      [() => { throw new Error('secret-do-not-log'); }, 'network_error'],
    ]) {
      global.fetch = async () => response();
      await new ContactController().submit(body, req, res);
      assert.equal(res.code, 502);
      assert.equal(logs.at(-1).reason, reason);
    }
    const output = JSON.stringify({ logs, response: res.body });
    for (const value of [...Object.values(body), process.env.RESEND_API_KEY, process.env.CONTACT_FROM, 'contact.example.com']) assert(!output.includes(value));
  } finally { Logger.prototype.error = originalError; global.fetch = request; }
});
