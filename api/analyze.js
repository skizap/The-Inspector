/**
 * Serverless function that acts as a secure proxy for AI API calls (OpenAI and OpenRouter).
 * This function runs server-side where AI API keys can be safely accessed
 * from environment variables without exposure to the browser.
 */

import axios from 'axios';
import { VALID_OPENROUTER_MODELS } from '../src/constants/openrouterModels.js';

// Constants
// Note: baseURL and model are determined dynamically based on provider
const DEFAULT_TIMEOUT = 30000;
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
 * Main serverless function handler
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
export default async function handler(req, res) {
  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Validate Content-Type
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  // Extract user-provided API key from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const userApiKey = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  console.log('[serverless] User-provided API key:', userApiKey ? 'Present' : 'Not present');

  // Determine AI provider with backward compatibility
  let provider = process.env.VITE_AI_PROVIDER;
  
  // Normalize provider to avoid case/whitespace configuration pitfalls
  provider = (provider || '').trim().toLowerCase();
  
  // Backward compatibility: default to 'openai' if VITE_AI_PROVIDER not set but OPENAI_API_KEY exists
  if (!provider && process.env.OPENAI_API_KEY) {
    provider = 'openai';
  }

  // Validate provider value
  if (provider && provider !== 'openai' && provider !== 'openrouter') {
    console.error('[serverless] Unsupported VITE_AI_PROVIDER value:', provider);
    return res.status(500).json({ 
      error: 'Server configuration error: unsupported VITE_AI_PROVIDER value' 
    });
  }

  // Detect provider/key mismatch if user provided a key
  if (userApiKey) {
    const looksLikeOpenRouter = userApiKey.startsWith('sk-or-');
    const looksLikeOpenAI = userApiKey.startsWith('sk-') && !userApiKey.startsWith('sk-or-');

    if (provider === 'openai' && looksLikeOpenRouter) {
      console.error('[serverless] Provider/key mismatch: OpenAI provider with OpenRouter key');
      return res.status(400).json({
        error: 'API key mismatch: You provided an OpenRouter API key, but the server is configured for OpenAI. Please use an OpenAI API key or contact support to switch providers.'
      });
    }

    if (provider === 'openrouter' && looksLikeOpenAI) {
      console.error('[serverless] Provider/key mismatch: OpenRouter provider with OpenAI key');
      return res.status(400).json({
        error: 'API key mismatch: You provided an OpenAI API key, but the server is configured for OpenRouter. Please use an OpenRouter API key or contact support to switch providers.'
      });
    }
  }

  // Configure provider-specific settings
  let baseURL;
  let apiKey;
  let headers;

  if (provider === 'openrouter') {
    baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
    
    // Validate API key is available
    if (!apiKey) {
      console.error('[serverless] OPENROUTER_API_KEY environment variable not set and no user API key provided');
      return res.status(500).json({ 
        error: 'Server configuration error: OPENROUTER_API_KEY is not set and no user API key provided' 
      });
    }

    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.VITE_SITE_URL || '',
      'X-Title': process.env.VITE_SITE_NAME || 'The Inspector',
      'Content-Type': 'application/json'
    };
  } else {
    // Default to OpenAI
    baseURL = 'https://api.openai.com/v1/chat/completions';
    apiKey = userApiKey || process.env.OPENAI_API_KEY;
    
    // Validate API key is available
    if (!apiKey) {
      console.error('[serverless] OPENAI_API_KEY environment variable not set and no user API key provided');
      return res.status(500).json({ 
        error: 'Server configuration error: OPENAI_API_KEY not set and no user API key provided' 
      });
    }

    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  console.log('[serverless] Using AI provider:', provider, 'with', userApiKey ? 'user-provided' : 'server', 'API key');

  // Parse and validate request body
  const { packageData, vulnerabilities, model: requestedModel } = req.body;

  if (!packageData || typeof packageData !== 'object') {
    return res.status(400).json({ error: 'Invalid request: packageData is required' });
  }

  if (!packageData.name || !packageData.version) {
    return res.status(400).json({ error: 'Invalid packageData: name and version are required' });
  }

  if (!packageData.dependencies || typeof packageData.dependencies !== 'object' || Array.isArray(packageData.dependencies)) {
    return res.status(400).json({ error: 'Invalid packageData: dependencies is required and must be an object' });
  }

  if (!Array.isArray(vulnerabilities)) {
    return res.status(400).json({ error: 'Invalid request: vulnerabilities must be an array' });
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
      console.error('[serverless] Invalid or unsupported OpenRouter model requested:', modelToUse);
      return res.status(400).json({ 
        error: `Model '${modelToUse}' is not a valid or supported OpenRouter model for this application. Please select a model from the dropdown in the UI.` 
      });
    }
  }

  console.log('[serverless] Analyzing package:', packageData.name);
  console.log('[serverless] Using model:', modelToUse);

  try {
    // Build AI request
    const messages = [
      { role: 'system', content: _buildSystemPrompt() },
      { role: 'user', content: _buildUserPrompt(packageData, vulnerabilities) }
    ];

    const requestBody = {
      model: modelToUse,
      messages: messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' }
    };

    // Make AI API call
    const response = await axios.post(baseURL, requestBody, {
      headers: headers,
      timeout: DEFAULT_TIMEOUT
    });

    // Validate response structure
    if (!response.data || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
      throw new Error('Invalid AI response: missing choices array');
    }

    if (!response.data.choices[0].message || typeof response.data.choices[0].message.content !== 'string') {
      throw new Error('Invalid AI response: missing message.content');
    }

    // Extract and parse response
    const content = response.data.choices[0].message.content;
    const parsedSummary = _parseAIResponse(content);

    console.log('[serverless] Generated summary for:', packageData.name);

    return res.status(200).json({ summary: parsedSummary });

  } catch (error) {
    console.error('[serverless] AI API error:', error.message);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return res.status(401).json({ 
          error: 'API authentication failed. Please check your API key in settings or contact support.' 
        });
      }

      if (status === 429) {
        // Forward Retry-After header if present
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          res.setHeader('Retry-After', retryAfter);
        }
        return res.status(429).json({ 
          error: 'AI API rate limit exceeded. Please try again in a moment.' 
        });
      }

      if (status >= 500) {
        return res.status(502).json({ 
          error: 'AI API temporarily unavailable. Please try again.' 
        });
      }
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'AI request timed out. Please try again.' 
      });
    }

    // Handle network errors
    if (!error.response) {
      return res.status(502).json({ 
        error: 'Failed to connect to AI API.' 
      });
    }

    // Handle validation errors from _parseAIResponse
    if (error.message && error.message.startsWith('Invalid AI response')) {
      return res.status(500).json({ 
        error: 'Invalid AI response.' 
      });
    }

    // Handle parsing errors
    if (error.message && error.message.includes('parse')) {
      return res.status(500).json({ 
        error: 'Failed to parse AI response.' 
      });
    }

    // Generic error
    return res.status(500).json({ 
      error: 'Failed to generate summary.' 
    });
  }
}
