// Filter and UI handler logic

let currentCategory = 'all';

const categoryIcons = {
    'Employment Indicators': '<i data-lucide="users" class="filter-icon"></i>',
    'Housing Market': '<i data-lucide="home" class="filter-icon"></i>',
    'Business Indicators': '<i data-lucide="briefcase" class="filter-icon"></i>',
    'Consumer Indicators': '<i data-lucide="shopping-cart" class="filter-icon"></i>',
    'Trade & Tariffs': '<i data-lucide="ship" class="filter-icon"></i>',
    'Government': '<i data-lucide="landmark" class="filter-icon"></i>',
    'Commodities': '<i data-lucide="package" class="filter-icon"></i>',
    'Prediction Markets': '<i data-lucide="trending-up" class="filter-icon"></i>',
    'Financial Markets': '<i data-lucide="bar-chart-2" class="filter-icon"></i>'
};

function setupFilters(financialData, SELECTORS, DATA_ATTRS) {
    const categories = [...new Set(financialData.indices.map(item => item.category))];
    const categoryDropdown = document.getElementById('categoryDropdown');
    const desktopFilters = document.getElementById('desktopFilters');

    // Reset content
    categoryDropdown.innerHTML = '';
    desktopFilters.innerHTML = '';

    // Helper to create filter elements
    const createFilterElements = (id, iconClass, text, isLatest = false) => {
        // Dropdown item
        const dropItem = document.createElement('button');
        dropItem.className = SELECTORS.DROPDOWN_ITEM.slice(1);
        if (id === 'all') dropItem.classList.add('active');
        if (isLatest) {
            dropItem.dataset.sort = 'latest';
            dropItem.setAttribute(DATA_ATTRS.IS_LATEST, 'true');
        } else {
            dropItem.setAttribute(DATA_ATTRS.CATEGORY, id);
        }
        dropItem.innerHTML = `${iconClass}<span>${text}</span>`;
        categoryDropdown.appendChild(dropItem);

        // Desktop button
        const deskBtn = document.createElement('button');
        deskBtn.className = `${SELECTORS.FILTER_BTN.slice(1)} ${SELECTORS.DESKTOP_FILTER_BTN.slice(1)}`;
        if (id === 'all') deskBtn.classList.add('active');
        if (isLatest) {
            deskBtn.dataset.sort = 'latest';
            deskBtn.setAttribute(DATA_ATTRS.IS_LATEST, 'true');
        } else {
            deskBtn.setAttribute(DATA_ATTRS.CATEGORY, id);
        }
        deskBtn.innerHTML = `${iconClass}<span>${text}</span>`;
        desktopFilters.appendChild(deskBtn);
    };

    // Add "All"
    createFilterElements('all', '<i data-lucide="list" class="filter-icon"></i>', 'All');

    // Add "Latest"
    createFilterElements('latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);

    // Add Categories
    categories.forEach(category => {
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2" class="filter-icon"></i>';
        createFilterElements(category, icon, category);
    });

    // Add 13F Holdings button
    createFilterElements('13F Holdings', '<i data-lucide="building-2" class="filter-icon"></i>', '13F Holdings');

    // Setup dropdown toggle functionality
    setupDropdownToggle('categoryBtn', 'categoryDropdown');

    // Setup filter button clicks (both dropdown and desktop)
    const setupFilterButtonClick = (element, selector, closeDropdown = false) => {
        element.addEventListener('click', function (e) {
            const btn = e.target.closest(selector);
            if (btn) {
                handleFilterClick(btn, 'filter', SELECTORS, DATA_ATTRS);
                if (closeDropdown) closeAllDropdowns(SELECTORS);
            }
        });
    };

    setupFilterButtonClick(document.getElementById('categoryDropdown'), SELECTORS.DROPDOWN_ITEM, true);
    setupFilterButtonClick(desktopFilters, SELECTORS.FILTER_BTN, false);

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.filter-group') && !e.target.closest('.filter-dropdown')) {
            closeAllDropdowns(SELECTORS);
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateActiveElements(selector, predicate) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove('active');
        if (predicate(el)) {
            el.classList.add('active');
        }
    });
}

function handleFilterClick(element, source, SELECTORS, DATA_ATTRS) {
    const category = element.getAttribute(DATA_ATTRS.CATEGORY);
    const isLatest = element.getAttribute(DATA_ATTRS.IS_LATEST) === 'true';

    // Update dropdown items
    const dropdownSelector = `${SELECTORS.CATEGORY_DROPDOWN} ${SELECTORS.DROPDOWN_ITEM}`;
    updateActiveElements(dropdownSelector, (i) =>
        (isLatest && i.getAttribute(DATA_ATTRS.IS_LATEST) === 'true') || (!isLatest && i.getAttribute(DATA_ATTRS.CATEGORY) === category)
    );

    // Update desktop buttons
    const desktopSelector = `${SELECTORS.DESKTOP_FILTERS} ${SELECTORS.FILTER_BTN}`;
    updateActiveElements(desktopSelector, (b) =>
        (isLatest && b.getAttribute(DATA_ATTRS.IS_LATEST) === 'true') || (!isLatest && b.getAttribute(DATA_ATTRS.CATEGORY) === category)
    );

    // Handle 13F Holdings button
    if (category === '13F Holdings') {
        document.getElementById('categories').style.display = 'none';
        document.getElementById('latest-13f-filings').style.display = 'block';
        currentCategory = '13F Holdings';
        return;
    }

    // Show categories (and 13F section if "all" is selected)
    document.getElementById('categories').style.display = 'block';
    if (category === 'all') {
        document.getElementById('latest-13f-filings').style.display = 'block';
    } else {
        document.getElementById('latest-13f-filings').style.display = 'none';
    }

    // Render
    if (isLatest) {
        renderDashboard('all', true);
    } else {
        currentCategory = category || 'all';
        renderDashboard(currentCategory, false);
    }
}

function setupDropdownToggle(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    const group = btn.closest('.filter-group');

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns({ FILTER_DROPDOWN: '.filter-dropdown', FILTER_GROUP: '.filter-group' });
        dropdown.classList.add('open');
        group.classList.add('open');
    });
}

function closeAllDropdowns(SELECTORS) {
    document.querySelectorAll(SELECTORS.FILTER_DROPDOWN).forEach(el => el.classList.remove('open'));
    document.querySelectorAll(SELECTORS.FILTER_GROUP).forEach(el => el.classList.remove('open'));
}

function setupIconHandlers(selector, handler) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handler.call(this);
        });
    });
}

function setupInfoIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.INFO_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        const explanationDiv = indicator.querySelector('.explanation-text');
        const explanation = this.getAttribute(DATA_ATTRS.EXPLANATION);

        if (explanationDiv.style.display === 'none') {
            explanationDiv.textContent = explanation;
            explanationDiv.style.display = 'block';
            this.classList.add('active');
        } else {
            explanationDiv.style.display = 'none';
            this.classList.remove('active');
        }
    });
}

function setupChartIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.CHART_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        const indicatorName = indicator.getAttribute(DATA_ATTRS.INDICATOR_NAME);
        toggleChartOverlay(indicator, indicatorName);
    });
}

function setupExpandHandlers(SELECTORS) {
    setupIconHandlers(SELECTORS.EXPAND_TOGGLE, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        indicator.classList.toggle('expanded');
    });
}

function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeChartModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');
    content?.classList.toggle('collapsed');
    toggle?.classList.toggle('collapsed');
    if (toggle) toggle.textContent = content?.classList.contains('collapsed') ? '▲' : '▼';
}
