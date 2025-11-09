/**
 * AI API client that calls the serverless proxy endpoint for multi-provider AI service (OpenAI and OpenRouter).
 * This client follows the same architectural patterns as npm.js and osv.js.
 * 
 * Platform Support:
 * - Vercel: Uses /api/analyze endpoint (api/analyze.js)
 * - Netlify: Uses /.netlify/functions/analyze endpoint (netlify/functions/analyze.js)
 * 
 * Platform Detection:
 * - Reads VITE_DEPLOY_PLATFORM env var for deterministic endpoint selection
 * - Falls back to alternative endpoint on 404/network errors
 * - Set VITE_DEPLOY_PLATFORM=netlify for Netlify deployments
 * - Set VITE_DEPLOY_PLATFORM=vercel (or omit) for Vercel deployments
 * 
 * Timeout Configuration:
 * - Default: 30 seconds (suitable for Vercel)
 * - Override with VITE_AI_TIMEOUT env var (in milliseconds)
 * - Recommended for Netlify: 25000 (25s) for Pro tier, 9000 (9s) for Free tier
 * 
 * Note: This API client does NOT use caching (unlike npm.js and osv.js).
 * AI summaries are context-dependent and may vary based on current threat
 * landscape, model improvements, and analysis context. Fresh analysis
 * provides more value than cached stale summaries.
 * See design.md lines 221-222 for rationale.
 */

import axios from 'axios';

// Constants
// Platform-specific endpoint detection:
// - Vercel: /api/analyze-start
// - Netlify: /.netlify/functions/analyze-start
// Reads VITE_DEPLOY_PLATFORM env var for deterministic selection
// Falls back to runtime detection with retry on 404/NETWORK_ERROR
const DEPLOY_PLATFORM = import.meta.env.VITE_DEPLOY_PLATFORM;
const SERVERLESS_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/.netlify/functions/analyze-start'
  : '/api/analyze-start';
const FALLBACK_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/api/analyze-start'
  : '/.netlify/functions/analyze-start';
const STATUS_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/.netlify/functions/analyze-status'
  : '/api/analyze-status';
const STATUS_FALLBACK_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/api/analyze-status'
  : '/.netlify/functions/analyze-status';
// Allow timeout override via VITE_AI_TIMEOUT env var (useful for Netlify's shorter limits)
const DEFAULT_TIMEOUT = import.meta.env.VITE_AI_TIMEOUT 
  ? parseInt(import.meta.env.VITE_AI_TIMEOUT, 10) 
  : 30000;
// Polling configuration for background jobs
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 100; // 5 minutes total (100 * 3s = 300s)

/**
 * Validates package data structure
 * @param {Object} packageData - Package metadata to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function _validatePackageData(packageData) {
  if (!packageData || typeof packageData !== 'object' || Array.isArray(packageData)) {
    throw new Error('Invalid package data: must be an object');
  }

  if (!packageData.name || typeof packageData.name !== 'string' || packageData.name.trim() === '') {
    throw new Error('Invalid package data: name is required and must be a non-empty string');
  }

  if (!packageData.version || typeof packageData.version !== 'string' || packageData.version.trim() === '') {
    throw new Error('Invalid package data: version is required and must be a non-empty string');
  }

  if (!packageData.dependencies || typeof packageData.dependencies !== 'object') {
    throw new Error('Invalid package data: dependencies is required and must be an object');
  }

  return true;
}

/**
 * Validates vulnerabilities array structure
 * @param {Array} vulnerabilities - Vulnerabilities to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function _validateVulnerabilities(vulnerabilities) {
  if (!Array.isArray(vulnerabilities)) {
    throw new Error('Invalid vulnerabilities: must be an array');
  }

  return true;
}

/**
 * Validates AI response structure
 * @param {Object} data - Response data to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function _validateResponse(data) {
  if (!data?.summary) {
    throw new Error('Invalid AI response: missing summary object');
  }

  const summary = data.summary;

  if (!summary.riskLevel) {
    throw new Error('Invalid AI response: missing riskLevel field');
  }

  const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'];
  if (!validRiskLevels.includes(summary.riskLevel)) {
    throw new Error(`Invalid AI response: riskLevel must be one of ${validRiskLevels.join(', ')}`);
  }

  if (!Array.isArray(summary.concerns) || summary.concerns.length === 0) {
    throw new Error('Invalid AI response: concerns must be a non-empty array');
  }

  if (!Array.isArray(summary.recommendations) || summary.recommendations.length === 0) {
    throw new Error('Invalid AI response: recommendations must be a non-empty array');
  }

  if (!summary.complexityAssessment || typeof summary.complexityAssessment !== 'string' || summary.complexityAssessment.trim() === '') {
    throw new Error('Invalid AI response: complexityAssessment must be a non-empty string');
  }

  // Optional maintenance fields validation (backward compatible)
  if (summary.maintenanceStatus !== undefined) {
    const validMaintenanceStatuses = ['Active', 'Stale', 'Abandoned', 'Unknown'];
    if (!validMaintenanceStatuses.includes(summary.maintenanceStatus)) {
      throw new Error(`Invalid AI response: maintenanceStatus must be one of ${validMaintenanceStatuses.join(', ')}`);
    }
  }

  if (summary.licenseCompatibility !== undefined) {
    const validLicenseTypes = ['Permissive', 'Copyleft', 'Proprietary', 'Unknown'];
    if (!validLicenseTypes.includes(summary.licenseCompatibility)) {
      throw new Error(`Invalid AI response: licenseCompatibility must be one of ${validLicenseTypes.join(', ')}`);
    }
  }

  if (summary.maintenanceNotes !== undefined && typeof summary.maintenanceNotes !== 'string') {
    throw new Error('Invalid AI response: maintenanceNotes must be a string');
  }

  return true;
}

/**
 * Determines if an error should trigger a retry
 * @param {Error} error - The error to check
 * @returns {boolean|number} True if should retry, or number of seconds to wait
 */
function _shouldRetry(error) {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Retry on 5xx server errors
  if (status >= 500) {
    return true;
  }

  // Retry on rate limit - check for Retry-After header
  if (status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    if (retryAfter) {
      // Return number of seconds to wait
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? true : seconds;
    }
    return true;
  }

  // Retry on gateway errors
  if (status === 502 || status === 504) {
    return true;
  }

  // Retry on timeout
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  // Don't retry on 4xx client errors (except 429)
  // Don't retry on 401 (indicates config issue, not transient)
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
 * @param {string} type - Error type
 * @param {string} message - Error message
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
 * Maps axios errors to standardized error objects
 * @param {Error} error - Axios error
 * @param {string} packageName - Package name for context
 * @returns {Object} Standardized error object
 */
function _mapAxiosError(error, packageName) {
  if (error.response) {
    const status = error.response.status;

    if (status === 400) {
      return _createErrorObject(
        'VALIDATION_ERROR',
        'Invalid request data. Please try again.',
        error
      );
    }

    if (status === 401) {
      return _createErrorObject(
        'INVALID_API_KEY',
        'Invalid API Key. Please check your key in the settings.',
        error
      );
    }

    if (status === 403) {
      return _createErrorObject(
        'INVALID_API_KEY',
        'Invalid API Key. Please check your key in the settings.',
        error
      );
    }

    if (status === 429) {
      return _createErrorObject(
        'RATE_LIMIT',
        'AI service rate limit exceeded. Please wait a moment and try again.',
        error
      );
    }

    if (status === 500) {
      return _createErrorObject(
        'API_ERROR',
        'AI service error. Please try again.',
        error
      );
    }

    if (status === 502) {
      return _createErrorObject(
        'API_ERROR',
        'AI service temporarily unavailable. Please try again in a few moments.',
        error
      );
    }

    if (status === 504) {
      return _createErrorObject(
        'TIMEOUT_ERROR',
        'AI request timed out. Please try again.',
        error
      );
    }

    if (status === 408) {
      return _createErrorObject(
        'TIMEOUT_ERROR',
        'Analysis timed out. This can happen with very large packages. Please try again.',
        error
      );
    }
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Analysis timed out. This can happen with very large packages. Please try again.',
      error
    );
  }

  // Network error (no response)
  if (!error.response) {
    return _createErrorObject(
      'NETWORK_ERROR',
      'Network error. Please check your internet connection.',
      error
    );
  }

  // Generic error
  return _createErrorObject(
    'API_ERROR',
    'Failed to generate AI summary',
    error
  );
}

/**
 * Retrieves the user's stored API key from localStorage
 * @returns {string|null} Decoded API key or null if not found
 */
function _getStoredApiKey() {
  // Guard against SSR/test contexts where localStorage is not available
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const encodedKey = localStorage.getItem('inspector-api-key');
    if (!encodedKey) {
      return null;
    }
    return atob(encodedKey);
  } catch (error) {
    console.error('[ai] Failed to decode stored API key:', error);
    return null;
  }
}

/**
 * Starts an analysis job via POST to /analyze-start endpoint
 * @param {Object} packageData - Package metadata
 * @param {Array} vulnerabilities - Array of vulnerability objects
 * @param {string|null} model - AI model to use
 * @param {string|null} userApiKey - User-provided API key
 * @param {boolean} useFallback - Whether to use fallback endpoint
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<string>} Job ID
 * @throws {Error} If job creation fails
 * @private
 */
async function _startAnalysisJob(packageData, vulnerabilities, model, userApiKey, useFallback, timeout) {
  const endpoint = useFallback ? FALLBACK_ENDPOINT : SERVERLESS_ENDPOINT;
  console.log('[ai] Starting analysis job at:', endpoint);

  const requestBody = {
    packageData: {
      name: packageData.name,
      version: packageData.version,
      dependencies: packageData.dependencies,
      license: packageData.license,
      lastPublishDate: packageData.lastPublishDate || null,
      githubStats: packageData.githubStats || null
    },
    vulnerabilities: vulnerabilities.map(v => ({
      package: v.package,
      id: v.id,
      severity: v.severity,
      summary: v.summary
    })),
    model: model || undefined
  };

  try {
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        ...(userApiKey ? { 'Authorization': `Bearer ${userApiKey}` } : {})
      },
      timeout
    });

    // Validate response has jobId
    if (!response.data?.jobId) {
      throw new Error('Invalid response: missing jobId');
    }

    console.log('[ai] Job started with ID:', response.data.jobId);
    return response.data.jobId;

  } catch (error) {
    console.error('[ai] Failed to start analysis job:', error.message);
    throw error;
  }
}

/**
 * Polls the /analyze-status endpoint for job completion
 * @param {string} jobId - Job ID to poll
 * @param {boolean} useFallback - Whether to use fallback endpoint
 * @returns {Promise<Object>} Analysis summary object
 * @throws {Error} If polling fails or times out
 * @private
 */
async function _pollJobStatus(jobId, useFallback) {
  let endpoint = useFallback ? STATUS_FALLBACK_ENDPOINT : STATUS_ENDPOINT;
  console.log('[ai] Polling job status:', jobId);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    // Wait before polling (except first attempt)
    if (attempt > 0) {
      await _sleep(POLL_INTERVAL);
    }

    try {
      const response = await axios.get(`${endpoint}?jobId=${jobId}`, {
        timeout: 10000 // 10 second timeout for status checks
      });

      const { status, result, error } = response.data;

      if (status === 'completed') {
        console.log('[ai] Job completed:', jobId);
        
        // Validate result structure
        if (!result || !result.summary) {
          throw _createErrorObject(
            'VALIDATION_ERROR',
            'Invalid status response: missing result.summary',
            new Error('Invalid status response')
          );
        }
        
        return result.summary;
      }

      if (status === 'failed') {
        console.error('[ai] Job failed:', jobId, error);
        
        // Use structured errorCode if present for reliable mapping
        const { errorCode } = response.data;
        
        if (errorCode) {
          // Use errorCode directly from backend
          throw _createErrorObject(errorCode, error || 'Analysis failed', new Error(error));
        }
        
        // Fallback to substring matching if errorCode not present (backward compatibility)
        if (error && error.includes('API key')) {
          throw _createErrorObject('INVALID_API_KEY', error, new Error(error));
        }
        
        throw _createErrorObject('API_ERROR', error || 'Analysis failed', new Error(error));
      }

      if (status === 'pending') {
        console.log('[ai] Job still processing:', jobId, `(attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
        continue;
      }

      // Unknown status
      throw new Error(`Unknown job status: ${status}`);

    } catch (error) {
      // Check if this is a 404 or network error on primary endpoint
      const is404 = error.response?.status === 404;
      const isNetworkError = !error.response;
      const canFallback = !useFallback && (is404 || isNetworkError);

      if (canFallback) {
        console.log('[ai] Status endpoint failed, trying fallback');
        endpoint = STATUS_FALLBACK_ENDPOINT;
        useFallback = true;
        continue;
      }

      // If this is a timeout or network error during polling, retry
      if (_shouldRetry(error) && attempt < MAX_POLL_ATTEMPTS - 1) {
        console.log('[ai] Polling error, retrying:', error.message);
        continue;
      }

      // If we've exhausted retries, throw the error
      throw error;
    }
  }

  // Max attempts reached - timeout
  throw _createErrorObject(
    'TIMEOUT_ERROR',
    'Analysis timed out after 5 minutes. This can happen with very slow AI models. Please try again.',
    new Error('Polling timeout')
  );
}

/**
 * Generates an AI-powered plain-English summary of package security and complexity
 * 
 * This function will use a user-provided API key from localStorage if available.
 * The key is retrieved from localStorage with the key 'inspector-api-key'.
 * If no user key is found, the serverless function will use its default environment variable configuration.
 * 
 * @param {Object} packageData - Package metadata from npm.js with name, version, dependencies, license
 * @param {Array<Object>} vulnerabilities - Array of vulnerability objects from osv.js with package, id, severity, summary
 * @param {string} [model] - Optional AI model to use (e.g., 'moonshotai/kimi-k2-thinking', 'openai/gpt-4o'). Falls back to VITE_DEFAULT_MODEL or backend default if not provided
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Object>} AI summary object with riskLevel, concerns, recommendations, complexityAssessment
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const summary = await generateSummary(
 *   { name: 'lodash', version: '4.17.21', dependencies: {...}, license: 'MIT' },
 *   [{ package: 'lodash', id: 'CVE-2021-23337', severity: 'High', summary: '...' }],
 *   'moonshotai/kimi-k2-thinking'
 * );
 * // Returns: { riskLevel: 'High', concerns: [...], recommendations: [...], complexityAssessment: '...' }
 */
async function generateSummary(packageData, vulnerabilities, model = null, timeout = DEFAULT_TIMEOUT) {
  // Input validation
  try {
    _validatePackageData(packageData);
    _validateVulnerabilities(vulnerabilities);
  } catch (validationError) {
    const errorObj = _createErrorObject(
      'VALIDATION_ERROR',
      validationError.message,
      validationError
    );
    console.error('[ai] Validation error:', errorObj.message);
    throw errorObj;
  }

  // Logging
  const startTime = Date.now();
  console.log('[ai] Generating summary for:', packageData.name, 'at', new Date().toISOString());

  // Retrieve user-provided API key if available
  const userApiKey = _getStoredApiKey();
  console.log('[ai] User API key:', userApiKey ? 'Found' : 'Not found');

  let useFallback = false;
  let jobId = null;

  // Phase 1: Start analysis job
  try {
    jobId = await _startAnalysisJob(packageData, vulnerabilities, model, userApiKey, useFallback, timeout);
  } catch (error) {
    // Check if this is a 404 or network error on primary endpoint
    const is404 = error.response?.status === 404;
    const isNetworkError = !error.response;

    if (!useFallback && (is404 || isNetworkError)) {
      // Try fallback endpoint once
      console.log('[ai] Primary endpoint failed, trying fallback endpoint');
      useFallback = true;
      
      try {
        jobId = await _startAnalysisJob(packageData, vulnerabilities, model, userApiKey, useFallback, timeout);
      } catch (fallbackError) {
        const errorObj = _mapAxiosError(fallbackError, packageData.name);
        console.error('[ai] Error starting analysis job:', packageData.name, errorObj.type, errorObj.message);
        throw errorObj;
      }
    } else {
      const errorObj = _mapAxiosError(error, packageData.name);
      console.error('[ai] Error starting analysis job:', packageData.name, errorObj.type, errorObj.message);
      throw errorObj;
    }
  }

  // Phase 2: Poll for job completion
  let summary;
  try {
    summary = await _pollJobStatus(jobId, useFallback);
  } catch (error) {
    // If error is already formatted, re-throw
    if (error.type && error.message) {
      console.error('[ai] Error during polling:', packageData.name, error.type, error.message);
      throw error;
    }

    // Otherwise, map the error
    const errorObj = _mapAxiosError(error, packageData.name);
    console.error('[ai] Error during polling:', packageData.name, errorObj.type, errorObj.message);
    throw errorObj;
  }

  // Validate response
  try {
    _validateResponse({ summary });
  } catch (validationError) {
    const errorObj = _createErrorObject(
      'VALIDATION_ERROR',
      validationError.message,
      validationError
    );
    console.error('[ai] Validation error after polling:', errorObj.message);
    throw errorObj;
  }

  // Success logging
  const responseTime = Date.now() - startTime;
  console.log('[ai] Successfully generated summary for:', packageData.name, 'in', responseTime, 'ms');
  console.log('[ai] Risk level:', summary.riskLevel);

  return summary;
}

export { generateSummary };
