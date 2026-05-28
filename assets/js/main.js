(function () {
  // ---------- theme ----------
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const icon = btn && btn.querySelector('i');
  if (btn) {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('theme', next);
    });
  }
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    if (icon) icon.className = mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // ---------- footer year ----------
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ---------- lightbox for publication thumbnails ----------
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">&times;</button><img alt=""/>';
  document.body.appendChild(overlay);
  const overlayImg = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function openLightbox(src, alt, kind) {
    overlayImg.src = src;
    overlayImg.alt = alt || '';
    overlay.classList.toggle('is-qr', kind === 'qr');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    overlay.classList.remove('is-open');
    overlay.classList.remove('is-qr');
    document.body.style.overflow = '';
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
  });
})();
