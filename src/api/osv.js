import axios from 'axios';
import CVSS from '@turingpointde/cvss.js';
import { get as cacheGet, set as cacheSet } from '../utils/cache.js';

// Constants
const OSV_API_URL = 'https://api.osv.dev';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_BATCH_SIZE = 1000;
const SEVERITY_THRESHOLDS = {
  CRITICAL: 9.0,
  HIGH: 7.0,
  MEDIUM: 4.0
};

/**
 * Validates dependencies object format
 * @param {Object} dependencies - Dependencies object with package names as keys and versions as values
 * @returns {boolean} True if valid
 * @throws {Error} If dependencies object is invalid
 * @example
 * _validateDependencies({ "lodash": "4.17.21" }); // Returns true
 * _validateDependencies({}); // Returns true (empty object is allowed)
 */
function _validateDependencies(dependencies) {
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    throw new Error('Dependencies must be a non-null object (not an array)');
  }

  const npmNameRegex = /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/;

  for (const [packageName, version] of Object.entries(dependencies)) {
    if (!packageName || typeof packageName !== 'string') {
      throw new Error('Package name must be a non-empty string');
    }

    if (packageName.length < 1 || packageName.length > 214) {
      throw new Error(`Invalid package name '${packageName}'. Must be between 1 and 214 characters.`);
    }

    if (!npmNameRegex.test(packageName)) {
      throw new Error(`Invalid package name '${packageName}'. Use lowercase letters, numbers, hyphens, underscores, dots, and optionally a @scope/ prefix.`);
    }

    if (typeof version !== 'string') {
      throw new Error(`Version for package '${packageName}' must be a string`);
    }
  }

  return true;
}

/**
 * Transforms dependencies object to OSV querybatch format
 * @param {Object} dependencies - Dependencies object with package names as keys and versions as values
 * @returns {Object} OSV querybatch payload
 * @example
 * _transformToOSVFormat({ "lodash": "4.17.21" });
 * // Returns: { queries: [{ package: { name: "lodash", ecosystem: "npm" }, version: "4.17.21" }] }
 */
function _transformToOSVFormat(dependencies) {
  const queries = Object.entries(dependencies).map(([packageName, version]) => ({
    package: {
      name: packageName,
      ecosystem: 'npm'
    },
    version
  }));

  return { queries };
}

/**
 * Splits dependencies into batches of MAX_BATCH_SIZE
 * @param {Object} dependencies - Dependencies object with package names as keys and versions as values
 * @returns {Array<Object>} Array of batched dependency objects
 * @example
 * _batchDependencies(largeDepsObject);
 * // Returns: [{ "pkg1": "1.0.0", ... }, { "pkg1001": "2.0.0", ... }]
 */
function _batchDependencies(dependencies) {
  const entries = Object.entries(dependencies);
  const batches = [];

  for (let i = 0; i < entries.length; i += MAX_BATCH_SIZE) {
    const batchEntries = entries.slice(i, i + MAX_BATCH_SIZE);
    const batchObject = Object.fromEntries(batchEntries);
    batches.push(batchObject);
  }

  return batches;
}

/**
 * Parses CVSS vector from OSV severity array and calculates numeric base score
 * @param {Array} severityArray - Array of severity objects from OSV API
 * @returns {number|null} Numeric CVSS base score or null if parsing fails
 * @example
 * _parseCVSSScore([{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }]);
 * // Returns: 9.8
 */
function _parseCVSSScore(severityArray) {
  if (!Array.isArray(severityArray) || severityArray.length === 0) {
    return null;
  }

  // Priority order: CVSS_V3 (prefer 3.1 over 3.0), then CVSS_V4, then CVSS_V2
  const cvssV3 = severityArray.find(s => s.type === 'CVSS_V3');
  const cvssV4 = severityArray.find(s => s.type === 'CVSS_V4');
  const cvssV2 = severityArray.find(s => s.type === 'CVSS_V2');

  const cvssEntry = cvssV3 || cvssV4 || cvssV2;

  if (!cvssEntry?.score) {
    return null;
  }

  try {
    const cvssVector = cvssEntry.score;
    const cvssObject = CVSS(cvssVector);
    
    if (!cvssObject.isValid) {
      return null;
    }

    const score = cvssObject.getScore();
    if (typeof score === 'number') {
      return score;
    }

    return null;
  } catch (error) {
    console.warn('[osv] Failed to parse CVSS vector:', cvssEntry.score, error.message);
    return null;
  }
}

/**
 * Classifies CVSS score into severity level
 * @param {number|null} cvssScore - Numeric CVSS base score
 * @returns {string} Severity level: 'Critical', 'High', 'Medium', 'Low', or 'Unknown'
 * @example
 * _classifySeverity(9.5); // Returns 'Critical'
 * _classifySeverity(7.2); // Returns 'High'
 */
function _classifySeverity(cvssScore) {
  if (cvssScore === null || cvssScore === undefined) {
    return 'Unknown';
  }

  if (cvssScore >= SEVERITY_THRESHOLDS.CRITICAL) {
    return 'Critical';
  }
  if (cvssScore >= SEVERITY_THRESHOLDS.HIGH) {
    return 'High';
  }
  if (cvssScore >= SEVERITY_THRESHOLDS.MEDIUM) {
    return 'Medium';
  }
  return 'Low';
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
 * @param {string} context - Context string for logging (e.g., 'querybatch' or 'vulnerability details')
 * @returns {Object} Standardized error object
 */
function _mapAxiosError(error, context) {
  // 429 Rate Limit
  if (error.response?.status === 429) {
    return _createErrorObject(
      'RATE_LIMIT',
      'Too many requests. Please wait a moment and try again.',
      error
    );
  }
  // 5xx Server Error
  if (error.response?.status >= 500) {
    return _createErrorObject(
      'API_ERROR',
      'OSV API temporarily unavailable. Please try again in a few moments.',
      error
    );
  }
  // Timeout
  if (error.code === 'ECONNABORTED') {
    return _createErrorObject(
      'TIMEOUT_ERROR',
      'Request timed out. Please try again.',
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
  // Validation error
  if (error.message?.includes('Invalid') || error.message?.includes('must be')) {
    return _createErrorObject('VALIDATION_ERROR', error.message, error);
  }
  // Generic error
  return _createErrorObject(
    'API_ERROR',
    'Failed to check vulnerabilities',
    error
  );
}

/**
 * Fetches full vulnerability details for given vulnerability IDs
 * @param {Array<string>} vulnerabilityIds - Array of vulnerability IDs (CVE or GHSA)
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Array<Object>>} Array of vulnerability detail objects
 */
async function _fetchVulnerabilityDetails(vulnerabilityIds, timeout) {
  if (!vulnerabilityIds || vulnerabilityIds.length === 0) {
    return [];
  }

  console.log(`[osv] Fetching details for ${vulnerabilityIds.length} vulnerabilities`);

  const fetchWithRetry = async (vulnId) => {
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await axios.get(`${OSV_API_URL}/v1/vulns/${vulnId}`, {
          timeout,
          headers: {
            'Accept': 'application/json'
          }
        });

        return response.data;
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
        const shouldRetry = _shouldRetry(error);

        if (!shouldRetry || isLastAttempt) {
          console.warn(`[osv] Failed to fetch details for ${vulnId}:`, error.message);
          return null;
        }

        // Handle rate limiting with Retry-After header
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            let waitTime;
            const retryAfterInt = parseInt(retryAfter, 10);
            
            // Check if it's an integer (seconds) or a date string
            if (!isNaN(retryAfterInt) && retryAfterInt.toString() === retryAfter.trim()) {
              // It's seconds
              waitTime = retryAfterInt * 1000;
              console.log(`[osv] Rate limited. Waiting ${retryAfterInt}s before retry.`);
            } else {
              // Try parsing as HTTP date
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                waitTime = Math.max(0, retryDate.getTime() - Date.now());
                console.log(`[osv] Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s before retry.`);
              } else {
                // Fallback to exponential backoff
                waitTime = RETRY_DELAYS[attempt];
                console.log(`[osv] Rate limited (invalid Retry-After). Waiting ${waitTime}ms before retry.`);
              }
            }
            
            await _sleep(waitTime);
            continue;
          }
        }

        await _sleep(RETRY_DELAYS[attempt]);
      }
    }
    return null;
  };

  // Fetch all vulnerability details in parallel with chunking to avoid overwhelming the API
  const CHUNK_SIZE = 10;
  const results = [];

  for (let i = 0; i < vulnerabilityIds.length; i += CHUNK_SIZE) {
    const chunk = vulnerabilityIds.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(id => fetchWithRetry(id)));
    results.push(...chunkResults);
    
    console.log(`[osv] Fetched ${Math.min(i + CHUNK_SIZE, vulnerabilityIds.length)}/${vulnerabilityIds.length} vulnerability details`);
  }

  // Filter out null results (failed fetches)
  return results.filter(result => result !== null);
}

/**
 * Extracts and normalizes vulnerability data from OSV detail object
 * @param {Object} vulnDetail - Vulnerability detail object from OSV API
 * @param {string} packageName - Package name associated with this vulnerability
 * @returns {Object} Normalized vulnerability object
 */
function _extractVulnerabilityData(vulnDetail, packageName) {
  const cvssScore = _parseCVSSScore(vulnDetail.severity || []);
  const severity = _classifySeverity(cvssScore);

  // Extract CVE ID from aliases
  let cveId = null;
  if (Array.isArray(vulnDetail.aliases)) {
    const cveAlias = vulnDetail.aliases.find(alias => alias.startsWith('CVE-'));
    if (cveAlias) {
      cveId = cveAlias;
    }
  }

  // Create description from summary or details
  const description = vulnDetail.summary || vulnDetail.details || 'No description available';

  return {
    package: packageName,
    id: vulnDetail.id || 'Unknown',
    cveId,
    severity,
    cvssScore,
    description,
    summary: vulnDetail.summary || 'No summary available',
    details: vulnDetail.details || '',
    references: vulnDetail.references || [],
    published: vulnDetail.published || null,
    modified: vulnDetail.modified || null
  };
}

/**
 * Checks for security vulnerabilities in npm package dependencies using OSV API
 * @param {Object} dependencies - Dependencies object with package names as keys and versions as values
 * @param {number} [timeout=30000] - Request timeout in milliseconds
 * @returns {Promise<Array<Object>>} Array of vulnerability objects with package, id, severity, cvssScore, summary, details, references
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const vulns = await checkVulnerabilities({ "lodash": "4.17.21", "express": "4.17.1" });
 */
async function checkVulnerabilities(dependencies, timeout = DEFAULT_TIMEOUT) {
  const startTime = Date.now();

  // Step 1: Input validation
  try {
    _validateDependencies(dependencies);
  } catch (error) {
    console.error('[osv] Validation error:', error.message);
    throw _createErrorObject('VALIDATION_ERROR', error.message, error);
  }

  // Step 2: Handle empty dependencies
  const depCount = Object.keys(dependencies).length;
  if (depCount === 0) {
    console.log('[osv] No dependencies to check');
    return [];
  }

  // Step 3: Generate cache key from dependencies (with versions)
  const sortedKeys = Object.keys(dependencies).sort();
  const cacheKey = `osv:${sortedKeys.map(name => `${name}@${dependencies[name]}`).join(',')}`;
  const cachedVulnerabilities = cacheGet(cacheKey);
  if (cachedVulnerabilities !== null) {
    console.log('[osv] Cache hit for dependencies');
    const totalTime = Date.now() - startTime;
    console.log('[osv] Returned cached vulnerabilities in', totalTime, 'ms. Found', cachedVulnerabilities.length, 'vulnerabilities.');
    return cachedVulnerabilities;
  }

  // Step 4: Batching
  const batches = _batchDependencies(dependencies);
  console.log(`[osv] Checking ${depCount} dependencies in ${batches.length} batch(es)`);

  const allVulnerabilities = [];
  const vulnIdToPackages = new Map();

  // Step 4: Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const osvPayload = _transformToOSVFormat(batch);

    // Retry loop for querybatch request
    let batchResults = null;
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[osv] Querying batch ${batchIndex + 1}/${batches.length} at ${new Date().toISOString()}`);

        const response = await axios.post(
          `${OSV_API_URL}/v1/querybatch`,
          osvPayload,
          {
            timeout,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        // Step 5: Handle querybatch response
        if (!response.data?.results || !Array.isArray(response.data.results)) {
          throw new Error('Invalid OSV API response: missing results array');
        }

        batchResults = response.data.results;
        break;

      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
        const shouldRetry = _shouldRetry(error);

        if (!shouldRetry || isLastAttempt) {
          const errorObject = _mapAxiosError(error, 'querybatch');
          console.error('[osv] Error checking vulnerabilities:', errorObject.type, errorObject.message);
          throw errorObject;
        }

        // Step 14: Rate limiting special handling
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            let waitTime;
            const retryAfterInt = parseInt(retryAfter, 10);
            
            // Check if it's an integer (seconds) or a date string
            if (!isNaN(retryAfterInt) && retryAfterInt.toString() === retryAfter.trim()) {
              // It's seconds
              waitTime = retryAfterInt * 1000;
              console.log(`[osv] Rate limited. Waiting ${retryAfterInt}s before retry.`);
            } else {
              // Try parsing as HTTP date
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                waitTime = Math.max(0, retryDate.getTime() - Date.now());
                console.log(`[osv] Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s before retry.`);
              } else {
                // Fallback to exponential backoff
                waitTime = RETRY_DELAYS[attempt];
                console.log(`[osv] Rate limited (invalid Retry-After). Waiting ${waitTime}ms before retry.`);
              }
            }
            
            await _sleep(waitTime);
            continue;
          }
        }

        console.log(`[osv] Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} for batch ${batchIndex + 1}`);
        await _sleep(RETRY_DELAYS[attempt]);
      }
    }

    if (!batchResults) {
      continue;
    }

    // Validate batch response length
    const batchEntries = Object.entries(batch);
    if (batchResults.length !== batchEntries.length) {
      console.warn(`[osv] Batch response length mismatch: expected ${batchEntries.length}, got ${batchResults.length}`);
    }

    // Extract vulnerability IDs and create mapping
    const vulnerabilityIds = [];
    const maxLength = Math.min(batchResults.length, batchEntries.length);

    for (let index = 0; index < maxLength; index++) {
      const result = batchResults[index];
      const packageName = batchEntries[index][0];

      if (result?.vulns && Array.isArray(result.vulns) && result.vulns.length > 0) {
        result.vulns.forEach(vuln => {
          if (vuln.id) {
            vulnerabilityIds.push(vuln.id);
            
            // Add package to the set for this vulnerability ID
            if (!vulnIdToPackages.has(vuln.id)) {
              vulnIdToPackages.set(vuln.id, new Set());
            }
            vulnIdToPackages.get(vuln.id).add(packageName);
          }
        });
      }
    }

    console.log(`[osv] Found ${vulnerabilityIds.length} potential vulnerabilities in batch ${batchIndex + 1}`);

    // Step 6: Handle empty results
    if (vulnerabilityIds.length === 0) {
      console.log(`[osv] No vulnerabilities found in batch ${batchIndex + 1}`);
      continue;
    }

    // Step 7: Fetch full vulnerability details
    try {
      const vulnerabilityDetails = await _fetchVulnerabilityDetails(vulnerabilityIds, timeout);

      // Step 8: Process vulnerability details
      vulnerabilityDetails.forEach(vulnDetail => {
        const packages = vulnIdToPackages.get(vulnDetail.id);
        if (packages) {
          // Create one entry per package affected by this vulnerability
          packages.forEach(packageName => {
            const normalizedVuln = _extractVulnerabilityData(vulnDetail, packageName);
            allVulnerabilities.push(normalizedVuln);
          });
        }
      });
    } catch (error) {
      const errorObject = _mapAxiosError(error, 'vulnerability details');
      console.error('[osv] Error fetching vulnerability details:', errorObject.type, errorObject.message);
      // Continue with other batches instead of failing completely
    }
  }

  // Step 9: Deduplicate results by compound key (package::id)
  const uniqueVulns = new Map();
  allVulnerabilities.forEach(vuln => {
    const compoundKey = `${vuln.package}::${vuln.id}`;
    if (!uniqueVulns.has(compoundKey)) {
      uniqueVulns.set(compoundKey, vuln);
    }
  });

  const deduplicatedVulns = Array.from(uniqueVulns.values());

  // Step 10: Sort results
  const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Unknown': 4 };
  
  deduplicatedVulns.sort((a, b) => {
    // Sort by severity first
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Within same severity, sort by CVSS score (descending)
    const scoreA = a.cvssScore || 0;
    const scoreB = b.cvssScore || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    // Within same score, sort alphabetically by package name
    return a.package.localeCompare(b.package);
  });

  // Step 11: Store successful response in cache
  cacheSet(cacheKey, deduplicatedVulns);
  console.log('[osv] Cached vulnerability results for', depCount, 'dependencies');

  // Step 12: Success logging
  const totalTime = Date.now() - startTime;
  console.log(`[osv] Successfully checked vulnerabilities in ${totalTime}ms. Found ${deduplicatedVulns.length} vulnerabilities.`);

  // Step 13: Return results
  return deduplicatedVulns;
}

// Step 16: Export the function
export { checkVulnerabilities };
