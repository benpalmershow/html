// Core Services - SOLID Architecture Foundation
// Provides: DataService (SRP), EventBus (DIP), Registry patterns (OCP)

const Services = (function () {
    'use strict';

    // =========================================
    // DataService: Single Responsibility - data fetching only
    // =========================================
    class DataService {
        constructor(options = {}) {
            this._cache = new Map();
            this._inflight = new Map(); // deduplicate concurrent fetches for the same key
        }

        async fetchJSON(path, options = {}) {
            const cacheKey = path;
            if (this._cache.has(cacheKey) && !options.bustCache) {
                return this._cache.get(cacheKey);
            }

            // If a fetch for this key is already in-flight, reuse that Promise
            // to avoid sending multiple network requests before the cache is warm
            if (this._inflight.has(cacheKey) && !options.bustCache) {
                return this._inflight.get(cacheKey);
            }

            let fetchPath = path;
            if (!options.bustCache) {
                const params = new URLSearchParams({ _t: Date.now() });
                fetchPath = `${path}?${params.toString()}`;
            }

            const fetchPromise = fetch(fetchPath, {
                headers: { 'Accept': 'application/json' },
                ...options
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${path}: ${response.status}`);
                }
                return response.json();
            }).then(data => {
                this._cache.set(cacheKey, data);
                this._inflight.delete(cacheKey);
                return data;
            }).catch(err => {
                this._inflight.delete(cacheKey);
                throw err;
            });

            this._inflight.set(cacheKey, fetchPromise);
            return fetchPromise;
        }

        async fetchAnyJSON(paths) {
            const fetchPromises = paths.map(async path => {
                const params = new URLSearchParams({ _t: Date.now() });
                const fetchPath = `${path}?${params.toString()}`;
                const response = await fetch(fetchPath, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`Failed to fetch from ${path}`);
                return response.json();
            });

            return Promise.any(fetchPromises);
        }

        async fetchText(path, options = {}) {
            if (this._cache.has(path) && !options.bustCache) {
                return this._cache.get(path);
            }

            const response = await fetch(path, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            this._cache.set(path, text);
            return text;
        }

        clearCache() {
            this._cache.clear();
        }
    }

    // =========================================
    // EventBus: Dependency Inversion - decoupled communication
    // =========================================
    class EventBus {
        constructor() {
            this._listeners = new Map();
        }

        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            const listeners = this._listeners.get(event);
            if (listeners) listeners.delete(callback);
        }

        emit(event, data) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                listeners.forEach(callback => {
                    try { callback(data); } catch (e) { console.error(`EventBus error [${event}]:`, e); }
                });
            }
        }

        once(event, callback) {
            const wrapper = (data) => {
                this.off(event, wrapper);
                callback(data);
            };
            return this.on(event, wrapper);
        }
    }

    // =========================================
    // Registry: Open/Closed - extensible type registration
    // =========================================
    class Registry {
        constructor(name) {
            this._name = name;
            this._items = new Map();
            this._fallback = null;
        }

        register(key, handler) {
            this._items.set(key, handler);
            return this;
        }

        registerFallback(handler) {
            this._fallback = handler;
            return this;
        }

        get(key) {
            return this._items.get(key) || this._fallback;
        }

        has(key) {
            return this._items.has(key);
        }

        keys() {
            return Array.from(this._items.keys());
        }

        resolve(key, ...args) {
            const handler = this.get(key);
            if (!handler) {
                console.warn(`Registry "${this._name}": No handler for "${key}"`);
                return null;
            }
            return typeof handler === 'function' ? handler(...args) : handler;
        }
    }

    // =========================================
    // Public API
    // =========================================
    const moduleCache = new Map();

    function loadExternalModule(url) {
        if (moduleCache.has(url)) {
            return moduleCache.get(url);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                moduleCache.set(url, promise);
                resolve();
            };
            script.onerror = (e) => {
                console.error('Failed to load module:', url, e);
                reject(new Error(`Failed to load module: ${url}`));
            };
            document.head.appendChild(script);
        });
        moduleCache.set(url, promise);
        return promise;
    }

    return {
        DataService,
        EventBus,
        Registry,
        loadExternalModule,

        // Singleton instances
        dataService: new DataService(),
        events: new EventBus()
    };
})();