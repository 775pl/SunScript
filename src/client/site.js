(() => {
  'use strict';
  const body = document.body;
  document.querySelector('.display-controls')?.removeAttribute('hidden');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const savePreference = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Private browsing may deny storage. */ } };
  let theme = readPreference('theme');
  const themeButton = document.querySelector('.theme-toggle');
  const motionButton = document.querySelector('.motion-toggle');
  const motionPreference = readPreference('motion');
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
    document.querySelectorAll('.srv, .wcard, .step').forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('reveal', 'pending'); observer.observe(el);
      }
    });
  }
  const bars = document.getElementById('bars');
  if (bars) [42,58,35,70,52,88,65].forEach((height, index) => {
    const bar = document.createElement('div'); bar.className = 'bar';
    bar.style.height = `${height}%`;
    bar.style.background = index === 6 ? 'var(--sun)' : index === 5 ? 'var(--sage)' : 'var(--sage-m)';
    bars.appendChild(bar);
  });
})();
