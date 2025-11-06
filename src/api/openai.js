/**
 * OpenAI API client that calls the serverless proxy endpoint.
 * This client follows the same architectural patterns as npm.js and osv.js.
 */

import axios from 'axios';

// Constants
const SERVERLESS_ENDPOINT = '/api/analyze';
const DEFAULT_TIMEOUT = 30000;
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
 * Generates an AI-powered plain-English summary of package security and complexity using GPT-4
 * @param {Object} packageData - Package metadata from npm.js with name, version, dependencies, license
 * @param {Array<Object>} vulnerabilities - Array of vulnerability objects from osv.js with package, id, severity, summary
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Object>} AI summary object with riskLevel, concerns, recommendations, complexityAssessment
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const summary = await generateSummary(
 *   { name: 'lodash', version: '4.17.21', dependencies: {...}, license: 'MIT' },
 *   [{ package: 'lodash', id: 'CVE-2021-23337', severity: 'High', summary: '...' }]
 * );
 * // Returns: { riskLevel: 'High', concerns: [...], recommendations: [...], complexityAssessment: '...' }
 */
async function generateSummary(packageData, vulnerabilities, timeout = DEFAULT_TIMEOUT) {
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
    console.error('[openai] Validation error:', errorObj.message);
    throw errorObj;
  }

  // Logging
  const startTime = Date.now();
  console.log('[openai] Generating summary for:', packageData.name, 'at', new Date().toISOString());

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Build request body
      const requestBody = {
        packageData: {
          name: packageData.name,
          version: packageData.version,
          dependencies: packageData.dependencies,
          license: packageData.license
        },
        vulnerabilities: vulnerabilities.map(v => ({
          package: v.package,
          id: v.id,
          severity: v.severity,
          summary: v.summary
        }))
      };

      // Make request to serverless endpoint
      const response = await axios.post(SERVERLESS_ENDPOINT, requestBody, {
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
      console.log('[openai] Successfully generated summary for:', packageData.name, 'in', responseTime, 'ms');
      console.log('[openai] Risk level:', summary.riskLevel);

      return summary;

    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      const shouldRetryResult = _shouldRetry(error);

      if (isLastAttempt || !shouldRetryResult) {
        // Map error and throw
        const errorObj = _mapAxiosError(error, packageData.name);
        console.error('[openai] Error generating summary:', packageData.name, errorObj.type, errorObj.message);
        throw errorObj;
      }

      // Log retry attempt
      console.log('[openai] Retry attempt', attempt + 1, '/', MAX_RETRY_ATTEMPTS, 'for package:', packageData.name);

      // Wait before retry - use Retry-After if provided, otherwise use exponential backoff
      if (typeof shouldRetryResult === 'number') {
        const retryAfterMs = shouldRetryResult * 1000;
        console.log('[openai] Respecting Retry-After:', shouldRetryResult, 'seconds');
        await _sleep(retryAfterMs);
      } else {
        await _sleep(RETRY_DELAYS[attempt]);
      }
    }
  }
}

export { generateSummary };
