// js/portfolio.js

document.addEventListener('DOMContentLoaded', function() {
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6z_p9IuSfz8-mFdOtKMNbmuqli7-EVaIDy9PiDkw-mneYgAmVroJEx5PGtUDEhYldcsnVyKLR5R2n/pub?gid=1020374850&single=true&output=csv';
    
    const tableContainer = document.getElementById('portfolio-table-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const lastUpdatedElement = document.getElementById('last-updated');

    // New elements for the summary card
    const summaryCard = document.getElementById('summary-card');
    const initialDateElement = document.getElementById('initial-date');
    const initialValueElement = document.getElementById('initial-value');
    const currentDateElement = document.getElementById('current-date');
    const currentValueElement = document.getElementById('current-value');
    const returnElement = document.getElementById('return');

    // --- IMPORTANT: Adjust these column indices based on your Google Sheet's structure ---
    // Assuming the first data row (after headers) contains this summary info
    // Column indices are 0-based.
    const summaryRowIndex = 1; // Assuming the summary data is in the second row of the CSV (first data row after header)
    const initialDateCol = 0; // Example: Column A in Google Sheet
    const initialValueCol = 1; // Example: Column B in Google Sheet
    const currentDateCol = 2;  // Example: Column C in Google Sheet
    const currentValueCol = 3; // Example: Column D in Google Sheet
    const returnCol = 4;       // Example: Column E in Google Sheet
    // --- End of IMPORTANT section ---


    // Function to display an error message
    function displayError(message) {
        loadingMessage.style.display = 'none';
        errorMessage.textContent = 'Error loading portfolio data: ' + message;
        errorMessage.style.display = 'block';
        summaryCard.style.display = 'none'; // Hide summary card on error
        console.error('Portfolio data fetch error:', message);
    }

    // Function to parse CSV data
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        const data = lines.map(line => {
            const cells = [];
            let inQuote = false;
            let currentCell = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    cells.push(currentCell.trim());
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            cells.push(currentCell.trim());
            return cells;
        });
        return data;
    }

    // Function to render the main table
    function renderTable(data) {
        if (!data || data.length < 2) {
            tableContainer.innerHTML = '<p>No data available to display.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Assuming the first row is the header
        const headers = data[0];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Data rows (starting from the second row or after summary row if different)
        // If your summary data is in the same row as the first table data, adjust the loop start
        const tableDataStartIndex = (summaryRowIndex === 0) ? 1 : summaryRowIndex + 1; // Start rendering table from row after summary if summary is not part of table headers.
        
        for (let i = tableDataStartIndex; i < data.length; i++) {
            const rowData = data[i];
            const tr = document.createElement('tr');
            rowData.forEach((cellData, index) => {
                const td = document.createElement('td');
                // Apply 'number' class to specific columns if they contain numeric data
                // Adjust these indices based on your actual data columns that should be right-aligned
                // Example: if 'Current Value', 'Gain/Loss', 'Return %' are columns 2, 3, 4 (0-indexed)
                if (index === 2 || index === 3 || index === 4) { // Modify these indices as per your sheet's number columns
                    td.classList.add('number');
                }
                td.textContent = cellData;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    }

    // Function to update the summary card
    function updateSummaryCard(data) {
        if (!data || data.length <= summaryRowIndex) {
            summaryCard.style.display = 'none'; // Hide if no data or not enough rows
            return;
        }

        const summaryDataRow = data[summaryRowIndex];

        // Ensure columns exist before trying to access them
        if (summaryDataRow[initialDateCol] !== undefined) {
            initialDateElement.textContent = summaryDataRow[initialDateCol];
        }
        if (summaryDataRow[initialValueCol] !== undefined) {
            initialValueElement.textContent = summaryDataRow[initialValueCol];
        }
        if (summaryDataRow[currentDateCol] !== undefined) {
            currentDateElement.textContent = summaryDataRow[currentDateCol];
        }
        if (summaryDataRow[currentValueCol] !== undefined) {
            currentValueElement.textContent = summaryDataRow[currentValueCol];
        }
        if (summaryDataRow[returnCol] !== undefined) {
            const returnValue = summaryDataRow[returnCol];
            returnElement.textContent = returnValue;

            // Optional: Apply color based on return value
            if (parseFloat(returnValue) > 0) { // Assuming return value is numeric
                returnElement.closest('.summary-item').style.color = 'var(--success-color, #28a745)';
            } else if (parseFloat(returnValue) < 0) {
                returnElement.closest('.summary-item').style.color = 'var(--error-color, #dc3545)';
            } else {
                returnElement.closest('.summary-item').style.color = 'var(--text-primary, #333)';
            }
        }
        
        summaryCard.style.display = 'grid'; // Show the summary card once data is loaded
    }


    // Fetch data from Google Sheet
    async function fetchGoogleSheetData() {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        tableContainer.innerHTML = ''; // Clear previous table content
        summaryCard.style.display = 'none'; // Hide summary card while loading

        try {
            const response = await fetch(googleSheetUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const data = parseCSV(csvText);
            
            updateSummaryCard(data); // Populate the summary card
            renderTable(data);       // Render the main table
            
            loadingMessage.style.display = 'none';
            
            const now = new Date();
            lastUpdatedElement.textContent = `Portfolio data refreshed automatically. Last updated: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}`;

        } catch (error) {
            displayError(error.message);
        }
    }

    // Initial fetch when the page loads
    fetchGoogleSheetData();

    // Optional: Refresh data periodically (e.g., every 5 minutes = 300000 milliseconds)
    // setInterval(fetchGoogleSheetData, 5 * 60 * 1000); 
});