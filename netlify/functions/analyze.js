/**
 * Netlify-compatible serverless function that acts as a secure proxy for AI API calls (OpenAI and OpenRouter).
 * This is a wrapper around the core logic from api/analyze.js adapted for Netlify's handler signature.
 * 
 * ⚠️ DEPRECATION NOTICE:
 * This function is DEPRECATED and kept for backward compatibility only.
 * 
 * New implementations should use the background functions architecture:
 * - analyze-start.js: Initiates analysis jobs and returns jobId
 * - analyze-background.js: Processes long-running AI requests (15-min timeout)
 * - analyze-status.js: Polls for job completion
 * 
 * The background functions architecture solves timeout issues with slow AI models
 * (e.g., Moonshot Kimi K2 Thinking takes 50-60+ seconds, exceeding the 26-second
 * Netlify function timeout limit).
 * 
 * See docs/BACKGROUND_FUNCTIONS.md for technical details.
 * 
 * This function may be removed in a future release after stable deployment
 * of the background functions architecture.
 */

import https from 'https';
import http from 'http';
import { VALID_OPENROUTER_MODELS } from '../../src/constants/openrouterModels.js';

// Constants
// Note: baseURL and model are determined dynamically based on provider
// Timeout set to 8 seconds for AI API calls (Netlify functions have a 30-second execution limit)
// Edge case: If frequent timeout errors occur in production, increase DEFAULT_TIMEOUT to 12000-15000ms.
// For tasks requiring >30 seconds compute, migrate to Netlify Background Function and adjust client UX for async completion.
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
 * @returns {Promise<string>} The accumulated response content
 */
function _makeStreamingRequest(baseURL, requestBody, headers) {
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
      timeout: DEFAULT_TIMEOUT
    };

    const req = protocol.request(options, (res) => {
      let fullContent = '';
      let hasError = false;

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
    req.setTimeout(DEFAULT_TIMEOUT);

    req.write(bodyString);
    req.end();
  });
}

/**
 * Netlify serverless function handler
 * @param {Object} event - Netlify event object with httpMethod, headers, body
 * @param {Object} context - Netlify context object
 * @returns {Promise<Object>} Response object with statusCode, headers, body
 */
export async function handler(event) {
  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  // Validate Content-Type
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !contentType.includes('application/json')) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Content-Type must be application/json' })
    };
  }

  // Check for user-provided API key in Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  let userProvidedKey = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userProvidedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[netlify] User-provided API key detected');
  }

  // Determine AI provider with backward compatibility
  let provider = process.env.VITE_AI_PROVIDER;
  
  // Normalize provider to avoid case/whitespace configuration pitfalls
  provider = (provider || '').trim().toLowerCase();
  
  // If user provided a key, default to openrouter (most common use case)
  if (!provider && userProvidedKey) {
    provider = 'openrouter';
    console.log('[netlify] Defaulting to openrouter for user-provided key');
  }
  
  // Backward compatibility: default to 'openai' if VITE_AI_PROVIDER not set but OPENAI_API_KEY exists
  if (!provider && process.env.OPENAI_API_KEY) {
    provider = 'openai';
  }

  // Validate provider value
  if (provider && provider !== 'openai' && provider !== 'openrouter') {
    console.error('[netlify] Unsupported VITE_AI_PROVIDER value:', provider);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Server configuration error: unsupported VITE_AI_PROVIDER value' 
      })
    };
  }

  // Configure provider-specific settings
  let baseURL;
  let apiKey;
  let headers;

  if (provider === 'openrouter') {
    // Use user-provided key if available, otherwise fall back to env var
    apiKey = userProvidedKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('[netlify] No OpenRouter API key available (neither user-provided nor env var)');
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'API key required. Please provide your OpenRouter API key in settings.' 
        })
      };
    }

    baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.VITE_SITE_URL || '',
      'X-Title': process.env.VITE_SITE_NAME || 'The Inspector',
      'Content-Type': 'application/json'
    };
    console.log('[netlify] Using OpenRouter with', userProvidedKey ? 'user-provided' : 'environment', 'API key');
  } else {
    // Default to OpenAI
    // Use user-provided key if available, otherwise fall back to env var
    apiKey = userProvidedKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('[netlify] No OpenAI API key available (neither user-provided nor env var)');
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'API key required. Please provide your OpenAI API key in settings.' 
        })
      };
    }

    baseURL = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    console.log('[netlify] Using OpenAI with', userProvidedKey ? 'user-provided' : 'environment', 'API key');
  }

  console.log('[netlify] Using AI provider:', provider);

  // Parse request body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  // Validate request body
  const { packageData, vulnerabilities, model: requestedModel } = requestBody;

  if (!packageData || typeof packageData !== 'object') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request: packageData is required' })
    };
  }

  if (!packageData.name || !packageData.version) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid packageData: name and version are required' })
    };
  }

  if (!packageData.dependencies || typeof packageData.dependencies !== 'object' || Array.isArray(packageData.dependencies)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid packageData: dependencies is required and must be an object' })
    };
  }

  if (!Array.isArray(vulnerabilities)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request: vulnerabilities must be an array' })
    };
  }

  // Determine model to use
  let modelToUse;
  if (requestedModel) {
    modelToUse = requestedModel;
  } else if (process.env.VITE_DEFAULT_MODEL) {
    modelToUse = process.env.VITE_DEFAULT_MODEL;
  } else {
    // Provider-specific defaults
    modelToUse = provider === 'openrouter' ? 'moonshotai/kimi-k2-thinking' : 'gpt-4o';
  }

  // Normalize model name (trim whitespace and convert to lowercase)
  modelToUse = modelToUse.trim().toLowerCase();

  // Validate model compatibility with provider
  if (provider === 'openrouter') {
    // Check if model is in the whitelist of valid OpenRouter models
    if (!VALID_OPENROUTER_MODELS.includes(modelToUse)) {
      console.error('[netlify] Invalid or unsupported OpenRouter model requested:', modelToUse);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Model '${modelToUse}' is not a valid or supported OpenRouter model for this application. Please select a model from the dropdown in the UI.` 
        })
      };
    }
  }

  console.log('[netlify] Analyzing package:', packageData.name);
  console.log('[netlify] Using model:', modelToUse);

  try {
    // Build AI request
    const messages = [
      { role: 'system', content: _buildSystemPrompt() },
      { role: 'user', content: _buildUserPrompt(packageData, vulnerabilities) }
    ];

    const aiRequestBody = {
      model: modelToUse,
      messages: messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      stream: true  // Enable streaming to avoid timeouts
    };

    // Make AI API call with streaming support
    const response = await _makeStreamingRequest(baseURL, aiRequestBody, headers);

    // Validate response structure
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid AI response: no content received');
    }

    // Parse the streamed response
    const parsedSummary = _parseAIResponse(response);

    console.log('[netlify] Generated summary for:', packageData.name);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: parsedSummary })
    };

  } catch (error) {
    console.error('[netlify] AI API error:', error.message);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: `${provider} API authentication failed. Please check server configuration.` 
          })
        };
      }

      if (status === 429) {
        // Forward Retry-After header if present
        const retryAfter = error.response.headers['retry-after'];
        const responseHeaders = { 'Content-Type': 'application/json' };
        if (retryAfter) {
          responseHeaders['Retry-After'] = retryAfter;
        }
        return {
          statusCode: 429,
          headers: responseHeaders,
          body: JSON.stringify({ 
            error: 'AI API rate limit exceeded. Please try again in a moment.' 
          })
        };
      }

      if (status >= 500) {
        return {
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'AI API temporarily unavailable. Please try again.' 
          })
        };
      }
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return {
        statusCode: 504,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'AI request timed out. Please try again.' 
        })
      };
    }

    // Handle network errors
    if (!error.response) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to connect to AI API.' 
        })
      };
    }

    // Handle validation errors from _parseAIResponse
    if (error.message && error.message.startsWith('Invalid AI response')) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Invalid AI response.' 
        })
      };
    }

    // Handle parsing errors
    if (error.message && error.message.includes('parse')) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to parse AI response.' 
        })
      };
    }

    // Generic error
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to generate summary.' 
      })
    };
  }
}
