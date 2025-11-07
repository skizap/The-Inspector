/**
 * Simple in-memory caching module using JavaScript Map
 * Reduces API costs and improves response times with 1-hour TTL
 */

// Constants
const DEFAULT_TTL = 3600000; // 1 hour in milliseconds
const CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes

// Private state
const cache = new Map();
let cleanupTimer = null;

/**
 * Checks if a cache entry has expired
 * @param {Object} entry - Cache entry object with timestamp and ttl
 * @returns {boolean} True if entry is expired
 */
function _isExpired(entry) {
  const age = Date.now() - entry.timestamp;
  return age >= entry.ttl;
}

/**
 * Starts periodic cleanup of expired cache entries
 * @returns {void}
 */
function _startCleanupTimer() {
  if (cleanupTimer !== null) {
    return; // Timer already running
  }

  cleanupTimer = setInterval(() => {
    let cleanedCount = 0;
    for (const [key, entry] of cache.entries()) {
      if (_isExpired(entry)) {
        cache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`[cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }, CACHE_CLEANUP_INTERVAL);
}

/**
 * Stops periodic cleanup timer
 * @returns {void}
 */
function _stopCleanupTimer() {
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Stores a value in the cache with specified TTL
 * @param {string} key - Cache key (e.g., package name)
 * @param {any} value - Value to cache (e.g., API response)
 * @param {number} [ttl=3600000] - Time-to-live in milliseconds (default: 1 hour)
 * @returns {void}
 * @example
 * set('lodash', packageData, 3600000);
 */
export function set(key, value, ttl = DEFAULT_TTL) {
  const entry = {
    data: value,
    timestamp: Date.now(),
    ttl
  };
  cache.set(key, entry);
  console.log(`[cache] Stored entry for key: ${key} with TTL: ${ttl}ms`);
  _startCleanupTimer();
}

/**
 * Retrieves a value from the cache if it exists and is not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found/expired
 * @example
 * const data = get('lodash');
 */
export function get(key) {
  if (!cache.has(key)) {
    return null;
  }

  const entry = cache.get(key);
  if (_isExpired(entry)) {
    cache.delete(key);
    console.log(`[cache] Entry expired for key: ${key}`);
    return null;
  }

  console.log(`[cache] Cache hit for key: ${key}`);
  return entry.data;
}

/**
 * Checks if a key exists in the cache and is not expired
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists and is not expired
 * @example
 * if (has('lodash')) { ... }
 */
export function has(key) {
  if (!cache.has(key)) {
    return false;
  }

  const entry = cache.get(key);
  if (_isExpired(entry)) {
    cache.delete(key);
    return false;
  }

  return true;
}

/**
 * Clears all entries from the cache
 * @returns {void}
 * @example
 * clear();
 */
export function clear() {
  cache.clear();
  _stopCleanupTimer();
  console.log('[cache] Cleared all cache entries');
}

/**
 * Returns the number of entries currently in the cache
 * @returns {number} Number of cache entries
 * @example
 * console.log('Cache size:', size());
 */
export function size() {
  return cache.size;
}

/**
 * Returns cache statistics
 * @returns {Object} Statistics object with total, expired, and valid counts
 * @example
 * const stats = getStats();
 * console.log('Valid entries:', stats.valid);
 */
export function getStats() {
  let expiredCount = 0;
  for (const entry of cache.values()) {
    if (_isExpired(entry)) {
      expiredCount++;
    }
  }

  const total = cache.size;
  const expired = expiredCount;
  const valid = total - expired;

  return { total, expired, valid };
}
