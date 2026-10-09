(function () {
  // ---------- theme ----------
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const icon = btn && btn.querySelector('i');
  if (btn) {
    let stored;
    try { stored = localStorage.getItem('theme'); } catch {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch {}
    });
  }
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    if (icon) icon.className = mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    if (btn) btn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // ---------- navigation ----------
  const menu = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav-links');
  function closeMenu() {
    if (!menu || !nav) return;
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
    navLinks.forEach(link => link.addEventListener('click', closeMenu));
    const sections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    function updateNavigation() {
      const active = [...sections].reverse().find(section => section.getBoundingClientRect().top <= 150) || sections[0];
      navLinks.forEach(link => {
        if (active && link.getAttribute('href') === '#' + active.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    let scheduled = false;
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { updateNavigation(); scheduled = false; });
    }, { passive: true });
    updateNavigation();
    window.addEventListener('resize', () => { if (window.innerWidth > 600) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  // ---------- footer year ----------
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ---------- lightbox for publication thumbnails ----------
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">&times;</button><img alt=""/>';
  document.body.appendChild(overlay);
  const overlayImg = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.lightbox-close');
  let lastFocused;

  function openLightbox(src, alt, kind) {
    lastFocused = document.activeElement;
    overlayImg.src = src;
    overlayImg.alt = alt || '';
    overlay.classList.toggle('is-qr', kind === 'qr');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeLightbox() {
    overlay.classList.remove('is-open');
    overlay.classList.remove('is-qr');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
    setTimeout(() => { if (!overlay.classList.contains('is-open')) overlayImg.src = ''; }, 250);
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-zoom-src]');
    if (trigger) {
      e.preventDefault();
      openLightbox(
        trigger.getAttribute('data-zoom-src'),
        trigger.getAttribute('data-zoom-alt'),
        trigger.getAttribute('data-zoom-kind')
      );
    }
  });

  overlay.addEventListener('click', (e) => {
    // Click anywhere except the image itself closes the lightbox
    if (e.target === overlay || e.target === closeBtn) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
    if (e.key === 'Tab' && overlay.classList.contains('is-open')) {
      e.preventDefault();
      closeBtn.focus();
    }
  });
})();
