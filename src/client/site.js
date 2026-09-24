(() => {
  'use strict';
  const body = document.body;
  const contactForm = document.querySelector('.contact-form');
  contactForm?.querySelector('.sent-again')?.addEventListener('click', () => {
    contactForm.classList.remove('is-sent');
    contactForm.querySelector('.contact-success').hidden = true;
    contactForm.querySelector('.contact-fields').hidden = false;
    contactForm.querySelector('.contact-status').textContent = '';
    contactForm.querySelector('[name="name"]').focus();
  });
  contactForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const button = contactForm.querySelector('button[type="submit"]');
    const status = contactForm.querySelector('.contact-status');
    button.disabled = true;
    status.textContent = 'Envoi en cours…';
    try {
      const response = await fetch(contactForm.action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(contactForm))), signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      status.textContent = result.message;
      if (response.ok) {
        contactForm.reset();
        contactForm.querySelector('.contact-fields').hidden = true;
        contactForm.classList.add('is-sent');
        const success = contactForm.querySelector('.contact-success');
        success.hidden = false;
        success.focus({ preventScroll: true });
      }
    } catch {
      status.textContent = 'L’envoi n’a pas pu être confirmé. Votre texte est conservé ; vous pouvez écrire à hello@sunscript.fr.';
    } finally { button.disabled = false; }
  });
  document.querySelector('.display-controls')?.removeAttribute('hidden');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const savePreference = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Private browsing may deny storage. */ } };
  let theme = readPreference('theme');
  const themeButton = document.querySelector('.theme-toggle');
  const motionButton = document.querySelector('.motion-toggle');
  const motionPreference = readPreference('motion');
  const navigation = document.querySelector('.site-nav');
  if (navigation) {
    const measureNavigation = () => document.documentElement.style.setProperty('--nav-offset', `${Math.ceil(navigation.getBoundingClientRect().height) + 16}px`);
    measureNavigation();
    new ResizeObserver(measureNavigation).observe(navigation);
  }
  let motionRequested = motionPreference === 'on' || (motionPreference !== 'off' && innerWidth > 900 && (navigator.hardwareConcurrency || 8) > 4);

  function applyTheme() {
    const dark = theme === 'dark' || (theme !== 'light' && darkScheme.matches);
    body.classList.toggle('dark-mode', dark);
    if (themeButton) {
      themeButton.textContent = dark ? 'Thème : sombre' : 'Thème : clair';
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.setAttribute('aria-label', dark ? 'Thème : sombre. Activer le thème clair' : 'Thème : clair. Activer le thème sombre');
    }
  }
  function applyMotion() {
    const enabled = motionRequested && !reducedMotion.matches;
    document.documentElement.classList.toggle('motion-enabled', enabled);
    body.classList.toggle('motion-enabled', enabled);
    if (motionButton) {
      motionButton.textContent = enabled ? 'Animations : oui' : 'Animations : non';
      motionButton.setAttribute('aria-pressed', String(enabled));
      motionButton.setAttribute('aria-label', reducedMotion.matches ? 'Animations : non. Désactivées selon votre système' : enabled ? 'Animations : oui. Désactiver les animations' : 'Animations : non. Activer les animations');
      motionButton.disabled = reducedMotion.matches;
    }
    if (!enabled) document.querySelectorAll('.pending').forEach(el => el.classList.remove('pending'));
  }
  themeButton?.addEventListener('click', () => {
    theme = body.classList.contains('dark-mode') ? 'light' : 'dark';
    savePreference('theme', theme); applyTheme();
  });
  motionButton?.addEventListener('click', () => {
    motionRequested = !motionRequested;
    savePreference('motion', motionRequested ? 'on' : 'off'); applyMotion();
  });
  darkScheme.addEventListener('change', applyTheme);
  reducedMotion.addEventListener('change', applyMotion);
  applyTheme(); applyMotion();

  // Preserve native anchors, history and focus. Only update a visual shadow:
  // no nav height changes, no transformed hero and no inertial scroll loop.
  const nav = document.querySelector('nav');
  let scrollFrame = 0;
  function updateNav() { scrollFrame = 0; nav?.classList.toggle('scrolled', scrollY > 50); }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNav);
  }, { passive:true });
  updateNav();
  document.addEventListener('visibilitychange', () => body.classList.toggle('page-hidden', document.hidden));

  // Fade cards once, never entire/nested sections or the hero.
  if (body.classList.contains('motion-enabled') && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('pending'); observer.unobserve(entry.target);
      }
    }, { threshold:0, rootMargin:'0px 0px 40px 0px' });
    document.querySelectorAll('.srv, .wcard, .step').forEach((el, index) => {
      el.style.setProperty('--reveal-order', String(index % 4));
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('reveal', 'pending'); observer.observe(el);
      }
    });
  }
  const showcase = document.querySelector('[data-showcase]');
  if (showcase) {
    showcase.querySelector('.showcase-controls').hidden = false;
    showcase.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', () => {
        const mood = showcase.querySelector('[name="showcase-mood"]:checked').value;
        const format = showcase.querySelector('[name="showcase-format"]:checked').value;
        const frame = showcase.querySelector('.showcase-frame');
        frame.dataset.mood = mood;
        frame.dataset.format = format;
        showcase.querySelector('.showcase-status').textContent = `Ambiance ${mood}, aperçu ${format === 'mobile' ? 'mobile' : 'ordinateur'}. Le même site s’adapte.`;
      });
    });
  }
  const lab = document.querySelector('[data-site-lab]');
  if (lab) {
    const controls = lab.querySelector('.lab-controls');
    const name = lab.querySelector('#lab-name');
    const preview = lab.querySelector('.lab-preview');
    const booking = lab.querySelector('#lab-booking');
    const form = lab.querySelector('.lab-booking');
    const slot = lab.querySelector('#lab-slot');
    const result = lab.querySelector('.lab-result');
    const headline = lab.querySelector('#lab-headline');
    const catalog = lab.querySelector('#lab-catalog');
    const search = lab.querySelector('#lab-search');
    const saveStatus = lab.querySelector('.lab-save-status');
    const storageKey = 'sunscript-creative-lab-v1';
    const defaults = { name:'Les petits ateliers', headline:'Un moment pour laisser fleurir vos idées.', palette:'nature', type:'editorial', layout:'portrait', booking:false, catalog:false };
    const choices = { palette:['nature','soleil','ocean'], type:['editorial','modern','handwritten'], layout:['portrait','compact'] };
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    function filterCatalog() {
      let count = 0;
      lab.querySelectorAll('[data-workshop]').forEach(card => {
        card.hidden = !normalize(card.dataset.workshop + ' ' + card.textContent).includes(normalize(search.value));
        if (!card.hidden) count++;
      });
      lab.querySelector('.lab-count').textContent = count ? `${count} atelier${count > 1 ? 's' : ''} à découvrir` : 'Aucun atelier trouvé. Essayez « fleurs », « dessin » ou « terre ».';
    }
    function updateCatalog() {
      lab.querySelector('.lab-catalog').hidden = !catalog.checked;
      search.value = '';
      filterCatalog();
    }
    function updateHeadline() {
      lab.querySelector('[data-lab-headline]').textContent = headline.value.trim() || defaults.headline;
    }
    function applyConfiguration(config) {
      name.value = typeof config.name === 'string' ? config.name.slice(0,40) : defaults.name;
      headline.value = typeof config.headline === 'string' ? config.headline.slice(0,90) : defaults.headline;
      lab.querySelector('[data-lab-name]').textContent = name.value.trim() || 'Votre atelier';
      updateHeadline();
      for (const [key, allowed] of Object.entries(choices)) {
        const value = allowed.includes(config[key]) ? config[key] : defaults[key];
        lab.querySelector(`[name="lab-${key}"][value="${value}"]`).checked = true;
        preview.dataset[key] = value;
      }
      booking.checked = config.booking === true;
      catalog.checked = config.catalog === true;
      updateBooking();
      updateCatalog();
    }
    controls.hidden = false;
    lab.classList.add('is-interactive');
    name.addEventListener('input', () => {
      lab.querySelector('[data-lab-name]').textContent = name.value.trim() || 'Votre atelier';
    });
    lab.querySelectorAll('[name="lab-palette"]').forEach(radio => {
      radio.addEventListener('change', () => { preview.dataset.palette = radio.value; });
    });
    headline.addEventListener('input', updateHeadline);
    for (const key of ['type','layout']) lab.querySelectorAll(`[name="lab-${key}"]`).forEach(radio => {
      radio.addEventListener('change', () => { preview.dataset[key] = radio.value; });
    });
    catalog.addEventListener('change', updateCatalog);
    search.addEventListener('input', filterCatalog);
    lab.querySelector('.lab-save').addEventListener('click', () => {
      const config = { name:name.value, headline:headline.value, palette:preview.dataset.palette, type:preview.dataset.type, layout:preview.dataset.layout, booking:booking.checked, catalog:catalog.checked };
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
        saveStatus.textContent = 'Votre version est gardée sur cet appareil. Vous la retrouverez en revenant ici.';
      } catch { saveStatus.textContent = 'Ce navigateur ne permet pas la sauvegarde. Vous pouvez continuer à créer ici.'; }
    });
    function updateBooking() {
      form.hidden = !booking.checked;
      lab.querySelector('.lab-static-note').hidden = booking.checked;
      result.textContent = '';
      slot.value = '';
    }
    booking.addEventListener('change', updateBooking);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      result.textContent = `Et voilà ! Votre essai pour ${slot.value} est confirmé dans cet aperçu. Aucune réservation réelle n’a été effectuée.`;
    });
    slot.addEventListener('change', () => { result.textContent = ''; });
    lab.querySelector('.lab-reset').addEventListener('click', () => {
      applyConfiguration(defaults);
      try {
        localStorage.removeItem(storageKey);
        saveStatus.textContent = 'Une nouvelle page blanche : votre version sauvegardée a été effacée.';
      } catch { saveStatus.textContent = 'L’aperçu est réinitialisé. La sauvegarde de ce navigateur reste inaccessible.'; }
    });
    try {
      const saved = JSON.parse(readPreference(storageKey));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        applyConfiguration(saved);
        saveStatus.textContent = 'Votre dernière composition est de retour. Continuez à la faire évoluer !';
      }
    } catch { /* An invalid stored draft must not prevent interaction. */ }
  }
})();
