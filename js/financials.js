// Enhanced financials.js with automatic change calculation

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

function populateIndicesTable(indices) {
  const tbody = document.getElementById("indicesTableBody");
  tbody.innerHTML = "";
  
  indices.forEach(data => {
    const row = tbody.insertRow();
    
    // Index name with agency descriptor and link
    const nameCell = row.insertCell();
    if (data.url) {
      nameCell.innerHTML = `<a href="${data.url}" target="_blank" rel="noopener">${data.agency}: ${data.name}</a>`;
    } else {
      nameCell.textContent = `${data.agency}: ${data.name}`;
    }
    
    // Data columns with proper formatting
    const marchCell = row.insertCell();
    const aprilCell = row.insertCell();
    const mayCell = row.insertCell();
    const juneCell = row.insertCell();
    const changeCell = row.insertCell();
    
    marchCell.textContent = formatDataValue(data.march);
    aprilCell.textContent = formatDataValue(data.april);
    mayCell.textContent = formatDataValue(data.may);
    juneCell.textContent = formatDataValue(data.june);
    changeCell.textContent = formatChangeValue(data.change);
    
    // Apply styling classes
    [marchCell, aprilCell, mayCell, juneCell, changeCell].forEach(cell => {
      cell.className = "number";
    });
    
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
    
    // Add category styling if specified
    if (data.category) {
      row.setAttribute('data-category', data.category.toLowerCase().replace(/\s+/g, '-'));
    }
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
  
  const numericChange = parseFloat(change);
  if (isNaN(numericChange)) {
    return change;
  }
  
  // Format with appropriate sign and styling
  const formattedChange = numericChange > 0 ? `+${numericChange.toFixed(2)}%` : `${numericChange.toFixed(2)}%`;
  return formattedChange;
}

function addCategoryHeaders(indices) {
  const tbody = document.getElementById("indicesTableBody");
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
    const headerRow = tbody.insertRow();
    const headerCell = headerRow.insertCell();
    headerCell.colSpan = 6;
    headerCell.innerHTML = `<strong>${categoryName}</strong>`;
    headerCell.className = "category-header";
    headerRow.className = "category-divider";
    
    // Add items in this category
    categories[categoryName].forEach(data => {
      const row = tbody.insertRow();
      
      // Index name with agency descriptor and link
      const nameCell = row.insertCell();
      if (data.url) {
        nameCell.innerHTML = `<a href="${data.url}" target="_blank" rel="noopener">${data.agency}: ${data.name}</a>`;
      } else {
        nameCell.textContent = `${data.agency}: ${data.name}`;
      }
      
      // Data columns
      const marchCell = row.insertCell();
      const aprilCell = row.insertCell();
      const mayCell = row.insertCell();
      const juneCell = row.insertCell();
      const changeCell = row.insertCell();
      
      marchCell.textContent = formatDataValue(data.march);
      aprilCell.textContent = formatDataValue(data.april);
      mayCell.textContent = formatDataValue(data.may);
      juneCell.textContent = formatDataValue(data.june);
      changeCell.textContent = formatChangeValue(data.change);
      
      // Apply styling
      [marchCell, aprilCell, mayCell, juneCell, changeCell].forEach(cell => {
        cell.className = "number";
      });
      
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
      
      row.setAttribute('data-category', categoryName.toLowerCase().replace(/\s+/g, '-'));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('/json/financials-data.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load financials-data.json');
      return response.json();
    })
    .then(data => {
      // Auto-calculate missing change values
      if (data.indices && data.indices.length > 0) {
        const indicesWithCalculatedChanges = autoCalculateChanges(data.indices);
        
        // Check if data has categories defined
        const hasCategories = indicesWithCalculatedChanges.some(item => item.category);
        
        if (hasCategories) {
          addCategoryHeaders(indicesWithCalculatedChanges);
        } else {
          populateIndicesTable(indicesWithCalculatedChanges);
        }
      }
      
      // Load TradingView widget if container exists
      const container = document.getElementById('tradingview-widget');
      if (container) {
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
      
      // Update last updated timestamp for economic indicators
      const lastUpdatedEconomic = document.getElementById('last-updated-economic');
      if (lastUpdatedEconomic && data.lastUpdated) {
        lastUpdatedEconomic.textContent = `Last updated: ${new Date(data.lastUpdated).toLocaleDateString()}`;
      }
    })
    .catch(error => {
      console.error('Error loading financials data:', error);
      
      // Show fallback message
      const tbody = document.getElementById("indicesTableBody");
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">Unable to load economic data. Please check back later.</td></tr>';
      }
    });
});