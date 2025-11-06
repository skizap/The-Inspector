import axios from 'axios';

// Constants
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

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
      `Package '${packageName}' not found. Please check the package name.`,
      error
    );
  }
  // Timeout
  if (error.code === 'ECONNABORTED') {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Request timed out. The package may be too large. Please try again.',
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
 * Fetches package metadata from npm registry
 * @param {string} packageName - The npm package name to fetch (supports scoped packages like @scope/name)
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Object>} Package metadata object with name, version, description, dependencies, license, repository, maintainers
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const data = await fetchPackageData('react');
 * @example
 * const scopedData = await fetchPackageData('@babel/core');
 */
async function fetchPackageData(packageName, timeout = DEFAULT_TIMEOUT) {
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

  // Step 3: Logging
  console.log('[npm] Fetching package:', packageName, 'at', new Date().toISOString());

  // Step 4: Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Step 5: Axios request configuration
      const response = await axios.get(url, {
        timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      // Step 6: Response validation
      _validateResponse(response.data, packageName);

      // Step 7: Data extraction and normalization
      const latestVersion = response.data['dist-tags'].latest;
      const versionData = response.data.versions[latestVersion];

      const normalizedData = {
        name: response.data.name,
        version: latestVersion,
        description: versionData.description || response.data.description || '',
        dependencies: typeof versionData.dependencies === 'object' ? versionData.dependencies : {},
        license: versionData.license || response.data.license || 'Unknown',
        repository: typeof versionData.repository === 'string' 
          ? versionData.repository 
          : versionData.repository?.url || response.data.repository?.url || '',
        maintainers: response.data.maintainers || []
      };

      // Step 9: Success logging
      const responseTime = Date.now() - startTime;
      console.log('[npm] Successfully fetched:', packageName, 'in', responseTime, 'ms');

      return normalizedData;

    } catch (error) {
      // Step 8: Error handling
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

// Step 10: Export the function
export { fetchPackageData };
