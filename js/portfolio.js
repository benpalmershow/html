/**
 * Portfolio Manager Class
 * Handles loading and displaying portfolio data from JSON
 */
class PortfolioManager {
    constructor() {
        this.portfolioData = null;
        this.currentSort = { column: null, direction: 'asc' };
        this.initialize();
    }

    /**
     * Initialize the portfolio manager
     */
    async initialize() {
        try {
            await this.loadPortfolioData();
            this.renderPortfolioTable();
            this.renderPortfolioSections();
            this.setupEventListeners();
            this.updateLastUpdated();
            
            // Initialize Lucide icons after content is loaded
            if (window.lucide) {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Error initializing portfolio:', error);
            this.showError('Failed to load portfolio data. Please try again later.');
        }
    }

    /**
     * Show error message to the user
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            <strong class="font-bold">Error: </strong>
            <span class="block sm:inline">${message}</span>
        `;
        
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.prepend(errorDiv);
        }
    }

    /**
     * Load portfolio data from JSON file
     */
    async loadPortfolioData() {
        try {
            const response = await fetch('/json/portfolio.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.portfolioData = await response.json();
        } catch (error) {
            console.error('Error loading portfolio data:', error);
            throw error;
        }
    }
    
    /**
     * Update the last updated timestamp
     */
    updateLastUpdated() {
        if (this.portfolioData?.lastUpdated) {
            const lastUpdatedEl = document.getElementById('last-updated');
            if (lastUpdatedEl) {
                const date = new Date(this.portfolioData.lastUpdated);
                lastUpdatedEl.textContent = `Portfolio data last updated: ${date.toLocaleString()}`;
            }
        }
    }

    /**
     * Render the portfolio table with data from JSON
     */
    renderPortfolioTable() {
        if (!this.portfolioData?.portfolioComparison?.stocks?.length) return;
        
        const tableBody = document.querySelector('#portfolio-comparison-table tbody');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add rows for each stock
        this.portfolioData.portfolioComparison.stocks.forEach(stock => {
            const row = document.createElement('tr');
            
            // Add background color for highlighted stocks
            row.classList.add(stock.highlight ? 'bg-blue-50' : 'bg-slate-50');
            
            const description = stock.description || {
                title: stock.company,
                short: '',
                full: ''
            };
            
            // Create ticker link
            const tickerLink = `https://finance.yahoo.com/quote/${stock.ticker}`;
            
            row.innerHTML = `
                <td class="px-3 py-2 whitespace-nowrap text-slate-700 overflow-hidden text-ellipsis">
                    <a href="${tickerLink}" target="_blank" class="hover:text-blue-600 hover:underline">
                        ${stock.company}
                    </a>
                </td>
                <td class="px-3 py-2 whitespace-nowrap font-medium text-slate-900 overflow-hidden text-ellipsis">
                    <a href="${tickerLink}" target="_blank" class="hover:text-blue-600 hover:underline">
                        ${stock.ticker}
                    </a>
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-right font-medium text-slate-900">
                    ${stock.october || '-'}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-right text-slate-500">
                    ${stock.september || '-'}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-right text-slate-500">
                    ${stock.august || '-'}
                </td>
                <td class="px-3 py-2 text-slate-600 text-xs overflow-hidden w-[52%]">
                    <div class="truncate w-full group relative">
                        <span class="font-medium">${description.title}</span> - ${description.short}
                        ${description.full ? `
                            <div class="hidden group-hover:block absolute z-10 w-96 p-3 mt-1 -ml-2 text-xs bg-white border border-slate-200 rounded shadow-lg">
                                <div class="font-semibold mb-1">${description.title}</div>
                                <div>${description.full}</div>
                            </div>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    /**
     * Render portfolio sections from the data
     */
    renderPortfolioSections() {
        if (!this.portfolioData?.portfolioSections?.length) return;
        
        const sectionsContainer = document.getElementById('portfolio-sections');
        if (!sectionsContainer) return;
        
        this.portfolioData.portfolioSections.forEach(section => {
            const sectionElement = this.createPortfolioSection(section);
            if (sectionElement) {
                sectionsContainer.appendChild(sectionElement);
            }
        });
    }
    
    /**
     * Create a portfolio section element
     */
    createPortfolioSection(section) {
        if (!section?.id || !section.title || !section.holdings?.length) return null;
        
        const sectionElement = document.createElement('div');
        sectionElement.className = 'bg-white rounded-lg shadow-sm border border-slate-200 mb-6';
        
        // Create section header
        const header = document.createElement('div');
        header.className = 'p-6 border-b border-slate-200';
        header.innerHTML = `
            <h2 class="flex items-center justify-between text-lg font-medium text-slate-800 cursor-pointer select-none hover:text-slate-600 transition-colors" 
                data-toggle="collapse" data-target="${section.id}-holdings-grid">
                <div class="flex items-center gap-3">
                    <i data-lucide="${section.icon || 'briefcase'}" class="w-5 h-5 text-slate-500"></i>
                    <span>${section.title}</span>
                </div>
                <i data-lucide="chevron-down" class="w-5 h-5 text-slate-400 transition-transform duration-200"></i>
            </h2>
            ${section.subtitle ? `<p class="text-sm text-slate-500 mt-1">${section.subtitle}</p>` : ''}
        `;
        
        // Create holdings grid
        const grid = document.createElement('div');
        grid.id = `${section.id}-holdings-grid`;
        grid.className = 'p-6';
        grid.style.display = 'none'; // Start collapsed
        
        const gridInner = document.createElement('div');
        gridInner.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        // Add holdings to grid
        section.holdings.forEach(holding => {
            const holdingElement = this.createHoldingCard(holding);
            if (holdingElement) {
                gridInner.appendChild(holdingElement);
            }
        });
        
        grid.appendChild(gridInner);
        
        sectionElement.appendChild(header);
        sectionElement.appendChild(grid);
        
        return sectionElement;
    }
    
    /**
     * Create a holding card element
     */
    createHoldingCard(holding) {
        if (!holding.ticker) return null;
        
        const card = document.createElement('div');
        card.className = 'bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-sm hover:border-slate-300 transition-all duration-200';
        
        const tickerLink = `https://finance.yahoo.com/quote/${holding.ticker}`;
        const allocation = holding.allocation ? `
            <span class="bg-${holding.highlight ? 'blue' : 'slate'}-600 text-white px-2 py-1 rounded text-xs font-medium">
                ${holding.allocation}
            </span>
        ` : '';
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <a href="${tickerLink}" target="_blank" class="text-base font-semibold text-slate-700 hover:text-blue-600 transition-colors no-underline">
                    ${holding.ticker}
                </a>
                ${allocation}
            </div>
            ${holding.company ? `
                <div class="text-sm text-slate-600 mb-2">
                    <a href="${tickerLink}" target="_blank" class="hover:text-blue-600 hover:underline">
                        ${holding.company}
                    </a>
                </div>
            ` : ''}
            ${holding.description ? `
                <div class="text-xs text-slate-500 mb-2 line-clamp-2">
                    ${holding.description}
                </div>
            ` : ''}
            ${holding.notes ? `
                <div class="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div class="font-medium text-slate-600">Notes:</div>
                    <div>${holding.notes}</div>
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    /**
     * Set up event listeners for the portfolio page
     */
    setupEventListeners() {
        // Add sort handlers to table headers
        document.querySelectorAll('#portfolio-comparison-table th[data-sort]').forEach(th => {
            const sortKey = th.getAttribute('data-sort');
            if (sortKey) {
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => this.sortTable(sortKey));
            }
        });

        // Toggle collapsible sections
        document.body.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-toggle="collapse"]');
            if (toggleBtn) {
                const targetId = toggleBtn.getAttribute('data-target');
                const target = document.getElementById(targetId);
                const icon = toggleBtn.querySelector('i[data-lucide]');
                
                if (target) {
                    const isExpanding = target.style.display === 'none';
                    target.style.display = isExpanding ? 'block' : 'none';
                    
                    if (icon) {
                        // Rotate the chevron icon
                        icon.style.transform = isExpanding ? 'rotate(180deg)' : '';
                    }
                }
            }
        });
    }

    /**
     * Parse a percentage value from a string
     * @param {string} value - The percentage value to parse (e.g., "5%" or "-3.2%")
     * @returns {number} The parsed number or -Infinity for '-' values
     */
    parsePercentage(value) {
        if (value === '-' || value === undefined) return -Infinity;
        const num = parseFloat(value);
        return isNaN(num) ? -Infinity : num;
    }

    /**
     * Update the sort indicators in the table header
     * @param {string} sortKey - The key of the column being sorted
     * @param {string} direction - The sort direction ('asc' or 'desc')
     */
    updateSortIndicators(sortKey, direction) {
        // Remove all sort indicators and reset header text
        document.querySelectorAll('th[data-sort]').forEach(header => {
            // Get the original text from the data-original-text attribute or the header's text content
            const originalText = header.getAttribute('data-original-text') || header.textContent.trim();
            header.textContent = originalText; // Reset to original text
            header.setAttribute('data-original-text', originalText); // Ensure we have the original text saved
        });

        // Add sort indicator to current column
        const header = document.querySelector(`th[data-sort="${sortKey}"]`);
        if (header) {
            const originalText = header.getAttribute('data-original-text') || header.textContent.trim();
            header.setAttribute('data-original-text', originalText);
            header.innerHTML = `${originalText} <span class="ml-1">${direction === 'asc' ? '↑' : '↓'}</span>`;
        }
    }

    /**
     * Sort the portfolio table by the specified column
     * @param {string} sortKey - The key of the column to sort by
     */
    sortTable(sortKey) {
        if (!this.portfolioData?.portfolioComparison?.stocks?.length) return;

        // Toggle direction if sorting the same column
        const direction = this.currentSort.column === sortKey && 
                         this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        
        // Update the sort indicators
        this.updateSortIndicators(sortKey, direction);
        
        // Define sort functions for different columns
        const sortFunctions = {
            company: (a, b) => a.company.localeCompare(b.company),
            ticker: (a, b) => a.ticker.localeCompare(b.ticker),
            october: (a, b) => this.parsePercentage(a.october) - this.parsePercentage(b.october),
            september: (a, b) => this.parsePercentage(a.september) - this.parsePercentage(b.september),
            august: (a, b) => this.parsePercentage(a.august) - this.parsePercentage(b.august)
        };

        // Get the appropriate sort function
        const sortFunction = sortFunctions[sortKey];
        if (!sortFunction) return;

        // Sort the stocks
        this.portfolioData.portfolioComparison.stocks.sort((a, b) => {
            return direction === 'asc' ? sortFunction(a, b) : -sortFunction(a, b);
        });
        
        // Update current sort state
        this.currentSort = { column: sortKey, direction };
        
        // Re-render the table
        this.renderPortfolioTable();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize the portfolio manager
    window.portfolio = new PortfolioManager();

    // Helper function to toggle grid display
    function toggleGrid(gridId) {
        const grid = document.getElementById(gridId);
        if (grid) {
            grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Expose functions to global scope for HTML onclick handlers
    window.toggleGptPortfolio = () => toggleGrid('gpt-holdings-grid');
    window.toggleSeptemberPortfolio = () => toggleGrid('september-holdings-grid');
    window.toggleOctoberPortfolio = () => toggleGrid('october-holdings-grid');
});
