const fallbackData = {
    lastUpdated: "2025-06-10T12:00:00Z",
    indices: [{
        category: "Inflation Measures",
        agency: "BLS",
        name: "Consumer Price Index (CPI-U)",
        url: "https://www.bls.gov/cpi/",
        march: "319.8",
        april: "320.8",
        may: "321.5",
        june: "",
        change: "+0.22"
    }]
};

function extractNumericValue(value) {
    if (!value || value === "" || value === "TBD" || value.includes("TBD") || value === "—") return null;
    const cleanValue = value.toString().replace(/[$,%,\s,]/g, "");
    const numericValue = parseFloat(cleanValue);
    return isNaN(numericValue) ? null : numericValue;
}

function getLastTwoValues(indicator) {
    const months = [
        { month: "march", value: indicator.march },
        { month: "april", value: indicator.april },
        { month: "may", value: indicator.may },
        { month: "june", value: indicator.june }
    ].map(item => ({
        ...item,
        numeric: extractNumericValue(item.value)
    })).filter(item => item.numeric !== null);

    if (months.length < 2) return null;
    const lastTwo = months.slice(-2);
    return { previous: lastTwo[0], current: lastTwo[1] };
}

function calculatePercentageChange(previousValue, currentValue) {
    const isPercent = v => typeof v === "string" && v.trim().endsWith("%");
    
    if (isPercent(previousValue) && isPercent(currentValue)) {
        const prev = parseFloat(previousValue);
        const curr = parseFloat(currentValue);
        return isNaN(prev) || isNaN(curr) ? null : curr - prev;
    }
    
    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    return isNaN(prev) || isNaN(curr) || prev === 0 ? null : curr - prev;
}

function autoCalculateChanges(indices) {
    return indices.map(indicator => {
        const lastTwoValues = getLastTwoValues(indicator);
        if ((!indicator.change || indicator.change === "" || indicator.change === "—") && lastTwoValues) {
            const change = calculatePercentageChange(lastTwoValues.previous.numeric, lastTwoValues.current.numeric);
            const formattedChange = change >= 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
            return { ...indicator, change: formattedChange };
        }
        return indicator;
    });
}

function formatDataValue(value) {
    return value && value !== "" && value != null ? value : "—";
}

function formatChangeValue(change) {
    if (!change || change === "" || change == null) return "—";
    const numericChange = parseFloat(change.replace(/[+%]/g, ""));
    if (isNaN(numericChange)) return change;
    return numericChange > 0 ? `+${numericChange.toFixed(2)}%` : `${numericChange.toFixed(2)}%`;
}

function createTableRow(indicator) {
    const row = document.createElement("tr");
    
    // Name cell with link
    const nameCell = document.createElement("td");
    let url = indicator.url;
    if (!url || url === "") {
        url = `https://www.google.com/search?q=${encodeURIComponent(`${indicator.agency} official website`)}`;
    }
    
    const nameLink = document.createElement('a');
    nameLink.href = url;
    nameLink.target = '_blank';
    nameLink.rel = 'noopener noreferrer';
    nameLink.style.color = 'var(--text-primary)';
    nameLink.style.textDecoration = 'underline';
    nameLink.textContent = `${indicator.agency}: ${indicator.name}`;
    nameCell.appendChild(nameLink);
    row.appendChild(nameCell);
    
    // Data cells
    ["march", "april", "may", "june"].forEach(month => {
        const cell = document.createElement("td");
        cell.textContent = formatDataValue(indicator[month]);
        cell.className = "number";
        row.appendChild(cell);
    });
    
    // Change cell
    const changeCell = document.createElement("td");
    changeCell.textContent = formatChangeValue(indicator.change);
    changeCell.className = "number";
    
    if (indicator.change && indicator.change !== "—" && indicator.change !== "") {
        const changeValue = parseFloat(indicator.change.replace(/[+%]/g, ""));
        if (!isNaN(changeValue)) {
            if (changeValue > 0) {
                changeCell.style.color = "#059669";
            } else if (changeValue < 0) {
                changeCell.style.color = "#DC2626";
            }
        }
    }
    
    row.appendChild(changeCell);
    
    if (indicator.category) {
        row.setAttribute("data-category", indicator.category.toLowerCase().replace(/\s+/g, "-"));
    }
    
    return row;
}

function populateIndicesTable(data) {
    const tableBody = document.getElementById("indicesTableBody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    // Group indices by category
    const categories = {};
    data.indices.forEach(index => {
        const category = index.category || "Other";
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(index);
    });
    
    // Create table rows for each category
    Object.entries(categories).forEach(([category, indices]) => {
        // Add category header
        const categoryRow = document.createElement('tr');
        categoryRow.className = 'category-header';
        const categoryCell = document.createElement('td');
        categoryCell.colSpan = 6;
        categoryCell.innerHTML = `<strong>${category}</strong>`;
        categoryCell.className = 'category-header';
        categoryRow.appendChild(categoryCell);
        tableBody.appendChild(categoryRow);
        
        // Add indices for this category
        indices.forEach(index => {
            const row = createTableRow(index);
            tableBody.appendChild(row);
        });
    });
}

function updateLastUpdatedTimestamp(data) {
    const lastUpdatedElement = document.getElementById("last-updated-economic");
    if (lastUpdatedElement && data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        lastUpdatedElement.textContent = `Last updated: ${date.toLocaleString()}`;
    }
}

function showError(message) {
    const tableBody = document.getElementById("indicesTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">${message}</td></tr>`;
    }
}

function processFinancialsData(data) {
    try {
        if (!data || !data.indices || !Array.isArray(data.indices)) {
            throw new Error("Invalid data structure");
        }
        
        // Update lastUpdated timestamp to current time
        data.lastUpdated = new Date().toISOString();
        
        const processedIndices = autoCalculateChanges(data.indices);
        data.indices = processedIndices;
        
        populateIndicesTable(data);
        updateLastUpdatedTimestamp(data);
    } catch (error) {
        console.error('Error processing financial data:', error);
        showError("Error processing economic data. Please check back later.");
    }
}

async function loadFinancialsData() {
    const paths = [
        "./json/financials-data.json",
        "./financials-data.json", 
        "json/financials-data.json",
        "/json/financials-data.json",
        "../json/financials-data.json"
    ];
    
    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (!response.ok) continue;
            return await response.json();
        } catch (error) {
            console.error(`Error loading from ${path}:`, error);
            continue;
        }
    }
    
    throw new Error("Could not load financials data from any path");
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const data = await loadFinancialsData();
        processFinancialsData(data);
    } catch (error) {
        console.error('Failed to load financial data:', error);
        try {
            processFinancialsData(fallbackData);
            const tableBody = document.getElementById("indicesTableBody");
            if (tableBody && tableBody.children.length > 0) {
                const warningRow = document.createElement("tr");
                warningRow.innerHTML = '<td colspan="6" style="text-align: center; padding: 1rem; background-color: #FEF3C7; color: #92400E; font-size: 0.9em;">⚠️ Using cached data - some information may be outdated</td>';
                tableBody.insertBefore(warningRow, tableBody.firstChild);
            }
        } catch (fallbackError) {
            console.error('Fallback data also failed:', fallbackError);
            showError("Unable to load economic data. Please refresh the page or check back later.");
        }
    }
});

// Debug utilities (only in development)
if (typeof window !== "undefined") {
    window.financialsDebug = {
        loadFinancialsData,
        processFinancialsData,
        autoCalculateChanges,
        extractNumericValue
    };
}