document.addEventListener('DOMContentLoaded', () => {
  // Fetch the widget configuration from financials-data.json
  fetch('json/financials-data.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load financials-data.json');
      }
      return response.json();
    })
    .then(config => {
      // Create the TradingView widget script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
      script.innerHTML = JSON.stringify(config);

      // Append the script to the TradingView widget container
      const container = document.getElementById('tradingview-widget');
      if (container) {
        container.appendChild(script);
      } else {
        console.error('TradingView widget container not found');
      }
    })
    .catch(error => {
      console.error('Error loading TradingView widget:', error);
    });
});