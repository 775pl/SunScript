/** Public tracker settings only. No account/API credentials belong in this config. */
export function analyticsConfig(env = process.env) {
  const production = env.VERCEL_ENV ? env.VERCEL_ENV === 'production' : env.NODE_ENV === 'production';
  // Public website identifier supplied by the owner. Explicit env values override
  // these defaults; setting both to empty disables tracking in production too.
  const websiteId = (env.UMAMI_WEBSITE_ID ?? (production ? 'dc39312c-2441-4c3b-a7db-961e6a605f3f' : '')).trim();
  const source = (env.UMAMI_SCRIPT_URL ?? (production ? 'https://cloud.umami.is/script.js' : '')).trim();
  if (!websiteId && !source) return null;
  if (!websiteId || !source || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(websiteId)) {
    throw new Error('Set UMAMI_WEBSITE_ID (UUID) and UMAMI_SCRIPT_URL together');
  }
  const script = new URL(source);
  const host = new URL(env.UMAMI_HOST_URL?.trim() ||
    (script.origin === 'https://cloud.umami.is' ? 'https://api-gateway.umami.dev' : script.origin));
  for (const url of [script, host]) {
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('Umami URLs must use HTTPS without credentials, query or fragment');
    }
  }
  return { websiteId, scriptUrl: script.href, scriptOrigin: script.origin,
    hostUrl: host.href.replace(/\/$/, ''), hostOrigin: host.origin };
}
