(function () {
  'use strict';

  const MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
  let financialDataPromise;
  let chartLibraryPromise;

  function loadFinancialData() {
    if (!financialDataPromise) {
      financialDataPromise = fetch('/json/financials-data.json')
        .then(response => {
          if (!response.ok) throw new Error(`Financial data request failed: ${response.status}`);
          return response.json();
        });
    }
    return financialDataPromise;
  }

  function loadChartLibrary() {
    if (typeof window.Chart !== 'undefined') return Promise.resolve();
    if (!chartLibraryPromise) {
      chartLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          if (typeof window.Chart === 'undefined') {
            reject(new Error('Chart.js loaded without exposing its Chart constructor'));
            return;
          }
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
      });
    }
    return chartLibraryPromise;
  }

  function numericValue(value) {
    if (value === null || value === undefined || value === '' || value === '—' || /^TBD/i.test(String(value))) {
      return null;
    }
    const number = Number(String(value).replace(/[$,%A-Za-z,\s]/g, ''));
    return Number.isFinite(number) ? number : null;
  }

  function extractSeries(indicator) {
    const years = Object.keys(indicator)
      .filter(key => /^\d{4}$/.test(key))
      .map(Number)
      .sort((a, b) => a - b);
    const isQuarterly = years.some(year =>
      QUARTERS.some(quarter => Object.prototype.hasOwnProperty.call(indicator[year] || {}, quarter))
    ) || QUARTERS.some(quarter => Object.prototype.hasOwnProperty.call(indicator, quarter));
    const labels = [];
    const values = [];

    if (indicator.bps_probabilities && typeof indicator.bps_probabilities === 'object') {
      Object.entries(indicator.bps_probabilities).forEach(([label, value]) => {
        const number = numericValue(value);
        if (number !== null) {
          labels.push(label);
          values.push(number);
        }
      });
    }

    if (labels.length) return { labels, values };

    years.forEach(year => {
      const periods = isQuarterly ? QUARTERS : MONTHS;
      periods.forEach((period, index) => {
        const number = numericValue(indicator[year]?.[period]);
        if (number === null) return;
        const label = isQuarterly
          ? `${year} Q${index + 1}`
          : `${year} ${period.slice(0, 3)}`;
        labels.push(label);
        values.push(number);
      });
    });

    if (labels.length) {
      const pointsInOneYear = isQuarterly ? 4 : 12;
      return {
        labels: labels.slice(-pointsInOneYear),
        values: values.slice(-pointsInOneYear)
      };
    }

    const periods = isQuarterly ? QUARTERS : MONTHS;
    periods.forEach((period, index) => {
      const number = numericValue(indicator[period]);
      if (number === null) return;
      labels.push(isQuarterly ? `Q${index + 1}` : period.slice(0, 3));
      values.push(number);
    });
    const pointsInOneYear = isQuarterly ? 4 : 12;
    return {
      labels: labels.slice(-pointsInOneYear),
      values: values.slice(-pointsInOneYear)
    };
  }

  function showError(container) {
    container.classList.add('is-error');
    const status = container.querySelector('.journal-chart-status');
    if (status) status.textContent = 'Chart unavailable';
  }

  async function renderChart(container, indices) {
    const indicatorName = container.dataset.chartIndicator;
    const indicator = indices.find(item =>
      item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase()
    );
    if (!indicator) throw new Error(`No financial indicator found for "${indicatorName}"`);

    const { labels, values } = extractSeries(indicator);
    if (!labels.length) throw new Error(`No historical chart data found for "${indicatorName}"`);

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error(`Chart canvas missing for "${indicatorName}"`);

    await loadChartLibrary();
    const status = container.querySelector('.journal-chart-status');
    if (status) status.remove();

    new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: indicatorName,
          data: values,
          borderColor: '#2c5f5a',
          backgroundColor: 'rgba(44, 95, 90, 0.1)',
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#2c5f5a',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8, maxRotation: 0 }
          },
          y: {
            grid: { color: 'rgba(44, 95, 90, 0.1)' },
            ticks: { maxTicksLimit: 5 }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });
  }

  async function render(root) {
    if (!root) return;
    const containers = Array.from(root.querySelectorAll('.journal-chart:not([data-rendered])'));
    if (!containers.length) return;

    containers.forEach(container => {
      container.dataset.rendered = 'true';
    });

    try {
      const [data] = await Promise.all([loadFinancialData(), loadChartLibrary()]);
      await Promise.all(containers.map(async container => {
        try {
          await renderChart(container, data.indices || []);
        } catch (error) {
          console.error('Embedded chart render failed:', error);
          showError(container);
        }
      }));
    } catch (error) {
      console.error('Embedded chart resources failed to load:', error);
      containers.forEach(showError);
    }
  }

  window.ChartRenderer = { render };
})();
