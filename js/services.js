// Core Services - SOLID Architecture Foundation
// Provides: DataService (SRP), EventBus (DIP), Registry patterns (OCP)

const Services = (function () {
    'use strict';

    // =========================================
    // DataService: Single Responsibility - data fetching only
    // =========================================
    class DataService {
        constructor(options = {}) {
            this._version = options.version || document.querySelector('meta[name="site-data-version"]')?.content || '20260320';
            this._cache = new Map();
        }

        _cacheKey(path) {
            return `${path}?v=${this._version}`;
        }

        async fetchJSON(path, options = {}) {
            const cacheKey = this._cacheKey(path);
            if (this._cache.has(cacheKey) && !options.bustCache) {
                return this._cache.get(cacheKey);
            }

            const response = await fetch(cacheKey, {
                headers: { 'Accept': 'application/json' },
                ...options
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.status}`);
            }

            const data = await response.json();
            this._cache.set(cacheKey, data);
            return data;
        }

        async fetchAnyJSON(paths) {
            const fetchPromises = paths.map(async path => {
                const response = await fetch(this._cacheKey(path), {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`Failed to fetch from ${path}`);
                return response.json();
            });

            return Promise.any(fetchPromises);
        }

        async fetchText(path) {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
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
    return {
        DataService,
        EventBus,
        Registry,

        // Singleton instances
        dataService: new DataService(),
        events: new EventBus()
    };
})();
