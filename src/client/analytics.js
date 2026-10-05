(() => {
  'use strict';
  const config = document.currentScript.dataset;
  const panel = document.querySelector('.analytics-consent');
  const preferences = document.querySelector('.analytics-preferences');
  const key = 'sunscript-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  let choice = null;
  let expires = 0;
  let loading = false;
  let viewed = false;
  let returnFocus = null;
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const pagePath = canonical ? new URL(canonical).pathname : null;
  function restore() {
    choice = null; expires = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && ['granted', 'denied'].includes(saved.choice) && saved.expires > Date.now()
        && saved.expires <= Date.now() + lifetime) {
        choice = saved.choice; expires = saved.expires;
      }
    } catch { /* Storage is optional: keep the choice in memory for this page. */ }
  }
  function allowed() {
    return choice === 'granted' && expires > Date.now() && pagePath &&
      navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
  }
  function track(name, data) {
    if (!allowed() || !window.umami?.track) return;
    // Only canonical paths and referring origins: no query strings, fragment,
    // arbitrary page text, form contents or personal identifiers.
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch {}
    try {
      Promise.resolve(window.umami.track(props => ({ ...props, url: pagePath, referrer,
        title: document.title, ...(name ? { name, data } : {}) }))).catch(() => {});
    } catch { /* Analytics must never interrupt navigation or the contact form. */ }
  }
  function pageview() {
    if (!viewed && allowed() && window.umami?.track) { viewed = true; track(); }
  }
  function start() {
    if (!allowed()) return;
    if (window.umami?.track) { pageview(); return; }
    if (loading) return;
    loading = true;
    const script = document.createElement('script');
    script.src = config.scriptUrl;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.dataset.websiteId = config.websiteId;
    script.dataset.hostUrl = config.hostUrl;
    script.dataset.autoTrack = 'false';
    script.dataset.doNotTrack = 'true';
    script.onload = () => { loading = false; pageview(); };
    script.onerror = () => { loading = false; script.remove(); };
    document.head.append(script);
  }
  restore();
  preferences.hidden = false;
  panel.hidden = choice !== null;
  preferences.addEventListener('click', () => {
    returnFocus = preferences; panel.hidden = false; panel.focus();
  });
  panel.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => {
    choice = button.dataset.analyticsChoice;
    expires = Date.now() + lifetime;
    try { localStorage.setItem(key, JSON.stringify({ choice, expires })); } catch {}
    panel.hidden = true;
    (returnFocus || preferences).focus({ preventScroll: true });
    start();
  }));
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    restore(); panel.hidden = choice !== null; start();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    for (const [selector, name] of [
      ['.theme-toggle', 'theme'], ['.motion-toggle', 'animations'],
      ['.lab-save', 'atelier_sauvegarder'], ['.lab-reset', 'atelier_reinitialiser'],
      ['.sent-again', 'contact_nouveau'],
    ]) if (button?.matches(selector)) track('clic_bouton', { cible: name });
    const link = event.target.closest?.('a[href]');
    if (!link || link.closest('.analytics-consent')) return;
    const url = new URL(link.href, location.href);
    let target;
    if (url.protocol === 'mailto:') target = 'email';
    else if (url.protocol === 'tel:') target = 'telephone';
    else if (['http:', 'https:'].includes(url.protocol)) {
      target = url.origin === location.origin ? url.pathname + url.hash : url.origin;
    } else return;
    const section = link.closest('nav, footer, section[id]');
    track('clic_lien', { cible: target, zone: section?.id || section?.tagName.toLowerCase() || 'contenu' });
  });
  // A confirmed server response, not the submit button click, is a conversion.
  document.addEventListener('sunscript:contact-sent', () => track('contact_envoye'));
  start();
})();
