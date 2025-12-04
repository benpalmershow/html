/**
 * 
 * Event Manager - Centralized event listener management
 * Prevents memory leaks by tracking and cleaning up event listeners
 */

const eventListeners = new Map();
const DEBUG = false; // Set to true to log all listener operations

/**
 * Shallow compare options objects
 */
function optionsEqual(opts1, opts2) {
  const keys1 = Object.keys(opts1);
  const keys2 = Object.keys(opts2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key => opts1[key] === opts2[key]);
}

/**
 * Add a managed event listener with automatic cleanup
 * @param {Element|Window|Document} target - Event target
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - addEventListener options (capture, passive, etc)
 * @returns {Function} Cleanup function
 */
export function addListener(target, event, handler, options = {}) {
  if (!target) return () => {};
  
  if (!target.__eventManagerId) {
    target.__eventManagerId = `em_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Make scroll/resize passive by default for performance
  if ((event === 'scroll' || event === 'resize') && options.passive === undefined) {
    options = { ...options, passive: true };
  }
  
  const key = `${target.__eventManagerId}::${event}`;
  
  if (!eventListeners.has(key)) {
    eventListeners.set(key, []);
  }
  
  const listeners = eventListeners.get(key);
  
  // Check for duplicates
  const isDuplicate = listeners.some(l => l.handler === handler && optionsEqual(l.options, options));
  if (isDuplicate) {
    if (DEBUG) console.warn(`Duplicate listener already registered: ${event} on ${key}`);
    return () => removeListener(target, event, handler, options);
  }
  
  // Warn if too many listeners on same target
  if (listeners.length > 50) {
    console.warn(`[EventManager] High listener count (${listeners.length + 1}) for ${key}. Check for memory leaks.`);
  }
  
  listeners.push({ target, event, handler, options });
  target.addEventListener(event, handler, options);
  
  if (DEBUG) console.log(`[EventManager] Added ${event} listener. Total: ${listeners.length}`);
  
  // Return cleanup function
  return () => removeListener(target, event, handler, options);
}

/**
 * Remove a specific event listener
 */
export function removeListener(target, event, handler, options = {}) {
  if (!target) return;
  
  const key = target.__eventManagerId ? `${target.__eventManagerId}::${event}` : null;
  if (!key) return;
  
  const listeners = eventListeners.get(key);
  if (listeners) {
    const index = listeners.findIndex(l => 
      l.handler === handler && optionsEqual(l.options, options)
    );
    if (index > -1) {
      try {
        target.removeEventListener(event, handler, options);
        listeners.splice(index, 1);
        if (DEBUG) console.log(`[EventManager] Removed ${event} listener. Remaining: ${listeners.length}`);
        
        // Clean up orphaned entries
        if (listeners.length === 0) {
          eventListeners.delete(key);
        }
      } catch (e) {
        console.error(`[EventManager] Failed to remove listener for ${event}:`, e);
      }
    }
  }
}

/**
 * Remove all event listeners for a target
 */
export function removeAllListeners(target) {
  if (!target || !target.__eventManagerId) return;
  
  const id = target.__eventManagerId;
  eventListeners.forEach((listeners, key) => {
    if (key.startsWith(id)) {
      listeners.forEach(({ target: t, event, handler, options }) => {
        t.removeEventListener(event, handler, options);
      });
      eventListeners.delete(key);
    }
  });
}

/**
 * Remove all event listeners on page unload/navigation
 * Call this on beforeunload or pagehide
 */
export function cleanupAllListeners() {
  eventListeners.forEach((listeners) => {
    listeners.forEach(({ target, event, handler, options }) => {
      if (target && event) {
        try {
          target.removeEventListener(event, handler, options);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    });
  });
  eventListeners.clear();
}

/**
 * Add a one-time event listener that auto-removes after first call
 * @param {Element|Window|Document} target - Event target
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - addEventListener options
 * @returns {Function} Cleanup function
 */
export function addListenerOnce(target, event, handler, options = {}) {
  const wrappedHandler = (e) => {
    handler.call(target, e);
    removeListener(target, event, wrappedHandler, options);
  };
  
  return addListener(target, event, wrappedHandler, options);
}

/**
 * Delegation helper - add single listener to parent, handle child clicks
 * @param {Element} parent - Parent element
 * @param {string} selector - Child selector to match
 * @param {Function} handler - Event handler
 */
export function delegateListener(parent, selector, handler) {
  const wrappedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target) {
      handler.call(target, e);
    }
  };
  
  addListener(parent, 'click', wrappedHandler);
  return () => removeListener(parent, 'click', wrappedHandler);
}

/**
 * Debug: Get all registered listeners (useful for debugging memory leaks)
 * @returns {Object} Map of listeners by key
 */
export function getListenerStats() {
  const stats = {};
  let totalListeners = 0;
  
  eventListeners.forEach((listeners, key) => {
    stats[key] = listeners.length;
    totalListeners += listeners.length;
  });
  
  return { stats, totalListeners, targetCount: eventListeners.size };
}

/**
 * Debug: Get listeners for a specific target
 * @param {Element|Window|Document} target - Event target
 * @param {string} event - Optional: filter by event type
 * @returns {Array} Array of listener objects for this target
 */
export function getTargetListeners(target, event = null) {
  if (!target || !target.__eventManagerId) return [];
  
  const id = target.__eventManagerId;
  const result = [];
  
  eventListeners.forEach((listeners, key) => {
    if (key.startsWith(id)) {
      const [, eventName] = key.split('::');
      if (!event || eventName === event) {
        result.push(...listeners.map(l => ({ event: eventName, handler: l.handler, options: l.options })));
      }
    }
  });
  
  return result;
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllListeners);
  window.addEventListener('pagehide', cleanupAllListeners);
}
