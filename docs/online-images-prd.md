# Online Images Fetching and Display PRD

## Overview

The Online Images system enables automatic fetching of images from external sources and their display on the website. This system will enhance visual content by integrating relevant images from web APIs, media databases, or direct URLs, providing users with rich visual context for content such as media recommendations, news articles, and financial data.

## Objectives

- Automatically fetch high-quality, relevant images from online sources
- Display images seamlessly within existing content structures
- Ensure fast loading and optimal performance
- Maintain consistent visual styling and accessibility
- Handle errors gracefully with fallbacks

## Technical Requirements

### Image Sources

The system will support fetching images from:

1. **Media APIs** (TMDB, Spotify, etc.) - For movies, TV shows, music, podcasts
2. **News APIs** - For article thumbnails and featured images
3. **Financial data sources** - For company logos, chart images
4. **Direct URLs** - When specific image URLs are provided
5. **Fallback sources** - Generic icons or placeholder images

### Fetching Mechanism

- Implement asynchronous image fetching with proper error handling
- Cache fetched images locally to reduce external API calls
- Respect rate limits and API terms of service
- Use appropriate API keys and authentication where required

### Display Integration

- Images will be displayed within existing content areas:
  - Media cards on media.html
  - Post thumbnails in posts.json
  - Article previews on news.html
  - Company logos on financial pages

## Implementation Details

### Image Fetching Module

Create a new JavaScript module (`js/image-fetch.js`) that handles:

```javascript
// Example API integration
async function fetchImageFromAPI(type, identifier) {
  const apiUrls = {
    movie: `https://api.themoviedb.org/3/movie/${identifier}/images`,
    music: `https://api.spotify.com/v1/albums/${identifier}`,
    // etc.
  };

  try {
    const response = await fetch(apiUrls[type]);
    const data = await response.json();
    return data.images?.[0]?.url || getFallbackImage(type);
  } catch (error) {
    console.error('Image fetch failed:', error);
    return getFallbackImage(type);
  }
}
```

### Image Display Standards

All fetched images must conform to:

- **Maximum dimensions**: 400px width, 600px height
- **File formats**: JPEG, PNG, WebP (preferred for performance)
- **Aspect ratios**: Maintain original aspect ratio, with cropping if needed
- **Alt text**: Descriptive text for accessibility
- **Loading**: Lazy loading for performance

### Styling Guidelines

Images will use existing CSS classes with modifications:

```css
/* Existing media image styles */
.media-image {
  width: 60px;
  height: auto;
  float: left;
  margin-right: 10px;
}

/* New online image styles */
.online-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Dark mode support */
.dark-mode .online-image {
  box-shadow: 0 2px 4px rgba(255,255,255,0.1);
}
```

### Caching Strategy

- Implement localStorage or IndexedDB caching for fetched images
- Cache images for 24 hours to balance freshness and performance
- Include cache invalidation for updated content
- Handle cache misses gracefully

## Content Integration Points

### Media Cards

- Fetch cover images for new media additions automatically
- Update existing media entries with high-resolution images
- Support multiple image sizes (thumbnail, full-size)

### Posts System

- Include image URLs in posts.json content field
- Display images inline with post text using `<img>` tags
- Ensure images are responsive and mobile-friendly

### News Articles

- Fetch featured images for news articles
- Display thumbnails in article lists
- Support social media sharing with proper image metadata

## Error Handling and Fallbacks

### Fallback Strategy

1. **Primary source fails** → Try secondary API
2. **All APIs fail** → Use generic placeholder image
3. **Network timeout** → Display loading spinner, then fallback
4. **Invalid image URL** → Replace with placeholder

### Error States

- Loading state: Show skeleton or spinner
- Error state: Display placeholder with retry option
- Offline state: Use cached images or placeholders

## Performance Considerations

### Optimization Techniques

- **Lazy loading**: Load images only when entering viewport
- **Image compression**: Serve optimized image sizes
- **CDN integration**: Use fast, reliable image hosting
- **Preloading**: Preload critical images on page load

### Monitoring

- Track image load times and success rates
- Monitor API usage and rate limits
- Log errors for debugging and improvement

## Security and Privacy

- Validate all external URLs before fetching
- Implement CORS handling for cross-origin images
- Avoid exposing API keys in client-side code
- Sanitize image metadata and alt text

## API Integrations

### Planned Integrations

1. **TMDB (The Movie Database)** - Movie and TV show images
2. **Spotify Web API** - Album and artist images
3. **News API** - Article thumbnails
4. **Unsplash** - Stock photography for general content
5. **Company logo APIs** - For financial content

### API Key Management

- Store API keys securely (environment variables)
- Implement rate limiting and usage monitoring
- Handle API quota exceeded errors gracefully

## Implementation Phases

### Phase 1: Core Infrastructure
- Create image-fetch.js module
- Implement basic API integrations (TMDB, Spotify)
- Add caching and error handling

### Phase 2: Content Integration
- Integrate with media.html cards
- Update posts.json to include image URLs
- Add image display to news articles

### Phase 3: Optimization
- Implement lazy loading and compression
- Add performance monitoring
- Expand to additional APIs

### Phase 4: Advanced Features
- Image search and selection interface
- Bulk image updates for existing content
- Social media image optimization

## Testing Requirements

### Unit Tests
- Image fetching functions
- Error handling scenarios
- Cache functionality

### Integration Tests
- API response parsing
- Image display in various contexts
- Fallback behavior

### Performance Tests
- Image load times
- Memory usage with caching
- Network failure scenarios

## Success Metrics

- **Image load success rate**: >95%
- **Page load time impact**: <500ms increase
- **User engagement**: Increased time on page with images
- **Error rate**: <5% of image requests

## Future Enhancements

- AI-powered image relevance scoring
- Automatic image cropping and enhancement
- Progressive image loading
- Offline image caching for PWA features

## Dependencies

- Existing JavaScript modules (navigation.js, etc.)
- External APIs (TMDB, Spotify, etc.)
- CSS styling framework
- Caching libraries (if needed)

## Current Implementation Status

### Phase 1: Basic Infrastructure (Completed)
- ✅ Created `js/image-fetch.js` module with localStorage caching
- ✅ Basic error handling and fallback mechanisms
- ✅ Blob URL generation for offline compatibility

### Content Integration Examples

#### Supreme Court Building Images
- Used in post headers for context (e.g., `2025-11-06.md`)
- Source: Wikimedia Commons thumbnails
- Format: 330px width JPEG with border styling
- Fallback: Generic court icon if fetch fails

#### Justice Portraits
- Displayed in flexbox layout with biographical information
- Source: Official Supreme Court website (`supremecourt.gov/about/justice_pictures/`)
- Dimensions: 50x60px with 2px borders and rounded corners
- Integration: Flexbox containers with side-by-side image and text
- Accessibility: Descriptive alt text for each justice
- Automation: `getJusticeImageTag()` function available for future use

#### Media Content Images
- Existing implementation in articles (e.g., Kei trucks, books, films)
- Centered display with border and rounded corners
- Lazy loading considerations for performance

### Observed Issues and Solutions

#### Local Development Challenges
- **Problem**: HTTPS images blocked in `file://` protocol
- **Solution**: Run local HTTP server (`python3 -m http.server 8000`)
- **Future**: Implement service worker for offline image caching

#### Image URL Validation
- **Problem**: Invalid thumbnail URLs cause 404 errors
- **Solution**: Verify URLs before deployment using web inspection
- **Prevention**: Add URL validation in image-fetch.js

#### Performance Optimization
- **Current**: Direct URL loading
- **Planned**: Implement lazy loading and preloading
- **Caching**: 24-hour localStorage retention implemented

### Justice Image Automation Tool

Create a dedicated utility for fetching Supreme Court justice portraits:

```javascript
// js/justice-images.js
const justiceImageMap = {
  'Roberts': 'https://www.supremecourt.gov/justice_pictures/Roberts2.jpg',
  'Thomas': 'https://www.supremecourt.gov/justice_pictures/Thomas2.jpg',
  'Alito': 'https://www.supremecourt.gov/justice_pictures/Alito2.jpg',
  'Sotomayor': 'https://www.supremecourt.gov/justice_pictures/Sotomayor_Official_2025.jpg',
  'Kagan': 'https://www.supremecourt.gov/justice_pictures/Kagan_10713-017-Crop.jpg',
  'Gorsuch': 'https://www.supremecourt.gov/justice_pictures/Gorsuch2.jpg',
  'Kavanaugh': 'https://www.supremecourt.gov/justice_pictures/Kavanaugh%2012221_005_crop.jpg',
  'Barrett': 'https://www.supremecourt.gov/justice_pictures/Barrett_102535_w151.jpg',
  'Jackson': 'https://www.supremecourt.gov/justice_pictures/Jackson2.jpg'
};

function getJusticeImageTag(name, description = '') {
  const imageUrl = justiceImageMap[name];
  if (!imageUrl) return '';

  return `<img src="${imageUrl}" alt="Justice ${name}" width="40" height="60" style="vertical-align:middle; margin-right:5px;"> **Justice ${name}** ${description}`;
}

// Usage in posts:
// - getJusticeImageTag('Roberts', 'Asked about standing.')
// - getJusticeImageTag('Gorsuch', 'Congress can transfer power by simple majority...')
```

### Streamlined Image Integration Process

#### For Content Creators
1. **Justice Portraits**: Use `getJusticeImageTag()` function instead of manual HTML
2. **Wikipedia Images**: Use verified thumbnail URLs from Commons
3. **Media Covers**: Leverage existing media.json data with cover fields
4. **Automated Fetching**: For new content, run image-fetch.js preload functions

#### For Developers
1. **URL Validation Script**: Create `validate-image-urls.js` to check all image URLs before deployment
2. **Bulk Image Update**: Function to scan and update all posts with cached images
3. **Template System**: Standard HTML templates for different image types
4. **One-Click Integration**: Button in content editor to insert properly formatted images

#### Quality Assurance Checklist
- [ ] All image URLs tested and accessible
- [ ] HTTPS URLs used for security
- [ ] Alt text provided for accessibility
- [ ] Consistent dimensions and styling
- [ ] Mobile responsiveness verified
- [ ] Local server testing for HTTPS images
- [ ] Cache invalidation for updated content

### Next Steps (Phase 2)
1. Integrate image-fetch.js with content loading
2. Add lazy loading for below-the-fold images
3. Implement API integrations (TMDB, Spotify)
4. Add image optimization and compression
5. Expand to news articles and financial content
6. **NEW**: Create justice image automation tool
7. **NEW**: Build URL validation and bulk update utilities

This PRD establishes the foundation for a robust online image fetching and display system that will significantly enhance the visual appeal and user experience of the website.
