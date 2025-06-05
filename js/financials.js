function populateIndicesTable(indices) {
  const tbody = document.getElementById("indicesTableBody");
  tbody.innerHTML = "";
  indices.forEach(data => {
    const row = tbody.insertRow();
    
    // Index name with link
    row.insertCell().innerHTML = data.url ? 
      `<a href="${data.url}" target="_blank" rel="noopener">${data.name}</a>` : 
      data.name;
    
    // Data columns
    row.insertCell().textContent = data.march || '';
    row.insertCell().textContent = data.april || '';
    row.insertCell().textContent = data.may || '';
    row.insertCell().textContent = data.june || '';
    row.insertCell().textContent = data.change || '';

    // Apply number class to data cells
    for (let i = 1; i < row.cells.length; i++) {
      row.cells[i].className = "number";
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('/json/financials-data.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load financials-data.json');
      return response.json();
    })
    .then(data => {
      // Populate the indices table
      if (data.indices) {
        populateIndicesTable(data.indices);
      }
      
      // Load TradingView widget if container exists
      const container = document.getElementById('tradingview-widget');
      if (container) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify(data, null, 2);
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
        container.appendChild(script);
      }
    })
    .catch(error => console.error('Error loading financials data:', error));
});