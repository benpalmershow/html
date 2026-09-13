// Sun position tracker for index.html.
// Uses the Geolocation API to find the viewer's real location, then computes the
// sun's position from local time via the NOAA solar algorithm
// (no network dependency for the sun calculation itself).
// The sun drifts along a parabolic arc spanning the page: low at the horizon at
// sunrise/sunset, high at midday, and fading to gray at night.

(function () {
  const FALLBACK_LAT = 40.7128;   // New York — used if geolocation is denied/unavailable
  const FALLBACK_LNG = -74.0060;

  let lat = FALLBACK_LAT;
  let lng = FALLBACK_LNG;

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  function dayOfYear(date) {
    const start = new Date(Date.UTC(date.getFullYear(), 0, 0));
    return Math.floor((date.getTime() - start.getTime()) / 86400000);
  }

  // Returns the sun's horizontal fraction (0..1 across the page, 0 = sunrise,
  // 1 = sunset), whether it is daytime, and the sun's altitude in degrees
  // (0 = horizon, 90 = zenith).
  function sunState(now) {
    const N = dayOfYear(now);
    const B = rad(360 * (N - 81) / 365);
    const E = 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
      - 0.014615 * Math.cos(2 * B) - 0.040849 * Math.sin(2 * B));
    const decl = deg(Math.asin(Math.sin(rad(23.45)) * Math.sin(rad(360 * (N - 81) / 365))));
    const HA = Math.acos((Math.cos(rad(90.833)) - Math.sin(rad(lat)) * Math.sin(rad(decl)))
      / (Math.cos(rad(lat)) * Math.cos(rad(decl))));
    const lngWest = -lng;
    const solarNoonUTC = 720 + 4 * lngWest - E; // minutes from UTC midnight
    const halfDayMin = 4 * deg(HA); // minutes from solar noon to sunrise or sunset
    const sunriseUTC = solarNoonUTC - halfDayMin;
    const sunsetUTC = solarNoonUTC + halfDayMin;

    const tzOffsetMin = now.getTimezoneOffset();
    // getTimezoneOffset() is positive for zones west of UTC (e.g. +420 for PDT),
    // so local time = UTC - offset.
    const sunriseLocal = (sunriseUTC - tzOffsetMin + 1440) % 1440;
    const sunsetLocal = (sunsetUTC - tzOffsetMin + 1440) % 1440;
    const nowLocal = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    let fraction, isDay;
    if (nowLocal < sunriseLocal) {
      fraction = 0; isDay = false;
    } else if (nowLocal >= sunsetLocal) {
      fraction = 1; isDay = false;
    } else {
      fraction = (nowLocal - sunriseLocal) / (sunsetLocal - sunriseLocal);
      isDay = true;
    }

    // Altitude: 0 at sunrise/sunset, peaks at noon. The hour angle measured from
    // solar noon gives a symmetric arc that peaks exactly at noon.
    const minutesFromNoon = nowLocal - (solarNoonUTC + tzOffsetMin);
    const altitude = Math.max(0, Math.sin(Math.PI * (1 - Math.abs(minutesFromNoon) / halfDayMin)) * 90);

    return { fraction, isDay, altitude, sunrise: sunriseLocal, sunset: sunsetLocal };
  }

  // Map a horizontal fraction (0..1) to a point on the parabolic arc
  // M0,100 Q100,0 200,100, expressed as percentages of the track's size.
  // The quadratic Bézier has x = 200t and y = 100((1-t)^2 + t^2), so the apex
  // sits at y = 50 (half the track height) at midday.
  function arcPoint(fraction) {
    const xPct = fraction * 100;
    const yPct = 100 * (Math.pow(1 - fraction, 2) + Math.pow(fraction, 2));
    return { xPct, yPct };
  }

  function init() {
    const track = document.querySelector('.sun-track');
    if (!track) return;
    const body = track.querySelector('.sun-body');
    if (!body) return;

    // Resolve the viewer's location via the Geolocation API. On any failure
    // (permission denied, timeout, or no GPS) we keep the fallback city.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        },
        () => { /* keep fallback */ },
        { timeout: 5000, maximumAge: 300000 }
      );
    }

    let currentX = 0;
    let currentY = 0;
    let rafId = null;

    function target() {
      const now = new Date();
      const { fraction, isDay, altitude } = sunState(now);
      const { xPct, yPct } = arcPoint(fraction);

      // Constrain the arc to a band below the navbar so the sun never rises
      // above the nav links. The band starts just under the header and extends
      // down toward the bottom of the viewport.
      const headerH = document.querySelector('.page-header')
        ? document.querySelector('.page-header').offsetHeight : 72;
      const topMargin = headerH + 20;
      const bottomMargin = 20;
      const bandTop = topMargin;
      const bandBottom = window.innerHeight - bottomMargin;
      const bandH = bandBottom - bandTop;

      const targetX = (xPct / 100) * track.offsetWidth;
      // The parabola's yPct is 100 at the horizon and 50 at midday; blend with
      // altitude so the sun lifts off the horizon at noon.
      const arcY = bandTop + (yPct / 100) * bandH;
      const topY = bandTop + body.offsetHeight / 2;
      const targetY = arcY - (altitude / 90) * (arcY - topY);
      return { targetX, targetY, isDay };
    }

    function apply() {
      const { targetX, targetY, isDay } = target();
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      body.style.left = currentX + 'px';
      body.style.top = currentY + 'px';
      body.style.opacity = isDay ? 1 : 0.25;
      track.classList.toggle('is-night', !isDay);
    }

    function loop() {
      apply();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId) return;
      apply();
      loop();
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    apply();
    start();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    window.addEventListener('resize', () => {
      const pad = body.offsetWidth / 2;
      currentX = Math.min(Math.max(currentX, pad), window.innerWidth - body.offsetWidth + pad);
      currentY = Math.min(Math.max(currentY, body.offsetHeight / 2), window.innerHeight - body.offsetHeight / 2);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();