# Performance Optimizations

## Lighthouse Performance Improvements

### 1. **Resource Loading Strategy**

#### Before:
- All external libraries loaded immediately (Chart.js, marked.js, js-yaml, lucide)
- 4 external CDN requests blocking render
- All posts loaded at once (~80+ posts)

#### After:
- **Critical only**: marked.js, lucide (needed immediately)
- **Lazy loaded**: Chart.js (only when charts detected), js-yaml (on demand)
- **Preconnect hints**: Added for all CDN domains with crossorigin
- **Result**: 2 critical requests → faster initial load

### 2. **Pagination & Lazy Loading**

#### Initial Load:
- First 10 posts loaded immediately
- Remaining posts loaded on demand via "Load More" button
- Reduces initial HTML parsing and script execution

#### Benefits:
- **Faster Time to Interactive (TTI)**: Less JavaScript to parse
- **Reduced memory**: Only active posts in DOM
- **Better mobile performance**: Less data transferred initially

### 3. **Chart.js Optimization**

```javascript
// Lazy load Chart.js only when needed
window.loadChartJS = function() {
  return new Promise((resolve) => {
    if (window.Chart) resolve(window.Chart);
    // Load on demand
  });
};
```

- Chart.js (~200KB) only loads if posts contain `<canvas>` elements
- Deferred promise-based loading
- Charts render after library loads

### 4. **Script Execution Flow**

1. **DOMContentLoaded**: Initialize posts-loader.js
2. **Wait for marked.js**: Check every 50ms (max 5s)
3. **Load first 10 posts**: Fetch markdown → parse → render
4. **Detect charts**: If found, lazy load Chart.js
5. **Execute scripts**: Chart generation after library ready
6. **Show "Load More"**: If more than 10 posts

### 5. **Performance Metrics**

#### Expected Improvements:
- **FCP (First Contentful Paint)**: Faster (fewer blocking resources)
- **LCP (Largest Contentful Paint)**: Improved (less initial content)
- **TBT (Total Blocking Time)**: Reduced (less JavaScript parsing)
- **CLS (Cumulative Layout Shift)**: Better (progressive loading)

### 6. **Network Optimizations**

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://unpkg.com" crossorigin>
```

- Early DNS resolution for CDN domains
- Reduces connection overhead
- Crossorigin attribute for CORS resources

### 7. **Content Loading Pattern**

```
Page Load
    ↓
Load marked.js + lucide
    ↓
Fetch posts.json
    ↓
Load first 10 markdown files (parallel)
    ↓
Parse markdown → HTML
    ↓
Render to DOM
    ↓
Detect charts → Load Chart.js if needed
    ↓
Execute chart scripts
    ↓
Show "Load More" button
```

## Usage

### For Content Authors:
- Write markdown files in `article/posts/`
- Include charts with `<canvas>` and `<script>` tags
- Chart.js loads automatically when needed

### For Users:
- See first 10 posts immediately
- Click "Load More" to see additional content
- Charts render progressively as loaded

## Future Optimizations

1. **Intersection Observer**: Load more posts on scroll (infinite scroll)
2. **Service Worker**: Cache markdown files and libraries
3. **Image optimization**: WebP conversion, lazy loading
4. **Bundle optimization**: Self-host critical libraries
5. **Code splitting**: Separate chart types (line, bar, etc.)

## Monitoring

Use Lighthouse to track improvements:
```bash
# Run Lighthouse
npx lighthouse https://howdystranger.net --view

# Key metrics to watch:
# - Performance score
# - First Contentful Paint
# - Largest Contentful Paint
# - Total Blocking Time
# - Cumulative Layout Shift
```
