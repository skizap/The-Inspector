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
// - Vercel: /api/analyze
// - Netlify: /.netlify/functions/analyze
// Reads VITE_DEPLOY_PLATFORM env var for deterministic selection
// Falls back to runtime detection with retry on 404/NETWORK_ERROR
const DEPLOY_PLATFORM = import.meta.env.VITE_DEPLOY_PLATFORM;
const SERVERLESS_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/.netlify/functions/analyze'
  : '/api/analyze';
const FALLBACK_ENDPOINT = DEPLOY_PLATFORM === 'netlify'
  ? '/api/analyze'
  : '/.netlify/functions/analyze';
// Allow timeout override via VITE_AI_TIMEOUT env var (useful for Netlify's shorter limits)
const DEFAULT_TIMEOUT = import.meta.env.VITE_AI_TIMEOUT 
  ? parseInt(import.meta.env.VITE_AI_TIMEOUT, 10) 
  : 30000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

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
        'Server configuration error. Please contact support.',
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
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Request timed out. AI analysis may take longer for complex packages.',
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
 * Generates an AI-powered plain-English summary of package security and complexity
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

  // Retry loop with exponential backoff
  let useFallback = false;
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Build request body
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

      // Select endpoint (primary or fallback)
      const endpoint = useFallback ? FALLBACK_ENDPOINT : SERVERLESS_ENDPOINT;
      console.log('[ai] Using endpoint:', endpoint);

      // Make request to serverless endpoint
      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout
      });

      // Validate response
      _validateResponse(response.data);

      // Extract summary
      const summary = response.data.summary;

      // Success logging
      const responseTime = Date.now() - startTime;
      console.log('[ai] Successfully generated summary for:', packageData.name, 'in', responseTime, 'ms');
      console.log('[ai] Risk level:', summary.riskLevel);

      return summary;

    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      const shouldRetryResult = _shouldRetry(error);

      // Check if this is a 404 or network error on primary endpoint
      const is404 = error.response?.status === 404;
      const isNetworkError = !error.response;
      const canFallback = !useFallback && (is404 || isNetworkError);

      if (canFallback) {
        // Try fallback endpoint once
        console.log('[ai] Primary endpoint failed, trying fallback endpoint');
        useFallback = true;
        continue;
      }

      if (isLastAttempt || !shouldRetryResult) {
        // Map error and throw
        const errorObj = _mapAxiosError(error, packageData.name);
        console.error('[ai] Error generating summary:', packageData.name, errorObj.type, errorObj.message);
        throw errorObj;
      }

      // Log retry attempt
      console.log('[ai] Retry attempt', attempt + 1, '/', MAX_RETRY_ATTEMPTS, 'for package:', packageData.name);

      // Wait before retry - use Retry-After if provided, otherwise use exponential backoff
      if (typeof shouldRetryResult === 'number') {
        const retryAfterMs = shouldRetryResult * 1000;
        console.log('[ai] Respecting Retry-After:', shouldRetryResult, 'seconds');
        await _sleep(retryAfterMs);
      } else {
        await _sleep(RETRY_DELAYS[attempt]);
      }
    }
  }
}

export { generateSummary };
