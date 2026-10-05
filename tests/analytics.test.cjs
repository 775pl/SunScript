const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyticsConfig } = require('../dist/analytics');
const id = '94db1cb1-74f4-4a40-ad6c-962362670409';
test('owner configuration is enabled only in production unless explicitly overridden', () => {
  const config = analyticsConfig({ VERCEL_ENV: 'production' });
  assert.equal(config.websiteId, 'dc39312c-2441-4c3b-a7db-961e6a605f3f');
  assert.equal(config.scriptUrl, 'https://cloud.umami.is/script.js');
  assert.equal(analyticsConfig({ NODE_ENV: 'production' }).websiteId, config.websiteId);
  assert.equal(analyticsConfig({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), null);
  assert.equal(analyticsConfig({ NODE_ENV: 'development' }), null);
  assert.equal(analyticsConfig({ VERCEL_ENV: 'production', UMAMI_WEBSITE_ID: '', UMAMI_SCRIPT_URL: '' }), null);
  const vercel = require('../vercel.json');
  const policy = vercel.headers.find(rule => rule.source === '/(.*)').headers.find(header => header.key === 'Content-Security-Policy').value;
  assert(policy.split(';').find(rule => rule.trim().startsWith('script-src ')).includes(config.scriptOrigin));
  assert(policy.split(';').find(rule => rule.trim().startsWith('connect-src ')).includes(config.hostOrigin));
});
test('analytics is opt-in at deployment and validates public configuration', () => {
  assert.equal(analyticsConfig({}), null);
  for (const env of [ { UMAMI_WEBSITE_ID: id }, { UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js' },
    { UMAMI_WEBSITE_ID: 'not-a-uuid', UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js' } ]) {
    assert.throws(() => analyticsConfig(env));
  }
  for (const source of ['http://stats.example/script.js', 'https://user:pass@stats.example/script.js', 'https://stats.example/script.js?key=secret']) {
    assert.throws(() => analyticsConfig({ UMAMI_WEBSITE_ID: id, UMAMI_SCRIPT_URL: source }));
  }
  assert.equal(analyticsConfig({ UMAMI_WEBSITE_ID: id, UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js' }).hostOrigin, 'https://api-gateway.umami.dev');
  assert.equal(analyticsConfig({ UMAMI_WEBSITE_ID: id, UMAMI_SCRIPT_URL: 'https://stats.example/script.js' }).hostOrigin, 'https://stats.example');
});
