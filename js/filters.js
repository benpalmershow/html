// Filter and UI handler logic - Simple filter bar (like news.html)
// SOLID: SRP - each module has one responsibility

let currentCategory = 'all';

const boundIconHandlers = new Set();

const categoryIcons = {
    'Employment Indicators': '<i data-lucide="users" class="filter-icon"></i>',
    'Housing Market': '<i data-lucide="home" class="filter-icon"></i>',
    'Business Indicators': '<i data-lucide="briefcase" class="filter-icon"></i>',
    'Consumer Indicators': '<i data-lucide="shopping-cart" class="filter-icon"></i>',
    'Trade & Tariffs': '<i data-lucide="ship" class="filter-icon"></i>',
    'Government': '<i data-lucide="landmark" class="filter-icon"></i>',
    'Commodities': '<i data-lucide="package" class="filter-icon"></i>',
    'Prediction Markets': '<i data-lucide="trending-up" class="filter-icon"></i>',
    'Financial Markets': '<i data-lucide="bar-chart-2" class="filter-icon"></i>',
    'World Cup': '<i data-lucide="trophy" class="filter-icon"></i>'
};

/* =========================================
   Filter Click Handler (SRP: filter state management)
   ========================================= */

function updateActiveElements(selector, predicate) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove('active');
        if (predicate(el)) el.classList.add('active');
    });
}

function handleFilterClick(element, category, isLatest = false) {
    if (category === '13F Holdings') {
        if (typeof ensureLoad13F === 'function') ensureLoad13F();
    } else if (category === 'World Cup') {
        if (typeof loadWorldCupMatches === 'function') loadWorldCupMatches();
    } else {
        if (typeof ensureLoad13F === 'function') ensureLoad13F();
    }

    if (typeof setActiveFilter === 'function') {
        setActiveFilter(isLatest ? 'latest' : category);
    }
}

function syncFilterToURL(category, isLatest) {
    const url = new URL(window.location);
    if (isLatest) {
        url.searchParams.set('filter', 'latest');
    } else if (category === '13F Holdings') {
        url.searchParams.set('filter', '13F Holdings');
    } else {
        url.searchParams.set('filter', category || 'all');
    }
    url.searchParams.delete('indicator');
    history.replaceState(null, '', url);
}

/* =========================================
   Main Filter Setup (delegates to focused modules)
   ========================================= */

function setupFilters(financialData) {
     const categories = [...new Set(financialData.indices.map(item => item.category))];
     const filtersContainer = document.getElementById('financials-filters');

     if (!filtersContainer) return;

     // Check if there's a nested .filters element for buttons, otherwise use the container
     const buttonsContainer = filtersContainer.querySelector('.filters') || filtersContainer;
     buttonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.remove());

const createFilterBtn = (id, icon, text, isLatest = false) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `filter-btn ${id === 'all' ? 'active' : ''}`;
          btn.dataset.category = id;
          if (isLatest) btn.dataset.isLatest = 'true';
          btn.setAttribute('aria-label', `Filter by ${text}`);
          btn.innerHTML = `${icon}<span class="filter-text">${text}</span>`;
          return btn;
      };

     // Create buttons
     const allBtn = createFilterBtn('all', '<i data-lucide="list" class="filter-icon"></i>', 'All');
     buttonsContainer.appendChild(allBtn);

     const latestBtn = createFilterBtn('latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);
     buttonsContainer.appendChild(latestBtn);

     categories.forEach(category => {
         const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2" class="filter-icon"></i>';
         const btn = createFilterBtn(category, icon, category);
         buttonsContainer.appendChild(btn);
     });

     const th13fBtn = createFilterBtn('13F Holdings', '<i data-lucide="building-2" class="filter-icon"></i>', '13F Holdings');
     buttonsContainer.appendChild(th13fBtn);

     // Add World Cup filter button
     const worldCupBtn = createFilterBtn('World Cup', '<i data-lucide="trophy" class="filter-icon"></i>', 'World Cup');
     buttonsContainer.appendChild(worldCupBtn);

     // Use event delegation on the buttons container
     buttonsContainer.addEventListener('click', function (e) {
         const btn = e.target.closest('.filter-btn');
         if (!btn) return;

         buttonsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
         btn.classList.add('active');

         const category = btn.dataset.category;
         const isLatest = btn.dataset.isLatest === 'true';

         handleFilterClick(btn, category, isLatest);

         // Render indicator categories only for non-special filters
         if (category !== '13F Holdings' && category !== 'World Cup') {
             renderDashboard(isLatest ? 'all' : category, isLatest);
         }
     });

     if (typeof lucide !== 'undefined') lucide.createIcons();
 }

/* =========================================
   Icon Handlers (SRP: UI interactions)
   ========================================= */

function setupIconHandlers(selector, handler) {
    if (boundIconHandlers.has(selector)) return;
    boundIconHandlers.add(selector);

    document.addEventListener('click', function (e) {
        const icon = e.target.closest(selector);
        if (icon) {
            e.preventDefault();
            e.stopPropagation();
            handler.call(icon);
        }
    });
}

let explanationTooltip = null;
let explanationTooltipOwner = null;

// Whether the browser supports native CSS Anchor Positioning (Chrome/Edge 125+).
// Kept only to decide whether to clear any leftover anchor-name on the button;
// placement itself is always computed in JS for consistent cross-screen behavior.
const SUPPORTS_CSS_ANCHOR =
    typeof CSS !== 'undefined' &&
    CSS.supports('anchor-name: --a') &&
    CSS.supports('position-area: block-end');

function getExplanationTooltip() {
    if (explanationTooltip) return explanationTooltip;
    const tip = document.createElement('div');
    tip.className = 'explanation-tooltip';
    tip.setAttribute('role', 'dialog');
    tip.setAttribute('aria-live', 'polite');
    tip.innerHTML = '<button class="tooltip-close" aria-label="Close explanation">&times;</button><div class="tooltip-body"></div>';
    document.body.appendChild(tip);

    tip.querySelector('.tooltip-close').addEventListener('click', hideExplanationTooltip);
    document.addEventListener('click', function (e) {
        if (!explanationTooltip || !explanationTooltip.classList.contains('open')) return;
        if (e.target.closest('.explanation-tooltip') || e.target.closest('.info-btn')) return;
        hideExplanationTooltip();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideExplanationTooltip();
    });
    // JS positioning is now the only path, so always keep the tooltip glued to
    // its button on scroll/resize across all browsers.
    window.addEventListener('scroll', repositionExplanationTooltip, true);
    window.addEventListener('resize', repositionExplanationTooltip);
    explanationTooltip = tip;
    return tip;
}

let repositionScheduled = false;
function repositionExplanationTooltip() {
    if (!explanationTooltip || !explanationTooltip.classList.contains('open') || !explanationTooltipOwner) return;
    if (repositionScheduled) return;
    repositionScheduled = true;
    requestAnimationFrame(function () {
        repositionScheduled = false;
        if (!explanationTooltipOwner || !explanationTooltip.classList.contains('open')) return;
        positionExplanationTooltip(explanationTooltipOwner);
    });
}

function positionExplanationTooltip(btn) {
    const tip = explanationTooltip;
    if (!tip) return;

    const rect = btn.getBoundingClientRect();

    // If the anchoring button has scrolled out of view, keep the tooltip hidden
    // but leave it open so it reappears once the button is visible again.
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
        tip.style.visibility = 'hidden';
        return;
    }

    // Use offsetWidth/offsetHeight (not getBoundingClientRect) so the tooltip's
    // true layout size is measured. getBoundingClientRect reflects the in-flight
    // tooltipIn scale animation, which would report a smaller size and let the
    // viewport clamp under-compute on shorter screens.
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + margin;
    let arrowAtTop = true;
    if (top + tipH > vh - margin && rect.top - margin - tipH > margin) {
        top = rect.top - margin - tipH;
        arrowAtTop = false;
    }
    // Hard-clamp vertically into the viewport. This handles explanations taller
    // than the available space on either side of the button (e.g. short mobile
    // viewports) so the tooltip never overflows the bottom of the screen.
    top = Math.max(margin, Math.min(top, vh - tipH - margin));

    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, vw - tipW - margin));

    tip.style.top = top + 'px';
    tip.style.left = left + 'px';

    const arrowX = rect.left + rect.width / 2 - left;
    tip.style.setProperty('--arrow-left', arrowX + 'px');
    tip.classList.toggle('arrow-bottom', !arrowAtTop);

    tip.style.visibility = 'visible';
}

function hideExplanationTooltip() {
    if (!explanationTooltip) return;
    explanationTooltip.classList.remove('open');
    explanationTooltip.style.visibility = 'hidden';
    if (explanationTooltipOwner) {
        explanationTooltipOwner.classList.remove('active');
        if (SUPPORTS_CSS_ANCHOR) explanationTooltipOwner.style.anchorName = '';
        explanationTooltipOwner = null;
    }
}

function showExplanationTooltip(btn, explanation) {
    const tip = getExplanationTooltip();
    tip.querySelector('.tooltip-body').textContent = explanation;

    if (explanationTooltipOwner && explanationTooltipOwner !== btn) {
        explanationTooltipOwner.classList.remove('active');
        if (SUPPORTS_CSS_ANCHOR) explanationTooltipOwner.style.anchorName = '';
    }
    explanationTooltipOwner = btn;
    btn.classList.add('active');

    tip.classList.add('open');

    // Single positioning path: always compute placement in JS so the tooltip is
    // clamped into the viewport on every screen size and browser (the native
    // CSS-anchor fallback could overflow when the explanation is taller than the
    // available space on either side of the button).
    if (SUPPORTS_CSS_ANCHOR) btn.style.anchorName = '';
    tip.classList.remove('css-anchored');
    tip.style.visibility = 'hidden';
    positionExplanationTooltip(btn);
}

function setupInfoIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.INFO_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        if (!indicator) return;

        const explanation = this.getAttribute(DATA_ATTRS.EXPLANATION);
        if (!explanation) return;

        if (explanationTooltipOwner === this && explanationTooltip && explanationTooltip.classList.contains('open')) {
            hideExplanationTooltip();
            return;
        }
        showExplanationTooltip(this, explanation);
    });
}

function setupChartIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.CHART_BTN, function () {
        console.log('Chart button clicked');
        const indicator = this.closest(SELECTORS.INDICATOR);
        const indicatorName = indicator.getAttribute(DATA_ATTRS.INDICATOR_NAME);
        console.log('Indicator name:', indicatorName);
        toggleChartOverlay(indicator, indicatorName);
    });
}

function setupExpandHandlers(SELECTORS) {
    setupIconHandlers(SELECTORS.EXPAND_TOGGLE, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        indicator.classList.toggle('expanded');
    });
}

/* =========================================
   Modal & Search (SRP: separated concerns)
   ========================================= */

function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    if (!modal || modal.dataset.handlersBound === 'true') return;
    modal.dataset.handlersBound = 'true';

    const closeBtn = document.getElementById('closeChartModal');
    if (closeBtn) closeBtn.addEventListener('click', () => { hideChartModal(modal); });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideChartModal(modal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') hideChartModal(modal);
    });
}

function showChartModal(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => firstFocusable?.focus(), 0);

    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
        }
    };
    modal._trapFocusHandler = trapFocus;
    modal.addEventListener('keydown', trapFocus);
}

function hideChartModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (modal._trapFocusHandler) {
        modal.removeEventListener('keydown', modal._trapFocusHandler);
    }
}

function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');
    content?.classList.toggle('collapsed');
    toggle?.classList.toggle('collapsed');
    if (toggle) toggle.textContent = content?.classList.contains('collapsed') ? '▲' : '▼';
}

function setupStickyObserver() {
    const filters = document.getElementById('financials-filters');
    if (!filters) return;

    const observer = new IntersectionObserver(
        ([entry]) => { filters.classList.toggle('stuck', !entry.isIntersecting); },
        { threshold: 1.0, rootMargin: '-1px 0px 0px 0px' }
    );

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.marginBottom = '-1px';
    filters.parentNode.insertBefore(sentinel, filters);
    observer.observe(sentinel);
}
