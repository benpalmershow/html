(function () {
  'use strict';

  var GA_ID = 'G-DWEVPGLJDP';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  // Consent Mode v2 defaults
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=Lax;Secure',
    first_party_collection: true
  });

  var loaded = false;
  function loadGtagScript() {
    if (loaded) return;
    loaded = true;
    var script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    script.async = true;
    document.head.appendChild(script);
  }

  // Load after idle; fall back to a short delay.
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadGtagScript, { timeout: 3000 });
  } else {
    window.setTimeout(loadGtagScript, 3000);
  }

  /**
   * Track a GA4 custom event.
   * @param {string} name - Event name (e.g. "contact_form_submit")
   * @param {Object} [params] - Event parameters
   */
  window.trackEvent = function trackEvent(name, params) {
    if (!name || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  };

  // Example delegated tracking hook: elements with data-ga-event="event_name"
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-ga-event]') : null;
    if (!target) return;
    var name = target.getAttribute('data-ga-event');
    if (!name) return;
    var params = {};
    if (target.dataset.gaCategory) params.event_category = target.dataset.gaCategory;
    if (target.dataset.gaLabel) params.event_label = target.dataset.gaLabel;
    if (target.dataset.gaValue) {
      var value = Number(target.dataset.gaValue);
      if (!Number.isNaN(value)) params.value = value;
    }
    window.trackEvent(name, params);
  }, { passive: true });
})();
