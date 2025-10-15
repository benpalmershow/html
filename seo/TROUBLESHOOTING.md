# SEO System Troubleshooting Guide

## Quick Diagnosis

Run this in your browser console for immediate diagnosis:

```javascript
// Check if SEO system is loaded
console.log('SEO System Status:');
console.log('✅ SEO Config:', window.seoConfig ? 'Loaded' : '❌ Missing');
console.log('✅ SEO Analytics:', window.seoAnalytics ? 'Loaded' : '❌ Missing');
console.log('✅ SEO Monitor:', window.seoMonitor ? 'Loaded' : '❌ Missing');
console.log('✅ Search Console:', window.searchConsoleIntegration ? 'Loaded' : '❌ Missing');
console.log('✅ Content Schema:', window.contentSchemaGenerator ? 'Loaded' : '❌ Missing');
console.log('✅ Mobile Optimizer:', window.mobileSEOOptimizer ? 'Loaded' : '❌ Missing');

// Run quick health check
if (window.seoMonitor) {
  window.seoMonitor.runFullAudit().then(result => {
    console.log('SEO Health Score:', result.overallScore + '/100');
    console.log('Issues:', result.issues.length);
    console.log('Warnings:', result.warnings.length);
  });
}
```

## Common Issues & Solutions

### 1. Analytics Not Tracking

**Symptoms:**
- GA4 events not appearing in reports
- Console errors about `gtag` undefined

**Solutions:**

```javascript
// Check GA4 setup
console.log('GA4 Status:');
console.log('gtag function:', typeof gtag);
console.log('GA4 ID:', window.GA_MEASUREMENT_ID || 'Not set');

// Verify tracking
gtag('event', 'test_seo_system', {
  event_category: 'SEO',
  event_label: 'System Test'
});
```

**Quick Fix:**
1. Ensure GA4 script is loaded before SEO modules
2. Check GA4 measurement ID is correct
3. Verify network requests to `google-analytics.com` in dev tools

### 2. Structured Data Errors

**Symptoms:**
- Search Console shows structured data errors
- Rich results not appearing

**Diagnosis:**
```javascript
// Check all schemas on page
const schemas = document.querySelectorAll('script[type="application/ld+json"]');
console.log('Found', schemas.length, 'schemas');

schemas.forEach((script, index) => {
  try {
    const data = JSON.parse(script.textContent);
    console.log(`Schema ${index + 1}:`, data['@type'], '✅ Valid');
  } catch (error) {
    console.error(`Schema ${index + 1}: ❌ Invalid JSON`, error.message);
  }
});

// Test with Google's Rich Results Tool
console.log('Test URL:', location.href);
```

**Solutions:**
1. Validate JSON syntax
2. Ensure required properties are present
3. Use schema.org documentation for correct structure
4. Test with Google's Rich Results Tool

### 3. Mobile SEO Issues

**Symptoms:**
- Poor mobile usability scores
- Touch targets too small
- Content not mobile-friendly

**Check Touch Targets:**
```javascript
// Check all interactive elements
const interactive = document.querySelectorAll('button, a, input, select, textarea');
console.log('Checking', interactive.length, 'interactive elements');

interactive.forEach((el, index) => {
  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  if (width < 44 || height < 44) {
    console.warn(`❌ Element ${index}:`, el, `${width}x${height}px (too small)`);
  } else {
    console.log(`✅ Element ${index}: ${width}x${height}px`);
  }
});
```

**Check Viewport:**
```javascript
const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) {
  console.log('Viewport:', viewport.content);
} else {
  console.error('❌ Missing viewport meta tag');
}
```

### 4. Performance Issues

**Symptoms:**
- Slow page loads
- Poor Core Web Vitals scores
- High bounce rates

**Performance Check:**
```javascript
// Check Core Web Vitals
if ('web-vitals' in window) {
  import('https://unpkg.com/web-vitals@3?module').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// Check resource loading
const resources = performance.getEntriesByType('resource');
const slowResources = resources.filter(r => r.duration > 1000);
console.log('Slow resources (>1s):', slowResources.length);

slowResources.forEach(resource => {
  console.log(`${resource.name}: ${resource.duration}ms`);
});
```

**Solutions:**
1. Optimize images (use WebP, add dimensions, lazy loading)
2. Minify CSS/JavaScript
3. Remove render-blocking resources
4. Enable compression (gzip/brotli)
5. Use CDN for static assets

### 5. SEO Health Score Issues

**Symptoms:**
- Low SEO health scores
- Audit failures

**Run Detailed Audit:**
```javascript
if (window.seoMonitor) {
  window.seoMonitor.runFullAudit().then(result => {
    console.log('Detailed Audit Results:');
    console.log('Overall Score:', result.overallScore);

    Object.entries(result.sections).forEach(([section, data]) => {
      console.log(`\n${section.toUpperCase()}: ${data.score}/100`);
      if (data.issues.length > 0) {
        console.log('❌ Issues:', data.issues);
      }
      if (data.warnings.length > 0) {
        console.log('⚠️ Warnings:', data.warnings);
      }
    });
  });
}
```

## Module-Specific Issues

### Analytics Module Issues

**Event Not Firing:**
```javascript
// Test custom event
window.seoAnalytics.trackSEOEvent('test_event', {
  event_category: 'Test',
  event_label: 'Debug'
});

// Check if event was sent
console.log('Check Network tab for analytics requests');
```

### Monitor Module Issues

**Audit Not Running:**
```javascript
console.log('Monitor status:');
console.log('Available:', !!window.seoMonitor);
console.log('Health check function:', typeof window.seoMonitor?.runFullAudit);
```

### Schema Generation Issues

**Schema Not Appearing:**
```javascript
console.log('Schema generator status:');
console.log('Available:', !!window.contentSchemaGenerator);

// Test schema generation
const testSchema = window.contentSchemaGenerator.generateArticleSchema({
  headline: 'Test Article',
  author: 'Test Author',
  datePublished: '2024-01-01'
});
console.log('Generated schema:', testSchema);
```

## Browser-Specific Issues

### Chrome
- Ensure third-party cookies aren't blocked
- Check for extensions interfering with analytics

### Firefox
- Verify Enhanced Tracking Protection isn't blocking scripts
- Check for strict content blocking

### Safari
- Ensure Intelligent Tracking Prevention isn't affecting analytics
- Check privacy settings

### Mobile Browsers
- Test on actual devices, not just emulators
- Check for app-like behavior affecting tracking

## Server-Side Issues

### Headers Not Set
```bash
# Check server headers
curl -I https://yourdomain.com

# Should include:
# Content-Encoding: gzip
# Cache-Control: public, max-age=31536000
# X-Content-Type-Options: nosniff
```

### CDN Issues
- Verify CDN is configured correctly
- Check for caching problems
- Ensure SSL certificates are valid

## Development vs Production

### Local Development
```javascript
// Disable analytics in development
if (window.location.hostname === 'localhost') {
  console.log('🔧 Development mode: Analytics disabled');
  window.disableSEOAnalytics = true;
}
```

### Testing Environment
- Use GA4 test property for staging
- Verify all scripts load correctly
- Test structured data validation

## Emergency Fixes

### Complete SEO System Reset
```javascript
// Clear all SEO modules
['seoAnalytics', 'seoMonitor', 'searchConsoleIntegration', 'contentSchemaGenerator', 'seoConfig', 'mobileSEOOptimizer'].forEach(module => {
  delete window[module];
});

// Reload page
window.location.reload();
```

### Disable Problematic Features
```javascript
// Temporarily disable analytics
window.disableSEOAnalytics = true;

// Disable monitoring
if (window.seoMonitor) {
  window.seoMonitor = null;
}

// Disable schema generation
window.disableContentSchema = true;
```

## Monitoring & Alerts

### Set Up Automated Monitoring
```javascript
// Check SEO health every hour
setInterval(() => {
  if (window.seoMonitor) {
    const health = window.seoMonitor.getHealthStatus();
    if (health.overallScore < 70) {
      console.warn('🚨 SEO Health Alert:', health);
      // Send notification to monitoring system
    }
  }
}, 3600000);
```

### Performance Regression Detection
```javascript
// Monitor for performance regressions
let lastScore = 100;
setInterval(() => {
  if (window.seoMonitor) {
    const current = window.seoMonitor.getHealthStatus();
    if (current.overallScore < lastScore - 10) {
      console.error('📉 Performance Regression Detected!');
      console.log('Previous:', lastScore, 'Current:', current.overallScore);
    }
    lastScore = current.overallScore;
  }
}, 300000); // Check every 5 minutes
```

## Getting Help

### Debug Information
```javascript
// Generate comprehensive debug report
const debug = {
  timestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  seoSystem: {
    config: !!window.seoConfig,
    analytics: !!window.seoAnalytics,
    monitor: !!window.seoMonitor,
    searchConsole: !!window.searchConsoleIntegration,
    contentSchema: !!window.contentSchemaGenerator,
    mobileOptimizer: !!window.mobileSEOOptimizer
  },
  page: {
    title: document.title,
    metaTags: Array.from(document.querySelectorAll('meta')).length,
    schemas: document.querySelectorAll('script[type="application/ld+json"]').length,
    images: document.querySelectorAll('img').length,
    links: document.querySelectorAll('a').length
  }
};

console.log('SEO Debug Report:', JSON.stringify(debug, null, 2));
```

### Support Checklist
- [ ] Run the quick diagnosis script above
- [ ] Check browser console for errors
- [ ] Verify all SEO modules are loaded
- [ ] Test on multiple devices/browsers
- [ ] Check network requests in dev tools
- [ ] Validate HTML structure
- [ ] Test with Google's tools (Rich Results, PageSpeed, Search Console)

## Prevention

### Best Practices
1. **Regular Audits**: Run SEO audits weekly
2. **Monitor Performance**: Track Core Web Vitals continuously
3. **Test Changes**: Always test SEO impact of code changes
4. **Stay Updated**: Keep SEO modules and dependencies current
5. **Documentation**: Maintain clear documentation of customizations

### Automated Testing
```javascript
// Add to CI/CD pipeline
function runSEOChecks() {
  // Run tests
  return window.SEOMonitoringAnalyticsTests.runAllTests()
    .then(results => {
      if (results.failed > 0) {
        throw new Error(`${results.failed} SEO tests failed`);
      }
      return results;
    });
}
```
</content>
</xai:function_call="create_file">
<parameter name="path">/Users/benjaminpalmer/TBPS/html/html/seo/TROUBLESHOOTING.md
