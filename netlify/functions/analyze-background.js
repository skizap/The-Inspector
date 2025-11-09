/**
 * Netlify Background Function that processes long-running AI analysis requests.
 * This function can run for up to 15 minutes, allowing slow AI models to complete.
 * Results are stored in Netlify Blobs with 1-hour TTL.
 */

import https from 'https';
import http from 'http';
import { getStore } from '@netlify/blobs';
import { VALID_OPENROUTER_MODELS } from '../../src/constants/openrouterModels.js';

// Constants
const DEFAULT_TIMEOUT = 8000;
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.7;

/**
 * Builds the system prompt that instructs GPT-4 to act as a security analyst
 * @returns {string} System prompt text
 */
function _buildSystemPrompt() {
  return `You are a security analyst reviewing an npm package. Analyze the package data and vulnerabilities provided. Provide a plain-English risk assessment suitable for developers of all skill levels.

Your response must be in JSON format with the following structure:
{
  "riskLevel": "Low|Medium|High|Critical",
  "concerns": ["concern1", "concern2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "complexityAssessment": "paragraph describing dependency complexity",
  "maintenanceStatus": "Active|Stale|Abandoned|Unknown",
  "licenseCompatibility": "Permissive|Copyleft|Proprietary|Unknown",
  "maintenanceNotes": "brief note about maintenance status and license implications"
}

- riskLevel must be one of: Low, Medium, High, Critical
- concerns must be an array of 2-5 key security concern strings
- recommendations must be an array of 2-5 actionable recommendation strings
- complexityAssessment must be a single paragraph describing dependency complexity
- maintenanceStatus: Active (updated within 1 year), Stale (1-2 years), Abandoned (>2 years), Unknown
- licenseCompatibility: Permissive (MIT/Apache/BSD), Copyleft (GPL/LGPL), Proprietary, Unknown
- maintenanceNotes: brief assessment of maintenance health and license implications

Consider open issues count as indicator of active maintenance.`;
}

/**
 * Builds the user prompt with package data and vulnerability information
 * @param {Object} packageData - Package metadata from npm
 * @param {Array} vulnerabilities - Array of vulnerability objects
 * @returns {string} Formatted user prompt
 */
function _buildUserPrompt(packageData, vulnerabilities) {
  const dependencyCount = packageData.dependencies 
    ? Object.keys(packageData.dependencies).length 
    : 0;

  // Severity order map for sorting (higher index = more severe)
  const severityOrder = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'moderate': 2,
    'low': 1,
    'unknown': 0
  };

  // Normalize severity function
  const normalizeSeverity = (severity) => {
    if (!severity) return 'Unknown';
    const normalized = severity.toString().trim().toLowerCase();
    
    // Map common variants
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    if (normalized === 'medium' || normalized === 'moderate') return 'Medium';
    if (normalized === 'low') return 'Low';
    return 'Unknown';
  };

  // Count vulnerabilities by severity with normalization
  const severityCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Unknown: 0
  };

  vulnerabilities.forEach(vuln => {
    const normalizedSeverity = normalizeSeverity(vuln.severity);
    severityCounts[normalizedSeverity]++;
  });

  // Build vulnerability summary
  let prompt = `Package: ${packageData.name} v${packageData.version}
Dependencies: ${dependencyCount} direct dependencies
Vulnerabilities: ${severityCounts.Critical} Critical, ${severityCounts.High} High, ${severityCounts.Medium} Medium, ${severityCounts.Low} Low
`;

  // Add top 5 most severe vulnerabilities (sorted by severity)
  if (vulnerabilities.length > 0) {
    // Sort vulnerabilities by severity (most severe first)
    const sortedVulns = [...vulnerabilities].sort((a, b) => {
      const severityA = (a.severity || '').toString().trim().toLowerCase();
      const severityB = (b.severity || '').toString().trim().toLowerCase();
      const orderA = severityOrder[severityA] !== undefined ? severityOrder[severityA] : 0;
      const orderB = severityOrder[severityB] !== undefined ? severityOrder[severityB] : 0;
      return orderB - orderA; // Descending order
    });

    prompt += '\nTop Vulnerabilities:\n';
    const topVulns = sortedVulns.slice(0, 5);
    topVulns.forEach(vuln => {
      prompt += `- ${vuln.id}: ${vuln.summary || 'No summary available'}\n`;
    });
  } else {
    prompt += '\nNo known vulnerabilities found.\n';
  }

  prompt += `\nLicense: ${packageData.license || 'Unknown'}`;

  // Add maintenance information
  if (packageData.lastPublishDate) {
    const daysAgo = Math.floor((Date.now() - new Date(packageData.lastPublishDate)) / (1000 * 60 * 60 * 24));
    const publishDate = new Date(packageData.lastPublishDate).toLocaleDateString();
    prompt += `\nLast Published: ${daysAgo} days ago (${publishDate})`;
    
    // Add staleness warnings
    if (daysAgo > 730) {
      prompt += '\n⚠️ Package has not been updated in over 2 years (potentially abandoned)';
    } else if (daysAgo > 365) {
      prompt += '\n⚠️ Package has not been updated in over 1 year';
    }
  }

  // Add GitHub stats if available
  if (packageData.githubStats?.openIssues !== undefined) {
    prompt += `\nOpen Issues: ${packageData.githubStats.openIssues}`;
  }

  return prompt;
}

/**
 * Parses and validates the AI response
 * @param {string} content - JSON string from OpenAI
 * @returns {Object} Parsed and validated summary object
 * @throws {Error} If parsing fails or validation fails
 */
function _parseAIResponse(content) {
  let parsed;
  
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to parse AI response as JSON');
  }

  // Validate required fields
  if (!parsed.riskLevel || !parsed.concerns || !parsed.recommendations || !parsed.complexityAssessment) {
    throw new Error('Invalid AI response: missing required fields');
  }

  // Validate riskLevel
  const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'];
  if (!validRiskLevels.includes(parsed.riskLevel)) {
    throw new Error(`Invalid riskLevel: ${parsed.riskLevel}`);
  }

  // Validate arrays
  if (!Array.isArray(parsed.concerns) || parsed.concerns.length === 0) {
    throw new Error('Invalid concerns: must be non-empty array');
  }

  if (!Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
    throw new Error('Invalid recommendations: must be non-empty array');
  }

  // Validate complexityAssessment
  if (typeof parsed.complexityAssessment !== 'string' || parsed.complexityAssessment.trim() === '') {
    throw new Error('Invalid complexityAssessment: must be non-empty string');
  }

  // Validate maintenanceStatus
  const validMaintenanceStatuses = ['Active', 'Stale', 'Abandoned', 'Unknown'];
  if (parsed.maintenanceStatus && !validMaintenanceStatuses.includes(parsed.maintenanceStatus)) {
    throw new Error(`Invalid maintenanceStatus: ${parsed.maintenanceStatus}`);
  }

  // Validate licenseCompatibility
  const validLicenseTypes = ['Permissive', 'Copyleft', 'Proprietary', 'Unknown'];
  if (parsed.licenseCompatibility && !validLicenseTypes.includes(parsed.licenseCompatibility)) {
    throw new Error(`Invalid licenseCompatibility: ${parsed.licenseCompatibility}`);
  }

  // Validate maintenanceNotes
  if (parsed.maintenanceNotes && typeof parsed.maintenanceNotes !== 'string') {
    throw new Error('Invalid maintenanceNotes: must be a string');
  }

  return parsed;
}

/**
 * Makes a streaming request to the AI API and accumulates the response
 * @param {string} baseURL - The API endpoint URL
 * @param {Object} requestBody - The request payload
 * @param {Object} headers - Request headers
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<string>} The accumulated response content
 */
function _makeStreamingRequest(baseURL, requestBody, headers, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseURL);
    const protocol = url.protocol === 'https:' ? https : http;
    const bodyString = JSON.stringify(requestBody);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(bodyString)
      },
      timeout: timeout
    };

    const req = protocol.request(options, (res) => {
      let fullContent = '';
      let hasError = false;

      // Inspect HTTP status code at the start of response
      if (res.statusCode !== 200) {
        hasError = true;
        let errorBody = '';

        // Buffer all response data for error cases
        res.on('data', (chunk) => {
          errorBody += chunk.toString();
        });

        res.on('end', () => {
          // Parse error message from response body if possible
          let providerMessage = '';
          try {
            const parsed = JSON.parse(errorBody);
            providerMessage = parsed.error?.message || parsed.message || '';
          } catch (e) {
            providerMessage = errorBody.substring(0, 200); // First 200 chars if not JSON
          }

          // Build error message with HTTP status
          let errorMessage = `HTTP ${res.statusCode}`;
          
          if (res.statusCode === 401) {
            errorMessage += ' Unauthorized';
          } else if (res.statusCode === 429) {
            errorMessage += ' Too Many Requests';
          } else if (res.statusCode >= 500) {
            errorMessage += ' Server Error';
          }

          if (providerMessage) {
            errorMessage += `: ${providerMessage}`;
          }

          // Forward Retry-After header if present
          const retryAfter = res.headers['retry-after'];
          if (retryAfter) {
            errorMessage += ` (Retry-After: ${retryAfter})`;
          }

          reject(new Error(errorMessage));
        });

        return;
      }

      // Normal streaming response handling for 200 OK
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                fullContent += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore parsing errors for individual chunks
            }
          }
        }
      });

      res.on('end', () => {
        if (hasError) return;
        resolve(fullContent);
      });

      res.on('error', (error) => {
        hasError = true;
        reject(new Error(`Response error: ${error.message}`));
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    // Set timeout on the request
    req.setTimeout(timeout);

    req.write(bodyString);
    req.end();
  });
}

/**
 * Netlify Background Function handler
 * @param {Object} req - Request object
 * @param {Object} context - Netlify context object
 */
export default async (req, context) => {
  const store = getStore('analysis-results');
  
  let jobId;
  
  try {
    // Parse request body
    const body = await req.json();
    
    // Extract parameters
    jobId = body.jobId;
    const packageData = body.packageData;
    const vulnerabilities = body.vulnerabilities;
    const model = body.model;
    const apiKey = body.apiKey;
    const provider = body.provider;

    // Validate inputs
    if (!jobId) {
      throw new Error('jobId is required');
    }

    if (!packageData || !packageData.name || !packageData.version || !packageData.dependencies) {
      throw new Error('Invalid packageData structure');
    }

    if (!Array.isArray(vulnerabilities)) {
      throw new Error('vulnerabilities must be an array');
    }

    if (!apiKey) {
      throw new Error('apiKey is required');
    }

    if (!provider || (provider !== 'openai' && provider !== 'openrouter')) {
      throw new Error('Invalid provider');
    }

    // Validate model for OpenRouter
    if (provider === 'openrouter' && !VALID_OPENROUTER_MODELS.includes(model)) {
      throw new Error(`Invalid OpenRouter model: ${model}`);
    }

    console.log('[analyze-background] Processing job:', jobId);
    console.log('[analyze-background] Package:', packageData.name);
    console.log('[analyze-background] Model:', model);

    // Configure provider-specific settings
    let baseURL;
    let headers;

    if (provider === 'openrouter') {
      baseURL = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VITE_SITE_URL || '',
        'X-Title': process.env.VITE_SITE_NAME || 'The Inspector',
        'Content-Type': 'application/json'
      };
    } else {
      baseURL = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    }

    // Build AI request
    const messages = [
      { role: 'system', content: _buildSystemPrompt() },
      { role: 'user', content: _buildUserPrompt(packageData, vulnerabilities) }
    ];

    const aiRequestBody = {
      model: model,
      messages: messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      stream: true
    };

    // Make AI API call with streaming support
    const response = await _makeStreamingRequest(baseURL, aiRequestBody, headers);

    // Validate response structure
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid AI response: no content received');
    }

    // Parse the streamed response
    const parsedSummary = _parseAIResponse(response);

    console.log('[analyze-background] Analysis completed for job:', jobId);

    // Store successful result in Netlify Blobs
    const now = Date.now();
    const ttlSeconds = 3600; // 1 hour
    const expiresAt = now + (ttlSeconds * 1000);
    
    const result = {
      status: 'completed',
      result: {
        packageData,
        vulnerabilities,
        summary: parsedSummary
      },
      timestamp: now,
      model
    };

    await store.set(jobId, JSON.stringify(result), {
      metadata: {
        timestamp: now,
        ttl: ttlSeconds,
        expiresAt: expiresAt
      }
    });

    console.log('[analyze-background] Result stored for job:', jobId);

  } catch (error) {
    console.error('[analyze-background] Error processing job:', jobId, error.message);

    // Store error state in Netlify Blobs
    if (jobId) {
      try {
        const now = Date.now();
        const ttlSeconds = 3600; // 1 hour
        const expiresAt = now + (ttlSeconds * 1000);
        
        // Detect common error cases and assign structured error codes
        let errorCode = 'UNKNOWN_ERROR';
        const errorMessage = error.message || '';
        
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorCode = 'INVALID_API_KEY';
        } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('Retry-After')) {
          errorCode = 'RATE_LIMIT';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorCode = 'TIMEOUT_ERROR';
        } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
          errorCode = 'SERVER_ERROR';
        } else if (errorMessage.includes('parse') || errorMessage.includes('Invalid AI response')) {
          errorCode = 'PARSE_ERROR';
        }
        
        const errorResult = {
          status: 'failed',
          error: error.message,
          errorCode: errorCode,
          timestamp: now
        };

        await store.set(jobId, JSON.stringify(errorResult), {
          metadata: {
            timestamp: now,
            ttl: ttlSeconds,
            expiresAt: expiresAt
          }
        });

        console.log('[analyze-background] Error state stored for job:', jobId, 'errorCode:', errorCode);
      } catch (storeError) {
        console.error('[analyze-background] Failed to store error state:', storeError.message);
      }
    }
  }
};

// Export config for Netlify Background Function
export const config = {
  path: '/analyze-background'
};
