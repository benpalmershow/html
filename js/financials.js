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

    // Tooltip logic for all common indicators
    let tooltipText = '';
    if (indicator.name) {
        const name = indicator.name.toLowerCase();
        if (name.includes('ism manufacturing pmi')) {
            tooltipText = 'Above 50 means expanding, below 50 means contracting.';
        } else if (name.includes('consumer price index') || name.includes('cpi')) {
            tooltipText = 'CPI measures the average change over time in the prices paid by urban consumers for a market basket of consumer goods and services (inflation).';
        } else if (name.includes('core cpi')) {
            tooltipText = 'Core CPI excludes food and energy prices, providing a clearer view of underlying inflation trends.';
        } else if (name.includes('producer price index') || name.includes('ppi')) {
            tooltipText = 'PPI measures the average change over time in the selling prices received by domestic producers for their output (input inflation).';
        } else if (name.includes('unemployment rate')) {
            tooltipText = 'The percentage of the labor force that is jobless and actively seeking employment.';
        } else if (name.includes('average hourly earnings')) {
            tooltipText = 'Tracks changes in wages paid to American workers, a key measure of wage inflation.';
        } else if (name.includes('treasury yield curve')) {
            tooltipText = 'The difference between long-term and short-term Treasury yields; an inverted curve can signal recession.';
        } else if (name.includes('vix')) {
            tooltipText = 'The Volatility Index (VIX) measures market expectations of near-term volatility conveyed by S&P 500 stock index option prices.';
        } else if (name.includes('copper')) {
            tooltipText = 'Copper prices are seen as a proxy for global economic health due to its widespread industrial use.';
        } else if (name.includes('baltic dry index')) {
            tooltipText = 'The Baltic Dry Index tracks shipping rates for bulk commodities and is a leading indicator of economic activity.';
        } else if (name.includes('labor force participation')) {
            tooltipText = 'The percentage of the working-age population that is either employed or actively looking for work.';
        } else if (name.includes('initial jobless claims')) {
            tooltipText = 'The number of people filing for unemployment benefits for the first time; a leading indicator of labor market health.';
        } else if (name.includes('jobs growth')) {
            tooltipText = 'Monthly change in the number of jobs, indicating the strength of the labor market.';
        } else if (name.includes('building permits')) {
            tooltipText = 'The number of new residential building permits issued, a leading indicator of future construction activity.';
        } else if (name.includes('stock prices')) {
            tooltipText = 'Stock prices reflect investor expectations for the future of the economy and interest rates.';
        } else if (name.includes('leading credit index')) {
            tooltipText = 'A composite index of financial indicators that can predict turning points in the business cycle.';
        } else if (name.includes('interest rate spread') || name.includes('yield curve')) {
            tooltipText = 'The difference between long- and short-term interest rates; a negative spread (inverted yield curve) can signal recession.';
        } else if (name.includes('consumer expectations')) {
            tooltipText = 'Measures consumer sentiment about future economic conditions, a leading indicator of spending.';
        } else if (name.includes('gdp')) {
            tooltipText = 'Gross Domestic Product (GDP) measures the total value of goods and services produced in a country.';
        } else if (name.includes('personal income')) {
            tooltipText = 'Tracks the total income received by individuals, a coincident indicator of economic health.';
        } else if (name.includes('industrial production')) {
            tooltipText = 'Measures the output of the industrial sector, including manufacturing, mining, and utilities.';
        } else if (name.includes('retail sales')) {
            tooltipText = 'Tracks the total receipts of retail stores, a key indicator of consumer spending.';
        }
    }

    return `
        <div class="indicator">
            <div class="indicator-name">
                ${indicator.name}
                ${tooltipText ? `<span class=\"indicator-tooltip\">${tooltipText}</span>` : ''}
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