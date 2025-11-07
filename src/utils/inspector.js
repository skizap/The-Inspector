import { fetchPackageData } from '../api/npm.js';
import { checkVulnerabilities } from '../api/osv.js';
import { generateSummary } from '../api/openai.js';

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds, consistent with API clients

/**
 * Validates package name against npm naming rules
 * @param {string} packageName - The package name to validate
 * @returns {boolean} True if valid
 * @throws {Error} If package name is invalid
 * @private
 */
function _validatePackageName(packageName) {
  if (!packageName || typeof packageName !== 'string') {
    throw new Error('Package name must be a non-empty string');
  }

  // Supports both scoped (@scope/name) and unscoped (name) packages
  // Allows lowercase letters, digits, hyphens, underscores, and dots
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
 * Creates a standardized error object
 * @param {string} type - Error type identifier
 * @param {string} message - User-friendly error message
 * @param {Error} originalError - Original error object
 * @returns {Object} Standardized error object
 * @private
 */
function _createErrorObject(type, message, originalError) {
  return {
    type,
    message,
    originalError
  };
}

/**
 * Extracts dependency names from dependencies object
 * @param {Object} dependencies - Dependencies object from npm API
 * @returns {Array<string>} Array of dependency names sorted lexicographically
 * @private
 */
function _extractDependencyList(dependencies) {
  if (!dependencies || typeof dependencies !== 'object') {
    return [];
  }
  return Object.keys(dependencies).sort((a, b) => a.localeCompare(b));
}

/**
 * Groups vulnerabilities by severity level
 * @param {Array<Object>} vulnerabilities - Array of vulnerability objects
 * @returns {Object} Vulnerabilities grouped by severity
 * @private
 */
function _groupVulnerabilitiesBySeverity(vulnerabilities) {
  const grouped = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    unknown: []
  };

  if (!Array.isArray(vulnerabilities)) {
    return grouped;
  }

  vulnerabilities.forEach(vuln => {
    const severity = (vuln.severity || 'unknown').toLowerCase();
    if (grouped[severity]) {
      grouped[severity].push(vuln);
    } else {
      grouped.unknown.push(vuln);
    }
  });

  // Sort each group by CVSS score (descending)
  Object.keys(grouped).forEach(severity => {
    grouped[severity].sort((a, b) => {
      const scoreA = a.cvssScore || 0;
      const scoreB = b.cvssScore || 0;
      return scoreB - scoreA;
    });
  });

  return grouped;
}

/**
 * Builds the unified report object
 * @param {Object} packageData - Package data from npm API
 * @param {Array} vulnerabilities - Vulnerabilities from OSV API
 * @param {Object} aiSummary - AI summary from OpenAI API
 * @param {number} analysisStartTime - Timestamp when analysis started
 * @returns {Object} Unified report object
 * @private
 */
function _buildUnifiedReport(packageData, vulnerabilities, aiSummary, analysisStartTime) {
  const dependencies = packageData.dependencies || {};
  const vulnerabilitiesBySeverity = _groupVulnerabilitiesBySeverity(vulnerabilities);
  
  // Compute top 3 vulnerabilities (already sorted by severity in vulnerabilities array)
  const topVulnerabilities = vulnerabilities.slice(0, 3);
  
  // Compute severity counts
  const totalVulns = vulnerabilities.length;
  const criticalCount = vulnerabilitiesBySeverity.critical.length;
  const highCount = vulnerabilitiesBySeverity.high.length;
  const mediumCount = vulnerabilitiesBySeverity.medium.length;
  const lowCount = vulnerabilitiesBySeverity.low.length;
  
  return {
    packageInfo: {
      name: packageData.name,
      version: packageData.version,
      description: packageData.description,
      license: packageData.license,
      repository: packageData.repository,
      maintainers: packageData.maintainers
    },
    dependencyTree: {
      direct: _extractDependencyList(dependencies),
      total: Object.keys(dependencies).length
    },
    vulnerabilities: vulnerabilities,
    vulnerabilitiesBySeverity: vulnerabilitiesBySeverity,
    topVulnerabilities: topVulnerabilities,
    totalVulns: totalVulns,
    criticalCount: criticalCount,
    highCount: highCount,
    mediumCount: mediumCount,
    lowCount: lowCount,
    aiSummary: aiSummary,
    metadata: {
      analyzedAt: new Date().toISOString(),
      analysisTime: Date.now() - analysisStartTime
    }
  };
}

/**
 * Orchestrates package analysis by coordinating npm, OSV, and OpenAI API calls
 * to generate a comprehensive report
 * @param {string} packageName - The npm package name to analyze (supports scoped packages like @scope/name)
 * @param {number} [timeout=30000] - Request timeout in milliseconds for each API call
 * @returns {Promise<Object>} Unified report object with packageInfo, dependencyTree, vulnerabilities, aiSummary, and metadata
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const report = await inspectPackage('lodash');
 * // Returns: { packageInfo: {...}, dependencyTree: {...}, vulnerabilities: [...], aiSummary: {...}, metadata: {...} }
 * @example
 * const report = await inspectPackage('@babel/core');
 */
async function inspectPackage(packageName, timeout = DEFAULT_TIMEOUT) {
  try {
    // Step 1: Input Validation
    console.log('[inspector] Starting analysis for:', packageName, 'at', new Date().toISOString());
    try {
      _validatePackageName(packageName);
    } catch (error) {
      console.error('[inspector] Validation error:', packageName, error.message);
      throw _createErrorObject('VALIDATION_ERROR', error.message, error);
    }

    // Step 2: Initialize Timing
    const analysisStartTime = Date.now();

    // Step 3: Fetch Package Data from npm Registry
    let packageData;
    try {
      packageData = await fetchPackageData(packageName, timeout);
      console.log('[inspector] Fetched package data for:', packageName);
    } catch (error) {
      console.error('[inspector] Failed to fetch package data:', packageName, error.type, error.message);
      throw error; // Critical failure - cannot proceed
    }

    // Step 4: Extract Dependencies
    const dependencies = packageData.dependencies || {};
    const dependencyCount = Object.keys(dependencies).length;
    console.log('[inspector] Found', dependencyCount, 'dependencies for:', packageName);

    // Step 5: Check Vulnerabilities with OSV API
    let vulnerabilities = [];
    if (dependencyCount > 0) {
      try {
        vulnerabilities = await checkVulnerabilities(dependencies, timeout);
        console.log('[inspector] Checked vulnerabilities for:', packageName, '- Found', vulnerabilities.length, 'vulnerabilities');
      } catch (error) {
        console.error('[inspector] Failed to check vulnerabilities:', packageName, error.type, error.message);
        console.warn('[inspector] Continuing analysis without vulnerability data');
        vulnerabilities = []; // Non-critical failure - continue with empty array
      }
    } else {
      console.log('[inspector] No dependencies to check for vulnerabilities');
    }

    // Step 6: Generate AI Summary with OpenAI API
    let aiSummary = null;
    try {
      aiSummary = await generateSummary(packageData, vulnerabilities, timeout);
      console.log('[inspector] Generated AI summary for:', packageName, '- Risk level:', aiSummary.riskLevel);
    } catch (error) {
      console.error('[inspector] Failed to generate AI summary:', packageName, error.type, error.message);
      console.warn('[inspector] Continuing analysis without AI summary');
      // Non-critical failure - set to null
      aiSummary = null;
    }

    // Step 7: Build Unified Report
    const report = _buildUnifiedReport(packageData, vulnerabilities, aiSummary, analysisStartTime);

    // Step 8: Success Logging
    const totalTime = Date.now() - analysisStartTime;
    console.log('[inspector] Successfully analyzed:', packageName);
    console.log('[inspector] Analysis time:', totalTime, 'ms');
    console.log('[inspector] Dependencies:', report.dependencyTree.total);
    console.log('[inspector] Vulnerabilities:', report.vulnerabilities.length);
    console.log('[inspector] Risk level:', report.aiSummary?.riskLevel || 'N/A');

    // Step 9: Return Report
    return report;

  } catch (error) {
    // Step 10: Top-Level Error Handling
    console.error('[inspector] Unexpected error during analysis:', packageName, error);
    
    // If error is already formatted (from API clients), re-throw as-is
    if (error.type && error.message && error.originalError) {
      throw error;
    }
    
    // Otherwise, wrap in standardized error object
    throw _createErrorObject(
      'ANALYSIS_ERROR',
      'Failed to analyze package. Please try again.',
      error
    );
  }
}

export { inspectPackage };
