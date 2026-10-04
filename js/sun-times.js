// Sun position tracker for index.html.
// Uses the Geolocation API to find the viewer's real location, then computes the
// sun's position from local time via the NOAA solar algorithm
// (no network dependency for the sun calculation itself).
// The sun drifts along a parabolic arc spanning the page: low at the horizon at
// sunrise/sunset, high at midday, and fading to gray at night.
// Visual realism: atmospheric refraction, twilight ramps, horizon haze,
// altitude-based glow/color, and a night starfield.

(function () {
  const FALLBACK_LAT = 40.7128;   // New York
  const FALLBACK_LNG = -74.0060;
  const REFRACTION = 0.57;        // Atmospheric refraction near horizon (degrees)
  const TWILIGHT_CIVIL = -6;
  const TWILIGHT_NAUTICAL = -12;
  const TWILIGHT_ASTRONOMICAL = -18;

  let lat = FALLBACK_LAT;
  let lng = FALLBACK_LNG;

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function dayOfYear(date) {
    const start = new Date(Date.UTC(date.getFullYear(), 0, 0));
    return Math.floor((date.getTime() - start.getTime()) / 86400000);
  }

  function twilightFactor(altitude) {
    if (altitude >= 0) return 1;
    if (altitude <= TWILIGHT_ASTRONOMICAL) return 0;
    if (altitude > TWILIGHT_CIVIL) {
      return 0.5 + 0.5 * (altitude / TWILIGHT_CIVIL);
    }
    if (altitude > TWILIGHT_NAUTICAL) {
      const t = (altitude - TWILIGHT_NAUTICAL) / (TWILIGHT_CIVIL - TWILIGHT_NAUTICAL);
      return 0.2 + 0.3 * t;
    }
    const t = (altitude - TWILIGHT_ASTRONOMICAL) / (TWILIGHT_NAUTICAL - TWILIGHT_ASTRONOMICAL);
    return 0.05 + 0.15 * t;
  }

  function sunState(now) {
    const N = dayOfYear(now);
    const B = rad(360 * (N - 81) / 365);
    const E = 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
      - 0.014615 * Math.cos(2 * B) - 0.040849 * Math.sin(2 * B));
    const decl = deg(Math.asin(Math.sin(rad(23.45)) * Math.sin(rad(360 * (N - 81) / 365))));
    const latRad = rad(lat);
    const declRad = rad(decl);
    const cosTheta = Math.cos(rad(90.833)) - Math.sin(latRad) * Math.sin(declRad);
    const cosLat = Math.cos(latRad);
    const cosDecl = Math.cos(declRad);
    const denominator = cosLat * cosDecl;

    let fraction, isDay, altitude, halfDayMin;

    if (denominator === 0 || Math.abs(cosTheta / denominator) > 1) {
      const noonAlt = 90 - Math.abs(lat - decl);
      isDay = noonAlt > 0;
      fraction = isDay ? 0.5 : 0;
      altitude = isDay ? Math.max(0, noonAlt) : -45;
      halfDayMin = isDay ? 720 : 0;
    } else {
      const HA = Math.acos(cosTheta / denominator);
      halfDayMin = 4 * deg(HA);
      const lngWest = -lng;
      const solarNoonUTC = 720 + 4 * lngWest - E;
      const sunriseUTC = solarNoonUTC - halfDayMin;
      const sunsetUTC = solarNoonUTC + halfDayMin;
      const tzOffsetMin = now.getTimezoneOffset();
      const sunriseLocal = (sunriseUTC - tzOffsetMin + 1440) % 1440;
      const sunsetLocal = (sunsetUTC - tzOffsetMin + 1440) % 1440;
      const nowLocal = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

      if (nowLocal < sunriseLocal) {
        fraction = 0;
        isDay = false;
      } else if (nowLocal >= sunsetLocal) {
        fraction = 1;
        isDay = false;
      } else {
        fraction = (nowLocal - sunriseLocal) / (sunsetLocal - sunriseLocal);
        isDay = true;
      }

      const minutesFromNoon = nowLocal - (solarNoonUTC + tzOffsetMin);
      altitude = Math.max(0, Math.sin(Math.PI * (1 - Math.abs(minutesFromNoon) / halfDayMin)) * 90);
    }

    const refractedAlt = altitude + (altitude < 10 ? REFRACTION * (1 - altitude / 10) : REFRACTION);

    return { fraction, isDay, altitude: refractedAlt, geometricAlt: altitude, halfDayMin };
  }

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

    const header = document.querySelector('.page-header');
    let headerH = header ? header.offsetHeight : 72;
    const glow = track.querySelector('.sun-glow');
    const haze = track.querySelector('.sun-haze');
    const arcPath = track.querySelector('.sun-arc-path');
    const starfield = track.querySelector('.sun-starfield');

    if (starfield) {
      for (let i = 0; i < 60; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--delay', Math.random() * 4 + 's');
        star.style.setProperty('--dur', (2 + Math.random() * 3) + 's');
        starfield.appendChild(star);
      }
    }

    let bodyW = body.offsetWidth;
    let bodyH = body.offsetHeight;
    let currentX = window.innerWidth / 2;
    let currentY = headerH + 20 + (window.innerHeight - headerH - 40) / 2;
    let rafId = null;
    let lastTime = performance.now();

    function target() {
      const now = new Date();
      const { fraction, isDay, altitude, geometricAlt, halfDayMin } = sunState(now);
      const { xPct, yPct } = arcPoint(fraction);

      const topMargin = headerH + 20;
      const bottomMargin = 20;
      const bandTop = topMargin;
      const bandBottom = window.innerHeight - bottomMargin;
      const bandH = bandBottom - bandTop;

      const targetX = (xPct / 100) * track.offsetWidth;
      const arcY = bandTop + (yPct / 100) * bandH;
      const topY = bandTop + bodyH / 2;
      const visualAlt = Math.max(altitude, -5);
      const targetY = arcY - (visualAlt / 90) * (arcY - topY);

      const tf = twilightFactor(altitude);

      let arcStroke, arcOpacity;
      if (tf > 0.5) {
        arcStroke = 'rgba(210, 160, 120, 0.55)';
        arcOpacity = '0.7';
      } else if (tf > 0.1) {
        arcStroke = 'rgba(180, 140, 100, 0.5)';
        arcOpacity = String(0.3 + tf);
      } else {
        arcStroke = 'rgba(160, 160, 165, 0.3)';
        arcOpacity = '0.25';
      }

      return { targetX, targetY, isDay, altitude, geometricAlt, tf, arcStroke, arcOpacity };
    }

    function apply(timestamp) {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      const { targetX, targetY, isDay, altitude, geometricAlt, tf, arcStroke, arcOpacity } = target();

      const smooth = 1 - Math.exp(-4 * dt);
      currentX += (targetX - currentX) * smooth;
      currentY += (targetY - currentY) * smooth;

      const horizonFactor = clamp(1 - altitude / 30, 0, 1);
      const glowScale = lerp(0.6, 1.6, horizonFactor);
      const glowOpacity = lerp(0.15, 0.7, horizonFactor) * tf;
      const hazeOpacity = clamp(1 - altitude / 12, 0, 0.9);
      const showStars = tf < 0.6;

      body.style.left = currentX + 'px';
      body.style.top = currentY + 'px';
      body.style.opacity = String(0.15 + 0.85 * tf);
      body.style.setProperty('--horizon-factor', String(horizonFactor));
      body.style.filter = 'blur(' + clamp((1 - altitude / 15) * 2, 0, 3) + 'px) brightness(' + lerp(0.85, 1.05, altitude / 90) + ')';

      starfield.classList.toggle('is-visible', showStars);

      if (glow) {
        glow.style.transform = 'translate(-50%, -50%) scale(' + glowScale + ')';
        glow.style.opacity = String(glowOpacity);
      }

      if (haze) {
        haze.style.opacity = String(hazeOpacity);
      }

      if (arcPath) {
        arcPath.style.stroke = arcStroke;
        arcPath.style.opacity = arcOpacity;
      }
    }

    function loop(timestamp) {
      apply(timestamp);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId) return;
      lastTime = performance.now();
      apply(lastTime);
      loop(lastTime);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    start();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newHeaderH = header ? header.offsetHeight : 72;
        if (newHeaderH !== headerH) {
          headerH = newHeaderH;
        }
        bodyW = body.offsetWidth;
        bodyH = body.offsetHeight;
        currentX = clamp(currentX, bodyW / 2, window.innerWidth - bodyW / 2);
        currentY = clamp(currentY, bodyH / 2, window.innerHeight - bodyH / 2);
      }, 100);
    });

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();