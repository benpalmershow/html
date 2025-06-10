// js/portfolio.js

document.addEventListener('DOMContentLoaded', function() {
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6z_p9IuSfz8-mFdOtKMNbmuqli7-EVaIDy9PiDkw-mneYgAmVroJEx5PGtUDEhYldcsnVyKLR5R2n/pub?gid=1020374850&single=true&output=csv';
    
    const tableContainer = document.getElementById('portfolio-table-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const lastUpdatedElement = document.getElementById('last-updated-portfolio');

    function displayError(message) {
        loadingMessage.style.display = 'none';
        errorMessage.textContent = 'Error loading portfolio data: ' + message;
        errorMessage.style.display = 'block';
        console.error('Portfolio data fetch error:', message);
    }

    // Function to parse CSV data and filter empty rows / rows after 'CCL'
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const data = [];
        let cclFound = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                // If an empty line is encountered *after* data has started,
                // and 'CCL' has been found, consider it the end of relevant data.
                if (data.length > 0 && cclFound) {
                    break; 
                }
                continue; // Skip truly empty lines otherwise
            }

            const cells = [];
            let inQuote = false;
            let currentCell = '';
            for (let i = 0; i < trimmedLine.length; i++) {
                const char = trimmedLine[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    cells.push(currentCell.trim());
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            cells.push(currentCell.trim()); // Add the last cell

            // Check if this row contains 'CCL' (case-insensitive for robustness)
            if (cells.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('CCL'))) {
                cclFound = true;
            }

            // Only add the row if it's not completely empty (e.g., just commas)
            if (cells.some(cell => cell !== '')) {
                data.push(cells);
            }
        }
        return data;
    }

    function renderTable(data) {
        if (!data || data.length < 2) { // Need at least header and one data row
            tableContainer.innerHTML = '<p>No data available to display.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headers = data[0];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        for (let i = 1; i < data.length; i++) {
            const rowData = data[i];
            // Skip rows that are empty or contain only whitespace after processing
            if (rowData.every(cell => cell === '')) {
                continue;
            }

            const tr = document.createElement('tr');
            rowData.forEach((cellData, index) => {
                const td = document.createElement('td');
                
                // First column should contain stock symbols - make them links to Yahoo Finance
                if (index === 0 && cellData && cellData.trim() !== '') {
                    const symbol = cellData.trim();
                    // Check if it looks like a stock symbol (not header-like text)
                    if (symbol.length <= 5 && symbol.match(/^[A-Z]+$/)) {
                        const link = document.createElement('a');
                        link.href = `https://finance.yahoo.com/quote/${symbol}`;
                        link.target = '_blank';
                        link.rel = 'noopener';
                        link.textContent = symbol;
                        td.appendChild(link);
                    } else {
                        td.textContent = cellData;
                    }
                } else {
                    td.textContent = cellData;
                }
                
                // Apply number formatting to numeric columns (adjust indices based on your data structure)
                // Typically columns with dollar amounts, percentages, or quantities should be right-aligned
                if (index >= 1 && cellData && (
                    cellData.includes('$') || 
                    cellData.includes('%') || 
                    !isNaN(parseFloat(cellData.replace(/[$,%]/g, '')))
                )) {
                    td.classList.add('number');
                }
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    }

    async function fetchGoogleSheetData() {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        tableContainer.innerHTML = '';

        try {
            const response = await fetch(googleSheetUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const data = parseCSV(csvText);
            renderTable(data);
            loadingMessage.style.display = 'none';
            
            const now = new Date();
            lastUpdatedElement.textContent = `Portfolio data refreshed automatically. Last updated: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}`;

        } catch (error) {
            displayError(error.message);
        }
    }

    fetchGoogleSheetData();
});