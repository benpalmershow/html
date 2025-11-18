---
title: "60 Minutes: Trump interview"
date: "2025-11-03"
category: "political"
summary: "Norah O'Donnell interviews President Trump on wars, the economy, the border, and tariffs."
icon: "message-square"
---

# 60 Minutes Trump Interview

>Try being president for a day. 
<br>Try running for any political office against a contentious and dishonest 4th estate. 
<br>Try representing ungrateful people. 
<br>Try waking up every day knowing so many people hate you but haven’t even met you. <br><br>
Then, try answering to Norah O'Donnell:



[Full CBS Transcript (official)](https://www.cbsnews.com/news/read-full-transcript-norah-odonnell-60-minutes-interview-with-president-trump/)


**Trump:** I solved eight conflicts and saved (how many?) lives. (we had nine wars on our planet. I solved eight of 'em.)

**Norah:** But what about Russia? (Who's tougher to deal with, Vladimir Putin or Xi Jinping?)

**Trump:** I set economic records in nine months with S&P at all-time highs. (By the way, the stock market just hit-- perfect timing for your show, just hit an all-time high.)

**Norah:** But what about people without a 401(k)? (But for people that don't have 401(k)s, who are not invested in the stock market)

**Trump:** I closed the border to protect American workers. (We had an open border. Now we have a border that's, as you know, absolutely shut)

**Norah:** But what about the brutality of ICE raids? (Have some of these raids gone too far?)

**Trump:** I created billions of new dollars in government revenue from tariffs. (we'll be takin' in hundreds of billions of dollars-- in the form of tariffs.)

<a href="../financials.html?filter=Trade%20%26%20Tariffs" style="text-decoration: none;">
    <canvas id="tariff-revenue-chart" width="200" height="200" style="float: right; margin-left: 15px; margin-bottom: 10px;"></canvas>
</a>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
function initTariffChart() {
    console.log('initTariffChart called');
    if (typeof Chart === 'undefined') {
        console.log('Chart not loaded yet, retrying');
        setTimeout(initTariffChart, 100);
        return;
    }
    const ctx = document.getElementById('tariff-revenue-chart');
    if (!ctx) {
        console.log('Canvas not found');
        return;
    }
    console.log('Creating chart');
    const chartCtx = ctx.getContext('2d');
    new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            datasets: [{
                label: 'Tariff Revenue',
                data: [8.2, 16, 22, 27, 28, 30, 30, 34],
                borderColor: '#2C5F5A',
                backgroundColor: 'rgba(44, 95, 90, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                    borderColor: '#2C5F5A', borderWidth: 1, padding: 8,
                    titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 4,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += '$' + context.parsed.y + 'B';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { display: true, grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 4, padding: 2, font: { size: 9 } } },
                y: { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { padding: 2, font: { size: 9 }, callback: function (value) { return '$' + value + 'B'; } }, position: 'right' }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}
initTariffChart();
</script>

**Norah:** But what about the soybean farmers? (This trade war, though, was hurting Americans. I mean, our soybean farmers.)

**Trump:** I killed drug dealers. (And every one of those boats that you see shot down-- and I agree, it's a terrible thing-- but every one of those boats kills 25,000 Americans.)

**Norah:** But what about their civil rights to deal drugs? (There have been at least eight boats in the Caribbean destroyed by the U.S. military--)




## The 8 Conflicts Trump Mediated that the UN could not

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Cambodia_location_map.svg" alt="Cambodia-Thailand border" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>1. Cambodia–Thailand</strong><br>Border disputes<br><em>U.S. State Department mediation efforts under Trump administration helped resolve long-standing border tensions along the Mekong River. <a href="https://en.wikipedia.org/wiki/Cambodia%E2%80%93Thailand_border">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Kosovo_location_map.svg" alt="Kosovo-Serbia region" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>2. Kosovo–Serbia</strong><br>Kosovo region<br><em>Trump-brokered Washington Agreement: Economic normalization, embassies in Jerusalem, Huawei restrictions. <a href="https://en.wikipedia.org/wiki/Kosovo_and_Serbia_economic_normalization_agreements">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Democratic_Republic_of_the_Congo_location_map.svg" alt="DRC-Rwanda region" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>3. Congo–Rwanda</strong><br>DRC and Rwanda<br><em>U.S. diplomatic efforts contributed to reduced tensions and improved cooperation between DRC and Rwanda governments. <a href="https://en.wikipedia.org/wiki/Democratic_Republic_of_the_Congo%E2%80%93Rwanda_relations">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Middle_East_(orthographic_projection).svg" alt="Israel-Iran region" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>4. Israel–Iran</strong><br>Middle East tensions<br><em>Abraham Accords: Israel-UAE, Israel-Bahrain, Israel-Morocco, Israel-Sudan normalization. <a href="https://en.wikipedia.org/wiki/Abraham_Accords">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Nile_basin_countries.png" alt="Egypt-Ethiopia Nile basin" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>5. Egypt–Ethiopia</strong><br>Nile basin (GERD)<br><em>U.S. mediation helped facilitate agreements between Egypt and Ethiopia on the Grand Ethiopian Renaissance Dam. <a href="https://en.wikipedia.org/wiki/Grand_Ethiopian_Renaissance_Dam">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Nagorno-Karabakh_conflict.png" alt="Armenia-Azerbaijan" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>6. Armenia–Azerbaijan</strong><br>Nagorno-Karabakh<br><em>Trump administration mediated ceasefire ending the Nagorno-Karabakh war. <a href="https://en.wikipedia.org/wiki/2020_Nagorno-Karabakh_war">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/India_disputed_areas_map.svg" alt="Pakistan-India Kashmir" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>7. Pakistan–India</strong><br>Kashmir dispute<br><em>Trump administration mediation prevented escalation to nuclear war between India and Pakistan. <a href="https://en.wikipedia.org/wiki/India%E2%80%93Pakistan_relations">Wikipedia</a></em></figcaption>
  </figure>

  <figure style="margin: 0; text-align: center;">
    <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Gaza_Strip_location_map.svg" alt="Israel-Hamas Gaza" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
    <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>8. Israel–Hamas</strong><br>Gaza Strip<br><em>Trump administration brokered 2025 ceasefire ending Israel-Hamas war and securing release of all hostages. The U.S. installed a 2-Year Mandate from UN Sec. Council for a Gaza Stabilization Unit administered by Israel and Egypt and approved by Qatar, Egypt, United Arab Emirates, Saudi Arabia, Indonesia, Pakistan, Jordan and Turkey. <a href="https://en.wikipedia.org/wiki/Israel%E2%80%93Hamas_war">Wikipedia</a></em></figcaption>
  </figure>
</div>
