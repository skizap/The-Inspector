# Background Functions Architecture

## Overview

This document describes the background function architecture implemented to handle long-running AI analysis requests that exceed Netlify's standard 26-second function timeout.

## Problem

The original `analyze.js` function times out when using slow AI models like Moonshot Kimi K2 Thinking (50-60+ seconds response time). Netlify Pro functions have a 26-second timeout limit, causing analysis failures.

## Solution

Implemented a three-function architecture using Netlify Background Functions (15-minute timeout) with job-based polling:

1. **analyze-start.js** - Initiates analysis jobs
2. **analyze-background.js** - Processes long-running AI requests
3. **analyze-status.js** - Polls for job completion

Results are stored in Netlify Blobs with 1-hour TTL for automatic cleanup.

## Architecture Diagram

```
User → Frontend → analyze-start.js → analyze-background.js (Background)
                         ↓                      ↓
                    Returns jobId         Stores result in Blobs
                         ↓                      ↓
                   Frontend polls ← analyze-status.js ← Reads from Blobs
```

## Function Details

### analyze-start.js (Standard Function)

**Purpose:** Validates inputs, generates job ID, triggers background processing

**Timeout:** 10 seconds (standard Netlify function)

**Request:**
```json
POST /.netlify/functions/analyze-start
{
  "packageData": { "name": "react", "version": "18.0.0", "dependencies": {...} },
  "vulnerabilities": [...],
  "model": "moonshotai/kimi-k2-thinking"
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Analysis started"
}
```

**Key Features:**
- Validates package data structure
- Handles user-provided API keys via Authorization header
- Detects AI provider (OpenAI/OpenRouter)
- Validates model compatibility
- Generates UUID job ID
- Triggers background function
- Returns immediately (no waiting)

### analyze-background.js (Background Function)

**Purpose:** Processes AI analysis requests with extended timeout

**Timeout:** 15 minutes (Netlify Background Function)

**Input:** Receives payload from analyze-start.js via HTTP POST

**Key Features:**
- Reuses core logic from original `analyze.js`
- Supports streaming AI responses
- Handles provider-specific configurations
- Stores results in Netlify Blobs
- Stores error states for failed jobs
- 1-hour TTL for automatic cleanup

**Result Storage:**
```json
{
  "status": "completed",
  "result": {
    "packageData": {...},
    "vulnerabilities": [...],
    "summary": {
      "riskLevel": "Medium",
      "concerns": [...],
      "recommendations": [...],
      "complexityAssessment": "...",
      "maintenanceStatus": "Active",
      "licenseCompatibility": "Permissive",
      "maintenanceNotes": "..."
    }
  },
  "timestamp": 1234567890,
  "model": "moonshotai/kimi-k2-thinking"
}
```

### analyze-status.js (Standard Function)

**Purpose:** Checks job status and retrieves results

**Timeout:** 10 seconds (standard Netlify function)

**Request:**
```
GET /.netlify/functions/analyze-status?jobId=550e8400-e29b-41d4-a716-446655440000
```

**Response (Pending):**
```json
{
  "status": "pending",
  "message": "Analysis in progress..."
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "result": {
    "packageData": {...},
    "vulnerabilities": [...],
    "summary": {...}
  }
}
```

**Response (Failed):**
```json
{
  "status": "failed",
  "error": "AI API authentication failed"
}
```

**Key Features:**
- Validates UUID format
- Retrieves results from Netlify Blobs
- Handles missing/expired jobs (returns pending)
- Fast response time (<1 second)

## Frontend Integration

The frontend has been updated to use the new polling architecture. The implementation is in `src/api/ai.js`:

### Implementation Details

**Phase 1 - Start Job:**
- `_startAnalysisJob()` function POSTs to `/analyze-start` endpoint
- Receives `jobId` in response
- Handles fallback endpoint on 404/network errors
- Includes user API key in Authorization header if available

**Phase 2 - Poll Status:**
- `_pollJobStatus()` function polls `/analyze-status?jobId=<jobId>` endpoint
- Polls every 3 seconds (configurable via `POLL_INTERVAL`)
- Max 100 attempts = 5 minutes total (configurable via `MAX_POLL_ATTEMPTS`)
- Returns summary when status is "completed"
- Throws error when status is "failed"
- Continues polling when status is "pending"
- Handles fallback endpoint on 404/network errors

**User Experience:**
- `InspectorForm.jsx` tracks elapsed time during analysis
- Loading message updates dynamically:
  - 0-30s: "Analyzing package... This may take up to 2 minutes for complex models."
  - 30-60s: "Analyzing package... Still processing (45s elapsed)..."
  - 60s+: "Analyzing package... Still processing (1m 30s elapsed)..."
- Provides clear feedback for long-running analyses

### Code Example

The `generateSummary()` function in `src/api/ai.js` now uses polling:

```javascript
// Phase 1: Start job
const jobId = await _startAnalysisJob(
  packageData, 
  vulnerabilities, 
  model, 
  userApiKey, 
  useFallback, 
  timeout
);

// Phase 2: Poll for completion
const summary = await _pollJobStatus(jobId, useFallback, timeout);

return summary;
```

The polling is transparent to the rest of the application - `inspectPackage()` in `utils/inspector.js` continues to call `generateSummary()` the same way, and the UI continues to manage loading state the same way.

## Dependencies

Added `@netlify/blobs` package for result storage:

```json
{
  "dependencies": {
    "@netlify/blobs": "^8.1.0"
  }
}
```

## Deployment

1. Install dependencies: `npm install`
2. Deploy to Netlify (functions are automatically detected)
3. Configure environment variables:
   - `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
   - `VITE_AI_PROVIDER` (openai or openrouter)
   - `VITE_DEFAULT_MODEL` (optional)
   - `VITE_SITE_URL` (for OpenRouter)
   - `VITE_SITE_NAME` (for OpenRouter)

## Testing

Test the background function architecture:

1. **Test with fast model (GPT-4o):**
   - Should complete in <10 seconds
   - Verify polling returns result quickly

2. **Test with slow model (Kimi K2 Thinking):**
   - Should complete in 50-60 seconds
   - Verify polling continues until completion
   - Verify no timeout errors

3. **Test error handling:**
   - Invalid API key → should store error state
   - Invalid model → should return 400 error
   - Network error → should store error state

## Backward Compatibility

The original `analyze.js` function remains unchanged and can still be used for fast models. The new background function architecture is opt-in via frontend changes.

## Performance Considerations

- **analyze-start:** <1 second (validation + job creation)
- **analyze-background:** 10-60 seconds (AI processing)
- **analyze-status:** <1 second (blob lookup)
- **Total user wait time:** 10-60 seconds (with polling feedback)

## Limitations

- Maximum 15-minute timeout (Netlify Background Function limit)
- 1-hour result TTL (jobs expire after 1 hour, enforced application-side)
- No job cancellation (once started, runs to completion)
- No progress updates (only pending/completed/failed states)

## Implementation Details

### TTL Enforcement

Netlify Blobs does not automatically delete expired objects based on metadata TTL. The implementation enforces TTL application-side:

1. When storing results, an `expiresAt` timestamp (epoch ms) is added to metadata
2. When retrieving results, `analyze-status.js` checks if `now > expiresAt`
3. If expired, the blob is deleted and a "failed" status is returned
4. This ensures users receive clear feedback when results expire

### Error Handling

The implementation handles several failure scenarios:

1. **Background trigger fails:** Stores failure state in Blobs and returns 502 error
2. **AI API timeout:** Stores failure state with timeout error message
3. **Invalid response:** Stores failure state with parsing error
4. **Network errors:** Stores failure state with connection error

All failures are stored in Blobs to prevent jobs from remaining in "pending" state forever.

### Dynamic URL Construction

The background function trigger uses dynamic URL construction from request headers:
- Protocol: `x-forwarded-proto` header (or defaults to `https`)
- Host: `x-forwarded-host` or `host` header
- Path: `/.netlify/functions/analyze-background`

This ensures the trigger works in both production and local development (`netlify dev`).

## Future Enhancements

- Add progress updates during AI processing
- Implement job cancellation
- Add job history/logging
- Support batch analysis (multiple packages)
- Add webhook notifications for job completion
