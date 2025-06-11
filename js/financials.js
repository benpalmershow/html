// Enhanced financials.js with improved JSON loading and error handling

// Fallback data in case JSON fails to load
const fallbackData = {
  "lastUpdated": "2025-06-10T12:00:00Z",
  "indices": [
    {
      "category": "Inflation Measures",
      "agency": "BLS",
      "name": "Consumer Price Index (CPI-U)",
      "url": "https://www.bls.gov/cpi/",
      "march": "319.8",
      "april": "320.8",
      "may": "321.5",
      "june": "",
      "change": "+0.22"
    },
    {
      "category": "Employment Indicators",
      "agency": "BLS",
      "name": "Unemployment Rate (%)",
      "url": "https://www.bls.gov/news.release/empsit.nr0.htm",
      "march": "4.2%",
      "april": "4.2%",
      "may": "4.2%",
      "june": "",
      "change": "0.00"
    }
  ]
};

function extractNumericValue(value) {
  if (!value || value === "" || value === "TBD" || value.includes("TBD") || value === "—") {
    return null;
  }
  
  // Remove common formatting characters and extract number
  const cleaned = value.toString().replace(/[$,%,\s,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function getLastTwoValues(item) {
  const values = [
    { month: 'march', value: item.march },
    { month: 'april', value: item.april },
    { month: 'may', value: item.may },
    { month: 'june', value: item.june }
  ];
  
  // Filter out null/empty values and extract numeric values
  const validValues = values
    .map(v => ({ ...v, numeric: extractNumericValue(v.value) }))
    .filter(v => v.numeric !== null);
  
  if (validValues.length < 2) {
    return null;
  }
  
  // Return the last two values
  const lastTwo = validValues.slice(-2);
  return {
    previous: lastTwo[0],
    current: lastTwo[1]
  };
}

function calculatePercentageChange(previous, current) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function autoCalculateChanges(indices) {
  return indices.map(item => {
    const lastTwo = getLastTwoValues(item);
    
    // If change is blank or empty, calculate it
    if ((!item.change || item.change === "" || item.change === "—") && lastTwo) {
      const percentChange = calculatePercentageChange(lastTwo.previous.numeric, lastTwo.current.numeric);
      const newChange = percentChange >= 0 ? `+${percentChange.toFixed(2)}` : `${percentChange.toFixed(2)}`;
      
      console.log(`Auto-calculated change for ${item.name}: ${newChange}%`);
      
      return {
        ...item,
        change: newChange
      };
    }
    
    return item;
  });
}

function formatDataValue(value) {
  if (!value || value === "" || value === null || value === undefined) {
    return "—";
  }
  
  // Handle special cases like "TBD" dates
  if (typeof value === "string" && (value.includes("TBD") || value.includes("*"))) {
    return value;
  }
  
  return value;
}

function formatChangeValue(change) {
  if (!change || change === "" || change === null || change === undefined) {
    return "—";
  }
  
  const numericChange = parseFloat(change.replace(/[+%]/g, ''));
  if (isNaN(numericChange)) {
    return change;
  }
  
  // Format with appropriate sign and styling
  const formattedChange = numericChange > 0 ? `+${numericChange.toFixed(2)}%` : `${numericChange.toFixed(2)}%`;
  return formattedChange;
}

function createTableRow(data) {
  const row = document.createElement('tr');
  
  // Index name with agency descriptor and link
  const nameCell = document.createElement('td');
  if (data.url) {
    nameCell.innerHTML = `<a href="${data.url}" target="_blank" rel="noopener">${data.agency}: ${data.name}</a>`;
  } else {
    nameCell.textContent = `${data.agency}: ${data.name}`;
  }
  row.appendChild(nameCell);
  
  // Data columns
  const months = ['march', 'april', 'may', 'june'];
  months.forEach(month => {
    const cell = document.createElement('td');
    cell.textContent = formatDataValue(data[month]);
    cell.className = "number";
    row.appendChild(cell);
  });
  
  // Change column
  const changeCell = document.createElement('td');
  changeCell.textContent = formatChangeValue(data.change);
  changeCell.className = "number";
  
  // Color-code the change cell based on positive/negative values
  if (data.change && data.change !== "—" && data.change !== "") {
    const numericChange = parseFloat(data.change.replace(/[+%]/g, ''));
    if (!isNaN(numericChange)) {
      if (numericChange > 0) {
        changeCell.style.color = '#059669'; // Green for positive
      } else if (numericChange < 0) {
        changeCell.style.color = '#DC2626'; // Red for negative
      }
    }
  }
  
  row.appendChild(changeCell);
  
  // Add category styling if specified
  if (data.category) {
    row.setAttribute('data-category', data.category.toLowerCase().replace(/\s+/g, '-'));
  }
  
  return row;
}

function addCategoryHeaders(indices) {
  const tbody = document.getElementById("indicesTableBody");
  if (!tbody) {
    console.error('Table body element not found');
    return;
  }
  
  const categories = {};
  
  // Group indices by category
  indices.forEach(item => {
    const category = item.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(item);
  });
  
  // Clear existing content
  tbody.innerHTML = "";
  
  // Add each category with header
  Object.keys(categories).forEach(categoryName => {
    // Add category header row
    const headerRow = document.createElement('tr');
    headerRow.className = "category-divider";
    
    const headerCell = document.createElement('td');
    headerCell.colSpan = 6;
    headerCell.innerHTML = `<strong>${categoryName}</strong>`;
    headerCell.className = "category-header";
    headerRow.appendChild(headerCell);
    
    tbody.appendChild(headerRow);
    
    // Add items in this category
    categories[categoryName].forEach(data => {
      const row = createTableRow(data);
      tbody.appendChild(row);
    });
  });
}

function populateIndicesTable(indices) {
  const tbody = document.getElementById("indicesTableBody");
  if (!tbody) {
    console.error('Table body element not found');
    return;
  }
  
  tbody.innerHTML = "";
  
  indices.forEach(data => {
    const row = createTableRow(data);
    tbody.appendChild(row);
  });
}

function loadTradingViewWidget(data) {
  const container = document.getElementById('tradingview-widget');
  if (!container) return;
  
  // Clear any existing content
  container.innerHTML = '';
  
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
  
  // Configure widget
  const widgetConfig = {
    colorTheme: "light",
    dateRange: "12M",
    showChart: true,
    locale: "en",
    largeChartUrl: "",
    isTransparent: false,
    showSymbolLogo: true,
    showFloatingTooltip: false,
    width: "100%",
    height: "400",
    tabs: data.tradingViewTabs || []
  };
  
  script.innerHTML = JSON.stringify(widgetConfig);
  container.appendChild(script);
}

function updateLastUpdatedTimestamp(data) {
  const lastUpdatedEconomic = document.getElementById('last-updated-economic');
  if (lastUpdatedEconomic && data.lastUpdated) {
    const date = new Date(data.lastUpdated);
    lastUpdatedEconomic.textContent = `Last updated: ${date.toLocaleDateString()}`;
  }
}

function showError(message) {
  const tbody = document.getElementById("indicesTableBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">${message}</td></tr>`;
  }
}

function processFinancialsData(data) {
  try {
    console.log('Processing financials data:', data);
    
    if (!data || !data.indices || !Array.isArray(data.indices)) {
      throw new Error('Invalid data structure');
    }
    
    // Auto-calculate missing change values
    const indicesWithCalculatedChanges = autoCalculateChanges(data.indices);
    
    // Check if data has categories defined
    const hasCategories = indicesWithCalculatedChanges.some(item => item.category);
    
    if (hasCategories) {
      addCategoryHeaders(indicesWithCalculatedChanges);
    } else {
      populateIndicesTable(indicesWithCalculatedChanges);
    }
    
    // Load TradingView widget
    loadTradingViewWidget(data);
    
    // Update timestamp
    updateLastUpdatedTimestamp(data);
    
    console.log('Successfully loaded and processed financials data');
    
  } catch (error) {
    console.error('Error processing financials data:', error);
    showError('Error processing economic data. Please check back later.');
  }
}

async function loadFinancialsData() {
  const possiblePaths = [
    './json/financials-data.json',
    './financials-data.json',
    'json/financials-data.json',
    '/json/financials-data.json',
    '../json/financials-data.json'
  ];
  
  for (const path of possiblePaths) {
    try {
      console.log(`Attempting to load data from: ${path}`);
      const response = await fetch(path);
      
      if (!response.ok) {
        console.warn(`Failed to load from ${path}: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Successfully loaded data from: ${path}`);
      return data;
      
    } catch (error) {
      console.warn(`Error loading from ${path}:`, error.message);
      continue;
    }
  }
  
  // If all paths fail, throw error
  throw new Error('Could not load financials data from any path');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing financials data...');
  
  try {
    const data = await loadFinancialsData();
    processFinancialsData(data);
  } catch (error) {
    console.error('Failed to load financials data, using fallback:', error);
    
    // Try to use fallback data
    try {
      processFinancialsData(fallbackData);
      
      // Show a warning message
      const tbody = document.getElementById("indicesTableBody");
      if (tbody && tbody.children.length > 0) {
        const warningRow = document.createElement('tr');
        warningRow.innerHTML = '<td colspan="6" style="text-align: center; padding: 1rem; background-color: #FEF3C7; color: #92400E; font-size: 0.9em;">⚠️ Using cached data - some information may be outdated</td>';
        tbody.insertBefore(warningRow, tbody.firstChild);
      }
    } catch (fallbackError) {
      console.error('Even fallback data failed:', fallbackError);
      showError('Unable to load economic data. Please refresh the page or check back later.');
    }
  }
});

// Export functions for testing/debugging
if (typeof window !== 'undefined') {
  window.financialsDebug = {
    loadFinancialsData,
    processFinancialsData,
    autoCalculateChanges,
    extractNumericValue
  };
}

fetch('/json/financials-data.json?ts=' + Date.now())
  .then(response => response.json())
  .then(data => {
    // your code to render data
  })
  .catch(error => {
    // handle error
  });