# Testing Guide: Background Functions Architecture

## Overview

This guide provides comprehensive testing procedures for The Inspector's background functions architecture. The architecture handles long-running AI analysis requests using Netlify Background Functions, which support execution times up to 15 minutes.

For architectural details, see [BACKGROUND_FUNCTIONS.md](./BACKGROUND_FUNCTIONS.md).

## Prerequisites

Before testing, ensure you have:

- **Netlify account** with deployed site
- **API keys** configured:
  - OpenRouter API key (for multiple AI models), OR
  - OpenAI API key (for GPT models only)
- **Browser DevTools** access (Chrome, Firefox, Safari, or Edge)
- **Network access** to test endpoints
- **Basic understanding** of HTTP requests and browser console

## Test Scenarios

### 1. Fast Model (Claude 3.5 Sonnet, 3-8 seconds)

**Purpose:** Verify that fast models complete quickly and polling returns results efficiently.

**Model to use:** `anthropic/claude-3.5-sonnet` (Claude 3.5 Sonnet)

**Expected behavior:** Analysis completes in 3-8 seconds, polling returns result within 1-2 poll attempts (3-6 seconds total).

**Steps:**

1. Open The Inspector application in your browser
2. Enter a small package name (e.g., `lodash`)
3. Select "Claude 3.5 Sonnet" from the model dropdown
4. Click the "Inspect" button
5. Observe the loading message: Should display "Analyzing package... This may take up to 2 minutes for complex models."
6. Open browser DevTools (F12) and navigate to the Network tab
7. Verify POST request to `/.netlify/functions/analyze-start` returns 200 status with `jobId` in response
8. Verify GET requests to `/.netlify/functions/analyze-status?jobId=<uuid>` start polling every 3 seconds
9. Verify status returns `"pending"` initially, then `"completed"` within 3-8 seconds
10. Verify analysis results display correctly with:
    - Risk level (Low, Medium, High, Critical)
    - Security concerns
    - Recommendations

**Success criteria:**
- ✅ Analysis completes in <10 seconds
- ✅ No timeout errors occur
- ✅ Results display correctly with all sections populated

**Troubleshooting:**
- If analysis takes longer than expected, check AI provider status at [OpenRouter Status](https://status.openrouter.ai/)
- Verify API key is valid in Settings
- Check Netlify function logs for errors

---

### 2. Slow Model (Moonshot Kimi K2 Thinking, 50-60+ seconds)

**Purpose:** Verify that slow models complete successfully without timeout errors.

**Model to use:** `moonshotai/kimi-k2-thinking` (Moonshot Kimi K2 Thinking - Recommended)

**Expected behavior:** Analysis completes in 50-60+ seconds, polling continues until completion, loading message updates with elapsed time.

**Steps:**

1. Open The Inspector application in your browser
2. Enter a medium-sized package name (e.g., `react`)
3. Select "Moonshot Kimi K2 Thinking (Recommended)" from the model dropdown
4. Click the "Inspect" button
5. Observe loading message progression:
   - **0-30s:** "Analyzing package... This may take up to 2 minutes for complex models."
   - **30-60s:** "Analyzing package... Still processing (45s elapsed)..."
   - **60s+:** "Analyzing package... Still processing (1m 15s elapsed)..."
6. Open browser DevTools (F12) and navigate to the Network tab
7. Verify POST request to `/.netlify/functions/analyze-start` returns 200 status with `jobId`
8. Verify GET requests to `/.netlify/functions/analyze-status` poll every 3 seconds
9. Count polling attempts: Should see 15-20 status checks before completion
10. Verify status eventually returns `"completed"` with full analysis results
11. Verify **no 504 Gateway Timeout errors** occur

**Success criteria:**
- ✅ Analysis completes in 50-70 seconds
- ✅ Polling continues throughout entire duration
- ✅ Results display correctly
- ✅ No timeout errors (504, 408, etc.)

**Troubleshooting:**
- If 504 errors occur, verify `analyze-background.js` is properly configured as a background function
- Check Netlify deployment logs to confirm background function was detected
- Verify function export signature: `export default async (req, context)` and `export const config`

---

### 3. Invalid API Key Error

**Purpose:** Verify error handling for authentication failures.

**Steps:**

1. Open The Inspector application
2. Click the Settings icon (gear icon in top-right corner)
3. Enter an invalid API key (e.g., `invalid-key-12345`)
4. Save settings
5. Enter a package name (e.g., `express`)
6. Click the "Inspect" button
7. Observe error handling:
   - Frontend starts polling normally
   - Background function fails with authentication error
   - Error is stored in Netlify Blobs
   - Status endpoint returns `{"status": "failed", "error": "...API key..."}`
   - Frontend displays error message: **"Invalid API Key. Please check your key in the settings."**
8. Open browser DevTools Console (F12 → Console tab)
9. Verify error is logged with type `INVALID_API_KEY`

**Expected behavior:**
- Error is caught gracefully
- Error is stored in Netlify Blobs
- Error is returned to frontend via status endpoint
- User-friendly error message is displayed
- Job does not remain in "pending" state forever

**Success criteria:**
- ✅ No unhandled errors or crashes
- ✅ Clear, actionable error message displayed
- ✅ Job transitions from "pending" to "failed" state

**Verification:**
- Check Netlify function logs for `[analyze-background] Error processing job` message
- Verify error includes authentication-related keywords

---

### 4. Network Error Handling

**Purpose:** Verify fallback endpoint logic and network error recovery.

**Steps:**

1. Open browser DevTools (F12) and navigate to the Network tab
2. Enable network throttling:
   - Chrome: Network tab → Throttling dropdown → "Slow 3G"
   - Firefox: Network tab → Throttling icon → "GPRS"
3. Enter a package name and click "Inspect"
4. Observe fallback behavior:
   - Primary endpoint fails with network error
   - Frontend retries with fallback endpoint
   - If both endpoints fail, error is displayed
5. Disable network throttling (set to "No throttling" or "Online")
6. Retry the analysis
7. Verify analysis completes successfully

**Expected behavior:**
- Frontend attempts fallback endpoint on network errors
- Clear error message displayed if both endpoints fail
- Analysis succeeds once network is restored

**Success criteria:**
- ✅ Fallback logic works correctly
- ✅ Error messages are user-friendly
- ✅ Recovery works after network restoration

---

### 5. 5-Minute Polling Timeout

**Purpose:** Verify timeout handling when analysis exceeds maximum polling duration.

**Note:** This scenario is difficult to test naturally (requires AI model that takes >5 minutes). Use simulated test approach.

**Simulated test approach:**

1. **Temporarily modify polling timeout** (for testing only):
   - Open `src/api/ai.js`
   - Find `MAX_POLL_ATTEMPTS` constant (line 54)
   - Change value from `100` to `5` (15 seconds total: 5 attempts × 3 seconds)
   - Save file
2. Rebuild and deploy the application
3. Test with slow model (Moonshot Kimi K2 Thinking)
4. Verify timeout error after 15 seconds
5. Verify error message: **"Analysis timed out after 5 minutes. This can happen with very slow AI models. Please try again."**
6. **Restore original value:**
   - Change `MAX_POLL_ATTEMPTS` back to `100`
   - Rebuild and redeploy

**Expected behavior:**
- Polling stops after max attempts
- Timeout error is thrown with type `TIMEOUT_ERROR`
- User-friendly message suggests retry

**Success criteria:**
- ✅ Timeout is enforced correctly
- ✅ Error message is clear and actionable
- ✅ No infinite polling loops

**⚠️ Important:** Always restore `MAX_POLL_ATTEMPTS` to `100` after testing!

---

### 6. Netlify Blobs TTL Verification (1-Hour Expiration)

**Purpose:** Verify that job results expire after 1 hour and are cleaned up.

**Steps:**

1. Complete a successful analysis (any model, any package)
2. Note the `jobId` from browser DevTools Network tab:
   - Find the POST request to `analyze-start`
   - Copy the `jobId` from the response body
3. Manually call the status endpoint:
   ```bash
   curl "https://your-site.netlify.app/.netlify/functions/analyze-status?jobId=<uuid>"
   ```
4. Verify response returns `"completed"` status with full results
5. **Wait 1 hour** (or temporarily modify TTL in code for faster testing)
6. Call the status endpoint again with the same `jobId`
7. Verify response returns `"failed"` status with error: **"Job expired (results are only available for 1 hour)"**
8. Verify blob is deleted (check Netlify Blobs dashboard or function logs)

**Expected behavior:**
- Results are available for 1 hour after completion
- After 1 hour, results expire and are deleted
- Clear error message is returned for expired jobs

**Success criteria:**
- ✅ TTL is enforced correctly (1 hour)
- ✅ Expired blobs are deleted
- ✅ Clear error message for expired jobs

**Implementation details:**
- TTL is enforced application-side by checking `expiresAt` metadata
- Netlify Blobs does not automatically delete expired blobs
- The status endpoint deletes expired blobs when accessed

**Faster testing (optional):**
- Temporarily modify `TTL` constant in `analyze-background.js` (line 18) from `3600000` (1 hour) to `60000` (1 minute)
- Rebuild and deploy
- Test with 1-minute expiration
- Restore original TTL value

---

### 7. Concurrent Analysis Support

**Purpose:** Verify that multiple analyses can run simultaneously without conflicts.

**Steps:**

1. Open The Inspector in **two separate browser tabs**
2. **In Tab 1:**
   - Enter package name: `react`
   - Select model: "Moonshot Kimi K2 Thinking (Recommended)"
   - Click "Inspect"
3. **In Tab 2** (immediately after starting Tab 1):
   - Enter package name: `vue`
   - Select model: "Claude 3.5 Sonnet"
   - Click "Inspect"
4. Observe both analyses:
   - Each receives a unique `jobId` (generated by `crypto.randomUUID()`)
   - Each polls independently
   - **Tab 2** (fast model) should complete first (~5 seconds)
   - **Tab 1** (slow model) should complete second (~60 seconds)
   - Results should not interfere with each other
5. Verify in browser DevTools (Network tab) that each tab polls its own `jobId`
6. Verify both analyses complete successfully with correct results for each package

**Expected behavior:**
- Multiple concurrent analyses work independently
- Each analysis has a unique job ID
- No race conditions or conflicts
- Results are correct for each package

**Success criteria:**
- ✅ Both analyses complete successfully
- ✅ Results are correct for each package (no cross-contamination)
- ✅ No errors or conflicts

**Troubleshooting:**
- If results are mixed up, verify unique job IDs in DevTools
- Check React state management in `InspectorForm.jsx`
- Verify blob storage keys are unique per job

---

## Verification Checklist

Use this checklist to track your testing progress:

- [ ] **Test 1:** Fast Model (Claude 3.5 Sonnet) - Analysis completes in <10 seconds
- [ ] **Test 2:** Slow Model (Moonshot Kimi K2 Thinking) - Analysis completes in 50-70 seconds without timeout
- [ ] **Test 3:** Invalid API Key - Error is caught and displayed with clear message
- [ ] **Test 4:** Network Error - Fallback logic works correctly
- [ ] **Test 5:** Polling Timeout - Timeout is enforced after max attempts
- [ ] **Test 6:** Blob TTL - Results expire after 1 hour and are deleted
- [ ] **Test 7:** Concurrent Analysis - Multiple analyses run independently without conflicts

**Notes and Observations:**

```
[Add your testing notes here]
```

---

## Troubleshooting

### Issue: 504 Gateway Timeout errors with slow models

**Cause:** Background function not properly configured or detected by Netlify.

**Solution:**
1. Verify `analyze-background.js` has correct export signature:
   ```javascript
   export default async (req, context) => { ... }
   export const config = { path: '/analyze-background' }
   ```
2. Redeploy to Netlify
3. Check Netlify Functions dashboard to confirm function is listed as "Background Function" (not "Serverless Function")
4. Review deployment logs for any warnings

---

### Issue: Polling never completes (stuck in "pending" state)

**Cause:** Background function crashed without storing error state, or blob storage is not working.

**Solution:**
1. Check Netlify function logs for errors:
   - Go to Netlify dashboard → Functions → analyze-background → Logs
   - Look for error messages or stack traces
2. Verify blob storage is working:
   - Check Netlify Blobs dashboard
   - Verify blobs are being created with correct keys
3. Check API key validity in Settings
4. Verify environment variables are set correctly:
   - `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
   - `VITE_AI_PROVIDER`
   - `VITE_SITE_URL`
   - `VITE_SITE_NAME`

---

### Issue: Results not displaying after completion

**Cause:** Response validation failing in frontend.

**Solution:**
1. Check browser console for validation errors
2. Verify AI response format matches expected structure:
   - Must include `riskLevel`, `concerns`, `recommendations`
   - Check `src/api/ai.js` lines 102-150 for validation logic
3. Verify AI model is returning properly formatted JSON
4. Check for parsing errors in function logs

---

### Issue: Concurrent analyses interfering with each other

**Cause:** Job ID collision (extremely unlikely with UUID) or frontend state management issue.

**Solution:**
1. Verify unique job IDs in DevTools Network tab
2. Check React state management in `InspectorForm.jsx`:
   - Ensure each analysis uses separate state
   - Verify `jobId` is stored correctly per analysis
3. Check blob storage keys are unique per job
4. Verify no global state pollution

---

## Performance Benchmarks

Expected performance metrics for different AI models:

| Model Category | Example Models | Expected Time | Polling Attempts |
|----------------|----------------|---------------|------------------|
| **Fast** | Claude 3.5 Sonnet, GPT-4o | 3-10 seconds | 1-3 attempts |
| **Medium** | Gemini Flash, Mistral Large | 10-30 seconds | 3-10 attempts |
| **Slow** | Moonshot Kimi K2 Thinking | 50-70 seconds | 15-25 attempts |

**Function Performance:**
- `analyze-start`: <1 second (job creation and background trigger)
- `analyze-status`: <1 second (blob lookup and JSON parsing)
- `analyze-background`: Variable (depends on AI model speed)

**Polling Overhead:**
- Polling interval: 3 seconds
- Maximum polling duration: 5 minutes (100 attempts × 3 seconds)
- Network overhead per poll: ~100-200ms

---

## Deployment Verification

Before testing, verify your deployment is configured correctly:

### 1. Check Netlify Functions Dashboard

1. Go to Netlify dashboard → Site → Functions
2. Verify **3 functions** are deployed:
   - `analyze-start` (Serverless Function)
   - `analyze-status` (Serverless Function)
   - `analyze-background` (Background Function)
3. Verify `analyze-background` is listed as **"Background Function"** (not "Serverless Function")

### 2. Verify Environment Variables

1. Go to Netlify dashboard → Site Settings → Environment Variables
2. Verify the following variables are set:
   - `OPENROUTER_API_KEY` or `OPENAI_API_KEY` (depending on provider)
   - `VITE_AI_PROVIDER` (e.g., `openrouter` or `openai`)
   - `VITE_SITE_URL` (your Netlify site URL)
   - `VITE_SITE_NAME` (your site name)
3. Verify values are correct (no typos, no extra spaces)

### 3. Test Endpoints with curl

Test each endpoint manually to verify they respond correctly:

**Test analyze-start:**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/analyze-start \
  -H "Content-Type: application/json" \
  -d '{"packageName": "lodash", "model": "anthropic/claude-3.5-sonnet"}'
```

Expected response:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Analysis started. Poll /analyze-status?jobId=<jobId> for results."
}
```

**Test analyze-status:**
```bash
curl "https://your-site.netlify.app/.netlify/functions/analyze-status?jobId=<jobId>"
```

Expected response (pending):
```json
{
  "status": "pending"
}
```

Expected response (completed):
```json
{
  "status": "completed",
  "result": { ... }
}
```

### 4. Check Function Logs

1. Go to Netlify dashboard → Functions → Select function → Logs
2. Trigger a test analysis
3. Verify logs show:
   - `[analyze-start] Starting analysis job`
   - `[analyze-background] Processing job`
   - `[analyze-background] Analysis completed successfully`
   - `[analyze-status] Job status: completed`
4. Check for any errors or warnings

---

## References

- [Background Functions Architecture](./BACKGROUND_FUNCTIONS.md) - Detailed architecture documentation
- [Deployment Guide](./DEPLOYMENT.md) - Deployment instructions for Netlify
- [Netlify Background Functions](https://docs.netlify.com/functions/background-functions/) - Official documentation
- [Netlify Blobs](https://docs.netlify.com/blobs/overview/) - Blob storage documentation
- [OpenRouter API](https://openrouter.ai/docs) - AI provider API documentation

---

## Support

If you encounter issues not covered in this guide:

1. Check Netlify function logs for detailed error messages
2. Review browser console for frontend errors
3. Verify all environment variables are set correctly
4. Consult the [BACKGROUND_FUNCTIONS.md](./BACKGROUND_FUNCTIONS.md) architecture document
5. Check [OpenRouter Status](https://status.openrouter.ai/) for API availability

---

**Last Updated:** 2025-11-09
