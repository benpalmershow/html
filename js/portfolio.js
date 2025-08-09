class EnhancedPortfolio {
    constructor() {
        this.portfolioData = [];
        this.filteredData = [];
        this.currentView = 'grid';
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPortfolioData();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('portfolio-search');
        searchInput.addEventListener('input', (e) => {
            this.filterData(e.target.value);
        });

        // View toggle
        const viewToggle = document.getElementById('view-toggle');
        viewToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-btn');
            if (btn) {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.toggleView();
            }
        });
    }

    async loadPortfolioData() {
        const loadingElement = document.getElementById('loading-message');
        const errorElement = document.getElementById('error-message');
        
        loadingElement.classList.remove('hidden');
        errorElement.classList.add('hidden');

        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT6z_p9IuSfz8-mFdOtKMNbmuqli7-EVaIDy9PiDkw-mneYgAmVroJEx5PGtUDEhYldcsnVyKLR5R2n/pub?gid=31137953&single=true&output=csv');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            this.portfolioData = this.parseCSV(csvText);
            this.filteredData = [...this.portfolioData];
            
            this.updateSummaryMetrics();
            this.renderPortfolio();
            this.updateLastUpdated();
            
            loadingElement.classList.add('hidden');

        } catch (error) {
            loadingElement.classList.add('hidden');
            errorElement.textContent = 'Error loading portfolio data: ' + error.message;
            errorElement.classList.remove('hidden');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length && values[0] && values[0].trim()) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }

        return data;
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/"/g, ''));
        return values;
    }

    updateSummaryMetrics() {
        if (this.portfolioData.length === 0) return;

        const headers = Object.keys(this.portfolioData[0]);
        let totalValue = 0;
        let bestPerformer = { symbol: '-', change: 0 };
        let dailyPnL = 0;

        // Calculate metrics from portfolio data
        this.portfolioData.forEach(row => {
            const symbol = row[headers[0]];
            
            // Find value columns
            Object.entries(row).forEach(([key, value]) => {
                if (typeof value === 'string' && value.includes('$')) {
                    const numValue = parseFloat(value.replace(/[$,]/g, ''));
                    if (!isNaN(numValue) && numValue > 0) {
                        totalValue += numValue;
                    }
                }
                
                // Look for percentage changes
                if (typeof value === 'string' && value.includes('%')) {
                    const percentValue = parseFloat(value.replace(/[%+]/g, ''));
                    if (!isNaN(percentValue) && Math.abs(percentValue) > Math.abs(bestPerformer.change)) {
                        bestPerformer = { symbol, change: percentValue };
                    }
                }
            });
        });

        // Simulate daily P&L (in real app, this would come from actual data)
        dailyPnL = totalValue * (Math.random() - 0.5) * 0.02; // ±1% random
        const dailyPercent = totalValue > 0 ? (dailyPnL / totalValue) * 100 : 0;

        // Update UI
        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
        document.getElementById('position-count').textContent = this.portfolioData.length;
        document.getElementById('best-performer').textContent = bestPerformer.symbol;
        document.getElementById('best-performer-change').textContent = `${bestPerformer.change >= 0 ? '+' : ''}${bestPerformer.change.toFixed(2)}%`;
        
        document.getElementById('daily-pnl').textContent = this.formatCurrency(dailyPnL);
        document.getElementById('daily-pnl-percent').textContent = `${dailyPercent >= 0 ? '+' : ''}${dailyPercent.toFixed(2)}%`;

        // Apply color classes
        const dailyPnLEl = document.getElementById('daily-pnl');
        const dailyPercentEl = document.getElementById('daily-pnl-percent');
        const performerChangeEl = document.getElementById('best-performer-change');
        
        const pnlClass = dailyPnL >= 0 ? 'positive' : 'negative';
        const performerClass = bestPerformer.change >= 0 ? 'positive' : 'negative';
        
        dailyPnLEl.className = `metric-value ${pnlClass}`;
        dailyPercentEl.className = `metric-change ${pnlClass}`;
        performerChangeEl.className = `metric-change ${performerClass}`;
    }

    renderPortfolio() {
        if (this.currentView === 'grid') {
            this.renderGridView();
        } else {
            this.renderTableView();
        }
    }

    renderGridView() {
        const container = document.getElementById('portfolio-grid');
        
        if (this.filteredData.length === 0) {
            container.innerHTML = '<div class="loading-state">No positions found matching your search.</div>';
            return;
        }

        const headers = Object.keys(this.filteredData[0]);
        
        container.innerHTML = this.filteredData.map(position => {
            const symbol = position[headers[0]] || 'N/A';
            const isValidSymbol = symbol.length <= 5 && symbol.match(/^[A-Z]+$/);
            
            // Generate mock data for enhanced display
            const mockPrice = (Math.random() * 200 + 50).toFixed(2);
            const mockChange = ((Math.random() - 0.5) * 10).toFixed(2);
            const mockShares = Math.floor(Math.random() * 100 + 10);
            const mockValue = (mockPrice * mockShares).toFixed(2);
            
            return `
                <div class="position-card fade-in">
                    <div class="position-header">
                        ${isValidSymbol ? 
                            `<a href="https://finance.yahoo.com/quote/${symbol}" target="_blank" class="position-symbol">${symbol}</a>` :
                            `<span class="position-symbol">${symbol}</span>`
                        }
                        <span class="position-type">Stock</span>
                    </div>
                    
                    <div class="position-details">
                        <div class="detail-item">
                            <span class="detail-label">Price</span>
                            <span class="detail-value">$${mockPrice}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Shares</span>
                            <span class="detail-value">${mockShares}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Market Value</span>
                            <span class="detail-value">$${mockValue}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Weight</span>
                            <span class="detail-value">${(Math.random() * 15 + 1).toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="position-performance">
                        <div class="performance-metric">
                            <div class="performance-label">Day Change</div>
                            <div class="performance-value ${mockChange >= 0 ? 'positive' : 'negative'}">
                                ${mockChange >= 0 ? '+' : ''}${mockChange}%
                            </div>
                        </div>
                        <div class="performance-metric">
                            <div class="performance-label">Total Return</div>
                            <div class="performance-value ${Math.random() > 0.5 ? 'positive' : 'negative'}">
                                ${Math.random() > 0.5 ? '+' : ''}${((Math.random() - 0.5) * 50).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Re-initialize Lucide icons
        lucide.createIcons();
    }

    renderTableView() {
        const tableHeader = document.getElementById('table-header');
        const tableBody = document.getElementById('table-body');
        
        if (this.filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 40px;">No positions found matching your search.</td></tr>';
            return;
        }

        const headers = Object.keys(this.filteredData[0]);
        
        // Create table header
        tableHeader.innerHTML = `
            <tr>
                ${headers.map(header => `
                    <th onclick="portfolio.sortTable('${header}')" class="tooltip" data-tooltip="Click to sort by ${header}">
                        ${header}
                        <span class="sort-indicator" id="sort-${header}"></span>
                    </th>
                `).join('')}
                <th>Actions</th>
            </tr>
        `;

        // Create table body
        tableBody.innerHTML = this.filteredData.map(row => {
            const symbol = row[headers[0]] || '';
            const isValidSymbol = symbol.length <= 5 && symbol.match(/^[A-Z]+$/);
            
            return `
                <tr>
                    ${headers.map(header => {
                        const value = row[header] || '';
                        const isSymbol = header === headers[0];
                        const isNumber = !isNaN(parseFloat(value.replace(/[$,%]/g, '')));
                        
                        return `
                            <td class="${isSymbol ? 'symbol-cell' : isNumber ? 'number-cell' : ''}">
                                ${isSymbol && isValidSymbol ? 
                                    `<a href="https://finance.yahoo.com/quote/${value}" target="_blank">${value}</a>` :
                                    value
                                }
                            </td>
                        `;
                    }).join('')}
                    <td>
                        <button class="view-btn" onclick="viewDetails('${symbol}')">
                            <i data-lucide="eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update sort indicators
        if (this.sortColumn) {
            const indicator = document.getElementById(`sort-${this.sortColumn}`);
            if (indicator) {
                indicator.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
            }
        }

        // Re-initialize Lucide icons
        lucide.createIcons();
    }

    filterData(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredData = this.portfolioData.filter(row => {
            return Object.values(row).some(value => 
                value.toLowerCase().includes(term)
            );
        });
        this.renderPortfolio();
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredData.sort((a, b) => {
            let valA = a[column] || '';
            let valB = b[column] || '';

            // Handle numeric values with $ or %
            const isNumeric = valA.includes('$') || valA.includes('%');
            if (isNumeric) {
                valA = parseFloat(valA.replace(/[$,%]/g, '')) || 0;
                valB = parseFloat(valB.replace(/[$,%]/g, '')) || 0;
            }

            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderPortfolio();
    }

    toggleView() {
        const gridView = document.getElementById('portfolio-grid');
        const tableView = document.getElementById('portfolio-table');
        
        gridView.classList.toggle('hidden', this.currentView !== 'grid');
        tableView.classList.toggle('hidden', this.currentView !== 'table');
        
        this.renderPortfolio();
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    updateLastUpdated() {
        const lastUpdatedEl = document.getElementById('last-updated-portfolio');
        const now = new Date();
        lastUpdatedEl.textContent = `Portfolio data last updated: ${now.toLocaleString()}`;
    }
}

// Initialize portfolio
const portfolio = new EnhancedPortfolio();

// Refresh portfolio data
function refreshPortfolioData() {
    portfolio.loadPortfolioData();
}

// View details placeholder
function viewDetails(symbol) {
    alert(`Viewing details for ${symbol}`);
}

// Initialize Lucide icons

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});
