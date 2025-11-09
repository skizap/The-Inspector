/**
 * Netlify serverless function that checks the status of background analysis jobs.
 * This function polls Netlify Blobs storage to retrieve job results.
 */

import { getStore } from '@netlify/blobs';

/**
 * Validates UUID format (basic validation)
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} True if valid UUID format
 */
function _isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  // Basic UUID format check: 8-4-4-4-12 hexadecimal characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Netlify serverless function handler
 * @param {Object} event - Netlify event object with httpMethod, queryStringParameters
 * @returns {Promise<Object>} Response object with statusCode, headers, body
 */
export async function handler(event) {
  // Validate request method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  // Extract jobId from query parameters
  const jobId = event.queryStringParameters?.jobId;

  // Validate jobId presence
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'jobId query parameter is required' })
    };
  }

  // Validate jobId format
  if (!_isValidUUID(jobId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid jobId format' })
    };
  }

  try {
    // Initialize blob store
    const store = getStore('analysis-results');

    // Attempt to retrieve result with metadata
    const blobData = await store.getWithMetadata(jobId, { type: 'text' });

    // Case 1: Job not found or still processing
    if (!blobData || !blobData.data) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pending',
          message: 'Analysis in progress...'
        })
      };
    }

    // TTL Enforcement Strategy:
    // Netlify Blobs does not automatically delete expired objects based on metadata TTL.
    // We enforce TTL application-side by checking the expiresAt timestamp and manually
    // deleting expired blobs. This ensures users receive clear feedback when results
    // expire (1-hour TTL) rather than seeing stale data or ambiguous "pending" states.
    
    // Check if blob has expired
    const now = Date.now();
    const expiresAt = blobData.metadata?.expiresAt;
    
    if (expiresAt && now > expiresAt) {
      console.log('[analyze-status] Job expired:', jobId);
      
      // Delete expired blob
      try {
        await store.delete(jobId);
      } catch (deleteError) {
        console.error('[analyze-status] Failed to delete expired blob:', deleteError.message);
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'failed',
          error: 'Job expired (results are only available for 1 hour)'
        })
      };
    }

    // Parse stored JSON
    let storedData;
    try {
      storedData = JSON.parse(blobData.data);
    } catch (parseError) {
      console.error('[analyze-status] Failed to parse stored data for job:', jobId, parseError.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'error',
          error: 'Corrupted job data'
        })
      };
    }

    // Case 2: Job completed successfully
    if (storedData.status === 'completed') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          result: storedData.result
        })
      };
    }

    // Case 3: Job failed
    if (storedData.status === 'failed') {
      const response = { 
        status: 'failed',
        error: storedData.error || 'Analysis failed'
      };
      
      // Include errorCode if present for reliable frontend mapping
      if (storedData.errorCode) {
        response.errorCode = storedData.errorCode;
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      };
    }

    // Unknown status
    console.error('[analyze-status] Unknown status for job:', jobId, storedData.status);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'error',
        error: 'Unknown job status'
      })
    };

  } catch (error) {
    console.error('[analyze-status] Error checking job status:', jobId, error.message);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'error',
        error: 'Failed to check job status'
      })
    };
  }
}
