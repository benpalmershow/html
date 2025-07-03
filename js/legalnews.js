// Handles all card toggling for legalnews.html and chart rendering
function toggleCard(headerOrId) {
  let content, icon;
  if (typeof headerOrId === 'string') {
    // Called with cardId
    const header = document.querySelector('.card-header[data-toggle="' + headerOrId + '"]');
    if (!header) return;
    content = document.getElementById(headerOrId);
    icon = header.querySelector('.expand-icon');
  } else {
    // Called with header element
    const header = headerOrId;
    content = header.nextElementSibling;
    icon = header.querySelector('.expand-icon');
  }
  if (!content || !icon) return;
  if (content.classList.contains('expanded')) {
    content.classList.remove('expanded');
    icon.textContent = '+';
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('expanded');
    icon.textContent = '−';
    icon.style.transform = 'rotate(180deg)';
  }
}

$(function() {
  var chartCanvas = document.getElementById('gorsuchChart');
  if (chartCanvas && window.Chart) {
    var ctx = chartCanvas.getContext('2d');
    var data = {
      labels: [
        'Brokerage Accounts (ETFs, stocks, bonds)',
        'Retirement Accounts (IRAs)',
        '529 Plans (Education Savings)',
        'Bank / Cash Accounts',
        'CDs / Money Markets'
      ],
      datasets: [{
        data: [50, 30, 2, 10, 8],
        backgroundColor: [
          '#2c5f5a',
          '#87c5be',
          '#d4822a',
          '#e8955d',
          '#f8f4e6'
        ]
      }]
    };
    var config = {
      type: 'pie',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                var label = context.label || '';
                var value = context.raw;
                return label + ': ' + value + '%';
              }
            }
          }
        }
      }
    };
    new Chart(ctx, config);
  }
});
