(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────

  const scriptEl    = document.currentScript || {};
  const THRESHOLD   = parseInt(scriptEl.dataset?.threshold ?? '300', 10);
  const DURATION    = parseInt(scriptEl.dataset?.duration  ?? '400', 10);
  const LABEL       = scriptEl.dataset?.label    ?? 'Back to top';
  const POSITION    = scriptEl.dataset?.position ?? 'right';

  // ── Inject styles ────────────────────────────────────────────────────────────

  const STYLE_ID = 'back-to-top-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #back-to-top-btn {
        position: fixed;
        bottom: 1.5rem;
        ${POSITION === 'left' ? 'left: 1.5rem;' : 'right: 1.5rem;'}
        z-index: 9999;

        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        padding: 0;

        /* Theme: inherits site CSS variables when available, falls back to safe defaults */
        background: var(--bg-tertiary, #2C5F5A);
        color: var(--text-primary, #fff);
        border: 1px solid var(--border-color, rgba(255,255,255,0.2));
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);

        opacity: 0;
        transform: translateY(0.75rem) scale(0.85);
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s ease, background 0.15s ease;
      }

      #back-to-top-btn.btt-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      #back-to-top-btn:hover {
        background: var(--bg-secondary, #3a7a74);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
      }

      #back-to-top-btn:active {
        transform: translateY(0) scale(0.97);
      }

      #back-to-top-btn:focus-visible {
        outline: 2px solid var(--text-primary, #fff);
        outline-offset: 3px;
      }

      #back-to-top-btn svg {
        display: block;
        width: 1.1rem;
        height: 1.1rem;
      }

      /* Keep button above a common sticky bottom nav if present */
      @media (max-width: 640px) {
        #back-to-top-btn {
          bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Build button ─────────────────────────────────────────────────────────────

  function buildButton() {
    if (document.getElementById('back-to-top-btn')) return;

    const btn = document.createElement('button');
    btn.id              = 'back-to-top-btn';
    btn.type            = 'button';
    btn.setAttribute('aria-label', LABEL);
    btn.setAttribute('title', LABEL);

    // Chevron-up SVG (no external deps)
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true" focusable="false">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    `;

    btn.addEventListener('click', scrollToTop);
    document.body.appendChild(btn);
    return btn;
  }

  // ── Scroll logic ─────────────────────────────────────────────────────────────

  function scrollToTop() {
    if (!DURATION || DURATION <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const start    = window.scrollY;
    const startAt  = performance.now();

    function step(now) {
      const elapsed  = now - startAt;
      const progress = Math.min(elapsed / DURATION, 1);
      // ease-out-cubic
      const eased    = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, start * (1 - eased));

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // ── Visibility toggle ────────────────────────────────────────────────────────

  function onScroll() {
    const btn = document.getElementById('back-to-top-btn');
    if (!btn) return;
    const visible = window.scrollY > THRESHOLD;
    btn.classList.toggle('btt-visible', visible);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    buildButton();
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state in case page is already scrolled
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();