<i data-lucide='football' class='post-icon'></i> <b>Patriots @ Bengals</b><br><br>Sunday 1:00 PM ET. Patriots -7, 79¢ win probability. New England visits Cincinnati in Week 11 action.<br><br><a href="financials.html?filter=Prediction%20Markets"><b>View odds</b></a><br><br><i data-lucide='trending-down' class='post-icon'></i> <b>WTI Crude Oil Down 19.6% YTD</b><br><br>October: $60.89/bbl (from $75.74 in January).<br><br><div class="chart-container" style="cursor: pointer;" onclick="window.location.href='financials.html?filter=Commodities'">
  <canvas id="wti-oil-chart" width="400" height="200"></canvas>
</div>

<script>
const ctx = document.getElementById('wti-oil-chart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [{
      label: 'WTI Crude Oil ($/bbl)',
      data: [75.74, 71.53, 68.24, 63.54, 62.17, 68.17, 68.39, 64.86, 63.96, 60.89],
      borderColor: '#2C5F5A',
      backgroundColor: 'rgba(44, 95, 90, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: {
      y: {
        min: 55,
        max: 80,
        ticks: {
          callback: function(value) { return '$' + value.toFixed(2); }
        }
      }
    }
  }
});
</script><br><br><a href="financials.html?filter=Commodities"><b>View commodities</b></a><br><br><i data-lucide='hammer' class='post-icon'></i> <b>Construction Spending Rises to $2,169.5B</b><br><br>August: $2,169.5B (up from $2,165B in July). Total spending growth continues through summer months.<br><br><div class="chart-container" style="cursor: pointer;" onclick="window.location.href='financials.html?filter=Business%20Indicators'">
  <canvas id="construction-chart" width="400" height="200"></canvas>
</div>

<script>
const ctxConstruction = document.getElementById('construction-chart').getContext('2d');
new Chart(ctxConstruction, {
  type: 'line',
  data: {
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    datasets: [{
      label: 'Construction Spending ($B)',
      data: [2162, 2145, 2143.9, 2140.5, 2165, 2169.5],
      borderColor: '#2C5F5A',
      backgroundColor: 'rgba(44, 95, 90, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: {
      y: {
        min: 2130,
        max: 2180,
        ticks: {
          callback: function(value) { return '$' + value.toFixed(0) + 'B'; }
        }
      }
    }
  }
});
</script><br><br><a href="financials.html?filter=Business%20Indicators"><b>View all indicators</b></a>
