# Lighthouse Performance Optimizations

## Current Score: 59 → Target: 90+

### LCP (Largest Contentful Paint) Improvements

#### 1. **Critical Resource Loading**
```html
<!-- Before: Logo preloaded (not LCP element) -->
<link rel="preload" href="images/logo-360x360.webp">

<!-- After: Announcements icon preloaded (actual LCP) -->
<link rel="preload" href="images/announcements.webp" fetchpriority="high">
```

#### 2. **Inline Critical CSS**
Added inline CSS for above-the-fold content:
- Body background/text colors
- Announcement container layout
- Loading skeleton styles
- Page title styles

**Impact**: Eliminates render-blocking CSS for initial paint

#### 3. **Reduced Initial Load**
```javascript
// Before: 10 posts initially
const INITIAL_LOAD = 10;

// After: 5 posts initially (faster LCP)
const INITIAL_LOAD = 5;
```

#### 4. **Deferred Analytics**
```javascript
// Load Google Analytics after page load
window.addEventListener('load', function() {
  const script = document.createElement('script');
  script.src = 'gtag.js';
  document.head.appendChild(script);
});
```

### CLS (Cumulative Layout Shift) Improvements

#### 1. **Fixed Skeleton Heights**
```html
<!-- Before: Dynamic height -->
<div class="loading-skeleton"></div>

<!-- After: Fixed height to prevent shift -->
<div class="loading-skeleton" style="height: 80px;"></div>
```

#### 2. **Container Min-Height**
```html
<div class="announcements-container" style="min-height: 200px;">
```
Prevents layout shift when content loads

#### 3. **Content Visibility**
```css
.announcement-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 150px;
}
```
Reserves space for off-screen content

#### 4. **Image Aspect Ratios**
```css
.announcement-card img {
  aspect-ratio: attr(width) / attr(height);
  object-fit: cover;
}
```

### TBT (Total Blocking Time) Improvements

#### 1. **RequestIdleCallback**
```javascript
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initPosts(), { timeout: 2000 });
}
```
Defers non-critical JavaScript execution

#### 2. **Lazy Load External Libraries**
- **Chart.js**: Only loads when charts detected
- **Font Awesome**: Preloaded asynchronously
- **js-yaml**: Loaded on demand

#### 3. **Optimized Preconnects**
```html
<!-- Critical: preconnect -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>

<!-- Non-critical: dns-prefetch -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
```

### FCP (First Contentful Paint) Improvements

#### 1. **Non-Blocking Font Awesome**
```html
<link rel="preload" 
      href="font-awesome.css" 
      as="style" 
      onload="this.rel='stylesheet'">
```

#### 2. **Optimized CSS Loading**
- Critical CSS inlined in `<head>`
- Non-critical CSS loaded with `rel="preload"`
- Font Awesome deferred

#### 3. **Image Loading Priority**
```html
<img src="announcements.webp" loading="eager" fetchpriority="high">
```

## Performance Checklist

- [x] Inline critical CSS
- [x] Defer non-critical CSS
- [x] Preload LCP image
- [x] Fixed skeleton heights
- [x] Container min-heights
- [x] Content visibility
- [x] Lazy load Chart.js
- [x] RequestIdleCallback for posts
- [x] Deferred analytics
- [x] Optimized preconnects
- [x] Reduced initial posts (10→5)
- [x] Image aspect ratios
- [x] Containment on cards

## Expected Improvements

| Metric | Before | Target | Optimization |
|--------|--------|--------|--------------|
| **Performance** | 59 | 90+ | Multiple optimizations |
| **LCP** | ~3.5s | <2.5s | Critical path optimization |
| **CLS** | ~0.2 | <0.1 | Fixed heights, min-heights |
| **TBT** | ~800ms | <300ms | Deferred JS, requestIdleCallback |
| **FCP** | ~2.0s | <1.8s | Inline CSS, deferred fonts |

## Testing Commands

```bash
# Run Lighthouse
npx lighthouse https://howdystranger.net --view

# Run multiple tests
npx lighthouse https://howdystranger.net --output=json --output-path=./report.json

# Test mobile
npx lighthouse https://howdystranger.net --preset=mobile --view

# Test desktop
npx lighthouse https://howdystranger.net --preset=desktop --view
```

## Next Steps

1. **Test on real device** - Mobile performance
2. **Analyze Web Vitals** - Real user metrics
3. **Monitor field data** - Chrome UX Report
4. **Progressive enhancement** - Service worker caching
5. **Image optimization** - Convert to AVIF where supported

## Additional Optimizations (Future)

- [ ] Service Worker for offline caching
- [ ] HTTP/2 Server Push for critical resources
- [ ] Image lazy loading with IntersectionObserver
- [ ] AVIF image format with WebP fallback
- [ ] Prefetch next posts on idle
- [ ] Bundle CSS/JS (production build)
- [ ] Enable HTTP/3 (QUIC)
- [ ] Implement resource hints for next navigation
