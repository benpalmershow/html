// js/portfolio.js

document.addEventListener('DOMContentLoaded', function() {
    // IMPORTANT: This URL points to your Google Sheet published as CSV.
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6z_p9IuSfz8-mFdOtKMNbmuqli7-EVaIDy9PiDkw-mneYgAmVroJEx5PGtUDEhYldcsnVyKLR5R2n/pub?gid=1020374850&single=true&output=csv';
    
    const tableContainer = document.getElementById('portfolio-table-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const lastUpdatedElement = document.getElementById('last-updated');

    // Function to display an error message
    function displayError(message) {
        loadingMessage.style.display = 'none'; // Hide loading
        errorMessage.textContent = 'Error loading portfolio data: ' + message;
        errorMessage.style.display = 'block'; // Show error
        console.error('Portfolio data fetch error:', message);
    }

    // Function to parse CSV data
    function parseCSV(csvText) {
        // Split into lines, filter out empty lines
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        // Map each line to an array of trimmed cell values
        // Handles commas within quotes (basic handling, for more complex CSV, use a library)
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
            cells.push(currentCell.trim()); // Add the last cell
            return cells;
        });
        return data;
    }

    // Function to render the table
    function renderTable(data) {
        if (!data || data.length < 2) { // Need at least header and one data row
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

        // Data rows (starting from the second row)
        for (let i = 1; i < data.length; i++) {
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

    // Fetch data from Google Sheet
    async function fetchGoogleSheetData() {
        loadingMessage.style.display = 'block'; // Show loading message
        errorMessage.style.display = 'none'; // Hide any previous error
        tableContainer.innerHTML = ''; // Clear previous table content

        try {
            const response = await fetch(googleSheetUrl);
            if (!response.ok) {
                // Throw an error if the HTTP status is not OK (e.g., 404, 500)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const data = parseCSV(csvText);
            renderTable(data);
            loadingMessage.style.display = 'none'; // Hide loading message on success
            
            // Update the 'Last updated' timestamp
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