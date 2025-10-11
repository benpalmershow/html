document.addEventListener("DOMContentLoaded", function () {
  const urbanRuralTrend = [
    { year: "2020", urban: 18.2, rural: 12.3 },
    { year: "2021", urban: 21.4, rural: 13.1 },
    { year: "2022", urban: 24.6, rural: 14.5 },
    { year: "2023", urban: 25.1, rural: 15.2 },
    { year: "2024", urban: 26.8, rural: 13.7 },
  ];

  const ctx = document.getElementById("ncvsChart");

  if (ctx) {
    new Chart(ctx, {
      type: "line",
      data: {
        labels: urbanRuralTrend.map((d) => d.year),
        datasets: [
          {
            label: "Urban",
            data: urbanRuralTrend.map((d) => d.urban),
            borderColor: "#dc2626",
            strokeWidth: 3,
            fill: false,
            tension: 0.4,
          },
          {
            label: "Rural",
            data: urbanRuralTrend.map((d) => d.rural),
            borderColor: "#2563eb",
            strokeWidth: 3,
            fill: false,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Year",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Violent Crime Rate per 1,000 Residents",
            },
          },
        },
      },
    });
  }
});
