// Dashboard JS for financials.html
let financialData = null;

// Collapsible functionality (used by dashboard and other sections)
function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        toggle.textContent = '▲';
    }
}

async function fetchFinancialData() {
    const paths = [
        './json/financials-data.json',
        './financials-data.json',
        'json/financials-data.json',
        '/json/financials-data.json',
        '../json/financials-data.json'
    ];
    
    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (!response.ok) continue;
            financialData = await response.json();
            initializeDashboard();
            return;
        } catch (error) {
            console.error(`Error loading from ${path}:`, error);
            continue;
        }
    }
    
    // If we get here, none of the paths worked
    console.error('Could not load financial data from any path');
    document.getElementById('categories').innerHTML = 
        '<div class="error">Error loading financial data. Please try again later.</div>';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getChangeClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return 'change-neutral';
    if (change.startsWith('+')) return 'change-positive';
    if (change.startsWith('-')) return 'change-negative';
    return 'change-neutral';
}

function getArrowClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return '';
    if (change.startsWith('+')) return 'arrow-up';
    if (change.startsWith('-')) return 'arrow-down';
    return '';
}

function createIndicatorCard(indicator) {
    const months = ['march', 'april', 'may', 'june'];
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun'];
    
    let dataRows = '';
    months.forEach((month, index) => {
        const value = indicator[month];
        if (value && value !== '') {
            dataRows += `
                <div class="data-row">
                    <span class="month-label">${monthLabels[index]}:</span>
                    <span class="month-value">${value}</span>
                </div>
            `;
        }
    });

    const url = indicator.url || '#';

    return `
        <div class="indicator">
            <div class="indicator-name">
                ${indicator.name}
            </div>
            <div class="indicator-agency">Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">${indicator.agency}</a></div>
            ${dataRows}
            <div class="change-indicator ${getChangeClass(indicator.change)} ${getArrowClass(indicator.change)}">
                Change: ${indicator.change}${indicator.change !== "—" && !indicator.change.includes('%') ? '%' : ''}
            </div>
        </div>
    `;
}

function renderDashboard(filterCategory = 'all') {
    const categoriesContainer = document.getElementById('categories');
    const categories = [...new Set(financialData.indices.map(item => item.category))];
    
    let html = '';
    
    categories.forEach(category => {
        if (filterCategory !== 'all' && category !== filterCategory) return;
        
        const categoryIndicators = financialData.indices.filter(item => item.category === category);
        
        html += `
            <div class="category" data-category="${category}">
                <h2 class="category-title">${category}</h2>
                <div class="indicators-grid">
                    ${categoryIndicators.map(indicator => createIndicatorCard(indicator)).join('')}
                </div>
            </div>
        `;
    });
    
    categoriesContainer.innerHTML = html;
}

function setupFilters() {
    const filtersContainer = document.getElementById('filters');
    const categories = [...new Set(financialData.indices.map(item => item.category))];
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = category;
        button.dataset.category = category;
        filtersContainer.appendChild(button);
    });

    filtersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderDashboard(e.target.dataset.category);
        }
    });
}

function initializeDashboard() {
    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated)}`;
    setupFilters();
    renderDashboard();
}

document.addEventListener('DOMContentLoaded', fetchFinancialData);