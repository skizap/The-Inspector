/**
 * Netlify serverless function that initiates background AI analysis jobs.
 * This function validates inputs, generates a unique job ID, and triggers
 * the background function to process long-running AI requests.
 */

import https from 'https';
import http from 'http';
import { randomUUID } from 'crypto';
import { getStore } from '@netlify/blobs';
import { VALID_OPENROUTER_MODELS } from '../../src/constants/openrouterModels.js';

/**
 * Netlify serverless function handler
 * @param {Object} event - Netlify event object with httpMethod, headers, body
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

  // Check for user-provided API key in Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  let apiKey = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[analyze-start] User-provided API key detected');
  }

  // Determine AI provider with backward compatibility
  let provider = process.env.VITE_AI_PROVIDER;
  
  // Normalize provider to avoid case/whitespace configuration pitfalls
  provider = (provider || '').trim().toLowerCase();
  
  // If user provided a key, default to openrouter (most common use case)
  if (!provider && apiKey) {
    provider = 'openrouter';
    console.log('[analyze-start] Defaulting to openrouter for user-provided key');
  }
  
  // Backward compatibility: default to 'openai' if VITE_AI_PROVIDER not set but OPENAI_API_KEY exists
  if (!provider && process.env.OPENAI_API_KEY) {
    provider = 'openai';
  }

  // If no API key provided by user, check environment variables
  if (!apiKey) {
    if (provider === 'openrouter') {
      apiKey = process.env.OPENROUTER_API_KEY;
    } else {
      apiKey = process.env.OPENAI_API_KEY;
    }
  }

  // Validate that we have an API key
  if (!apiKey) {
    console.error('[analyze-start] No API key available');
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'API key required. Please provide your API key in settings.' 
      })
    };
  }

  // Validate provider value
  if (provider && provider !== 'openai' && provider !== 'openrouter') {
    console.error('[analyze-start] Unsupported VITE_AI_PROVIDER value:', provider);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Server configuration error: unsupported VITE_AI_PROVIDER value' 
      })
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
      console.error('[analyze-start] Invalid or unsupported OpenRouter model requested:', modelToUse);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Model '${modelToUse}' is not a valid or supported OpenRouter model for this application. Please select a model from the dropdown in the UI.` 
        })
      };
    }
  }

  // Generate unique job ID
  const jobId = randomUUID();
  
  console.log('[analyze-start] Job created:', jobId);
  console.log('[analyze-start] Package:', packageData.name);
  console.log('[analyze-start] Model:', modelToUse);

  // Trigger background function
  try {
    const backgroundPayload = {
      jobId,
      packageData,
      vulnerabilities,
      model: modelToUse,
      apiKey,
      provider
    };

    // Make HTTP POST request to background function
    await _triggerBackgroundFunction(backgroundPayload, event);
    
    console.log('[analyze-start] Background function triggered for job:', jobId);
  } catch (error) {
    console.error('[analyze-start] Failed to trigger background function:', error.message);
    
    // Store failure state so the job doesn't remain pending forever
    try {
      const store = getStore('analysis-results');
      const now = Date.now();
      const ttlSeconds = 3600; // 1 hour
      const expiresAt = now + (ttlSeconds * 1000);
      
      await store.set(jobId, JSON.stringify({
        status: 'failed',
        error: 'Failed to trigger background job',
        timestamp: now
      }), {
        metadata: {
          timestamp: now,
          ttl: ttlSeconds,
          expiresAt: expiresAt
        }
      });
      
      console.log('[analyze-start] Failure state stored for job:', jobId);
    } catch (storeError) {
      console.error('[analyze-start] Failed to store failure state:', storeError.message);
    }
    
    // Return error response immediately
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to start analysis. Please try again.'
      })
    };
  }

  // Return immediately with job ID
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      jobId, 
      status: 'pending',
      message: 'Analysis started'
    })
  };
}

/**
 * Triggers the background function via HTTP POST
 * @param {Object} payload - The payload to send to the background function
 * @param {Object} event - Netlify event object for extracting request headers
 * @returns {Promise<void>}
 */
function _triggerBackgroundFunction(payload, event) {
  return new Promise((resolve, reject) => {
    // Build absolute URL from request headers
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers['x-forwarded-host'] || event.headers['host'] || 'localhost';
    const absoluteURL = `${protocol}://${host}/.netlify/functions/analyze-background`;
    
    const url = new URL(absoluteURL);
    const httpModule = url.protocol === 'https:' ? https : http;
    const bodyString = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString)
      },
      timeout: 5000 // 5 second timeout for trigger
    };

    const req = httpModule.request(options, (res) => {
      res.on('data', () => {}); // Consume response data
      res.on('end', () => resolve());
      res.on('error', (error) => reject(error));
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Background function trigger timed out'));
    });

    req.write(bodyString);
    req.end();
  });
}
