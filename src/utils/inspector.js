import { fetchPackageData, fetchTransitiveDependencies, resolveVersionFromRange } from '../api/npm.js';
import { checkVulnerabilities } from '../api/osv.js';
import { generateSummary } from '../api/ai.js';

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
 * Merges direct dependencies with transitive dependencies into a single flat object
 * @param {Object} directDeps - Direct dependencies object from npm API
 * @param {Map} transitiveDepsMap - Map of transitive dependencies from fetchTransitiveDependencies
 * @returns {Object} Combined object with all dependencies { "package-name": "version", ... }
 * @private
 */
function _mergeDependencyMaps(directDeps, transitiveDepsMap) {
  const combined = { ...directDeps }; // Start with direct dependencies
  
  // Add transitive dependencies (prefer direct dependency version over transitive)
  transitiveDepsMap.forEach((depData, key) => {
    const packageName = depData.name;
    if (!combined[packageName]) {
      combined[packageName] = depData.version;
    }
  });
  
  return combined;
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
 * @param {Object} directDependencies - Direct dependencies object
 * @param {Object} transitiveDependencies - Transitive dependencies object
 * @param {Object} allDependencies - Combined dependencies object
 * @param {Array} vulnerabilities - Vulnerabilities from OSV API
 * @param {Object} aiSummary - AI summary from OpenAI API
 * @param {number} analysisStartTime - Timestamp when analysis started
 * @returns {Object} Unified report object
 * @private
 */
function _buildUnifiedReport(packageData, directDependencies, transitiveDependencies, allDependencies, vulnerabilities, aiSummary, analysisStartTime) {
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
    maintenanceInfo: {
      lastPublishDate: packageData.lastPublishDate || null,
      githubStats: packageData.githubStats || null,
      maintenanceStatus: aiSummary?.maintenanceStatus || 'Unknown',
      maintenanceNotes: aiSummary?.maintenanceNotes || null,
      licenseCompatibility: aiSummary?.licenseCompatibility || 'Unknown'
    },
    dependencyTree: {
      direct: _extractDependencyList(directDependencies),
      directCount: Object.keys(directDependencies).length,
      transitive: _extractDependencyList(transitiveDependencies),
      transitiveCount: Object.keys(transitiveDependencies).length,
      total: Object.keys(allDependencies).length
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
 * Orchestrates package analysis by coordinating npm, OSV, and AI API calls
 * to generate a comprehensive report
 * @param {string} packageName - The npm package name to analyze (supports scoped packages like @scope/name)
 * @param {string} [model=null] - Optional AI model to use for analysis (e.g., 'moonshotai/kimi-k2-thinking', 'openai/gpt-4o'). If not provided, falls back to VITE_DEFAULT_MODEL or backend default
 * @param {number} [timeout=30000] - Request timeout in milliseconds for each API call
 * @returns {Promise<Object>} Unified report object with packageInfo, dependencyTree, vulnerabilities, aiSummary, and metadata
 * @throws {Error} Custom error object with type, message, and originalError properties
 * @example
 * const report = await inspectPackage('lodash', 'openai/gpt-4o');
 * // Returns: { packageInfo: {...}, dependencyTree: {...}, vulnerabilities: [...], aiSummary: {...}, metadata: {...} }
 * @example
 * const report = await inspectPackage('@babel/core');
 */
async function inspectPackage(packageName, model = null, timeout = DEFAULT_TIMEOUT) {
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

    // Step 4: Extract Direct Dependencies
    const directDependencies = packageData.dependencies || {};
    const directCount = Object.keys(directDependencies).length;
    console.log('[inspector] Found', directCount, 'direct dependencies for:', packageName);

    // Step 4.5: Fetch Transitive Dependencies
    let transitiveDepsMap = new Map();
    let transitiveDependencies = {};
    let allDependencies = {};
    
    if (directCount > 0) {
      try {
        console.log('[inspector] Fetching transitive dependencies (max depth: 3)');
        transitiveDepsMap = await fetchTransitiveDependencies(packageName, packageData.version, 3, timeout);
        
        // Convert Map to object (excluding direct dependencies and root package)
        transitiveDepsMap.forEach((depData) => {
          const depName = depData.name;
          // Exclude root package and direct dependencies from transitive list
          if (depName !== packageData.name && !directDependencies[depName]) {
            transitiveDependencies[depName] = depData.version;
          }
        });
        
        const transitiveCount = Object.keys(transitiveDependencies).length;
        console.log('[inspector] Found', transitiveCount, 'transitive dependencies');
        
        // Normalize direct dependencies to exact versions from transitive map
        // This ensures OSV receives exact versions, not semver ranges
        const normalizedDirectDeps = {};
        const directDepNames = Object.keys(directDependencies);
        
        for (const depName of directDepNames) {
          // Find the resolved version from transitive map (depth 1)
          let resolvedVersion = null;
          transitiveDepsMap.forEach((depData) => {
            if (depData.name === depName && depData.depth === 1) {
              resolvedVersion = depData.version;
            }
          });
          
          // If not found in transitive map (fetch failed), resolve the semver range
          if (!resolvedVersion) {
            const range = directDependencies[depName];
            console.log(`[inspector] Direct dependency ${depName}@${range} not in transitive map, resolving...`);
            
            try {
              // First attempt: resolve using metadata
              resolvedVersion = await resolveVersionFromRange(depName, range, timeout);
              console.log(`[inspector] Resolved ${depName}@${range} to ${resolvedVersion} via metadata`);
            } catch (metadataError) {
              // Second attempt: fetch latest version via fetchPackageData
              console.warn(`[inspector] Metadata resolution failed for ${depName}@${range}:`, metadataError.message);
              console.log(`[inspector] Attempting to fetch latest version for ${depName}...`);
              
              try {
                const packageInfo = await fetchPackageData(depName, timeout, { includeGithubStats: false });
                resolvedVersion = packageInfo.version;
                console.log(`[inspector] Resolved ${depName}@${range} to latest version ${resolvedVersion}`);
              } catch (fetchError) {
                // Both attempts failed - skip this dependency to avoid passing range to OSV
                console.warn(`[inspector] Failed to resolve ${depName}@${range} to exact version:`, fetchError.message);
                console.warn(`[inspector] Skipping ${depName} from vulnerability check to avoid passing semver range to OSV`);
                // Do not add to normalizedDirectDeps - effectively skips this dependency
                continue;
              }
            }
          }
          
          normalizedDirectDeps[depName] = resolvedVersion;
        }
        
        // Merge normalized direct and transitive dependencies
        allDependencies = { ...normalizedDirectDeps, ...transitiveDependencies };
        const totalCount = Object.keys(allDependencies).length;
        console.log('[inspector] Total dependencies to check:', totalCount, '(direct + transitive)');
        
      } catch (error) {
        // Non-critical failure - continue with direct dependencies only
        console.warn('[inspector] Failed to fetch transitive dependencies:', error.message);
        console.warn('[inspector] Normalizing direct dependencies to exact versions via metadata/latest fallback');
        
        // Normalize direct dependencies to exact versions to avoid passing ranges to OSV
        const normalizedDirectDeps = {};
        const directDepNames = Object.keys(directDependencies);
        
        for (const depName of directDepNames) {
          const range = directDependencies[depName];
          let resolvedVersion = null;
          
          try {
            // First attempt: resolve using metadata
            resolvedVersion = await resolveVersionFromRange(depName, range, timeout);
            console.log(`[inspector] Resolved ${depName}@${range} to ${resolvedVersion} via metadata`);
          } catch (metadataError) {
            // Second attempt: fetch latest version via fetchPackageData
            console.warn(`[inspector] Metadata resolution failed for ${depName}@${range}:`, metadataError.message);
            console.log(`[inspector] Attempting to fetch latest version for ${depName}...`);
            
            try {
              const packageInfo = await fetchPackageData(depName, timeout, { includeGithubStats: false });
              resolvedVersion = packageInfo.version;
              console.log(`[inspector] Resolved ${depName}@${range} to latest version ${resolvedVersion}`);
            } catch (fetchError) {
              // Both attempts failed - skip this dependency to avoid passing range to OSV
              console.warn(`[inspector] Failed to resolve ${depName}@${range} to exact version:`, fetchError.message);
              console.warn(`[inspector] Skipping ${depName} from vulnerability check to avoid passing semver range to OSV`);
              // Do not add to normalizedDirectDeps - effectively skips this dependency
              continue;
            }
          }
          
          normalizedDirectDeps[depName] = resolvedVersion;
        }
        
        allDependencies = normalizedDirectDeps;
        console.log(`[inspector] Normalized ${Object.keys(normalizedDirectDeps).length} direct dependencies to exact versions`);
      }
    } else {
      allDependencies = { ...directDependencies };
    }

    // Step 5: Check Vulnerabilities with OSV API
    let vulnerabilities = [];
    const totalDepCount = Object.keys(allDependencies).length;
    if (totalDepCount > 0) {
      try {
        vulnerabilities = await checkVulnerabilities(allDependencies, timeout);
        console.log('[inspector] Checked vulnerabilities for:', packageName, '- Found', vulnerabilities.length, 'vulnerabilities');
      } catch (error) {
        console.error('[inspector] Failed to check vulnerabilities:', packageName, error.type, error.message);
        console.warn('[inspector] Continuing analysis without vulnerability data');
        vulnerabilities = []; // Non-critical failure - continue with empty array
      }
    } else {
      console.log('[inspector] No dependencies to check for vulnerabilities');
    }

    // Step 6: Generate AI Summary with AI API
    let aiSummary = null;
    try {
      console.log('[inspector] Using AI model:', model || 'default');
      aiSummary = await generateSummary(packageData, vulnerabilities, model, timeout);
      console.log('[inspector] Generated AI summary for:', packageName, '- Risk level:', aiSummary.riskLevel);
    } catch (error) {
      console.error('[inspector] Failed to generate AI summary:', packageName, error.type, error.message);
      console.warn('[inspector] Continuing analysis without AI summary');
      // Non-critical failure - set to null
      aiSummary = null;
    }

    // Step 7: Build Unified Report
    const report = _buildUnifiedReport(packageData, directDependencies, transitiveDependencies, allDependencies, vulnerabilities, aiSummary, analysisStartTime);

    // Step 8: Success Logging
    const totalTime = Date.now() - analysisStartTime;
    console.log('[inspector] Successfully analyzed:', packageName);
    console.log('[inspector] Analysis time:', totalTime, 'ms');
    console.log('[inspector] Dependencies:', report.dependencyTree.total);
    console.log('[inspector] Vulnerabilities:', report.vulnerabilities.length);
    console.log('[inspector] Risk level:', report.aiSummary?.riskLevel || 'N/A');
    console.log('[inspector] Maintenance status:', report.maintenanceInfo?.maintenanceStatus || 'N/A');

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
