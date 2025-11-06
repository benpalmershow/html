// Image Fetching and Caching Module
// Implements online image fetching with local caching as per online-images-prd.md

class ImageFetcher {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.loadCacheFromStorage();
  }

  // Load cached images from localStorage
  loadCacheFromStorage() {
    try {
      const cached = localStorage.getItem('imageCache');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cache = new Map(Object.entries(parsed));
        // Clean expired entries
        this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Failed to load image cache:', error);
    }
  }

  // Save cache to localStorage
  saveCacheToStorage() {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem('imageCache', JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save image cache:', error);
    }
  }

  // Clean expired cache entries
  cleanExpiredCache() {
    const now = Date.now();
    for (const [url, data] of this.cache) {
      if (now - data.timestamp > this.cacheExpiry) {
        this.cache.delete(url);
      }
    }
    this.saveCacheToStorage();
  }

  // Fetch image from URL with caching
  async fetchImage(url) {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
      return cached.blobUrl;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Cache the blob URL
      this.cache.set(url, {
        blobUrl: blobUrl,
        timestamp: Date.now()
      });
      this.saveCacheToStorage();

      return blobUrl;
    } catch (error) {
      console.error('Failed to fetch image:', url, error);
      return url; // Return original URL as fallback
    }
  }

  // Get cached image or fetch if not cached
  async getImage(url) {
    return await this.fetchImage(url);
  }

  // Preload images
  async preloadImages(urls) {
    const promises = urls.map(url => this.fetchImage(url));
    return Promise.allSettled(promises);
  }
}

// Global instance
const imageFetcher = new ImageFetcher();

// Export for use in other modules
window.imageFetcher = imageFetcher;
