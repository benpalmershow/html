document.addEventListener('DOMContentLoaded', () => {
  // Fetch the widget configuration from financials-data.json
  fetch('/json/financials-data.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load financials-data.json');
      return response.json();
    })
    .then(config => {
      // Create the TradingView widget script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify(config, null, 2);
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';

      // Append the script to the TradingView widget container
      const container = document.getElementById('tradingview-widget');
      if (container) {
        container.appendChild(script);
      }
    })
    .catch(error => {
      console.error('Error loading TradingView widget:', error);
    });
});