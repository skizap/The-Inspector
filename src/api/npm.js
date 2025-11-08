import axios from 'axios';
import semver from 'semver';
import { get as cacheGet, set as cacheSet } from '../utils/cache.js';

// Constants
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const CONCURRENT_FETCH_LIMIT = 10;

/**
 * Validates npm package name format
 * @param {string} packageName - The package name to validate
 * @returns {boolean} True if valid
 * @throws {Error} If package name is invalid
 * @example
 * _validatePackageName('react'); // Returns true
 * _validatePackageName('@babel/core'); // Returns true
 */
function _validatePackageName(packageName) {
  if (!packageName || typeof packageName !== 'string') {
    throw new Error('Package name must be a non-empty string');
  }

  const npmNameRegex = /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/;
  
  if (packageName.length < 1 || packageName.length > 214) {
    throw new Error('Invalid package name. Package name must be between 1 and 214 characters.');
  }

  if (!npmNameRegex.test(packageName)) {
    throw new Error('Invalid package name. Use lowercase letters, numbers, hyphens, underscores, dots, and optionally a @scope/ prefix.');
  }

  return true;
}

/**
 * Validates npm API response structure
 * @param {Object} data - The response data from npm API
 * @param {string} packageName - The requested package name
 * @returns {boolean} True if valid
 * @throws {Error} If response is invalid
 */
function _validateResponse(data, packageName) {
  if (!data?.name) {
    throw new Error('Invalid npm API response: missing name field');
  }

  if (!data?.['dist-tags']?.latest || typeof data['dist-tags'].latest !== 'string') {
    throw new Error('Invalid npm API response: missing or invalid dist-tags.latest field');
  }

  if (!data?.versions || typeof data.versions !== 'object') {
    throw new Error('Invalid npm API response: missing or invalid versions field');
  }

  const latestVersion = data['dist-tags'].latest;
  const versionData = data.versions[latestVersion];
  
  if (!versionData) {
    throw new Error(`Invalid npm API response: version ${latestVersion} not found in versions object`);
  }

  // Validate dependencies is an object if present
  if (versionData.dependencies !== undefined && typeof versionData.dependencies !== 'object') {
    throw new Error('Invalid npm API response: dependencies must be an object');
  }

  // Verify package name matches (case-insensitive for scoped packages)
  if (data.name.toLowerCase() !== packageName.toLowerCase()) {
    throw new Error(`Invalid npm API response: package name mismatch (expected ${packageName}, got ${data.name})`);
  }

  return true;
}

/**
 * Determines if an error should trigger a retry
 * @param {Error} error - The error object from axios
 * @returns {boolean} True if should retry
 */
function _shouldRetry(error) {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  // Request timeout errors (408)
  if (error.response.status === 408) {
    return true;
  }

  // Rate limit errors
  if (error.response.status === 429) {
    return true;
  }

  // Server errors (5xx)
  if (error.response.status >= 500) {
    return true;
  }

  // Don't retry client errors (4xx except 408 and 429)
  return false;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a standardized error object
 * @param {string} type - Error type identifier
 * @param {string} message - User-friendly error message
 * @param {Error} originalError - Original error object
 * @returns {Object} Standardized error object
 */
function _createErrorObject(type, message, originalError) {
  return {
    type,
    message,
    originalError
  };
}

/**
 * Maps axios error to standardized error object
 * @param {Error} error - The axios error object
 * @param {string} packageName - The package name being fetched
 * @returns {Object} Standardized error object
 */
function _mapAxiosError(error, packageName) {
  // 404 Not Found
  if (error.response?.status === 404) {
    return _createErrorObject(
      'PACKAGE_NOT_FOUND',
      'Package not found. Please check the name and try again.',
      error
    );
  }
  // 408 Request Timeout
  if (error.response?.status === 408) {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Analysis timed out. This can happen with very large packages. Please try again.',
      error
    );
  }
  // Timeout
  if (error.code === 'ECONNABORTED') {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Analysis timed out. This can happen with very large packages. Please try again.',
      error
    );
  }
  // Network error
  if (!error.response) {
    return _createErrorObject(
      'NETWORK_ERROR',
      'Network error. Please check your internet connection.',
      error
    );
  }
  // 5xx server error
  if (error.response?.status >= 500) {
    return _createErrorObject(
      'API_ERROR',
      'npm Registry temporarily unavailable. Please try again in a few moments.',
      error
    );
  }
  // 429 Rate limit
  if (error.response?.status === 429) {
    return _createErrorObject(
      'RATE_LIMIT',
      'Too many requests. Please wait a moment and try again.',
      error
    );
  }
  // Validation error
  if (error.message?.includes('Invalid npm API response')) {
    return _createErrorObject('VALIDATION_ERROR', error.message, error);
  }
  // Generic error
  return _createErrorObject(
    'API_ERROR',
    'Failed to fetch package data',
    error
  );
}

/**
 * Parses GitHub repository URL to extract owner and repo name
 * @param {string} repositoryUrl - The repository URL from npm metadata
 * @returns {Object|null} Object with owner and repo properties, or null if not GitHub or invalid
 * @example
 * _parseGitHubRepo('https://github.com/lodash/lodash'); // Returns { owner: 'lodash', repo: 'lodash' }
 * _parseGitHubRepo('git+https://github.com/facebook/react.git'); // Returns { owner: 'facebook', repo: 'react' }
 * _parseGitHubRepo('git@github.com:owner/repo.git'); // Returns { owner: 'owner', repo: 'repo' }
 * _parseGitHubRepo('https://github.com/eslint/eslint'); // Returns { owner: 'eslint', repo: 'eslint' }
 * _parseGitHubRepo('https://github.com/airbnb/eslint-config-airbnb'); // Returns { owner: 'airbnb', repo: 'eslint-config-airbnb' }
 * _parseGitHubRepo('https://github.com/owner/repo.git#readme'); // Returns { owner: 'owner', repo: 'repo' }
 * @private
 */
function _parseGitHubRepo(repositoryUrl) {
  if (!repositoryUrl || typeof repositoryUrl !== 'string') {
    return null;
  }

  try {
    // Check if URL contains github.com
    if (!repositoryUrl.includes('github.com')) {
      return null;
    }

    // Strip known prefixes (git+, protocols, git@)
    let cleanUrl = repositoryUrl
      .replace(/^git\+/, '')
      .replace(/^https?:\/\//, '')
      .replace(/^git@/, '')
      .replace(/^ssh:\/\//, '');

    // Remove .git suffix
    cleanUrl = cleanUrl.replace(/\.git$/, '');

    // Remove anchors/fragments (#readme, #main, etc.)
    cleanUrl = cleanUrl.replace(/#.*$/, '');

    // Remove query strings
    cleanUrl = cleanUrl.replace(/\?.*$/, '');

    // Extract owner and repo from github.com/owner/repo or github.com:owner/repo
    const githubRegex = /github\.com[/:]([\w.-]+)\/([\w.-]+)/i;
    const match = cleanUrl.match(githubRegex);

    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }

    return null;
  } catch (error) {
    console.warn('[npm] Failed to parse GitHub repo URL:', repositoryUrl, error.message);
    return null;
  }
}

/**
 * Fetches GitHub repository statistics (open issues count)
 * @param {string} owner - GitHub repository owner
 * @param {string} repo - GitHub repository name
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object|null>} Object with openIssues count, or null if fetch fails
 * @example
 * const stats = await _fetchGitHubStats('facebook', 'react', 30000);
 * // Returns: { openIssues: 234 }
 * @private
 */
async function _fetchGitHubStats(owner, repo, timeout) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    
    const response = await axios.get(url, {
      timeout,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.data?.open_issues_count !== undefined) {
      return {
        openIssues: response.data.open_issues_count
      };
    }

    return null;
  } catch (error) {
    // Non-critical failure - log warning and return null
    console.warn(`[npm] Failed to fetch GitHub stats for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Fetches package metadata from npm registry
 * @param {string} packageName - The npm package name to fetch (supports scoped packages like @scope/name)
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @param {Object} [options={}] - Optional configuration
 * @param {boolean} [options.includeGithubStats=true] - Whether to fetch GitHub stats (default: true)
 * @returns {Promise<Object>} Package metadata object with name, version, description, dependencies, license, repository, maintainers, lastPublishDate, githubStats
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const data = await fetchPackageData('react');
 * @example
 * const scopedData = await fetchPackageData('@babel/core');
 * @example
 * const dataWithoutGithub = await fetchPackageData('lodash', 30000, { includeGithubStats: false });
 */
async function fetchPackageData(packageName, timeout = DEFAULT_TIMEOUT, options = {}) {
  const startTime = Date.now();

  // Step 1: Input validation
  try {
    _validatePackageName(packageName);
  } catch (error) {
    console.error('[npm] Validation error:', packageName, error.message);
    throw _createErrorObject('VALIDATION_ERROR', error.message, error);
  }

  // Step 2: URL encoding for scoped packages
  const encodedPackageName = packageName.includes('/') 
    ? encodeURIComponent(packageName) 
    : packageName;
  const url = `${NPM_REGISTRY_URL}/${encodedPackageName}`;

  // Step 3: Check cache before API call
  const cacheKey = `npm:${packageName}`;
  const cachedData = cacheGet(cacheKey);
  const includeGithubStats = options.includeGithubStats !== false; // Default to true
  
  if (cachedData !== null) {
    console.log('[npm] Cache hit for package:', packageName);
    
    // Create a shallow clone to avoid mutating cached data
    const result = { ...cachedData };
    
    // If GitHub stats are requested, try to fetch them (from cache or API)
    if (includeGithubStats) {
      const repositoryUrl = cachedData.repository;
      const githubRepo = _parseGitHubRepo(repositoryUrl);
      
      if (githubRepo) {
        // Try GitHub stats cache first (separate cache with shorter TTL)
        const githubCacheKey = `github:${githubRepo.owner}/${githubRepo.repo}`;
        let githubStats = cacheGet(githubCacheKey);
        
        if (githubStats !== null) {
          console.log(`[npm] GitHub stats cache hit for ${githubRepo.owner}/${githubRepo.repo}`);
          result.githubStats = githubStats;
        } else {
          // Fetch fresh GitHub stats
          try {
            githubStats = await _fetchGitHubStats(githubRepo.owner, githubRepo.repo, timeout);
            result.githubStats = githubStats;
            
            // Cache GitHub stats separately with 15-minute TTL
            if (githubStats) {
              cacheSet(githubCacheKey, githubStats, 900000); // 15 minutes
              console.log(`[npm] Fetched and cached GitHub stats for ${packageName}: ${githubStats.openIssues} open issues/PRs`);
            }
          } catch (error) {
            // Non-critical - continue with null GitHub stats
            result.githubStats = null;
            console.warn(`[npm] Failed to fetch GitHub stats for cached ${packageName}:`, error.message);
          }
        }
      } else {
        result.githubStats = null;
      }
    } else {
      // GitHub stats not requested - explicitly set to null
      result.githubStats = null;
    }
    
    const responseTime = Date.now() - startTime;
    console.log('[npm] Returned cached data for:', packageName, 'in', responseTime, 'ms');
    return result;
  }

  // Step 4: Logging
  console.log('[npm] Fetching package:', packageName, 'at', new Date().toISOString());

  // Step 5: Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Step 6: Axios request configuration
      const response = await axios.get(url, {
        timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      // Step 7: Response validation
      _validateResponse(response.data, packageName);

      // Step 8: Data extraction and normalization
      const latestVersion = response.data['dist-tags'].latest;
      const versionData = response.data.versions[latestVersion];

      // Extract repository URL
      const repositoryUrl = typeof versionData.repository === 'string' 
        ? versionData.repository 
        : versionData.repository?.url || response.data.repository?.url || '';

      // Extract last publish date from version timestamp (preferred) or time.modified (fallback)
      const lastPublishDate = response.data.time?.[latestVersion] || response.data.time?.modified || null;

      // Core npm metadata (without GitHub stats)
      const coreData = {
        name: response.data.name,
        version: latestVersion,
        description: versionData.description || response.data.description || '',
        dependencies: typeof versionData.dependencies === 'object' ? versionData.dependencies : {},
        license: versionData.license || response.data.license || 'Unknown',
        repository: repositoryUrl,
        maintainers: response.data.maintainers || [],
        lastPublishDate
      };

      // Step 9: Store core npm metadata in cache (without GitHub stats)
      cacheSet(cacheKey, coreData);
      console.log('[npm] Cached core npm metadata for package:', packageName);

      // Step 8a: Fetch GitHub stats if repository is GitHub and includeGithubStats is true
      let githubStats = null;
      const githubRepo = _parseGitHubRepo(repositoryUrl);
      
      if (githubRepo && includeGithubStats) {
        // Try GitHub stats cache first
        const githubCacheKey = `github:${githubRepo.owner}/${githubRepo.repo}`;
        githubStats = cacheGet(githubCacheKey);
        
        if (githubStats !== null) {
          console.log(`[npm] GitHub stats cache hit for ${githubRepo.owner}/${githubRepo.repo}`);
        } else {
          // Fetch fresh GitHub stats
          try {
            githubStats = await _fetchGitHubStats(githubRepo.owner, githubRepo.repo, timeout);
            
            // Cache GitHub stats separately with 15-minute TTL
            if (githubStats) {
              cacheSet(githubCacheKey, githubStats, 900000); // 15 minutes
              console.log(`[npm] Fetched and cached GitHub stats for ${packageName}: ${githubStats.openIssues} open issues/PRs`);
            }
          } catch (error) {
            // Non-critical - continue without GitHub stats
            githubStats = null;
            console.warn(`[npm] Failed to fetch GitHub stats for ${packageName}:`, error.message);
          }
        }
      } else if (githubRepo && !includeGithubStats) {
        console.log(`[npm] Skipping GitHub stats fetch for ${packageName} (disabled via options)`);
      }

      // Step 10: Build result object with GitHub stats if requested
      const result = {
        ...coreData,
        githubStats
      };

      // Step 11: Success logging
      const responseTime = Date.now() - startTime;
      console.log('[npm] Successfully fetched:', packageName, 'in', responseTime, 'ms');

      return result;

    } catch (error) {
      // Step 11: Error handling
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      const shouldRetry = _shouldRetry(error);

      if (!shouldRetry || isLastAttempt) {
        const errorObject = _mapAxiosError(error, packageName);
        console.error('[npm] Error fetching package:', packageName, errorObject.type, errorObject.message);
        throw errorObject;
      }

      // Should retry
      console.log(`[npm] Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} for package:`, packageName);
      await _sleep(RETRY_DELAYS[attempt]);
    }
  }
}

/**
 * Builds unique key for dependency tracking
 * @param {string} packageName - The package name
 * @param {string} version - The package version
 * @returns {string} Unique key in format packageName@version
 * @example
 * _buildDependencyKey('lodash', '4.17.21'); // Returns 'lodash@4.17.21'
 * _buildDependencyKey('@babel/core', '7.12.0'); // Returns '@babel/core@7.12.0'
 * @private
 */
function _buildDependencyKey(packageName, version) {
  return `${packageName}@${version}`;
}

/**
 * Fetches package metadata for a specific version from npm registry
 * @param {string} packageName - The npm package name to fetch
 * @param {string} version - The specific version to fetch
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Object>} Package metadata object with name, version, dependencies
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const data = await fetchPackageVersionData('react', '18.2.0');
 * @private
 */
async function fetchPackageVersionData(packageName, version, timeout = DEFAULT_TIMEOUT) {
  const startTime = Date.now();

  // Step 1: Input validation
  try {
    _validatePackageName(packageName);
  } catch (error) {
    console.error('[npm] Validation error:', packageName, error.message);
    throw _createErrorObject('VALIDATION_ERROR', error.message, error);
  }

  // Step 2: URL encoding for scoped packages
  const encodedPackageName = packageName.includes('/') 
    ? encodeURIComponent(packageName) 
    : packageName;
  const url = `${NPM_REGISTRY_URL}/${encodedPackageName}/${version}`;

  // Step 3: Check cache before API call (version-specific cache key)
  const cacheKey = `npm:${packageName}@${version}`;
  const cachedData = cacheGet(cacheKey);
  if (cachedData !== null) {
    console.log('[npm] Cache hit for package version:', `${packageName}@${version}`);
    const responseTime = Date.now() - startTime;
    console.log('[npm] Returned cached data for:', `${packageName}@${version}`, 'in', responseTime, 'ms');
    return cachedData;
  }

  // Step 4: Logging
  console.log('[npm] Fetching package version:', `${packageName}@${version}`, 'at', new Date().toISOString());

  // Step 5: Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Step 6: Axios request configuration
      const response = await axios.get(url, {
        timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      // Step 7: Validate response has required fields
      if (!response.data?.name || !response.data?.version) {
        throw new Error('Invalid npm API response: missing name or version field');
      }

      // Step 8: Data extraction and normalization
      const normalizedData = {
        name: response.data.name,
        version: response.data.version,
        description: response.data.description || '',
        dependencies: typeof response.data.dependencies === 'object' ? response.data.dependencies : {},
        license: response.data.license || 'Unknown',
        repository: typeof response.data.repository === 'string' 
          ? response.data.repository 
          : response.data.repository?.url || '',
        maintainers: response.data.maintainers || []
      };

      // Step 9: Store successful response in cache
      cacheSet(cacheKey, normalizedData);
      console.log('[npm] Cached response for package version:', `${packageName}@${version}`);

      // Step 10: Success logging
      const responseTime = Date.now() - startTime;
      console.log('[npm] Successfully fetched:', `${packageName}@${version}`, 'in', responseTime, 'ms');

      return normalizedData;

    } catch (error) {
      // Step 11: Error handling
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      const shouldRetry = _shouldRetry(error);

      if (!shouldRetry || isLastAttempt) {
        const errorObject = _mapAxiosError(error, `${packageName}@${version}`);
        console.error('[npm] Error fetching package version:', `${packageName}@${version}`, errorObject.type, errorObject.message);
        throw errorObject;
      }

      // Should retry
      console.log(`[npm] Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} for package version:`, `${packageName}@${version}`);
      await _sleep(RETRY_DELAYS[attempt]);
    }
  }
}

/**
 * Resolves a semver range to a concrete version using available versions
 * @param {string} range - Semver range (e.g., '^1.0.0', '~2.3.4', '>=1.2.3')
 * @param {Array<string>} availableVersions - Array of available version strings
 * @returns {string|null} Resolved version or null if no match
 * @private
 */
function _resolveSemverRange(range, availableVersions) {
  try {
    // Use semver.maxSatisfying to find the highest version that satisfies the range
    const resolved = semver.maxSatisfying(availableVersions, range);
    return resolved;
  } catch (error) {
    console.warn('[npm] Failed to resolve semver range:', range, error.message);
    return null;
  }
}

/**
 * Fetches package metadata to get available versions for semver resolution
 * @param {string} packageName - The npm package name
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} Object with versions array and latest version
 * @private
 */
async function _fetchPackageMetadata(packageName, timeout) {
  const encodedPackageName = packageName.includes('/') 
    ? encodeURIComponent(packageName) 
    : packageName;
  const url = `${NPM_REGISTRY_URL}/${encodedPackageName}`;

  // Check cache for metadata
  const cacheKey = `npm:meta:${packageName}`;
  const cachedMeta = cacheGet(cacheKey);
  if (cachedMeta !== null) {
    return cachedMeta;
  }

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const metadata = {
        versions: Object.keys(response.data.versions || {}),
        latest: response.data['dist-tags']?.latest || null
      };

      // Cache metadata for 1 hour
      cacheSet(cacheKey, metadata);
      return metadata;

    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      const shouldRetry = _shouldRetry(error);

      if (!shouldRetry || isLastAttempt) {
        throw error;
      }

      await _sleep(RETRY_DELAYS[attempt]);
    }
  }
}

/**
 * Recursively fetches all transitive dependencies up to maxDepth levels
 * Uses breadth-first search (BFS) with cycle detection, depth limiting, and proper semver resolution
 * @param {string} packageName - The npm package name to fetch transitive dependencies for
 * @param {string} version - The package version
 * @param {number} [maxDepth=3] - Maximum depth to traverse (default: 3)
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Map>} Map of all dependencies with structure: Map<string, { name, version, depth, dependencies }>
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const transitiveDeps = await fetchTransitiveDependencies('lodash', '4.17.21', 3);
 * // Returns: Map with all transitive dependencies up to 3 levels deep (excluding root)
 */
async function fetchTransitiveDependencies(packageName, version, maxDepth = 3, timeout = DEFAULT_TIMEOUT) {
  const startTime = Date.now();
  
  console.log(`[npm] Fetching transitive dependencies for: ${packageName}@${version} (max depth: ${maxDepth})`);
  
  // Initialize data structures
  const visited = new Set(); // Track visited packages by key (packageName@version)
  const result = new Map(); // Store all dependencies (excluding root)
  const failedPackages = new Set(); // Track packages that failed to fetch
  
  let processedCount = 0;
  let skippedCount = 0;
  
  // BFS traversal level-by-level with limited concurrency
  let currentLevel = [{ name: packageName, version, depth: 0 }];
  
  while (currentLevel.length > 0) {
    const nextLevel = [];
    
    // Process current level with limited concurrency
    for (let i = 0; i < currentLevel.length; i += CONCURRENT_FETCH_LIMIT) {
      const batch = currentLevel.slice(i, i + CONCURRENT_FETCH_LIMIT);
      
      const batchPromises = batch.map(async (current) => {
        const { name, version: currentVersion, depth } = current;
        
        // Create unique key for this package
        const key = _buildDependencyKey(name, currentVersion);
        
        // Skip if already visited (cycle detection)
        if (visited.has(key)) {
          skippedCount++;
          return [];
        }
        
        // Skip if depth exceeds maxDepth
        if (depth > maxDepth) {
          skippedCount++;
          return [];
        }
        
        // Mark as visited
        visited.add(key);
        
        // Fetch package data for specific version
        let packageData;
        try {
          packageData = await fetchPackageVersionData(name, currentVersion, timeout);
          processedCount++;
          
          // Log progress periodically
          if (processedCount % 10 === 0) {
            console.log(`[npm] Processed ${processedCount} packages at depth ${depth}`);
          }
        } catch (error) {
          // Non-critical failure - log warning and continue with other dependencies
          console.warn(`[npm] Failed to fetch transitive dependency '${name}@${currentVersion}':`, error.message);
          failedPackages.add(key);
          return [];
        }
        
        // Extract dependencies
        const dependencies = packageData.dependencies || {};
        
        // Add current package to result Map (exclude root at depth 0)
        if (depth > 0) {
          result.set(key, {
            name: packageData.name,
            version: packageData.version,
            depth,
            dependencies
          });
        }
        
        // Prepare children for next level (only if not at max depth)
        if (depth < maxDepth && Object.keys(dependencies).length > 0) {
          // Fetch metadata once for all dependencies to resolve versions
          const childrenToEnqueue = [];
          
          for (const [depName, depRange] of Object.entries(dependencies)) {
            try {
              // Fetch package metadata to get available versions
              const metadata = await _fetchPackageMetadata(depName, timeout);
              
              // Resolve semver range to concrete version
              const resolvedVersion = _resolveSemverRange(depRange, metadata.versions);
              
              if (resolvedVersion) {
                childrenToEnqueue.push({
                  name: depName,
                  version: resolvedVersion,
                  depth: depth + 1
                });
              } else {
                // Fallback to latest if resolution fails
                console.warn(`[npm] Could not resolve '${depRange}' for ${depName}, using latest: ${metadata.latest}`);
                if (metadata.latest) {
                  childrenToEnqueue.push({
                    name: depName,
                    version: metadata.latest,
                    depth: depth + 1
                  });
                }
              }
            } catch (error) {
              console.warn(`[npm] Failed to resolve version for ${depName}@${depRange}:`, error.message);
              // Skip this dependency
            }
          }
          
          return childrenToEnqueue;
        }
        
        return [];
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Flatten and add to next level
      batchResults.forEach(children => {
        nextLevel.push(...children);
      });
    }
    
    // Move to next level
    currentLevel = nextLevel;
  }
  
  // Final logging
  const totalTime = Date.now() - startTime;
  console.log(`[npm] Found ${result.size} total dependencies (direct + transitive) in ${totalTime}ms`);
  console.log(`[npm] Skipped ${skippedCount} packages due to depth limit or cycles`);
  
  if (failedPackages.size > 0) {
    const failedNames = Array.from(failedPackages).slice(0, 5).join(', ');
    const moreCount = failedPackages.size > 5 ? ` and ${failedPackages.size - 5} more` : '';
    console.log(`[npm] Failed to fetch ${failedPackages.size} transitive dependencies: ${failedNames}${moreCount}`);
  }
  
  return result;
}

/**
 * Resolves a semver range to an exact version by fetching package metadata
 * Used when transitive dependency fetch fails but we still need exact versions for OSV
 * @param {string} packageName - The npm package name
 * @param {string} range - Semver range (e.g., '^1.0.0', '~2.3.4', '>=1.2.3')
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<string>} Resolved exact version string
 * @throws {Error} Custom error object if resolution fails
 * @example
 * const version = await resolveVersionFromRange('lodash', '^4.17.0');
 * // Returns: '4.17.21'
 */
async function resolveVersionFromRange(packageName, range, timeout = DEFAULT_TIMEOUT) {
  try {
    console.log(`[npm] Resolving version range for ${packageName}: ${range}`);
    
    // Fetch package metadata to get available versions
    const metadata = await _fetchPackageMetadata(packageName, timeout);
    
    // Try to resolve the semver range
    const resolvedVersion = _resolveSemverRange(range, metadata.versions);
    
    if (resolvedVersion) {
      console.log(`[npm] Resolved ${packageName}@${range} to ${resolvedVersion}`);
      return resolvedVersion;
    }
    
    // Fallback to latest if resolution fails
    if (metadata.latest) {
      console.warn(`[npm] Could not resolve '${range}' for ${packageName}, using latest: ${metadata.latest}`);
      return metadata.latest;
    }
    
    // If all else fails, throw error
    throw new Error(`Could not resolve version for ${packageName}@${range}`);
    
  } catch (error) {
    console.error(`[npm] Failed to resolve version for ${packageName}@${range}:`, error.message);
    throw _createErrorObject(
      'VERSION_RESOLUTION_ERROR',
      `Failed to resolve version for ${packageName}`,
      error
    );
  }
}

// Step 12: Export the functions
export { fetchPackageData, fetchTransitiveDependencies, resolveVersionFromRange };
